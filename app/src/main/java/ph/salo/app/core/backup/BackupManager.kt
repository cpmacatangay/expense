package ph.salo.app.core.backup

import android.app.Activity
import kotlinx.coroutines.flow.Flow
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

sealed interface BackupOutcome {
    data class Success(val snapshotId: String?) : BackupOutcome
    data class LocalOnly(val message: String) : BackupOutcome
    data class Error(val message: String) : BackupOutcome
}

@Singleton
class BackupManager @Inject constructor(
    val config: BackupConfig,
    private val stateRepository: BackupStateRepository,
    private val serializer: SnapshotSerializer,
    private val importer: SnapshotImporter,
    private val supabase: SupabaseBackupClient,
    private val googleAuth: GoogleAuthManager,
    private val sessionStore: SessionStore
) {
    val status: Flow<ph.salo.app.core.database.BackupStateEntity?> =
        stateRepository.observe()

    val session: Flow<SessionState> = sessionStore.session

    suspend fun currentSession(): SessionState = sessionStore.getSession()

    suspend fun signIn(activity: Activity): Result<Unit> = runCatching {
        val idToken = googleAuth.signIn(activity)
        val session = supabase.signInWithGoogleIdToken(idToken)
        sessionStore.save(session)
        stateRepository.markLocalOnly("Signed in. Run a backup to sync this ledger.")
    }

    suspend fun signOut() {
        sessionStore.clear()
        stateRepository.markLocalOnly("Signed out. The ledger is local only.")
    }

    suspend fun backupNow(): BackupOutcome {
        if (!config.isConfigured) {
            val message = "Backup is not configured. Add Supabase values to local.properties."
            stateRepository.markLocalOnly(message)
            return BackupOutcome.LocalOnly(message)
        }
        val signedIn = (sessionStore.getSession() as? SessionState.SignedIn)?.session
        if (signedIn == null) {
            val message = "Sign in with Google to back up."
            stateRepository.markLocalOnly(message)
            return BackupOutcome.LocalOnly(message)
        }
        stateRepository.markBackingUp()
        return try {
            val deviceId = sessionStore.deviceId()
            val payload = serializer.build(deviceId)
            val snapshotId = withFreshSession { session ->
                supabase.uploadSnapshot(session, deviceId, payload)
            }
            // Retention is best-effort; a prune failure must not fail the backup.
            runCatching { withFreshSession { supabase.pruneSnapshots(it) } }
            stateRepository.markSuccess(snapshotId)
            BackupOutcome.Success(snapshotId)
        } catch (caught: Throwable) {
            val message = caught.message ?: "Backup failed."
            stateRepository.markError(message)
            BackupOutcome.Error(message)
        }
    }

    suspend fun restoreLatest(): Result<RestoreResult> = runCatching {
        if (!config.isConfigured) {
            error("Restore is not configured. Add Supabase values to local.properties.")
        }
        requireSignedIn()
        val payload = withFreshSession { session -> supabase.latestSnapshot(session) }
            ?: error("No backup snapshot was found.")
        val result = importer.import(payload.toString())
        stateRepository.markSuccess(null)
        result
    }

    suspend fun deleteCloudBackups(): Result<Unit> = runCatching {
        requireSignedIn()
        withFreshSession { session -> supabase.deleteSnapshots(session) }
        stateRepository.markLocalOnly("Cloud backups deleted.")
    }

    private suspend fun requireSignedIn() {
        if (sessionStore.getSession() !is SessionState.SignedIn) {
            error("Sign in with Google first.")
        }
    }

    /**
     * Runs [block] with a session that is valid right now. Supabase access tokens last about an
     * hour; the stored refresh token is exchanged before the call when it is close to expiry, and
     * once more if the server answers 401 anyway.
     *
     * When the refresh token is gone or rejected, the session is cleared so the UI stops claiming
     * to be signed in, and the caller gets a message it can act on.
     */
    private suspend fun <T> withFreshSession(block: suspend (OwnerSession) -> T): T {
        var session = (sessionStore.getSession() as? SessionState.SignedIn)?.session
            ?: error("Sign in with Google to continue.")

        if (session.isExpired()) {
            session = refresh(session)
        }

        return try {
            block(session)
        } catch (caught: IOException) {
            if (!caught.message.orEmpty().isUnauthorized()) throw caught
            session = refresh(session)
            block(session)
        }
    }

    private suspend fun refresh(session: OwnerSession): OwnerSession {
        if (!session.canRefresh) {
            sessionStore.clear()
            error("Your session expired. Sign in with Google again.")
        }
        val refreshed = runCatching { supabase.refreshSession(session.refreshToken) }
            .getOrElse {
                sessionStore.clear()
                error("Your session expired. Sign in with Google again.")
            }
        sessionStore.save(refreshed)
        return refreshed
    }

    private fun String.isUnauthorized(): Boolean =
        contains("(401)") || contains("PGRST303") || contains("JWT expired")
}
