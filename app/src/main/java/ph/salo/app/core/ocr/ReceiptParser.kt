package ph.salo.app.core.ocr

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/** A single line from ML Kit, with its geometry in image pixels. */
data class OcrLine(
    val text: String,
    val left: Int = 0,
    val top: Int = 0,
    val right: Int = 0,
    val bottom: Int = 0
)

enum class ScanWarning {
    NO_ITEMS,
    MISSING_TOTAL,
    ITEM_TOTAL_MISMATCH
}

data class ParsedItem(
    val name: String,
    val quantity: Int,
    val unitAmountCentavos: Long,
    val amountCentavos: Long
)

data class ParsedReceipt(
    val merchant: String?,
    val date: String?,
    val items: List<ParsedItem>,
    val taxCentavos: Long?,
    val serviceChargeCentavos: Long?,
    val discountCentavos: Long?,
    val totalCentavos: Long?,
    val itemSubtotalCentavos: Long = 0L,
    val differenceCentavos: Long? = null,
    val warnings: List<ScanWarning> = emptyList()
)

object ReceiptParser {
    private val moneyRegex = Regex(
        """(?:₱|PHP|P)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+\.[0-9]{2})""",
        RegexOption.IGNORE_CASE
    )
    private val quantityRegex = Regex(
        """^\s*(\d{1,2})\s*(?:x|@|pcs?|pc)\s*(?:₱|PHP|P)?\s*([0-9,]+\.[0-9]{2})""",
        RegexOption.IGNORE_CASE
    )
    private val dateLineRegex = Regex(
        """\b(?:\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b""",
        RegexOption.IGNORE_CASE
    )
    private val serviceAbbreviation = Regex("""\bs\.?c\.?\b""", RegexOption.IGNORE_CASE)
    private val taxWord = Regex("""\btax\b""", RegexOption.IGNORE_CASE)

    private val explicitTotalLabels = listOf(
        "grand total", "total due", "amount due", "amount payable", "total amount"
    )
    private val totalExclusions = listOf(
        "subtotal", "sub total", "total vat", "vat total", "total items", "total qty",
        "total quantity", "total discount", "total service", "vatable", "vat reg", "tin"
    )
    private val taxExclusions = listOf(
        "vatable", "vat reg", "vat exempt", "vat-exempt", "zero-rated", "zero rated", "tin"
    )
    private val taxLabels = listOf("vat", "tax")
    private val serviceLabels = listOf("service charge", "service")
    private val discountLabels = listOf("discount", "less", "promo", "senior", "pwd")
    private val ignoredLabels = listOf(
        "cash", "change", "vatable", "vat reg", "tin", "invoice", "receipt no",
        "cashier", "table", "date", "time", "thank", "welcome", "server",
        "tel", "phone", "mobile", "address", "street", "brgy", "barangay"
    )

    fun parse(rawText: String): ParsedReceipt =
        parse(rawText.lines().mapIndexed { index, line -> OcrLine(line, top = index) })

    fun parse(lines: List<OcrLine>): ParsedReceipt {
        val ordered = lines.sortedWith(compareBy({ it.top }, { it.left }))
        val rawLines = ordered.map { it.text.trim() }.filter { it.isNotEmpty() }
        val normalized = rawLines.map { it.lowercase(Locale.US) }

        val total = findTotal(normalized, rawLines)
        val tax = findTax(normalized, rawLines)
        val service = findService(normalized, rawLines)
        val discount = findDiscount(normalized, rawLines)
        val items = extractItems(rawLines, normalized)

        val itemSubtotal = items.sumOf { it.amountCentavos }
        val expectedTotal = itemSubtotal + (tax ?: 0L) + (service ?: 0L) - (discount ?: 0L)
        val difference = total?.let { it - expectedTotal }
        val warnings = buildList {
            if (items.isEmpty()) add(ScanWarning.NO_ITEMS)
            if (total == null) add(ScanWarning.MISSING_TOTAL)
            if (total != null && items.isNotEmpty() && difference != 0L) {
                add(ScanWarning.ITEM_TOTAL_MISMATCH)
            }
        }

        return ParsedReceipt(
            merchant = findMerchant(rawLines, normalized),
            date = findDate(rawLines),
            items = items,
            taxCentavos = tax,
            serviceChargeCentavos = service,
            discountCentavos = discount,
            totalCentavos = total,
            itemSubtotalCentavos = itemSubtotal,
            differenceCentavos = difference,
            warnings = warnings
        )
    }

    private fun extractItems(lines: List<String>, normalized: List<String>): List<ParsedItem> {
        val items = mutableListOf<ParsedItem>()
        var pendingName: String? = null
        lines.forEachIndexed { index, line ->
            val lower = normalized[index]
            if (isNonItemLine(lower)) {
                pendingName = null
                return@forEachIndexed
            }
            val item = parseItem(line, pendingName)
            if (item != null) {
                items += item
                pendingName = null
            } else if (looksLikeName(line)) {
                pendingName = line.cleanName()
            }
        }
        return items
    }

    private fun parseItem(line: String, pendingName: String?): ParsedItem? {
        val quantityMatch = quantityRegex.find(line)
        if (quantityMatch != null) {
            val quantity = quantityMatch.groupValues[1].toIntOrNull() ?: return null
            val unit = parseMoney(quantityMatch.groupValues[2]) ?: return null
            val before = line.substring(0, quantityMatch.range.first)
                .trim()
                .trim('-', ':', '.', '*')
            val after = line.substring(quantityMatch.range.last + 1)
                .trim()
                .trim('-', ':', '.', '*')
            val name = before.ifBlank { after }.cleanName().ifBlank { pendingName.orEmpty() }
            if (name.length < 2) return null
            return ParsedItem(name, quantity, unit, unit * quantity)
        }

        val matches = moneyRegex.findAll(line).toList()
        if (matches.isEmpty()) return null
        val last = matches.last()
        val amount = parseMoney(last.groupValues[1]) ?: return null
        if (amount <= 0) return null
        val leading = line.substring(0, last.range.first).cleanName()
        val name = leading.ifBlank { pendingName.orEmpty() }
        if (name.length < 2) return null
        if (name.all { it.isDigit() || it.isWhitespace() }) return null
        return ParsedItem(name, 1, amount, amount)
    }

    private fun findTotal(normalized: List<String>, lines: List<String>): Long? {
        fun amountAt(index: Int): Long? =
            moneyRegex.findAll(lines[index]).lastOrNull()?.groupValues?.get(1)?.let(::parseMoney)

        val explicit = normalized.indices
            .filter { index ->
                val lower = normalized[index]
                explicitTotalLabels.any { lower.contains(it) } &&
                    totalExclusions.none { lower.contains(it) }
            }
            .mapNotNull(::amountAt)
        if (explicit.isNotEmpty()) return explicit.last()

        return normalized.indices
            .filter { index ->
                val lower = normalized[index]
                lower.contains("total") && totalExclusions.none { lower.contains(it) }
            }
            .mapNotNull(::amountAt)
            .lastOrNull()
    }

    private fun findTax(normalized: List<String>, lines: List<String>): Long? {
        return normalized.indices
            .filter { index ->
                val lower = normalized[index]
                (lower.contains("vat") || taxWord.containsMatchIn(lower)) &&
                    taxExclusions.none { lower.contains(it) }
            }
            .mapNotNull { index ->
                moneyRegex.findAll(lines[index]).lastOrNull()?.groupValues?.get(1)
                    ?.let(::parseMoney)
            }
            .lastOrNull()
    }

    private fun findService(normalized: List<String>, lines: List<String>): Long? {
        return normalized.indices
            .filter { index ->
                val lower = normalized[index]
                serviceLabels.any { lower.contains(it) } ||
                    serviceAbbreviation.containsMatchIn(lower)
            }
            .mapNotNull { index ->
                moneyRegex.findAll(lines[index]).lastOrNull()?.groupValues?.get(1)
                    ?.let(::parseMoney)
            }
            .lastOrNull()
    }

    private fun findDiscount(normalized: List<String>, lines: List<String>): Long? {
        return normalized.indices
            .filter { index -> discountLabels.any { normalized[index].contains(it) } }
            .mapNotNull { index ->
                moneyRegex.findAll(lines[index]).lastOrNull()?.groupValues?.get(1)
                    ?.let(::parseMoney)
            }
            .lastOrNull()
    }

    private fun findMerchant(lines: List<String>, normalized: List<String>): String? =
        lines.mapIndexedNotNull { index, line ->
            val lower = normalized[index]
            when {
                line.length !in 3..60 -> null
                moneyRegex.find(line) != null -> null
                isNonItemLine(lower) -> null
                dateLineRegex.containsMatchIn(line) -> null
                line.none { it.isLetter() } -> null
                else -> line
            }
        }.firstOrNull()

    private fun findDate(lines: List<String>): String? {
        val text = lines.joinToString("\n")
        val patterns = listOf(
            Regex("""(\d{4})[-/](\d{1,2})[-/](\d{1,2})"""),
            Regex("""(\d{1,2})[-/](\d{1,2})[-/](\d{4})"""),
            Regex("""([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})"""),
            Regex("""(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})""")
        )
        patterns.forEach { pattern ->
            val match = pattern.find(text) ?: return@forEach
            return runCatching {
                when {
                    match.groupValues[1].length == 4 -> LocalDate.of(
                        match.groupValues[1].toInt(),
                        match.groupValues[2].toInt(),
                        match.groupValues[3].toInt()
                    ).toString()

                    match.groupValues[1].all { it.isDigit() } &&
                        match.groupValues[2].all { it.isDigit() } -> LocalDate.of(
                        match.groupValues[3].toInt(),
                        match.groupValues[1].toInt(),
                        match.groupValues[2].toInt()
                    ).toString()

                    match.groupValues[1].all { it.isDigit() } -> LocalDate.parse(
                        "${match.groupValues[1]} ${match.groupValues[2]} ${match.groupValues[3]}",
                        DateTimeFormatter.ofPattern("d MMM yyyy", Locale.US)
                    ).toString()

                    else -> LocalDate.parse(
                        "${match.groupValues[1]} ${match.groupValues[2]} ${match.groupValues[3]}",
                        DateTimeFormatter.ofPattern("MMM d yyyy", Locale.US)
                    ).toString()
                }
            }.getOrNull()
        }
        return null
    }

    private fun isNonItemLine(lower: String): Boolean =
        lower.contains("total") ||
            ignoredLabels.any { lower.contains(it) } ||
            explicitTotalLabels.any { lower.contains(it) } ||
            totalExclusions.any { lower.contains(it) } ||
            taxLabels.any { lower.contains(it) } ||
            taxExclusions.any { lower.contains(it) } ||
            serviceLabels.any { lower.contains(it) } ||
            serviceAbbreviation.containsMatchIn(lower) ||
            discountLabels.any { lower.contains(it) } ||
            dateLineRegex.containsMatchIn(lower)

    private fun looksLikeName(line: String): Boolean =
        line.length in 2..60 &&
            moneyRegex.find(line) == null &&
            line.any { it.isLetter() }

    private fun String.cleanName(): String =
        trim()
            .trim('-', ':', '.', '*')
            .replace(Regex("""\s+"""), " ")
            .trim()

    private fun parseMoney(value: String): Long? {
        val cleaned = value.replace(",", "").trim()
        return runCatching {
            BigDecimal(cleaned)
                .movePointRight(2)
                .setScale(0, RoundingMode.HALF_UP)
                .longValueExact()
        }.getOrNull()
    }
}
