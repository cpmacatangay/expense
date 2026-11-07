package ph.salo.app.core.backup

import android.app.Activity
import kotlinx.coroutines.flow.Flow
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
        val session = when (val state = sessionStore.getSession()) {
            SessionState.SignedOut -> {
                val message = "Sign in with Google to back up."
                stateRepository.markLocalOnly(message)
                return BackupOutcome.LocalOnly(message)
            }

            is SessionState.SignedIn -> state.session
        }
        stateRepository.markBackingUp()
        return try {
            val deviceId = sessionStore.deviceId()
            val payload = serializer.build(deviceId)
            val snapshotId = supabase.uploadSnapshot(session, deviceId, payload)
            // Retention is best-effort; a prune failure must not fail the backup.
            runCatching { supabase.pruneSnapshots(session) }
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
        val session = when (val state = sessionStore.getSession()) {
            SessionState.SignedOut -> error("Sign in with Google to restore.")
            is SessionState.SignedIn -> state.session
        }
        val payload = supabase.latestSnapshot(session)
            ?: error("No backup snapshot was found.")
        val result = importer.import(payload.toString())
        stateRepository.markSuccess(null)
        result
    }

    suspend fun deleteCloudBackups(): Result<Unit> = runCatching {
        val session = when (val state = sessionStore.getSession()) {
            SessionState.SignedOut -> error("Sign in with Google first.")
            is SessionState.SignedIn -> state.session
        }
        supabase.deleteSnapshots(session)
        stateRepository.markLocalOnly("Cloud backups deleted.")
    }
}
