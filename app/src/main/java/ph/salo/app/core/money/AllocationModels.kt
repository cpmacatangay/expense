package ph.salo.app.core.money

data class AdultRef(
    val id: String,
    val name: String,
    val order: Int
)

data class StudentRef(
    val id: String,
    val name: String
)

enum class ItemAssignmentType {
    ADULT,
    STUDENT,
    SHARED,
    UNASSIGNED
}

data class ReceiptItemInput(
    val id: String,
    val name: String,
    val quantity: Int,
    val unitAmountCentavos: Centavos,
    val amountCentavos: Centavos,
    val assignmentType: ItemAssignmentType,
    val assignedAdultId: String? = null,
    val assignedStudentId: String? = null
)

data class AllocationInput(
    val receiptTotalCentavos: Centavos,
    val adults: List<AdultRef>,
    val presentStudents: List<StudentRef>,
    val coverageByStudent: Map<String, String>,
    val items: List<ReceiptItemInput>,
    val taxCentavos: Centavos = 0,
    val serviceChargeCentavos: Centavos = 0,
    val discountCentavos: Centavos = 0,
    val payerId: String? = null
)

data class ShareAllocation(
    val adultId: String,
    val ownItemsCentavos: Centavos,
    val studentItemsCentavos: Centavos,
    val sharedHeadCentavos: Centavos,
    val coveredStudentSharedCentavos: Centavos,
    val adjustmentCentavos: Centavos,
    val gapCentavos: Centavos,
    val totalCentavos: Centavos,
    val isPayer: Boolean
)

data class AllocationResult(
    val shares: List<ShareAllocation>,
    val headcount: Int,
    val itemSubtotalCentavos: Centavos,
    val appliedAdjustmentCentavos: Centavos,
    val gapCentavos: Centavos
)

sealed interface AllocationIssue {
    data object NoAdults : AllocationIssue
    data class InvalidAdultCount(val count: Int) : AllocationIssue
    data class DuplicateAdult(val adultId: String) : AllocationIssue
    data class DuplicateStudent(val studentId: String) : AllocationIssue
    data object InvalidTotal : AllocationIssue
    data object InvalidAdjustment : AllocationIssue
    data class InvalidPayer(val payerId: String) : AllocationIssue
    data class InvalidItemAmount(val itemId: String) : AllocationIssue
    data class InvalidQuantity(val itemId: String) : AllocationIssue
    data class UnassignedItem(val itemId: String) : AllocationIssue
    data class InvalidAssignment(val itemId: String) : AllocationIssue
    data class UnknownAdult(val itemId: String, val adultId: String) : AllocationIssue
    data class UnknownStudent(val itemId: String, val studentId: String) : AllocationIssue
    data class MissingCoverage(val studentId: String) : AllocationIssue
    data class CoverageForAbsentStudent(val studentId: String) : AllocationIssue
    data class UnknownCoverageAdult(val studentId: String, val adultId: String) : AllocationIssue
}

class AllocationValidationException(
    val issues: List<AllocationIssue>
) : IllegalArgumentException(
    "Invalid allocation input: ${issues.joinToString(separator = "; ")}"
)
