package ph.salo.app.core.backup

import kotlinx.coroutines.flow.Flow
import ph.salo.app.core.database.BackupStateDao
import ph.salo.app.core.database.BackupStateEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BackupStateRepository @Inject constructor(
    private val dao: BackupStateDao
) {
    fun observe(): Flow<BackupStateEntity?> = dao.observe()

    suspend fun get(): BackupStateEntity = dao.get() ?: BackupStateEntity()

    suspend fun markBackingUp() {
        val current = get()
        dao.upsert(
            current.copy(
                status = "BACKING_UP",
                lastAttemptAt = System.currentTimeMillis(),
                lastError = null,
                updatedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun markSuccess(snapshotId: String?) {
        val current = get()
        val now = System.currentTimeMillis()
        dao.upsert(
            current.copy(
                status = "BACKED_UP",
                lastSuccessAt = now,
                lastSnapshotId = snapshotId,
                lastError = null,
                updatedAt = now
            )
        )
    }

    suspend fun markError(message: String) {
        val current = get()
        dao.upsert(
            current.copy(
                status = "ERROR",
                lastError = message,
                updatedAt = System.currentTimeMillis()
            )
        )
    }

    suspend fun markLocalOnly(message: String? = null) {
        val current = get()
        dao.upsert(
            current.copy(
                status = "LOCAL_ONLY",
                lastError = message,
                updatedAt = System.currentTimeMillis()
            )
        )
    }
}
