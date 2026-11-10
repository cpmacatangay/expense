package ph.salo.app.core.database

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "adult_profiles")
data class AdultProfileEntity(
    @PrimaryKey val id: String,
    val name: String,
    val order: Int,
    val email: String? = null,
    val isOwner: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "students")
data class StudentEntity(
    @PrimaryKey val id: String,
    val name: String,
    val notes: String? = null,
    val active: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val archivedAt: Long? = null
)

@Entity(tableName = "outings", indices = [Index("status"), Index("date")])
data class OutingEntity(
    @PrimaryKey val id: String,
    val date: String,
    val place: String? = null,
    val notes: String? = null,
    val payerAdultId: String,
    val status: String,
    val createdByAdultId: String,
    val createdAt: Long = System.currentTimeMillis(),
    val finalizedAt: Long? = null,
    val deletedAt: Long? = null
)

@Entity(tableName = "receipts", indices = [Index("outingId", unique = true)])
data class ReceiptEntity(
    @PrimaryKey val id: String,
    val outingId: String,
    val merchant: String? = null,
    val receiptDate: String? = null,
    val imagePath: String? = null,
    val totalCentavos: Long,
    val taxCentavos: Long = 0,
    val serviceChargeCentavos: Long = 0,
    val discountCentavos: Long = 0,
    val ocrEngine: String? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "receipt_items", indices = [Index("outingId"), Index("receiptId")])
data class ReceiptItemEntity(
    @PrimaryKey val id: String,
    val outingId: String,
    val receiptId: String,
    val name: String,
    val quantity: Int,
    val unitAmountCentavos: Long,
    val amountCentavos: Long,
    val assignmentType: String,
    val assignedAdultId: String? = null,
    val assignedStudentId: String? = null,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "coverage",
    indices = [Index("outingId"), Index(value = ["outingId", "studentId"], unique = true)]
)
data class CoverageEntity(
    @PrimaryKey val id: String,
    val outingId: String,
    val studentId: String,
    val adultId: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "shares", indices = [Index("outingId"), Index("adultId")])
data class ShareEntity(
    @PrimaryKey val id: String,
    val outingId: String,
    val adultId: String,
    val ownItemsCentavos: Long,
    val studentItemsCentavos: Long,
    val sharedHeadCentavos: Long,
    val coveredStudentSharedCentavos: Long,
    val adjustmentCentavos: Long,
    val gapCentavos: Long,
    val totalCentavos: Long,
    val isPayer: Boolean,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "settlements", indices = [Index("fromAdultId"), Index("toAdultId")])
data class SettlementEntity(
    @PrimaryKey val id: String,
    val fromAdultId: String,
    val toAdultId: String,
    val amountCentavos: Long,
    val date: String,
    val note: String? = null,
    val voidedAt: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "audit_events", indices = [Index("outingId")])
data class AuditEventEntity(
    @PrimaryKey val id: String,
    val outingId: String,
    val actorAdultId: String,
    val action: String,
    val beforeJson: String,
    val afterJson: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "backup_state")
data class BackupStateEntity(
    @PrimaryKey val id: Int = 1,
    val status: String = "LOCAL_ONLY",
    val lastSuccessAt: Long? = null,
    val lastAttemptAt: Long? = null,
    val lastSnapshotId: String? = null,
    val lastError: String? = null,
    val updatedAt: Long = System.currentTimeMillis()
)
