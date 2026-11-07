package ph.salo.app.core.ocr

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class ReceiptParserTest {
    @Test
    fun `parses a typical Philippine receipt`() {
        val text = """
            VAT REG TIN 123-456-789
            SALO RESTAURANT
            2026-11-07
            2 x 150.00 Chicken
            Rice 50.00
            Service Charge 30.00
            VAT 18.00
            Discount 20.00
            TOTAL 378.00
        """.trimIndent()

        val parsed = ReceiptParser.parse(text)

        assertEquals("SALO RESTAURANT", parsed.merchant)
        assertEquals("2026-11-07", parsed.date)
        assertEquals(37_800L, parsed.totalCentavos)
        assertEquals(1_800L, parsed.taxCentavos)
        assertEquals(3_000L, parsed.serviceChargeCentavos)
        assertEquals(2_000L, parsed.discountCentavos)
        assertEquals(2, parsed.items.size)
        assertEquals("Chicken", parsed.items[0].name)
        assertEquals(2, parsed.items[0].quantity)
        assertEquals(30_000L, parsed.items[0].amountCentavos)
        assertEquals("Rice", parsed.items[1].name)
        assertEquals(5_000L, parsed.items[1].amountCentavos)
    }

    @Test
    fun `returns manual-entry friendly result when text is unreadable`() {
        val parsed = ReceiptParser.parse("noise only")
        assertEquals(null, parsed.totalCentavos)
        assertNotNull(parsed.items)
    }
}
