package ph.salo.app.core.recap

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import android.os.Environment
import android.provider.MediaStore
import ph.salo.app.core.data.OutingDetails
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.core.money.Transfer
import ph.salo.app.core.money.formatPeso
import java.io.File

data class RecapAdult(
    val id: String,
    val name: String,
    val totalCentavos: Long,
    val ownItemsCentavos: Long,
    val studentItemsCentavos: Long,
    val sharedCentavos: Long,
    val adjustmentCentavos: Long,
    val gapCentavos: Long,
    val coveredStudents: List<String>
)

data class RecapData(
    val date: String,
    val place: String?,
    val totalCentavos: Long,
    val itemCount: Int,
    val sharedItemCount: Int,
    val adults: List<RecapAdult>,
    val payerName: String,
    val transfers: List<Transfer>,
    val adultNames: Map<String, String>
)

object RecapBuilder {
    fun build(
        details: OutingDetails,
        adults: List<AdultProfileEntity>,
        students: List<StudentEntity>,
        transfers: List<Transfer>
    ): RecapData {
        val adultById = adults.associateBy { it.id }
        val studentById = students.associateBy { it.id }
        val coveredByAdult = details.coverage.entries
            .groupBy({ it.value }, { studentById[it.key]?.name ?: "Student" })
        val shareByAdult = details.shares.associateBy { it.adultId }
        val recapAdults = adults.map { adult ->
            val share = shareByAdult[adult.id]
            RecapAdult(
                id = adult.id,
                name = adult.name,
                totalCentavos = share?.totalCentavos ?: 0,
                ownItemsCentavos = share?.ownItemsCentavos ?: 0,
                studentItemsCentavos = share?.studentItemsCentavos ?: 0,
                sharedCentavos = (share?.sharedHeadCentavos ?: 0) +
                    (share?.coveredStudentSharedCentavos ?: 0),
                adjustmentCentavos = share?.adjustmentCentavos ?: 0,
                gapCentavos = share?.gapCentavos ?: 0,
                coveredStudents = coveredByAdult[adult.id].orEmpty()
            )
        }
        return RecapData(
            date = details.outing.date,
            place = details.outing.place,
            totalCentavos = details.receipt?.totalCentavos ?: 0,
            itemCount = details.items.size,
            sharedItemCount = details.items.count { it.assignmentType == "SHARED" },
            adults = recapAdults,
            payerName = adultById[details.outing.payerAdultId]?.name ?: "—",
            transfers = transfers,
            adultNames = adults.associate { it.id to it.name }
        )
    }
}

object RecapTextBuilder {
    fun build(data: RecapData): String {
        val builder = StringBuilder()
        builder.appendLine("Salo — ${data.place?.takeIf { it.isNotBlank() } ?: "Meal"} — ${data.date}")
        builder.appendLine()
        builder.appendLine("Total: ${formatPeso(data.totalCentavos)}")
        builder.appendLine("Items: ${data.itemCount} · Shared: ${data.sharedItemCount}")
        builder.appendLine()
        data.adults.forEach { adult ->
            builder.appendLine("${adult.name} — ${formatPeso(adult.totalCentavos)}")
            builder.appendLine("  Own: ${formatPeso(adult.ownItemsCentavos)}")
            builder.appendLine("  Students: ${formatPeso(adult.studentItemsCentavos)}")
            if (adult.coveredStudents.isNotEmpty()) {
                builder.appendLine("  Covered: ${adult.coveredStudents.joinToString(", ")}")
            }
            builder.appendLine("  Shared: ${formatPeso(adult.sharedCentavos)}")
            if (adult.adjustmentCentavos != 0L) {
                builder.appendLine("  Adjustments: ${formatPeso(adult.adjustmentCentavos)}")
            }
            if (adult.gapCentavos != 0L) {
                builder.appendLine("  Total gap: ${formatPeso(adult.gapCentavos)}")
            }
        }
        builder.appendLine("Payer: ${data.payerName}")
        if (data.transfers.isEmpty()) {
            builder.appendLine("All settled.")
        } else {
            data.transfers.forEach { transfer ->
                val from = data.adultNames[transfer.fromAdultId] ?: "—"
                val to = data.adultNames[transfer.toAdultId] ?: "—"
                builder.appendLine("$from → $to ${formatPeso(transfer.amountCentavos)}")
            }
        }
        return builder.toString().trim()
    }
}

object RecapImageRenderer {
    fun render(context: Context, data: RecapData): File {
        val width = 1080
        val height = 1350
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val cream = Color.rgb(247, 251, 244)
        val green = Color.rgb(31, 92, 69)
        val ink = Color.rgb(25, 28, 25)
        val muted = Color.rgb(65, 73, 66)
        val accent = Color.rgb(201, 111, 74)
        canvas.drawColor(cream)

        val sans = Typeface.create("sans-serif", Typeface.NORMAL)
        val sansBold = Typeface.create("sans-serif", Typeface.BOLD)
        val mono = Typeface.create("monospace", Typeface.NORMAL)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = ink
            typeface = sans
            textSize = 30f
        }

        fun text(value: String, x: Float, y: Float, size: Float, typeface: Typeface = sans, color: Int = ink) {
            paint.color = color
            paint.typeface = typeface
            paint.textSize = size
            canvas.drawText(value, x, y, paint)
        }

        fun rule(y: Float) {
            paint.color = Color.argb(70, 113, 121, 112)
            paint.strokeWidth = 2f
            paint.pathEffect = android.graphics.DashPathEffect(floatArrayOf(12f, 12f), 0f)
            canvas.drawLine(72f, y, width - 72f, y, paint)
            paint.pathEffect = null
        }

        text("Salo", 72f, 112f, 62f, sansBold, green)
        text("Shared meal ledger", 72f, 152f, 24f, sans, muted)
        text(data.place?.takeIf { it.isNotBlank() } ?: "Meal", 72f, 230f, 40f, sansBold)
        text("${data.date} · Paid by ${data.payerName}", 72f, 272f, 26f, sans, muted)
        rule(304f)

        text("TOTAL", 72f, 366f, 24f, sans, muted)
        text(formatPeso(data.totalCentavos), 72f, 452f, 78f, mono, ink)
        text("${data.itemCount} items · ${data.sharedItemCount} shared", 72f, 492f, 24f, sans, muted)
        rule(526f)

        text("WHO COVERS & OWES", 72f, 570f, 24f, sans, muted)
        var y = 616f
        data.adults.forEach { adult ->
            text(adult.name, 72f, y, 32f, sansBold)
            paint.color = green
            paint.typeface = mono
            paint.textSize = 32f
            paint.textAlign = Paint.Align.RIGHT
            canvas.drawText(formatPeso(adult.totalCentavos), width - 72f, y, paint)
            paint.textAlign = Paint.Align.LEFT
            val covered = adult.coveredStudents
                .takeIf { it.isNotEmpty() }
                ?.joinToString(", ")
            val owedTo = data.transfers
                .filter { it.fromAdultId == adult.id }
                .mapNotNull { data.adultNames[it.toAdultId] }
                .distinct()
            val detail = buildList {
                add(covered?.let { "Covers $it" } ?: "No students")
                when {
                    owedTo.isNotEmpty() -> add("Owes ${owedTo.joinToString(", ")}")
                    adult.name == data.payerName -> add("Paid the bill")
                }
                if (adult.adjustmentCentavos != 0L) {
                    add("Adj ${formatPeso(adult.adjustmentCentavos)}")
                }
                if (adult.gapCentavos != 0L) {
                    add("Gap ${formatPeso(adult.gapCentavos)}")
                }
            }.joinToString(" · ")
            text(detail, 72f, y + 32f, 24f, sans, muted)
            y += 112f
        }

        rule(y - 12f)
        text("Settle directly with ${data.payerName}.", 72f, y + 40f, 26f, sans, muted)

        text("On-device receipt scan · Private ledger", 72f, height - 64f, 22f, sans, muted)
        paint.color = accent
        canvas.drawCircle(width - 96f, height - 76f, 10f, paint)

        val directory = File(context.cacheDir, "shared").apply { mkdirs() }
        val file = File(directory, "salo-recap-${System.currentTimeMillis()}.png")
        file.outputStream().use { output ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
        }
        bitmap.recycle()
        return file
    }
}

object RecapSharer {
    fun shareText(context: Context, text: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
            putExtra(Intent.EXTRA_SUBJECT, "Salo recap")
        }
        context.startActivity(Intent.createChooser(intent, "Share recap"))
    }

    fun saveImageToGallery(context: Context, file: File): Uri {
        val resolver = context.contentResolver
        val values = ContentValues().apply {
            put(
                MediaStore.Images.Media.DISPLAY_NAME,
                "Salo-${System.currentTimeMillis()}.png"
            )
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(
                MediaStore.Images.Media.RELATIVE_PATH,
                "${Environment.DIRECTORY_PICTURES}/Salo"
            )
            put(MediaStore.Images.Media.IS_PENDING, 1)
        }
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: error("Could not create the gallery image.")
        try {
            resolver.openOutputStream(uri)?.use { output ->
                file.inputStream().use { input -> input.copyTo(output) }
            } ?: error("Could not write the gallery image.")
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        } catch (caught: Throwable) {
            resolver.delete(uri, null, null)
            throw caught
        }
        return uri
    }
}
