package ph.salo.app.core.ocr

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.tasks.await
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

data class ReceiptOcrResult(
    val rawText: String,
    val lines: List<OcrLine>,
    val parsed: ParsedReceipt
)

@Singleton
class ReceiptOcr @Inject constructor() {

    suspend fun recognize(context: Context, uri: Uri): ReceiptOcrResult {
        val bitmap = decodeBitmap(context, uri)
            ?: error("Could not read the receipt image.")
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        return try {
            val text = recognizer.process(InputImage.fromBitmap(bitmap, 0)).await()
            val lines = text.textBlocks
                .flatMap { block -> block.lines }
                .mapNotNull { line ->
                    val box = line.boundingBox ?: return@mapNotNull null
                    OcrLine(line.text, box.left, box.top, box.right, box.bottom)
                }
                .sortedWith(compareBy({ it.top }, { it.left }))
                .ifEmpty {
                    text.text.lines().mapIndexed { index, line ->
                        OcrLine(line, top = index)
                    }
                }
            ReceiptOcrResult(
                rawText = text.text,
                lines = lines,
                parsed = ReceiptParser.parse(lines)
            )
        } finally {
            recognizer.close()
            bitmap.recycle()
        }
    }

    private fun decodeBitmap(context: Context, uri: Uri): Bitmap? {
        val input = context.contentResolver.openInputStream(uri) ?: return null
        val original = input.use { BitmapFactory.decodeStream(it) } ?: return null
        val maxSide = 1800
        val largest = maxOf(original.width, original.height)
        if (largest <= maxSide) return original
        val scale = maxSide.toFloat() / largest
        val scaled = Bitmap.createScaledBitmap(
            original,
            (original.width * scale).toInt(),
            (original.height * scale).toInt(),
            true
        )
        if (scaled !== original) original.recycle()
        return scaled
    }
}

@Singleton
class ReceiptImageStore @Inject constructor() {

    fun createCaptureUri(context: Context): Uri {
        val directory = File(context.cacheDir, "receipts").apply { mkdirs() }
        val file = File(directory, "capture-${System.currentTimeMillis()}.jpg")
        return androidx.core.content.FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
    }

    fun copyToAppStorage(context: Context, uri: Uri): String? {
        val directory = File(context.filesDir, "receipts").apply { mkdirs() }
        val target = File(directory, "receipt-${System.currentTimeMillis()}.jpg")
        return runCatching {
            context.contentResolver.openInputStream(uri)?.use { input ->
                target.outputStream().use { output -> input.copyTo(output) }
            } ?: return null
            target.absolutePath
        }.getOrNull()
    }
}
