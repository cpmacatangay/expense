package ph.salo.app.core.money

import org.junit.Assert.assertEquals
import org.junit.Test

class BalancesTest {

    private val adultIds = listOf("cp", "mai", "kent", "llanmer")

    @Test
    fun `balances net paid shares and partial settlements`() {
        val outings = listOf(
            FinalizedOutingInput("o1", "cp", 300_000, OutingStatus.FINAL)
        )
        val shares = listOf(
            ShareInput("o1", "cp", 150_000),
            ShareInput("o1", "mai", 50_000),
            ShareInput("o1", "kent", 50_000),
            ShareInput("o1", "llanmer", 50_000)
        )
        val settlements = listOf(
            SettlementInput("mai", "cp", 20_000)
        )

        val balances = BalanceCalculator.computeBalances(outings, shares, settlements, adultIds)

        assertEquals(130_000, balances.first { it.adultId == "cp" }.netCentavos)
        assertEquals(-30_000, balances.first { it.adultId == "mai" }.netCentavos)
        assertEquals(-50_000, balances.first { it.adultId == "kent" }.netCentavos)
        assertEquals(-50_000, balances.first { it.adultId == "llanmer" }.netCentavos)
        assertEquals(0, balances.sumOf { it.netCentavos })
    }

    @Test
    fun `voided settlements are ignored`() {
        val outings = listOf(
            FinalizedOutingInput("o1", "cp", 300_000, OutingStatus.FINAL)
        )
        val shares = listOf(
            ShareInput("o1", "cp", 150_000),
            ShareInput("o1", "mai", 50_000),
            ShareInput("o1", "kent", 50_000),
            ShareInput("o1", "llanmer", 50_000)
        )
        val settlements = listOf(
            SettlementInput("mai", "cp", 20_000, voided = true)
        )

        val balances = BalanceCalculator.computeBalances(outings, shares, settlements, adultIds)

        assertEquals(150_000, balances.first { it.adultId == "cp" }.netCentavos)
        assertEquals(-50_000, balances.first { it.adultId == "mai" }.netCentavos)
    }

    @Test
    fun `draft outings are ignored`() {
        val outings = listOf(
            FinalizedOutingInput("o1", "cp", 300_000, OutingStatus.DRAFT)
        )
        val shares = listOf(
            ShareInput("o1", "cp", 150_000),
            ShareInput("o1", "mai", 150_000)
        )

        val balances = BalanceCalculator.computeBalances(outings, shares, emptyList(), adultIds)

        assertEquals(0, balances.sumOf { it.netCentavos })
    }

    @Test
    fun `settlements simplify to who pays whom`() {
        val balances = listOf(
            Balance("cp", 300_000, 150_000, 0, 20_000, 130_000),
            Balance("mai", 0, 50_000, 20_000, 0, -30_000),
            Balance("kent", 0, 50_000, 0, 0, -50_000),
            Balance("llanmer", 0, 50_000, 0, 0, -50_000)
        )

        val transfers = BalanceCalculator.suggestSettlements(balances)

        assertEquals(
            listOf(
                Transfer("kent", "cp", 50_000),
                Transfer("llanmer", "cp", 50_000),
                Transfer("mai", "cp", 30_000)
            ),
            transfers
        )
        assertEquals(130_000, transfers.sumOf { it.amountCentavos })
    }
}
