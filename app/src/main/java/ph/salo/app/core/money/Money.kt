package ph.salo.app.core.money

import java.util.Locale

typealias Centavos = Long

// The peso string must not shift with the device locale: the recap image and the
// ledger have to agree with the printed receipt.
private val PESO_LOCALE: Locale = Locale.forLanguageTag("en-PH")

fun formatPeso(centavos: Centavos): String {
    val negative = centavos < 0
    val absolute = if (negative) -centavos else centavos
    val pesos = absolute / 100
    val cents = absolute % 100
    val formatted = String.format(PESO_LOCALE, "₱%,d.%02d", pesos, cents)
    return if (negative) "-$formatted" else formatted
}

fun formatCentavosPlain(centavos: Centavos): String {
    val absolute = if (centavos < 0) -centavos else centavos
    val formatted = String.format(PESO_LOCALE, "%d.%02d", absolute / 100, absolute % 100)
    return if (centavos < 0) "-$formatted" else formatted
}

fun parsePesoToCentavos(input: String): Centavos? {
    val cleaned = input
        .replace("₱", "")
        .replace("PHP", "", ignoreCase = true)
        .replace(",", "")
        .trim()
    if (cleaned.isEmpty()) return null
    val negative = cleaned.startsWith("-")
    val unsigned = cleaned.removePrefix("-")
    val parts = unsigned.split(".")
    if (parts.size > 2) return null
    val pesos = parts[0].ifEmpty { "0" }.toLongOrNull() ?: return null
    val cents = parts.getOrNull(1)
        ?.padEnd(2, '0')
        ?.take(2)
        ?.ifEmpty { "00" }
        ?.toLongOrNull() ?: 0L
    val value = pesos * 100 + cents
    return if (negative) -value else value
}
