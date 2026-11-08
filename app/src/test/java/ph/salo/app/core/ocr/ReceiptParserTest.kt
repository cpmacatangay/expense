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
        assertEquals(35_000L, parsed.itemSubtotalCentavos)
        assertEquals(0L, parsed.differenceCentavos)
        assertEquals(emptyList<ScanWarning>(), parsed.warnings)
    }

    @Test
    fun `parses layout lines and merges a name-only line into the next amount`() {
        val parsed = ReceiptParser.parse(
            listOf(
                OcrLine("SALO", top = 0),
                OcrLine("2026-11-07", top = 1),
                OcrLine("Garlic Rice", top = 2),
                OcrLine("50.00", top = 3),
                OcrLine("VAT 6.00", top = 4),
                OcrLine("TOTAL 56.00", top = 5)
            )
        )

        assertEquals("SALO", parsed.merchant)
        assertEquals("2026-11-07", parsed.date)
        assertEquals(1, parsed.items.size)
        assertEquals("Garlic Rice", parsed.items.single().name)
        assertEquals(5_000L, parsed.items.single().amountCentavos)
        assertEquals(600L, parsed.taxCentavos)
        assertEquals(5_600L, parsed.totalCentavos)
        assertEquals(0L, parsed.differenceCentavos)
        assertEquals(emptyList<ScanWarning>(), parsed.warnings)
    }

    @Test
    fun `parses both columns on the same line height`() {
        val parsed = ReceiptParser.parse(
            listOf(
                OcrLine("Burger 150.00", left = 0, top = 10),
                OcrLine("Fries 80.00", left = 500, top = 10),
                OcrLine("TOTAL 230.00", left = 0, top = 20)
            )
        )

        assertEquals(2, parsed.items.size)
        assertEquals(listOf("Burger", "Fries"), parsed.items.map { it.name })
        assertEquals(23_000L, parsed.itemSubtotalCentavos)
        assertEquals(23_000L, parsed.totalCentavos)
        assertEquals(0L, parsed.differenceCentavos)
    }

    @Test
    fun `ignores vatable sales from tax and prefers total due`() {
        val parsed = ReceiptParser.parse(
            """
            VATable Sales 300.00
            VAT 36.00
            Total Due 336.00
            """.trimIndent()
        )

        assertEquals(3_600L, parsed.taxCentavos)
        assertEquals(33_600L, parsed.totalCentavos)
        assertEquals(ScanWarning.NO_ITEMS, parsed.warnings.first())
    }

    @Test
    fun `flags a total that does not reconcile with items`() {
        val parsed = ReceiptParser.parse(
            """
            Burger 100.00
            TOTAL 120.00
            """.trimIndent()
        )

        assertEquals(10_000L, parsed.itemSubtotalCentavos)
        assertEquals(12_000L, parsed.totalCentavos)
        assertEquals(2_000L, parsed.differenceCentavos)
        assertEquals(listOf(ScanWarning.ITEM_TOTAL_MISMATCH), parsed.warnings)
    }

    @Test
    fun `flags a missing total and keeps the items`() {
        val parsed = ReceiptParser.parse("Burger 100.00")

        assertEquals(1, parsed.items.size)
        assertEquals(null, parsed.totalCentavos)
        assertEquals(null, parsed.differenceCentavos)
        assertEquals(listOf(ScanWarning.MISSING_TOTAL), parsed.warnings)
    }

    @Test
    fun `parses decimal amounts without floating point drift`() {
        val parsed = ReceiptParser.parse("Item 0.29")

        assertEquals(29L, parsed.items.single().amountCentavos)
        assertEquals(29L, parsed.itemSubtotalCentavos)
    }

    @Test
    fun `parses pcs quantity and day month year date`() {
        val parsed = ReceiptParser.parse(
            """
            Salo Restaurant
            7 Nov 2026
            2 pcs 150.00 Chicken
            TOTAL 300.00
            """.trimIndent()
        )

        assertEquals("2026-11-07", parsed.date)
        assertEquals(2, parsed.items.single().quantity)
        assertEquals(30_000L, parsed.items.single().amountCentavos)
        assertEquals(30_000L, parsed.totalCentavos)
    }

    @Test
    fun `returns manual-entry friendly result when text is unreadable`() {
        val parsed = ReceiptParser.parse("noise only")
        assertEquals(null, parsed.totalCentavos)
        assertNotNull(parsed.items)
    }
}
