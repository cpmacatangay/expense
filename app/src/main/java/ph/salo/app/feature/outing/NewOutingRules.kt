package ph.salo.app.feature.outing

import ph.salo.app.core.money.formatCentavosPlain

/**
 * Pure transitions for the New Outing total field. Keeping these out of the ViewModel makes the
 * auto/manual/fixed behavior testable without Android or repository dependencies.
 */
object TotalRules {

    /** Returns the new total input when items change, or null when the mode must not follow. */
    fun totalAfterItemsChanged(
        mode: TotalMode,
        itemsTotalCentavos: Long,
        hasItems: Boolean
    ): String? = if (mode == TotalMode.AUTO) {
        if (hasItems) formatCentavosPlain(itemsTotalCentavos) else ""
    } else {
        null
    }

    /** Editing the total always ends auto-follow; a reopened outing stays fixed. */
    fun modeAfterEdit(mode: TotalMode): TotalMode =
        if (mode == TotalMode.FIXED) TotalMode.FIXED else TotalMode.MANUAL

    /**
     * Explicitly restore the item total. Returns null when the outing is being edited (fixed
     * history) or the mode is already fixed.
     */
    fun totalAfterUseItems(
        mode: TotalMode,
        isEditing: Boolean,
        itemsTotalCentavos: Long
    ): Pair<TotalMode, String>? =
        if (isEditing || mode == TotalMode.FIXED) {
            null
        } else {
            TotalMode.AUTO to formatCentavosPlain(itemsTotalCentavos)
        }
}

/**
 * Merges two line items without losing a centavo. When the combined amount divides evenly by the
 * combined quantity, the merged line keeps the combined quantity; otherwise it becomes one line at
 * the exact combined amount.
 */
fun mergedQuantityAndUnit(
    firstAmountCentavos: Long,
    firstQuantity: Int,
    secondAmountCentavos: Long,
    secondQuantity: Int
): Pair<Int, Long> {
    val total = firstAmountCentavos + secondAmountCentavos
    val quantity = firstQuantity + secondQuantity
    return if (quantity > 0 && total % quantity == 0L) {
        quantity to total / quantity
    } else {
        1 to total
    }
}
