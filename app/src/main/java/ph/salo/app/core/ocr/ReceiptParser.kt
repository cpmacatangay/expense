package ph.salo.app.core.ocr

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

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
    val totalCentavos: Long?
)

object ReceiptParser {
    private val moneyRegex = Regex("""(?:₱|PHP|P)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+\.[0-9]{2})""")
    private val quantityRegex = Regex("""^\s*(\d{1,2})\s*(?:x|@)\s*(?:₱|PHP|P)?\s*([0-9,]+\.[0-9]{2})""", RegexOption.IGNORE_CASE)
    private val totalLabels = listOf("grand total", "total due", "amount due", "total")
    private val taxLabels = listOf("vat", "tax")
    private val serviceLabels = listOf("service charge", "service", "s.c.", "sc")
    private val discountLabels = listOf("discount", "less", "promo", "senior", "pwd")
    private val ignoredLabels = listOf(
        "cash", "change", "vatable", "vat reg", "tin", "invoice", "receipt no",
        "cashier", "table", "date", "time", "thank", "welcome", "server"
    )

    fun parse(rawText: String): ParsedReceipt {
        val lines = rawText.lines()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
        val normalized = lines.map { it.lowercase(Locale.US) }

        val total = findAmount(normalized, lines, totalLabels, preferLast = true)
        val tax = findAmount(normalized, lines, taxLabels)
        val service = findAmount(normalized, lines, serviceLabels)
        val discount = findAmount(normalized, lines, discountLabels)

        val items = mutableListOf<ParsedItem>()
        lines.forEachIndexed { index, line ->
            val lower = normalized[index]
            if (ignoredLabels.any { lower.contains(it) }) return@forEachIndexed
            if (totalLabels.any { lower.contains(it) }) return@forEachIndexed
            if (taxLabels.any { lower.contains(it) }) return@forEachIndexed
            if (serviceLabels.any { lower.contains(it) }) return@forEachIndexed
            if (discountLabels.any { lower.contains(it) }) return@forEachIndexed
            parseItem(line)?.let { items += it }
        }

        return ParsedReceipt(
            merchant = lines.mapIndexedNotNull { index, line ->
                if (
                    line.length in 3..60 &&
                    moneyRegex.find(line) == null &&
                    ignoredLabels.none { normalized[index].contains(it) } &&
                    totalLabels.none { normalized[index].contains(it) } &&
                    taxLabels.none { normalized[index].contains(it) } &&
                    serviceLabels.none { normalized[index].contains(it) } &&
                    discountLabels.none { normalized[index].contains(it) }
                ) {
                    line
                } else {
                    null
                }
            }.firstOrNull(),
            date = findDate(rawText),
            items = items,
            taxCentavos = tax,
            serviceChargeCentavos = service,
            discountCentavos = discount,
            totalCentavos = total
        )
    }

    private fun parseItem(line: String): ParsedItem? {
        val quantityMatch = quantityRegex.find(line)
        if (quantityMatch != null) {
            val quantity = quantityMatch.groupValues[1].toIntOrNull() ?: return null
            val unit = parseMoney(quantityMatch.groupValues[2]) ?: return null
            val before = line.substring(0, quantityMatch.range.first)
                .trim()
                .trim('-', ':', '.')
            val after = line.substring(quantityMatch.range.last + 1)
                .trim()
                .trim('-', ':', '.')
            val name = before.ifBlank { after }
            if (name.isBlank()) return null
            return ParsedItem(name, quantity, unit, unit * quantity)
        }
        val matches = moneyRegex.findAll(line).toList()
        if (matches.isEmpty()) return null
        val last = matches.last()
        val amount = parseMoney(last.groupValues[1]) ?: return null
        if (amount <= 0) return null
        val name = line.substring(0, last.range.first).trim().trim('-', ':', '.')
        if (name.length < 2) return null
        if (name.all { it.isDigit() || it.isWhitespace() }) return null
        return ParsedItem(name, 1, amount, amount)
    }

    private fun findAmount(
        normalized: List<String>,
        lines: List<String>,
        labels: List<String>,
        preferLast: Boolean = false
    ): Long? {
        val candidates = normalized.mapIndexedNotNull { index, lower ->
            if (labels.any { lower.contains(it) }) {
                moneyRegex.findAll(lines[index]).lastOrNull()?.groupValues?.get(1)
                    ?.let { parseMoney(it) }
            } else {
                null
            }
        }
        return if (preferLast) candidates.lastOrNull() else candidates.firstOrNull()
    }

    private fun findDate(text: String): String? {
        val patterns = listOf(
            Regex("""(\d{4})[-/](\d{1,2})[-/](\d{1,2})"""),
            Regex("""(\d{1,2})[-/](\d{1,2})[-/](\d{4})"""),
            Regex("""([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})""")
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

                    match.groupValues[1].all { it.isDigit() } -> LocalDate.of(
                        match.groupValues[3].toInt(),
                        match.groupValues[1].toInt(),
                        match.groupValues[2].toInt()
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

    private fun parseMoney(value: String): Long? {
        val cleaned = value.replace(",", "").trim()
        val pesos = cleaned.toDoubleOrNull() ?: return null
        return Math.round(pesos * 100.0)
    }
}
