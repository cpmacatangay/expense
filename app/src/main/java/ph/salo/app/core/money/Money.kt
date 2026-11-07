package ph.salo.app.core.money

typealias Centavos = Long

fun formatPeso(centavos: Centavos): String {
    val negative = centavos < 0
    val absolute = if (negative) -centavos else centavos
    val pesos = absolute / 100
    val cents = absolute % 100
    val formatted = "₱%,d.%02d".format(pesos, cents)
    return if (negative) "-$formatted" else formatted
}
