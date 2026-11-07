package ph.salo.app.core.backup

import android.content.Context
import androidx.datastore.preferences.core.edit
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
    val userId: String,
    val email: String
)

sealed interface SessionState {
    data object SignedOut : SessionState
    data class SignedIn(val session: OwnerSession) : SessionState
}

@Singleton
class SessionStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val accessTokenKey = stringPreferencesKey("access_token")
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
            SessionState.SignedIn(OwnerSession(token, userId, email))
        }
    }

    suspend fun getSession(): SessionState = session.first()

    suspend fun save(session: OwnerSession) {
        context.sessionDataStore.edit { preferences ->
            preferences[accessTokenKey] = session.accessToken
            preferences[userIdKey] = session.userId
            preferences[emailKey] = session.email
        }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { preferences ->
            preferences.remove(accessTokenKey)
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
