package ph.salo.app.core.backup

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

private val Context.sessionDataStore by preferencesDataStore(name = "salo_session")

data class OwnerSession(
    val accessToken: String,
    val refreshToken: String,
    val expiresAtMillis: Long,
    val userId: String,
    val email: String
) {
    val canRefresh: Boolean get() = refreshToken.isNotBlank()

    fun isExpired(now: Long = System.currentTimeMillis()): Boolean =
        expiresAtMillis <= now + REFRESH_WINDOW_MILLIS

    companion object {
        /** Refresh a minute early so a request cannot expire mid-flight. */
        const val REFRESH_WINDOW_MILLIS = 60_000L
    }
}

sealed interface SessionState {
    data object SignedOut : SessionState
    data class SignedIn(val session: OwnerSession) : SessionState
}

@Singleton
class SessionStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val accessTokenKey = stringPreferencesKey("access_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")
    private val expiresAtKey = longPreferencesKey("expires_at")
    private val userIdKey = stringPreferencesKey("user_id")
    private val emailKey = stringPreferencesKey("email")
    private val deviceIdKey = stringPreferencesKey("device_id")

    val session: Flow<SessionState> = context.sessionDataStore.data.map { preferences ->
        val token = preferences[accessTokenKey]
        val userId = preferences[userIdKey]
        val email = preferences[emailKey]
        if (token.isNullOrBlank() || userId.isNullOrBlank() || email.isNullOrBlank()) {
            SessionState.SignedOut
        } else {
            SessionState.SignedIn(
                OwnerSession(
                    accessToken = token,
                    refreshToken = preferences[refreshTokenKey].orEmpty(),
                    expiresAtMillis = preferences[expiresAtKey] ?: 0L,
                    userId = userId,
                    email = email
                )
            )
        }
    }

    suspend fun getSession(): SessionState = session.first()

    suspend fun save(session: OwnerSession) {
        context.sessionDataStore.edit { preferences ->
            preferences[accessTokenKey] = session.accessToken
            preferences[refreshTokenKey] = session.refreshToken
            preferences[expiresAtKey] = session.expiresAtMillis
            preferences[userIdKey] = session.userId
            preferences[emailKey] = session.email
        }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { preferences ->
            preferences.remove(accessTokenKey)
            preferences.remove(refreshTokenKey)
            preferences.remove(expiresAtKey)
            preferences.remove(userIdKey)
            preferences.remove(emailKey)
        }
    }

    suspend fun deviceId(): String {
        val existing = context.sessionDataStore.data.first()[deviceIdKey]
        if (!existing.isNullOrBlank()) return existing
        val created = UUID.randomUUID().toString()
        context.sessionDataStore.edit { it[deviceIdKey] = created }
        return created
    }
}
