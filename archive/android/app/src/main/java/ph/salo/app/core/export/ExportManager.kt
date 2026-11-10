package ph.salo.app.core.export

import ph.salo.app.core.backup.SnapshotSerializer
import ph.salo.app.core.database.AdultProfileDao
import ph.salo.app.core.database.OutingDao
import ph.salo.app.core.database.ReceiptDao
import ph.salo.app.core.database.ReceiptItemDao
import ph.salo.app.core.database.SettlementDao
import ph.salo.app.core.database.ShareDao
import ph.salo.app.core.database.StudentDao
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ExportManager @Inject constructor(
    private val serializer: SnapshotSerializer,
    private val adultDao: AdultProfileDao,
    private val studentDao: StudentDao,
    private val outingDao: OutingDao,
    private val receiptDao: ReceiptDao,
    private val itemDao: ReceiptItemDao,
    private val shareDao: ShareDao,
    private val settlementDao: SettlementDao
) {
    suspend fun json(): String = serializer.build(deviceId = "export").toString()

    suspend fun csv(): String {
        val adults = adultDao.getAll().associateBy { it.id }
        val students = studentDao.getAll().associateBy { it.id }
        val outings = outingDao.getAll().associateBy { it.id }
        val receipts = receiptDao.getAll().associateBy { it.outingId }
        val items = itemDao.getAll()
        val shares = shareDao.getAll()
        val settlements = settlementDao.getAll()

        val rows = mutableListOf<List<String>>()
        rows += listOf("type", "outing_id", "date", "place", "payer", "adult", "student", "item", "quantity", "amount_centavos", "assignment", "total_centavos", "note")

        outings.values.forEach { outing ->
            val receipt = receipts[outing.id]
            rows += listOf(
                "outing",
                outing.id,
                outing.date,
                outing.place.orEmpty(),
                adults[outing.payerAdultId]?.name.orEmpty(),
                "",
                "",
                "",
                "",
                (receipt?.totalCentavos ?: 0).toString(),
                outing.status,
                (receipt?.totalCentavos ?: 0).toString(),
                outing.notes.orEmpty()
            )
        }

        items.forEach { item ->
            val outing = outings[item.outingId]
            rows += listOf(
                "item",
                item.outingId,
                outing?.date.orEmpty(),
                outing?.place.orEmpty(),
                "",
                item.assignedAdultId?.let { adults[it]?.name }.orEmpty(),
                item.assignedStudentId?.let { students[it]?.name }.orEmpty(),
                item.name,
                item.quantity.toString(),
                item.amountCentavos.toString(),
                item.assignmentType,
                "",
                ""
            )
        }

        shares.forEach { share ->
            val outing = outings[share.outingId]
            rows += listOf(
                "share",
                share.outingId,
                outing?.date.orEmpty(),
                outing?.place.orEmpty(),
                "",
                adults[share.adultId]?.name.orEmpty(),
                "",
                "",
                "",
                "",
                if (share.isPayer) "PAYER" else "",
                share.totalCentavos.toString(),
                ""
            )
        }

        settlements.forEach { settlement ->
            rows += listOf(
                "settlement",
                "",
                settlement.date,
                "",
                "",
                adults[settlement.fromAdultId]?.name.orEmpty(),
                adults[settlement.toAdultId]?.name.orEmpty(),
                "",
                "",
                settlement.amountCentavos.toString(),
                if (settlement.voidedAt != null) "VOIDED" else "PAID",
                "",
                settlement.note.orEmpty()
            )
        }

        studentDao.getAll().forEach { student ->
            rows += listOf(
                "student",
                "",
                "",
                "",
                "",
                "",
                student.name,
                "",
                "",
                "",
                if (student.active) "ACTIVE" else "ARCHIVED",
                "",
                student.notes.orEmpty()
            )
        }

        return rows.joinToString("\n") { row -> row.joinToString(",") { escape(it) } }
    }

    private fun escape(value: String): String {
        if (value.contains(',') || value.contains('"') || value.contains('\n')) {
            return "\"" + value.replace("\"", "\"\"") + "\""
        }
        return value
    }
}
