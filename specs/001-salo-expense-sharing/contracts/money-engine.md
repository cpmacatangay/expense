# Contract: Money Engine

**Module**: `core/money` | **Consumers**: outing review, finalization, ledger, recap, tests

The money engine is pure Kotlin with no Android, Room, Supabase, or Compose dependencies. It is the
only place that computes peso amounts.

## Types

```kotlin
typealias Centavos = Long

enum class ItemAssignmentType { ADULT, STUDENT, SHARED, UNASSIGNED }

data class AdultRef(val id: String, val name: String, val order: Int)

data class StudentRef(val id: String, val name: String)

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
    val coverageByStudent: Map<String, String>, // studentId -> adultId
    val items: List<ReceiptItemInput>,
    val taxCentavos: Centavos,
    val serviceChargeCentavos: Centavos,
    val discountCentavos: Centavos
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
    data class MissingAmount(val itemId: String) : AllocationIssue
    data class UnknownAdult(val itemId: String, val adultId: String) : AllocationIssue
    data class UnknownStudent(val itemId: String, val studentId: String) : AllocationIssue
    data class UnassignedItem(val itemId: String) : AllocationIssue
    data class MissingCoverage(val studentId: String) : AllocationIssue
    data object NoAdults : AllocationIssue
    data object InvalidTotal : AllocationIssue
    data class InvalidItemAmount(val itemId: String) : AllocationIssue
    data class DuplicateCoverage(val studentId: String) : AllocationIssue
}
```

## Functions

### `validate(input: AllocationInput): List<AllocationIssue>`

Returns an empty list when the input can be allocated. Checks:

- `receiptTotalCentavos > 0`.
- Exactly four adult refs; at least one adult.
- Item amounts are non-negative integers.
- Every item is `ADULT`, `STUDENT`, or `SHARED`; `UNASSIGNED` is an issue.
- `ADULT` has a known `assignedAdultId` and no `assignedStudentId`.
- `STUDENT` has a known `assignedStudentId` and no `assignedAdultId`.
- `SHARED` has neither id.
- Every present student has exactly one covering adult in `coverageByStudent`.
- Every coverage adult is a known adult.
- Coverage does not reference a non-present student.
- Payer is validated by the caller; the engine only allocates.

### `allocate(input: AllocationInput, payerId: String): AllocationResult`

Preconditions: `validate(input)` is empty.

Steps:

1. **Adult items**
   - For each `ADULT` item, add `amountCentavos` to `ownItems` of the assigned adult.

2. **Student items**
   - For each `STUDENT` item, add `amountCentavos` to `studentItems` of the covering adult.

3. **Shared items**
   - `headcount = adults.size + presentStudents.size`.
   - For each adult, own head share = `sharedItemTotal / headcount`.
   - For each present student, their head share is added to the covering adult's
     `coveredStudentSharedCentavos`.
   - Use largest-remainder rounding so shared allocations sum exactly to `sharedItemTotal`.

4. **Pre-adjustment subtotal**
   - `base = ownItems + studentItems + sharedHead + coveredStudentShared`.

5. **Adjustments**
   - `adjustment = tax + serviceCharge - discount`.
   - If `sum(base) > 0`, allocate `adjustment` proportionally to `base` using largest-remainder
     rounding.
   - If `sum(base) == 0`, allocate `adjustment` per head across adults.
   - Negative adjustments use the absolute value for ranking and apply the sign.

6. **Total gap**
   - `preTotal = sum(base) + adjustment`.
   - `gap = receiptTotal - preTotal`.
   - If `gap != 0`, distribute it proportionally to `base + adjustment` using largest-remainder
     rounding.
   - If all weights are zero, distribute per head across adults.

7. **Final shares**
   - `total = base + adjustment + gap`.
   - Assert `sum(total) == receiptTotal`.
   - Assert each `total` is an integer centavo.

8. **No-items fallback**
   - If `items.isEmpty()`, skip item allocation and split `receiptTotal` per head across adults,
     adding each student's head to the covering adult.
   - This is equivalent to treating the whole total as a shared item.

9. **Ordering**
   - Return shares in the stable adult `order`.
   - Return `headcount`, `itemSubtotalCentavos`, `appliedAdjustmentCentavos`, and `gapCentavos`.

### `computeBalances(outings, shares, settlements, adultIds): List<Balance>`

- Considers only finalized, non-deleted outings.
- `paidCentavos` = sum of totals where the adult is payer.
- `owedCentavos` = sum of the adult's finalized share totals.
- `settledOutCentavos` = sum of non-voided settlements from the adult.
- `settledInCentavos` = sum of non-voided settlements to the adult.
- `netCentavos = paid - owed + settledOut - settledIn`.
- Returns one entry per adult in stable order.

### `suggestSettlements(balances): List<Transfer>`

- Split into debtors (`net < 0`) and creditors (`net > 0`).
- Greedily match the largest debtor to the largest creditor.
- Transfer `min(abs(debt), credit)`.
- Ignore zero balances.
- Sum of transfers settles every balance to zero.

## Rounding Contract

```kotlin
/**
 * Splits [amount] into [weights.size] integer parts proportional to [weights].
 * - If all weights are zero, uses equal weights.
 * - Floors each exact share, then distributes the remaining centavos to the largest
 *   fractional remainders.
 * - Ties break by the supplied stable order.
 * - Negative [amount] is allocated by absolute value and the sign is reapplied.
 * - The returned parts always sum exactly to [amount].
 */
fun allocateProportionally(amount: Centavos, weights: List<Centavos>): List<Centavos>
```

## Invariants

1. `sum(result.shares.totalCentavos) == input.receiptTotalCentavos`.
2. Every share is an integer centavo.
3. `sum(ownItems + studentItems + sharedHead + coveredStudentShared) == sum(item.amountCentavos)`.
4. `sum(adjustment) == tax + serviceCharge - discount`.
5. `sum(gap) == receiptTotal - (itemSubtotal + adjustment)`.
6. No item is assigned to more than one person.
7. Every present student has exactly one covering adult.
8. A student-assigned item is charged to the covering adult.
9. Shared items are split per head across all present people.
10. The no-items fallback produces a per-head split.
11. Negative discounts and negative gaps are handled without losing a centavo.
12. The function does not mutate its input.

## Worked Example

Four adults, two present students: Ana covered by CP, Ben covered by Mai.

| Item | Amount | Assignment |
|---|---:|---|
| CP meal | ₱200 | CP |
| Mai meal | ₱100 | Mai |
| Ana meal | ₱150 | Ana |
| Ben meal | ₱120 | Ben |
| Shared rice | ₱180 | Shared |

- Headcount = 6; shared rice = ₱30 per head.
- CP base = ₱200 + ₱150 + ₱30 + ₱30 = ₱410.
- Mai base = ₱100 + ₱120 + ₱30 + ₱30 = ₱280.
- Kent base = ₱30.
- Llanmer base = ₱30.
- Food subtotal = ₱750. Tax ₱75 is allocated proportionally:
  - CP ₱41, Mai ₱28, Kent ₱3, Llanmer ₱3.
- Final shares sum to ₱825.
