# Contract: Android Platform Adapters

**Consumers**: camera, sharing, export, auth, and backup features

Platform capabilities are isolated behind small interfaces so the domain and UI layers stay
testable. All implementations are Android-native.

## Camera

```kotlin
interface CameraAdapter {
    suspend fun captureReceipt(): CapturedImage?
}

data class CapturedImage(
    val uri: Uri,
    val path: String,
    val mimeType: String,
    val width: Int,
    val height: Int
)
```

- Uses CameraX preview and capture.
- Writes to app-private storage.
- Requests camera permission.
- Returns `null` when the owner cancels.
- Falls back to the photo picker if permission is denied.

## Sharing

```kotlin
interface ShareAdapter {
    fun shareText(text: String, subject: String)
    fun shareImage(uri: Uri, mimeType: String, subject: String)
    fun copyText(text: String)
}
```

- Uses `Intent.ACTION_SEND` and the Android share sheet.
- Images use a FileProvider URI.
- No network service.

## Export

```kotlin
interface ExportAdapter {
    suspend fun exportCsv(fileName: String, csv: String): Boolean
    suspend fun exportJson(fileName: String, json: String): Boolean
}
```

- Uses the Storage Access Framework (`ACTION_CREATE_DOCUMENT`).
- No broad storage permissions.
- Returns `false` when the owner cancels.

## Authentication

```kotlin
interface AuthAdapter {
    suspend fun signInWithGoogle(): GoogleSession?
    suspend fun signOut()
    fun currentSession(): GoogleSession?
}

data class GoogleSession(
    val email: String,
    val idToken: String,
    val supabaseAccessToken: String?
)
```

- Uses Google Credential Manager.
- Exchanges the ID token with Supabase Auth.
- Stores the session in encrypted storage.
- Rejects any account other than the configured owner.
- Local ledger use does not require a session.

## Backup

```kotlin
interface BackupAdapter {
    suspend fun uploadSnapshot(snapshot: LedgerSnapshot): BackupResult
    suspend fun latestSnapshot(): LedgerSnapshot?
    suspend fun deleteSnapshots()
}

sealed interface BackupResult {
    data class Success(val snapshotId: String) : BackupResult
    data class Failure(val message: String, val retryable: Boolean) : BackupResult
}
```

- Uses Supabase Postgrest with the authenticated owner session.
- Uploads versioned JSON snapshots.
- Enforces RLS; the client never uses a service-role key.
- Restore fetches the latest valid snapshot.
- Restore is blocked unless the local database is empty.

## Local storage

- Receipt images live in `filesDir/receipts/` or `cacheDir` as appropriate.
- Room owns ledger data.
- DataStore owns the selected adult profile and simple preferences.
- No receipt image path is written to the backup payload.

## Error handling

- Camera denied: offer gallery/manual entry.
- Share unavailable: copy text and show a message.
- Export canceled: no error toast; leave data unchanged.
- Auth canceled: return to local mode; backup remains queued as local-only.
- Auth denied: show a clear unauthorized-account message.
- Backup failure: keep local data, set `ERROR`, schedule retry.
- Restore blocked: explain that local data must be exported or cleared first.
