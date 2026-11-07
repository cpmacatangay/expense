package ph.salo.app.core.recap

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import androidx.core.content.FileProvider
import ph.salo.app.core.data.OutingDetails
import ph.salo.app.core.database.AdultProfileEntity
import ph.salo.app.core.database.StudentEntity
import ph.salo.app.core.money.Transfer
import ph.salo.app.core.money.formatPeso
import java.io.File

data class RecapAdult(
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
        text(data.date, 72f, 272f, 26f, sans, muted)
        rule(304f)

        text("TOTAL", 72f, 366f, 24f, sans, muted)
        text(formatPeso(data.totalCentavos), 72f, 452f, 78f, mono, ink)
        text("${data.itemCount} items · ${data.sharedItemCount} shared", 72f, 492f, 24f, sans, muted)
        rule(526f)

        var y = 588f
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
            val detail = buildList {
                if (covered != null) add("Covers $covered")
                if (adult.adjustmentCentavos != 0L) {
                    add("Adj ${formatPeso(adult.adjustmentCentavos)}")
                }
                if (adult.gapCentavos != 0L) {
                    add("Gap ${formatPeso(adult.gapCentavos)}")
                }
            }.joinToString(" · ").ifEmpty { "No students" }
            text(detail, 72f, y + 30f, 22f, sans, muted)
            y += 82f
        }

        rule(y - 18f)
        y += 48f
        text("Payer: ${data.payerName}", 72f, y, 28f, sansBold)
        y += 54f
        if (data.transfers.isEmpty()) {
            text("All settled.", 72f, y, 28f, sans, green)
        } else {
            data.transfers.take(4).forEach { transfer ->
                val from = data.adultNames[transfer.fromAdultId] ?: "—"
                val to = data.adultNames[transfer.toAdultId] ?: "—"
                text("$from → $to", 72f, y, 26f, sans)
                paint.color = green
                paint.typeface = mono
                paint.textSize = 26f
                paint.textAlign = Paint.Align.RIGHT
                canvas.drawText(formatPeso(transfer.amountCentavos), width - 72f, y, paint)
                paint.textAlign = Paint.Align.LEFT
                y += 44f
            }
        }

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

    fun shareImage(context: Context, file: File, text: String) {
        val uri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, text)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Share recap image"))
    }
}
