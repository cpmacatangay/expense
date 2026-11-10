package ph.salo.app.feature.outing

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NewOutingRulesTest {

    @Test
    fun autoFollowsTheItemSum() {
        assertEquals(
            "1234.50",
            TotalRules.totalAfterItemsChanged(
                mode = TotalMode.AUTO,
                itemsTotalCentavos = 123450,
                hasItems = true
            )
        )
    }

    @Test
    fun autoClearsWhenTheLastItemIsRemoved() {
        assertEquals(
            "",
            TotalRules.totalAfterItemsChanged(
                mode = TotalMode.AUTO,
                itemsTotalCentavos = 0,
                hasItems = false
            )
        )
    }

    @Test
    fun manualAndFixedIgnoreItemChanges() {
        assertNull(
            TotalRules.totalAfterItemsChanged(TotalMode.MANUAL, 123450, true)
        )
        assertNull(
            TotalRules.totalAfterItemsChanged(TotalMode.FIXED, 123450, true)
        )
    }

    @Test
    fun editingTurnsAutoIntoManualButKeepsFixed() {
        assertEquals(TotalMode.MANUAL, TotalRules.modeAfterEdit(TotalMode.AUTO))
        assertEquals(TotalMode.MANUAL, TotalRules.modeAfterEdit(TotalMode.MANUAL))
        assertEquals(TotalMode.FIXED, TotalRules.modeAfterEdit(TotalMode.FIXED))
    }

    @Test
    fun useItemsRestoresAuto() {
        assertEquals(
            TotalMode.AUTO to "250.00",
            TotalRules.totalAfterUseItems(
                mode = TotalMode.MANUAL,
                isEditing = false,
                itemsTotalCentavos = 25000
            )
        )
    }

    @Test
    fun useItemsIsIgnoredWhileEditingAFixedOuting() {
        assertNull(
            TotalRules.totalAfterUseItems(
                mode = TotalMode.FIXED,
                isEditing = true,
                itemsTotalCentavos = 25000
            )
        )
    }

    @Test
    fun mergeKeepsTheCombinedQuantityWhenItDividesEvenly() {
        assertEquals(3 to 100L, mergedQuantityAndUnit(200, 2, 100, 1))
    }

    @Test
    fun mergeFallsBackToOneLineWhenTheTotalDoesNotDivideEvenly() {
        assertEquals(1 to 201L, mergedQuantityAndUnit(100, 1, 101, 1))
    }

    @Test
    fun mergePreservesTheExactTotal() {
        val (quantity, unit) = mergedQuantityAndUnit(333, 3, 101, 1)
        assertEquals(434L, quantity.toLong() * unit)
    }
}
