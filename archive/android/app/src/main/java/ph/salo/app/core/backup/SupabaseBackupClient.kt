package ph.salo.app.core.backup

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.json.jsonObject

@Singleton
class SupabaseBackupClient @Inject constructor(
    private val config: BackupConfig
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun signInWithGoogleIdToken(idToken: String): OwnerSession =
        withContext(Dispatchers.IO) {
            require(config.isConfigured) { "Supabase is not configured." }
            val body = buildJsonObject {
                put("provider", "google")
                put("id_token", idToken)
            }.toString()
            val response = request(
                url = "${config.supabaseUrl}/auth/v1/token?grant_type=id_token",
                method = "POST",
                body = body
            )
            val session = parseTokenResponse(response)
            if (
                config.ownerEmail.isNotEmpty() &&
                !session.email.equals(config.ownerEmail, ignoreCase = true)
            ) {
                throw IOException("This Google account is not the configured Salo owner.")
            }
            session
        }

    /**
     * Exchanges the stored refresh token for a fresh access token. Supabase rotates the
     * refresh token on every call, so the returned session replaces the old one.
     */
    suspend fun refreshSession(refreshToken: String): OwnerSession =
        withContext(Dispatchers.IO) {
            require(refreshToken.isNotBlank()) { "No refresh token is available." }
            val body = buildJsonObject { put("refresh_token", refreshToken) }.toString()
            val response = request(
                url = "${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token",
                method = "POST",
                body = body
            )
            parseTokenResponse(response)
        }

    private fun parseTokenResponse(response: String): OwnerSession {
        val root = json.parseToJsonElement(response).jsonObject
        val token = root["access_token"]?.jsonPrimitive?.content
            ?: throw IOException("Supabase did not return an access token.")
        val refreshToken = root["refresh_token"]?.jsonPrimitive?.content.orEmpty()
        val expiresIn = root["expires_in"]?.jsonPrimitive?.content?.toLongOrNull() ?: 3600L
        val user = root["user"]?.jsonObject
            ?: throw IOException("Supabase did not return a user.")
        val userId = user["id"]?.jsonPrimitive?.content
            ?: throw IOException("Supabase did not return a user id.")
        val email = user["email"]?.jsonPrimitive?.content
            ?: throw IOException("Supabase did not return an email.")
        return OwnerSession(
            accessToken = token,
            refreshToken = refreshToken,
            expiresAtMillis = System.currentTimeMillis() + expiresIn * 1000L,
            userId = userId,
            email = email
        )
    }

    suspend fun uploadSnapshot(
        session: OwnerSession,
        deviceId: String,
        payload: JsonObject
    ): String? = withContext(Dispatchers.IO) {
        val body = buildJsonObject {
            put("user_id", session.userId)
            put("schema_version", SnapshotSerializer.SCHEMA_VERSION)
            put("payload", payload)
            put("device_id", deviceId)
        }.toString()
        val response = request(
            url = "${config.supabaseUrl}/rest/v1/ledger_snapshots",
            method = "POST",
            body = body,
            accessToken = session.accessToken,
            prefer = "return=representation"
        )
        runCatching {
            json.parseToJsonElement(response).jsonArray.firstOrNull()
                ?.jsonObject?.get("id")?.jsonPrimitive?.content
        }.getOrNull()
    }

    suspend fun latestSnapshot(session: OwnerSession): JsonObject? = withContext(Dispatchers.IO) {
        val response = request(
            url = "${config.supabaseUrl}/rest/v1/ledger_snapshots" +
                "?select=id,payload,schema_version,created_at&order=created_at.desc&limit=1",
            method = "GET",
            accessToken = session.accessToken
        )
        runCatching {
            json.parseToJsonElement(response).jsonArray.firstOrNull()
                ?.jsonObject?.get("payload")?.jsonObject
        }.getOrNull()
    }

    suspend fun deleteSnapshots(session: OwnerSession) = withContext(Dispatchers.IO) {
        request(
            url = "${config.supabaseUrl}/rest/v1/ledger_snapshots?user_id=eq.${session.userId}",
            method = "DELETE",
            accessToken = session.accessToken
        )
        Unit
    }

    suspend fun pruneSnapshots(session: OwnerSession, keep: Int = RETAINED_SNAPSHOTS) =
        withContext(Dispatchers.IO) {
            val body = buildJsonObject { put("p_keep", keep) }.toString()
            request(
                url = "${config.supabaseUrl}/rest/v1/rpc/prune_ledger_snapshots",
                method = "POST",
                body = body,
                accessToken = session.accessToken
            )
            Unit
        }

    companion object {
        const val RETAINED_SNAPSHOTS = 30
    }

    private fun request(
        url: String,
        method: String,
        body: String? = null,
        accessToken: String? = null,
        prefer: String? = null
    ): String {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 20_000
            setRequestProperty("apikey", config.supabaseAnonKey)
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            accessToken?.let { setRequestProperty("Authorization", "Bearer $it") }
            prefer?.let { setRequestProperty("Prefer", it) }
            if (body != null) {
                doOutput = true
                outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
        }
        return try {
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) {
                throw IOException("Supabase request failed ($code): ${text.take(300)}")
            }
            text
        } finally {
            connection.disconnect()
        }
    }
}