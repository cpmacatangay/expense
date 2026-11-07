package ph.salo.app.core.money

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class MoneyAllocatorTest {

    private val adults = listOf(
        AdultRef("cp", "CP", 1),
        AdultRef("mai", "Mai", 2),
        AdultRef("kent", "Kent", 3),
        AdultRef("llanmer", "Llanmer", 4)
    )
    private val students = listOf(
        StudentRef("ana", "Ana"),
        StudentRef("ben", "Ben")
    )
    private val coverage = mapOf("ana" to "cp", "ben" to "mai")

    private fun item(
        id: String,
        amount: Long,
        type: ItemAssignmentType,
        adultId: String? = null,
        studentId: String? = null
    ) = ReceiptItemInput(
        id = id,
        name = id,
        quantity = 1,
        unitAmountCentavos = amount,
        amountCentavos = amount,
        assignmentType = type,
        assignedAdultId = adultId,
        assignedStudentId = studentId
    )

    private fun allocate(
        items: List<ReceiptItemInput>,
        total: Long,
        tax: Long = 0,
        service: Long = 0,
        discount: Long = 0,
        payerId: String? = null
    ) = MoneyAllocator.allocate(
        AllocationInput(
            receiptTotalCentavos = total,
            adults = adults,
            presentStudents = students,
            coverageByStudent = coverage,
            items = items,
            taxCentavos = tax,
            serviceChargeCentavos = service,
            discountCentavos = discount,
            payerId = payerId
        )
    )

    private fun totals(result: AllocationResult): List<Long> =
        result.shares.map { it.totalCentavos }

    @Test
    fun `worked example splits adult, student, and shared items exactly`() {
        val result = allocate(
            items = listOf(
                item("cp-meal", 20_000, ItemAssignmentType.ADULT, adultId = "cp"),
                item("mai-meal", 10_000, ItemAssignmentType.ADULT, adultId = "mai"),
                item("ana-meal", 15_000, ItemAssignmentType.STUDENT, studentId = "ana"),
                item("ben-meal", 12_000, ItemAssignmentType.STUDENT, studentId = "ben"),
                item("rice", 18_000, ItemAssignmentType.SHARED)
            ),
            total = 82_500,
            tax = 7_500,
            payerId = "cp"
        )

        assertEquals(6, result.headcount)
        assertEquals(75_000, result.itemSubtotalCentavos)
        assertEquals(7_500, result.appliedAdjustmentCentavos)
        assertEquals(0, result.gapCentavos)
        assertEquals(listOf(45_100L, 30_800L, 3_300L, 3_300L), totals(result))
        assertEquals(82_500, totals(result).sum())
        assertTrue(result.shares.first { it.adultId == "cp" }.isPayer)
    }

    @Test
    fun `no items falls back to per-head split`() {
        val result = allocate(items = emptyList(), total = 100_000)

        assertEquals(6, result.headcount)
        assertEquals(listOf(33_333L, 33_333L, 16_667L, 16_667L), totals(result))
        assertEquals(100_000, totals(result).sum())
    }

    @Test
    fun `shared items split across adults and present students`() {
        val result = allocate(
            items = listOf(item("shared", 100_000, ItemAssignmentType.SHARED)),
            total = 100_000
        )

        assertEquals(listOf(33_333L, 33_333L, 16_667L, 16_667L), totals(result))
        assertEquals(100_000, totals(result).sum())
    }

    @Test
    fun `total gap is distributed proportionally`() {
        val result = allocate(
            items = listOf(
                item("cp", 40_000, ItemAssignmentType.ADULT, adultId = "cp"),
                item("mai", 30_000, ItemAssignmentType.ADULT, adultId = "mai")
            ),
            total = 75_000
        )

        assertEquals(listOf(42_857L, 32_143L, 0L, 0L), totals(result))
        assertEquals(5_000, result.gapCentavos)
        assertEquals(75_000, totals(result).sum())
    }

    @Test
    fun `discount is allocated proportionally`() {
        val result = allocate(
            items = listOf(
                item("cp", 60_000, ItemAssignmentType.ADULT, adultId = "cp"),
                item("mai", 40_000, ItemAssignmentType.ADULT, adultId = "mai")
            ),
            total = 90_000,
            discount = 10_000
        )

        assertEquals(listOf(54_000L, 36_000L, 0L, 0L), totals(result))
        assertEquals(-10_000, result.appliedAdjustmentCentavos)
        assertEquals(90_000, totals(result).sum())
    }

    @Test
    fun `tax and service charge allocated proportionally`() {
        val result = allocate(
            items = listOf(item("cp", 100_000, ItemAssignmentType.ADULT, adultId = "cp")),
            total = 120_000,
            tax = 12_000,
            service = 10_000,
            discount = 2_000
        )

        assertEquals(listOf(120_000L, 0L, 0L, 0L), totals(result))
        assertEquals(20_000, result.appliedAdjustmentCentavos)
        assertEquals(0, result.gapCentavos)
    }

    @Test
    fun `proportional allocation handles negative amounts and ties`() {
        assertEquals(listOf(34L, 33L, 33L), MoneyAllocator.allocateProportionally(100, listOf(1, 1, 1)).toList())
        assertEquals(listOf(-34L, -33L, -33L), MoneyAllocator.allocateProportionally(-100, listOf(1, 1, 1)).toList())
        assertEquals(listOf(50L, 50L), MoneyAllocator.allocateProportionally(100, listOf(0, 0)).toList())
    }

    @Test
    fun `validation rejects unassigned items`() {
        val issues = MoneyAllocator.validate(
            AllocationInput(
                receiptTotalCentavos = 10_000,
                adults = adults,
                presentStudents = emptyList(),
                coverageByStudent = emptyMap(),
                items = listOf(item("unassigned", 10_000, ItemAssignmentType.UNASSIGNED))
            )
        )

        assertTrue(issues.any { it is AllocationIssue.UnassignedItem })
    }

    @Test
    fun `validation requires coverage for every present student`() {
        val issues = MoneyAllocator.validate(
            AllocationInput(
                receiptTotalCentavos = 10_000,
                adults = adults,
                presentStudents = students,
                coverageByStudent = mapOf("ana" to "cp"),
                items = emptyList()
            )
        )

        assertTrue(issues.any { it is AllocationIssue.MissingCoverage && it.studentId == "ben" })
    }

    @Test
    fun `validation rejects unknown adult assignment`() {
        val issues = MoneyAllocator.validate(
            AllocationInput(
                receiptTotalCentavos = 10_000,
                adults = adults,
                presentStudents = emptyList(),
                coverageByStudent = emptyMap(),
                items = listOf(item("x", 10_000, ItemAssignmentType.ADULT, adultId = "nobody"))
            )
        )

        assertTrue(issues.any { it is AllocationIssue.UnknownAdult })
    }

    @Test
    fun `validation rejects non-positive totals`() {
        val issues = MoneyAllocator.validate(
            AllocationInput(
                receiptTotalCentavos = 0,
                adults = adults,
                presentStudents = emptyList(),
                coverageByStudent = emptyMap(),
                items = emptyList()
            )
        )

        assertTrue(issues.any { it is AllocationIssue.InvalidTotal })
    }

    @Test
    fun `allocate throws when validation fails`() {
        assertThrows(AllocationValidationException::class.java) {
            MoneyAllocator.allocate(
                AllocationInput(
                    receiptTotalCentavos = 0,
                    adults = adults,
                    presentStudents = emptyList(),
                    coverageByStudent = emptyMap(),
                    items = emptyList()
                )
            )
        }
    }

    @Test
    fun `random allocations always sum to the receipt total`() {
        val random = Random(20261107)
        repeat(500) {
            val cp = random.nextLong(0, 10_000)
            val mai = random.nextLong(0, 10_000)
            val ana = random.nextLong(0, 10_000)
            val ben = random.nextLong(0, 10_000)
            val shared = random.nextLong(0, 10_000)
            val tax = random.nextLong(0, 500)
            val service = random.nextLong(0, 500)
            val itemSum = cp + mai + ana + ben + shared
            val discountCeiling = minOf(500L, itemSum + tax + service)
            val discount = if (discountCeiling <= 0) 0 else random.nextLong(0, discountCeiling + 1)
            val baseTotal = itemSum + tax + service - discount
            val total = maxOf(1L, baseTotal + random.nextLong(0, 500))

            val result = allocate(
                items = listOf(
                    item("cp", cp, ItemAssignmentType.ADULT, adultId = "cp"),
                    item("mai", mai, ItemAssignmentType.ADULT, adultId = "mai"),
                    item("ana", ana, ItemAssignmentType.STUDENT, studentId = "ana"),
                    item("ben", ben, ItemAssignmentType.STUDENT, studentId = "ben"),
                    item("shared", shared, ItemAssignmentType.SHARED)
                ),
                total = total,
                tax = tax,
                service = service,
                discount = discount
            )

            assertEquals(total, totals(result).sum())
            assertTrue(totals(result).all { it >= 0 })
        }
    }
}
