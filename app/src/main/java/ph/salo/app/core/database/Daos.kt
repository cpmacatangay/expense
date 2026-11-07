package ph.salo.app.core.database

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface AdultProfileDao {
    @Query("SELECT * FROM adult_profiles ORDER BY `order` ASC")
    fun observeAll(): Flow<List<AdultProfileEntity>>

    @Query("SELECT * FROM adult_profiles ORDER BY `order` ASC")
    suspend fun getAll(): List<AdultProfileEntity>

    @Query("SELECT * FROM adult_profiles WHERE id = :id")
    suspend fun getById(id: String): AdultProfileEntity?

    @Upsert
    suspend fun upsert(profile: AdultProfileEntity)

    @Upsert
    suspend fun upsertAll(profiles: List<AdultProfileEntity>)

    @Query("SELECT COUNT(*) FROM adult_profiles")
    suspend fun count(): Int

    @Query("DELETE FROM adult_profiles")
    suspend fun deleteAll()
}

@Dao
interface StudentDao {
    @Query("SELECT * FROM students WHERE active = 1 ORDER BY name COLLATE NOCASE ASC")
    fun observeActive(): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students ORDER BY active DESC, name COLLATE NOCASE ASC")
    fun observeAll(): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students WHERE active = 1 ORDER BY name COLLATE NOCASE ASC")
    suspend fun getActive(): List<StudentEntity>

    @Query("SELECT * FROM students ORDER BY active DESC, name COLLATE NOCASE ASC")
    suspend fun getAll(): List<StudentEntity>

    @Query("SELECT * FROM students WHERE id = :id")
    suspend fun getById(id: String): StudentEntity?

    @Upsert
    suspend fun upsert(student: StudentEntity)

    @Query("UPDATE students SET active = :active, archivedAt = :archivedAt WHERE id = :id")
    suspend fun setActive(id: String, active: Boolean, archivedAt: Long?)

    @Query("SELECT COUNT(*) FROM students WHERE active = 1")
    suspend fun countActive(): Int
}

@Dao
interface OutingDao {
    @Query("SELECT * FROM outings WHERE status = 'FINAL' AND deletedAt IS NULL ORDER BY date DESC, createdAt DESC")
    fun observeFinalized(): Flow<List<OutingEntity>>

    @Query("SELECT * FROM outings WHERE deletedAt IS NULL ORDER BY date DESC, createdAt DESC")
    fun observeAll(): Flow<List<OutingEntity>>

    @Query("SELECT * FROM outings WHERE id = :id")
    fun observeById(id: String): Flow<OutingEntity?>

    @Query("SELECT * FROM outings WHERE id = :id")
    suspend fun getById(id: String): OutingEntity?

    @Query("SELECT * FROM outings WHERE status = 'FINAL' AND deletedAt IS NULL ORDER BY date DESC, createdAt DESC")
    suspend fun getFinalized(): List<OutingEntity>

    @Query("SELECT * FROM outings WHERE deletedAt IS NULL ORDER BY date DESC, createdAt DESC")
    suspend fun getAll(): List<OutingEntity>

    @Upsert
    suspend fun upsert(outing: OutingEntity)

    @Query("UPDATE outings SET status = :status, finalizedAt = :finalizedAt, payerAdultId = :payerId WHERE id = :id")
    suspend fun updateStatus(id: String, status: String, finalizedAt: Long?, payerId: String)

    @Query("UPDATE outings SET deletedAt = :deletedAt WHERE id = :id")
    suspend fun softDelete(id: String, deletedAt: Long)
}

@Dao
interface ReceiptDao {
    @Query("SELECT * FROM receipts WHERE outingId = :outingId LIMIT 1")
    fun observeByOuting(outingId: String): Flow<ReceiptEntity?>

    @Query("SELECT * FROM receipts WHERE outingId = :outingId LIMIT 1")
    suspend fun getByOuting(outingId: String): ReceiptEntity?

    @Query("SELECT * FROM receipts ORDER BY createdAt DESC")
    suspend fun getAll(): List<ReceiptEntity>

    @Upsert
    suspend fun upsert(receipt: ReceiptEntity)

    @Query("DELETE FROM receipts WHERE outingId = :outingId")
    suspend fun deleteByOuting(outingId: String)
}

@Dao
interface ReceiptItemDao {
    @Query("SELECT * FROM receipt_items WHERE outingId = :outingId ORDER BY sortOrder ASC, createdAt ASC")
    fun observeByOuting(outingId: String): Flow<List<ReceiptItemEntity>>

    @Query("SELECT * FROM receipt_items WHERE outingId = :outingId ORDER BY sortOrder ASC, createdAt ASC")
    suspend fun getByOuting(outingId: String): List<ReceiptItemEntity>

    @Query("SELECT * FROM receipt_items ORDER BY outingId, sortOrder")
    suspend fun getAll(): List<ReceiptItemEntity>

    @Upsert
    suspend fun upsert(item: ReceiptItemEntity)

    @Upsert
    suspend fun upsertAll(items: List<ReceiptItemEntity>)

    @Query("DELETE FROM receipt_items WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM receipt_items WHERE outingId = :outingId")
    suspend fun deleteByOuting(outingId: String)
}

@Dao
interface CoverageDao {
    @Query("SELECT * FROM coverage WHERE outingId = :outingId")
    fun observeByOuting(outingId: String): Flow<List<CoverageEntity>>

    @Query("SELECT * FROM coverage WHERE outingId = :outingId")
    suspend fun getByOuting(outingId: String): List<CoverageEntity>

    @Query("SELECT * FROM coverage ORDER BY outingId")
    suspend fun getAll(): List<CoverageEntity>

    @Upsert
    suspend fun upsertAll(rows: List<CoverageEntity>)

    @Query("DELETE FROM coverage WHERE outingId = :outingId")
    suspend fun deleteByOuting(outingId: String)
}

@Dao
interface ShareDao {
    @Query("SELECT * FROM shares WHERE outingId = :outingId")
    fun observeByOuting(outingId: String): Flow<List<ShareEntity>>

    @Query("SELECT * FROM shares WHERE outingId = :outingId")
    suspend fun getByOuting(outingId: String): List<ShareEntity>

    @Query("SELECT * FROM shares ORDER BY outingId, adultId")
    suspend fun getAll(): List<ShareEntity>

    @Query("SELECT * FROM shares ORDER BY outingId, adultId")
    fun observeAll(): Flow<List<ShareEntity>>

    @Upsert
    suspend fun upsertAll(shares: List<ShareEntity>)

    @Query("DELETE FROM shares WHERE outingId = :outingId")
    suspend fun deleteByOuting(outingId: String)
}

@Dao
interface SettlementDao {
    @Query("SELECT * FROM settlements ORDER BY date DESC, createdAt DESC")
    fun observeAll(): Flow<List<SettlementEntity>>

    @Query("SELECT * FROM settlements ORDER BY date DESC, createdAt DESC")
    suspend fun getAll(): List<SettlementEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(settlement: SettlementEntity)

    @Query("UPDATE settlements SET voidedAt = :voidedAt WHERE id = :id")
    suspend fun markVoided(id: String, voidedAt: Long)
}

@Dao
interface AuditEventDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(event: AuditEventEntity)

    @Query("SELECT * FROM audit_events WHERE outingId = :outingId ORDER BY createdAt DESC")
    suspend fun getByOuting(outingId: String): List<AuditEventEntity>

    @Query("SELECT * FROM audit_events WHERE outingId = :outingId ORDER BY createdAt DESC")
    fun observeByOuting(outingId: String): Flow<List<AuditEventEntity>>

    @Query("SELECT * FROM audit_events ORDER BY createdAt DESC")
    suspend fun getAll(): List<AuditEventEntity>
}

@Dao
interface BackupStateDao {
    @Query("SELECT * FROM backup_state WHERE id = 1")
    fun observe(): Flow<BackupStateEntity?>

    @Query("SELECT * FROM backup_state WHERE id = 1")
    suspend fun get(): BackupStateEntity?

    @Upsert
    suspend fun upsert(state: BackupStateEntity)
}
