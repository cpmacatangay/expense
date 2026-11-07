package ph.salo.app.core.backup

import androidx.room.withTransaction
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.AdultProfileEntity
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
import ph.salo.app.core.database.SettlementDao
import ph.salo.app.core.database.SettlementEntity
import ph.salo.app.core.database.ShareDao
import ph.salo.app.core.database.ShareEntity
import ph.salo.app.core.database.StudentDao
import ph.salo.app.core.database.StudentEntity
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonNull

data class RestoreResult(
    val adults: Int,
    val students: Int,
    val outings: Int
)

@Singleton
class SnapshotImporter @Inject constructor(
    private val db: SaloDatabase,
    private val adultDao: AdultProfileDao,
    private val studentDao: StudentDao,
    private val outingDao: OutingDao,
    private val receiptDao: ReceiptDao,
    private val itemDao: ReceiptItemDao,
    private val coverageDao: CoverageDao,
    private val shareDao: ShareDao,
    private val settlementDao: SettlementDao,
    private val auditEventDao: AuditEventDao
) {
    suspend fun import(payload: String): RestoreResult {
        val root = Json.parseToJsonElement(payload).jsonObject
        val schemaVersion = root["schemaVersion"]?.jsonPrimitive?.int ?: 0
        require(schemaVersion == SnapshotSerializer.SCHEMA_VERSION) {
            "This backup uses schema version $schemaVersion; this app supports " +
                "${SnapshotSerializer.SCHEMA_VERSION}."
        }
        require(studentDao.getAll().isEmpty()) {
            "Restore is only allowed when the local ledger is empty."
        }
        require(outingDao.getAll().isEmpty()) {
            "Restore is only allowed when the local database is empty."
        }
        require(settlementDao.getAll().isEmpty()) {
            "Restore is only allowed when the local database is empty."
        }

        val adults = root.array("adults").map { it.jsonObject.toAdult() }
        require(adults.size == 4) {
            "A Salo backup must contain exactly four adult profiles."
        }
        val students = root.array("students").map { it.jsonObject.toStudent() }
        val outings = root.array("outings").map { it.jsonObject.toOuting() }
        val receipts = root.array("receipts").map { it.jsonObject.toReceipt() }
        val items = root.array("items").map { it.jsonObject.toItem() }
        val coverage = root.array("coverage").map { it.jsonObject.toCoverage() }
        val shares = root.array("shares").map { it.jsonObject.toShare() }
        val settlements = root.array("settlements").map { it.jsonObject.toSettlement() }
        val auditEvents = root.array("auditEvents").map { it.jsonObject.toAuditEvent() }

        db.withTransaction {
            adultDao.deleteAll()
            adultDao.upsertAll(adults)
            students.forEach { studentDao.upsert(it) }
            outings.forEach { outingDao.upsert(it) }
            receipts.forEach { receiptDao.upsert(it) }
            itemDao.upsertAll(items)
            coverageDao.upsertAll(coverage)
            shareDao.upsertAll(shares)
            settlements.forEach { settlementDao.insert(it) }
            auditEvents.forEach { auditEventDao.insert(it) }
        }
        return RestoreResult(
            adults = adults.size,
            students = students.size,
            outings = outings.size
        )
    }

    private fun JsonObject.array(name: String): JsonArray =
        this[name]?.jsonArray ?: JsonArray(emptyList())

    private fun JsonObject.string(name: String): String =
        this[name]?.jsonPrimitive?.content ?: ""

    private fun JsonObject.nullableString(name: String): String? {
        val element = this[name] ?: return null
        return if (element is JsonNull) null else element.jsonPrimitive.content
    }

    private fun JsonObject.long(name: String): Long =
        this[name]?.jsonPrimitive?.long ?: 0L

    private fun JsonObject.int(name: String): Int =
        this[name]?.jsonPrimitive?.int ?: 0

    private fun JsonObject.boolean(name: String): Boolean =
        this[name]?.jsonPrimitive?.boolean ?: false

    private fun JsonObject.toAdult() = AdultProfileEntity(
        id = string("id"),
        name = string("name"),
        order = int("order"),
        email = nullableString("email"),
        isOwner = boolean("isOwner"),
        createdAt = long("createdAt")
    )

    private fun JsonObject.toStudent() = StudentEntity(
        id = string("id"),
        name = string("name"),
        notes = nullableString("notes"),
        active = boolean("active"),
        createdAt = long("createdAt"),
        archivedAt = nullableLong("archivedAt")
    )

    private fun JsonObject.toOuting() = OutingEntity(
        id = string("id"),
        date = string("date"),
        place = nullableString("place"),
        notes = nullableString("notes"),
        payerAdultId = string("payerAdultId"),
        status = string("status"),
        createdByAdultId = string("createdByAdultId"),
        createdAt = long("createdAt"),
        finalizedAt = nullableLong("finalizedAt"),
        deletedAt = nullableLong("deletedAt")
    )

    private fun JsonObject.toReceipt() = ReceiptEntity(
        id = string("id"),
        outingId = string("outingId"),
        merchant = nullableString("merchant"),
        receiptDate = nullableString("receiptDate"),
        imagePath = null,
        totalCentavos = long("totalCentavos"),
        taxCentavos = long("taxCentavos"),
        serviceChargeCentavos = long("serviceChargeCentavos"),
        discountCentavos = long("discountCentavos"),
        ocrEngine = nullableString("ocrEngine"),
        createdAt = long("createdAt")
    )

    private fun JsonObject.toItem() = ReceiptItemEntity(
        id = string("id"),
        outingId = string("outingId"),
        receiptId = string("receiptId"),
        name = string("name"),
        quantity = int("quantity"),
        unitAmountCentavos = long("unitAmountCentavos"),
        amountCentavos = long("amountCentavos"),
        assignmentType = string("assignmentType"),
        assignedAdultId = nullableString("assignedAdultId"),
        assignedStudentId = nullableString("assignedStudentId"),
        sortOrder = int("sortOrder"),
        createdAt = long("createdAt"),
        updatedAt = long("updatedAt")
    )

    private fun JsonObject.toCoverage() = CoverageEntity(
        id = string("id"),
        outingId = string("outingId"),
        studentId = string("studentId"),
        adultId = string("adultId"),
        createdAt = long("createdAt")
    )

    private fun JsonObject.toShare() = ShareEntity(
        id = string("id"),
        outingId = string("outingId"),
        adultId = string("adultId"),
        ownItemsCentavos = long("ownItemsCentavos"),
        studentItemsCentavos = long("studentItemsCentavos"),
        sharedHeadCentavos = long("sharedHeadCentavos"),
        coveredStudentSharedCentavos = long("coveredStudentSharedCentavos"),
        adjustmentCentavos = long("adjustmentCentavos"),
        gapCentavos = long("gapCentavos"),
        totalCentavos = long("totalCentavos"),
        isPayer = boolean("isPayer"),
        createdAt = long("createdAt")
    )

    private fun JsonObject.toSettlement() = SettlementEntity(
        id = string("id"),
        fromAdultId = string("fromAdultId"),
        toAdultId = string("toAdultId"),
        amountCentavos = long("amountCentavos"),
        date = string("date"),
        note = nullableString("note"),
        voidedAt = nullableLong("voidedAt"),
        createdAt = long("createdAt")
    )

    private fun JsonObject.toAuditEvent() = AuditEventEntity(
        id = string("id"),
        outingId = string("outingId"),
        actorAdultId = string("actorAdultId"),
        action = string("action"),
        beforeJson = string("beforeJson"),
        afterJson = string("afterJson"),
        createdAt = long("createdAt")
    )

    private fun JsonObject.nullableLong(name: String): Long? {
        val element = this[name] ?: return null
        return if (element is JsonNull) null else element.jsonPrimitive.long
    }
}