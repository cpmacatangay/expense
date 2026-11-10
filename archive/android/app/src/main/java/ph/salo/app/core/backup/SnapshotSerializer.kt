package ph.salo.app.core.backup

import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.AuditEventDao
import ph.salo.app.core.database.CoverageDao
import ph.salo.app.core.database.OutingDao
import ph.salo.app.core.database.ReceiptDao
import ph.salo.app.core.database.ReceiptItemDao
import ph.salo.app.core.database.SettlementDao
import ph.salo.app.core.database.ShareDao
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.jsonNull

@Singleton
class SnapshotSerializer @Inject constructor(
    private val adultDao: AdultProfileDao,
    private val studentDao: ph.salo.app.core.database.StudentDao,
    private val outingDao: OutingDao,
    private val receiptDao: ReceiptDao,
    private val itemDao: ReceiptItemDao,
    private val coverageDao: CoverageDao,
    private val shareDao: ShareDao,
    private val settlementDao: SettlementDao,
    private val auditEventDao: AuditEventDao
) {
    suspend fun build(deviceId: String): JsonObject {
        val adults = adultDao.getAll()
        val students = studentDao.getAll()
        val outings = outingDao.getAll()
        val receipts = receiptDao.getAll()
        val items = itemDao.getAll()
        val coverage = coverageDao.getAll()
        val shares = shareDao.getAll()
        val settlements = settlementDao.getAll()
        val auditEvents = auditEventDao.getAll()

        return buildJsonObject {
            put("schemaVersion", SCHEMA_VERSION)
            put("exportedAt", System.currentTimeMillis())
            put("deviceId", deviceId)
            put("ledger", buildJsonObject {
                put("name", "Salo")
                put("currency", "PHP")
            })
            putJsonArray("adults") {
                adults.forEach { adult ->
                    addJsonObject {
                        put("id", adult.id)
                        put("name", adult.name)
                        put("order", adult.order)
                        put("email", adult.email ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("isOwner", adult.isOwner)
                        put("createdAt", adult.createdAt)
                    }
                }
            }
            putJsonArray("students") {
                students.forEach { student ->
                    addJsonObject {
                        put("id", student.id)
                        put("name", student.name)
                        put("notes", student.notes ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("active", student.active)
                        put("createdAt", student.createdAt)
                        put("archivedAt", student.archivedAt ?.let { JsonPrimitive(it) } ?: JsonNull)
                    }
                }
            }
            putJsonArray("outings") {
                outings.forEach { outing ->
                    addJsonObject {
                        put("id", outing.id)
                        put("date", outing.date)
                        put("place", outing.place ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("notes", outing.notes ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("payerAdultId", outing.payerAdultId)
                        put("status", outing.status)
                        put("createdByAdultId", outing.createdByAdultId)
                        put("createdAt", outing.createdAt)
                        put("finalizedAt", outing.finalizedAt ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("deletedAt", outing.deletedAt ?.let { JsonPrimitive(it) } ?: JsonNull)
                    }
                }
            }
            putJsonArray("receipts") {
                receipts.forEach { receipt ->
                    addJsonObject {
                        put("id", receipt.id)
                        put("outingId", receipt.outingId)
                        put("merchant", receipt.merchant ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("receiptDate", receipt.receiptDate ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("totalCentavos", receipt.totalCentavos)
                        put("taxCentavos", receipt.taxCentavos)
                        put("serviceChargeCentavos", receipt.serviceChargeCentavos)
                        put("discountCentavos", receipt.discountCentavos)
                        put("ocrEngine", receipt.ocrEngine ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("createdAt", receipt.createdAt)
                    }
                }
            }
            putJsonArray("items") {
                items.forEach { item ->
                    addJsonObject {
                        put("id", item.id)
                        put("outingId", item.outingId)
                        put("receiptId", item.receiptId)
                        put("name", item.name)
                        put("quantity", item.quantity)
                        put("unitAmountCentavos", item.unitAmountCentavos)
                        put("amountCentavos", item.amountCentavos)
                        put("assignmentType", item.assignmentType)
                        put("assignedAdultId", item.assignedAdultId ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("assignedStudentId", item.assignedStudentId ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("sortOrder", item.sortOrder)
                        put("createdAt", item.createdAt)
                        put("updatedAt", item.updatedAt)
                    }
                }
            }
            putJsonArray("coverage") {
                coverage.forEach { row ->
                    addJsonObject {
                        put("id", row.id)
                        put("outingId", row.outingId)
                        put("studentId", row.studentId)
                        put("adultId", row.adultId)
                        put("createdAt", row.createdAt)
                    }
                }
            }
            putJsonArray("shares") {
                shares.forEach { share ->
                    addJsonObject {
                        put("id", share.id)
                        put("outingId", share.outingId)
                        put("adultId", share.adultId)
                        put("ownItemsCentavos", share.ownItemsCentavos)
                        put("studentItemsCentavos", share.studentItemsCentavos)
                        put("sharedHeadCentavos", share.sharedHeadCentavos)
                        put("coveredStudentSharedCentavos", share.coveredStudentSharedCentavos)
                        put("adjustmentCentavos", share.adjustmentCentavos)
                        put("gapCentavos", share.gapCentavos)
                        put("totalCentavos", share.totalCentavos)
                        put("isPayer", share.isPayer)
                        put("createdAt", share.createdAt)
                    }
                }
            }
            putJsonArray("settlements") {
                settlements.forEach { settlement ->
                    addJsonObject {
                        put("id", settlement.id)
                        put("fromAdultId", settlement.fromAdultId)
                        put("toAdultId", settlement.toAdultId)
                        put("amountCentavos", settlement.amountCentavos)
                        put("date", settlement.date)
                        put("note", settlement.note ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("voidedAt", settlement.voidedAt ?.let { JsonPrimitive(it) } ?: JsonNull)
                        put("createdAt", settlement.createdAt)
                    }
                }
            }
            putJsonArray("auditEvents") {
                auditEvents.forEach { event ->
                    addJsonObject {
                        put("id", event.id)
                        put("outingId", event.outingId)
                        put("actorAdultId", event.actorAdultId)
                        put("action", event.action)
                        put("beforeJson", event.beforeJson)
                        put("afterJson", event.afterJson)
                        put("createdAt", event.createdAt)
                    }
                }
            }
        }
    }

    companion object {
        const val SCHEMA_VERSION = 1
    }
}
