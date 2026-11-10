package ph.salo.app.core.data

import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import ph.salo.app.core.database.AuditEventDao
import ph.salo.app.core.database.AuditEventEntity
import ph.salo.app.core.database.CoverageDao
import ph.salo.app.core.database.CoverageEntity
import ph.salo.app.core.database.OutingDao
import ph.salo.app.core.database.OutingEntity
import ph.salo.app.core.database.ReceiptDao
import ph.salo.app.core.database.ReceiptEntity
import ph.salo.app.core.database.ReceiptItemDao
import ph.salo.app.core.database.ReceiptItemEntity
import ph.salo.app.core.database.SaloDatabase
import ph.salo.app.core.database.ShareDao
import ph.salo.app.core.money.AdultRef
import ph.salo.app.core.money.AllocationInput
import ph.salo.app.core.money.AllocationResult
import ph.salo.app.core.money.MoneyAllocator
import ph.salo.app.core.money.ReceiptItemInput
import ph.salo.app.core.money.StudentRef
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

data class OutingDetails(
    val outing: OutingEntity,
    val receipt: ReceiptEntity?,
    val items: List<ReceiptItemEntity>,
    val coverage: Map<String, String>,
    val shares: List<ph.salo.app.core.database.ShareEntity>,
    val auditEvents: List<AuditEventEntity>
)

private data class DetailsPartial(
    val outing: OutingEntity?,
    val receipt: ReceiptEntity?,
    val items: List<ReceiptItemEntity>,
    val coverage: List<CoverageEntity>,
    val shares: List<ph.salo.app.core.database.ShareEntity>
)

/**
 * One-shot read of everything the History screen needs, in a fixed number of queries.
 * Previously each outing was re-read individually (six queries per outing) on every emission.
 */
data class HistoryAggregate(
    val totalByOuting: Map<String, Long>,
    val itemsByOuting: Map<String, List<ReceiptItemEntity>>,
    val coverageByOuting: Map<String, Map<String, String>>
)

data class DraftInput(
    val outingId: String,
    val receiptId: String,
    val date: String,
    val place: String?,
    val notes: String?,
    val payerAdultId: String,
    val createdByAdultId: String,
    val merchant: String?,
    val receiptDate: String?,
    val imagePath: String?,
    val totalCentavos: Long,
    val taxCentavos: Long,
    val serviceChargeCentavos: Long,
    val discountCentavos: Long,
    val ocrEngine: String?,
    val items: List<ReceiptItemEntity>,
    val coverage: Map<String, String>
)

@Singleton
class OutingRepository @Inject constructor(
    private val db: SaloDatabase,
    private val outingDao: OutingDao,
    private val receiptDao: ReceiptDao,
    private val itemDao: ReceiptItemDao,
    private val coverageDao: CoverageDao,
    private val shareDao: ShareDao,
    private val auditEventDao: AuditEventDao
) {
    fun observeFinalized(): Flow<List<OutingEntity>> = outingDao.observeFinalized()

    fun observeRecent(limit: Int = 5): Flow<List<OutingEntity>> =
        outingDao.observeFinalized().map { it.take(limit) }

    fun observeDetails(outingId: String): Flow<OutingDetails?> =
        combine(
            outingDao.observeById(outingId),
            receiptDao.observeByOuting(outingId),
            itemDao.observeByOuting(outingId),
            coverageDao.observeByOuting(outingId),
            shareDao.observeByOuting(outingId)
        ) { outing, receipt, items, coverage, shares ->
            DetailsPartial(outing, receipt, items, coverage, shares)
        }.combine(auditEventDao.observeByOuting(outingId)) { partial, audit ->
            partial.outing?.let { outing ->
                OutingDetails(
                    outing = outing,
                    receipt = partial.receipt,
                    items = partial.items,
                    coverage = partial.coverage.associate { row -> row.studentId to row.adultId },
                    shares = partial.shares,
                    auditEvents = audit
                )
            }
        }

    suspend fun getDetails(outingId: String): OutingDetails? {
        val outing = outingDao.getById(outingId) ?: return null
        return OutingDetails(
            outing = outing,
            receipt = receiptDao.getByOuting(outingId),
            items = itemDao.getByOuting(outingId),
            coverage = coverageDao.getByOuting(outingId).associate { it.studentId to it.adultId },
            shares = shareDao.getByOuting(outingId),
            auditEvents = auditEventDao.getByOuting(outingId)
        )
    }

    /**
     * History reads all receipts, items, and coverage in three queries instead of
     * re-reading every outing's details one by one.
     */
    suspend fun getHistoryAggregate(): HistoryAggregate {
        val receipts = receiptDao.getAll()
        val items = itemDao.getAll()
        val coverage = coverageDao.getAll()
        return HistoryAggregate(
            totalByOuting = receipts.associate { it.outingId to it.totalCentavos },
            itemsByOuting = items.groupBy { it.outingId },
            coverageByOuting = coverage
                .groupBy { it.outingId }
                .mapValues { (_, rows) -> rows.associate { it.studentId to it.adultId } }
        )
    }

    suspend fun createDraft(
        date: String,
        place: String?,
        notes: String?,
        createdByAdultId: String,
        payerAdultId: String
    ): Pair<String, String> {
        val outingId = UUID.randomUUID().toString()
        val receiptId = UUID.randomUUID().toString()
        val outing = OutingEntity(
            id = outingId,
            date = date,
            place = place?.trim()?.takeIf { it.isNotEmpty() },
            notes = notes?.trim()?.takeIf { it.isNotEmpty() },
            payerAdultId = payerAdultId,
            status = "DRAFT",
            createdByAdultId = createdByAdultId
        )
        val receipt = ReceiptEntity(
            id = receiptId,
            outingId = outingId,
            totalCentavos = 0
        )
        db.withTransaction {
            outingDao.upsert(outing)
            receiptDao.upsert(receipt)
        }
        return outingId to receiptId
    }

    suspend fun saveDraft(input: DraftInput) {
        val existing = outingDao.getById(input.outingId) ?: return
        db.withTransaction {
            outingDao.upsert(
                existing.copy(
                    date = input.date,
                    place = input.place?.trim()?.takeIf { it.isNotEmpty() },
                    notes = input.notes?.trim()?.takeIf { it.isNotEmpty() },
                    payerAdultId = input.payerAdultId
                )
            )
            receiptDao.upsert(
                ReceiptEntity(
                    id = input.receiptId,
                    outingId = input.outingId,
                    merchant = input.merchant?.trim()?.takeIf { it.isNotEmpty() },
                    receiptDate = input.receiptDate,
                    imagePath = input.imagePath,
                    totalCentavos = input.totalCentavos,
                    taxCentavos = input.taxCentavos,
                    serviceChargeCentavos = input.serviceChargeCentavos,
                    discountCentavos = input.discountCentavos,
                    ocrEngine = input.ocrEngine
                )
            )
            itemDao.deleteByOuting(input.outingId)
            itemDao.upsertAll(input.items)
            coverageDao.deleteByOuting(input.outingId)
            coverageDao.upsertAll(
                input.coverage.map { (studentId, adultId) ->
                    CoverageEntity(
                        id = UUID.randomUUID().toString(),
                        outingId = input.outingId,
                        studentId = studentId,
                        adultId = adultId
                    )
                }
            )
        }
    }

    suspend fun finalize(
        input: DraftInput,
        adults: List<AdultRef>,
        presentStudents: List<StudentRef>
    ): AllocationResult {
        val allocation = MoneyAllocator.allocate(
            AllocationInput(
                receiptTotalCentavos = input.totalCentavos,
                adults = adults,
                presentStudents = presentStudents,
                coverageByStudent = input.coverage,
                items = input.items.map { it.toInput() },
                taxCentavos = input.taxCentavos,
                serviceChargeCentavos = input.serviceChargeCentavos,
                discountCentavos = input.discountCentavos,
                payerId = input.payerAdultId
            )
        )

        db.withTransaction {
            saveDraftInternal(input)
            outingDao.updateStatus(
                id = input.outingId,
                status = "FINAL",
                finalizedAt = System.currentTimeMillis(),
                payerId = input.payerAdultId
            )
            shareDao.deleteByOuting(input.outingId)
            shareDao.upsertAll(allocation.shares.map { it.toEntity(input.outingId) })
        }
        return allocation
    }

    private suspend fun saveDraftInternal(input: DraftInput) {
        val existing = outingDao.getById(input.outingId) ?: return
        outingDao.upsert(
            existing.copy(
                date = input.date,
                place = input.place?.trim()?.takeIf { it.isNotEmpty() },
                notes = input.notes?.trim()?.takeIf { it.isNotEmpty() },
                payerAdultId = input.payerAdultId
            )
        )
        receiptDao.upsert(
            ReceiptEntity(
                id = input.receiptId,
                outingId = input.outingId,
                merchant = input.merchant?.trim()?.takeIf { it.isNotEmpty() },
                receiptDate = input.receiptDate,
                imagePath = input.imagePath,
                totalCentavos = input.totalCentavos,
                taxCentavos = input.taxCentavos,
                serviceChargeCentavos = input.serviceChargeCentavos,
                discountCentavos = input.discountCentavos,
                ocrEngine = input.ocrEngine
            )
        )
        itemDao.deleteByOuting(input.outingId)
        itemDao.upsertAll(input.items)
        coverageDao.deleteByOuting(input.outingId)
        coverageDao.upsertAll(
            input.coverage.map { (studentId, adultId) ->
                CoverageEntity(
                    id = UUID.randomUUID().toString(),
                    outingId = input.outingId,
                    studentId = studentId,
                    adultId = adultId
                )
            }
        )
    }

    suspend fun reopen(outingId: String, actorAdultId: String) {
        val details = getDetails(outingId) ?: return
        val before = buildJsonObject {
            put("status", details.outing.status)
            put("payerAdultId", details.outing.payerAdultId)
            put("totalCentavos", details.receipt?.totalCentavos ?: 0)
        }.toString()
        val after = buildJsonObject {
            put("status", "DRAFT")
            put("payerAdultId", details.outing.payerAdultId)
            put("totalCentavos", details.receipt?.totalCentavos ?: 0)
        }.toString()
        db.withTransaction {
            outingDao.updateStatus(outingId, "DRAFT", null, details.outing.payerAdultId)
            shareDao.deleteByOuting(outingId)
            auditEventDao.insert(
                AuditEventEntity(
                    id = UUID.randomUUID().toString(),
                    outingId = outingId,
                    actorAdultId = actorAdultId,
                    action = "REOPEN",
                    beforeJson = before,
                    afterJson = after
                )
            )
        }
    }

    suspend fun delete(outingId: String) {
        outingDao.softDelete(outingId, System.currentTimeMillis())
    }

    suspend fun getFinalizedOutings(): List<OutingEntity> = outingDao.getFinalized()
}
