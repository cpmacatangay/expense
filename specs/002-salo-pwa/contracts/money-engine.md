# Contract: Money Engine

**Feature**: `002-salo-pwa` | **Consumers**: outing preview, server finalization, tests

The money engine is pure TypeScript with no DOM, network, or database dependencies. The same module
runs in the client preview and in the finalization Edge Function.

## Types

```ts
type Centavos = number; // safe integer centavos only

type AssignmentType = "ADULT" | "STUDENT" | "SHARED";

interface PresentAdult {
  id: string;
  displayName: string;
  order: number;
}

interface PresentStudent {
  id: string;
  displayName: string;
  coveringAdultId: string;
}

interface ReceiptItemInput {
  id: string;
  name: string;
  quantity: number;
  unitAmountCentavos: Centavos;
  amountCentavos: Centavos;
  assignmentType: AssignmentType;
  assignedAdultId?: string | null;
  assignedStudentId?: string | null;
}

interface AllocationInput {
  totalCentavos: Centavos;
  payerAdultId: string;
  presentAdults: PresentAdult[];
  presentStudents: PresentStudent[];
  items: ReceiptItemInput[];
}

interface ShareAllocation {
  adultId: string;
  ownItemsCentavos: Centavos;
  studentItemsCentavos: Centavos;
  sharedHeadCentavos: Centavos;
  coveredStudentSharedCentavos: Centavos;
  totalDifferenceCentavos: Centavos;
  totalCentavos: Centavos;
  isPayer: boolean;
}

interface AllocationResult {
  shares: ShareAllocation[];
  presentAdultCount: number;
  presentStudentCount: number;
  itemSubtotalCentavos: Centavos;
  totalDifferenceCentavos: Centavos;
}
```

## Validation

`validate(input)` returns issues; finalization is blocked when any exists:

- `totalCentavos` is a safe integer and greater than zero.
- At least two present adults.
- The payer is a present adult.
- Present adult ids are unique; present student ids are unique.
- Every present student has a covering adult who is present.
- Item names are non-empty; quantity ≥ 1; unit amount ≥ 0; amount = quantity × unit.
- Every item is `ADULT`, `STUDENT`, or `SHARED`.
- An `ADULT` item targets a present adult and has no student id.
- A `STUDENT` item targets a present student and has no adult id.
- A `SHARED` item has neither assignment id.
- An item assigned to a student implies that student is present.
- No item is assigned to an adult who is not present.
- The total is greater than zero.

## Allocation Steps

1. **Own items**: add each `ADULT` item amount to that adult's `ownItemsCentavos`.
2. **Student items**: add each `STUDENT` item amount to the covering adult's
   `studentItemsCentavos`.
3. **Shared items**:
   - `headcount = presentAdults.length + presentStudents.length`.
   - Split the shared total across headcount using largest-remainder rounding.
   - Add each present adult's head share to `sharedHeadCentavos`.
   - Add each present student's head share to the covering adult's
     `coveredStudentSharedCentavos`.
4. **Base**: `base = ownItems + studentItems + sharedHead + coveredStudentShared`.
5. **No-items fallback**: when there are no items, split `totalCentavos` across the same headcount and
   add adult head shares to `sharedHeadCentavos` and student head shares to
   `coveredStudentSharedCentavos`.
6. **Difference**: `difference = totalCentavos - sum(base)`. Distribute it proportionally to `base`
   using largest-remainder rounding. If every base is zero, distribute per head across present adults.
   This handles a manual total override and the per-head fallback.
7. **Final shares**: `totalCentavos = base + difference`.
8. **Assertions**:
   - `sum(shares.totalCentavos) === input.totalCentavos`.
   - Every share is a non-negative safe integer.
   - Every present adult appears exactly once.

## Rounding

- Integer centavos only; no floating point for money.
- Floor each proportional share, then distribute remaining centavos by largest fractional remainder.
- Ties break by the stable adult order.
- Negative differences use the absolute value for ranking and reapply the sign.
- Per-head allocations use the same largest-remainder rule, so the head shares sum exactly.

## Invariants

1. Finalized shares sum exactly to the outing total.
2. Every present adult gets one share; absent adults get none.
3. Every present student's share is charged to their covering present adult.
4. Shared items and the no-items fallback use present adults + present students.
5. A manual total override is distributed proportionally; the sum still matches the total.
6. No tax, service charge, discount, or printed-receipt reconciliation is applied.
7. The engine does not mutate its input.
8. The server recomputes the split; client-computed shares are never trusted as final.

## Worked Example

Four present adults (CP, Mai, Kent, Llanmer) and two present students (Ana covered by CP, Ben covered by
Mai). Items: CP ₱200, Mai ₱100, Ana ₱150, Ben ₱120, shared rice ₱180.

- Headcount = 6; shared rice = ₱30 per head.
- CP base = ₱200 + ₱150 + ₱30 + ₱30 = ₱410.
- Mai base = ₱100 + ₱120 + ₱30 + ₱30 = ₱280.
- Kent base = ₱30.
- Llanmer base = ₱30.
- Item sum = ₱750; no difference; shares sum to ₱750.

If only CP, Mai, and Ana are present (2 adults + 1 student), the headcount is 3 and Kent and Llanmer
receive no share.

## Edge Cases

- Two present adults, zero students: headcount 2.
- Twelve present adults, ten present students: headcount 22.
- All items shared: the entire item total is distributed per head.
- No items: the total is distributed per head.
- Manual total lower than the item sum: the difference is negative and distributed proportionally.
- Manual total higher than the item sum: the difference is positive and distributed proportionally.
- A pending adult is present: they are a present adult for the split, but they cannot sign in or
  confirm settlements until claimed.
- A reopened outing: the saved total is Fixed; the engine uses that total, not the current item sum.
