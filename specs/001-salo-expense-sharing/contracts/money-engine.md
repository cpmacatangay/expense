# Contract: Money Engine

**Module**: `src/lib/money/` | **Consumers**: outing wizard, ledger, reports, tests

The money engine is pure TypeScript with no browser, React, or Supabase dependencies. It is the only
place that computes peso amounts.

## Types

```ts
type Centavos = number; // integer, 0 <= value <= Number.MAX_SAFE_INTEGER

interface SplitInput {
  totalCentavos: Centavos;
  memberIds: readonly [string, string, string];
  presentStudentIds: readonly string[];
  coverageByStudent: Readonly<Record<string, string>>; // studentId -> memberId
}

interface ShareDraft {
  memberId: string;
  ownHead: 1;
  coveredStudents: number;
  heads: number;
  amountCentavos: Centavos;
}

interface SplitResult {
  headcount: number;             // 4 + presentStudentIds.length
  perHeadCentavos: Centavos;     // floor(total / headcount), display only
  shares: ShareDraft[];          // one entry per memberId (four in the Salo group), ordered by memberIds
  remainderCentavos: Centavos;   // total - perHeadCentavos * headcount
}

interface Balance {
  memberId: string;
  paidCentavos: Centavos;
  owedCentavos: Centavos;
  settledOutCentavos: Centavos;
  settledInCentavos: Centavos;
  netCentavos: Centavos; // positive = is owed, negative = owes
}

interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountCentavos: Centavos;
}

interface FairnessTally {
  memberId: string;
  studentHeads: number;
  amountCoveredCentavos: Centavos;
}
```

## Functions

### `splitOuting(input: SplitInput): SplitResult`

- Requires `totalCentavos > 0`.
- Requires at least two unique `memberIds`.
- Requires `coverageByStudent` to contain exactly one entry per present student, with a member id
  from `memberIds`.
- Computes `headcount = memberIds.length + presentStudentIds.length` (7 with four adults and three
  present students).
- Computes `perHeadCentavos = Math.floor(totalCentavos / headcount)`.
- Computes each raw share as `totalCentavos * heads / headcount`.
- Floors each exact share, then distributes the remaining centavos one at a time to the shares with
  the largest fractional remainder.
- Tie-break for equal remainders is stable member order as supplied in `memberIds`.
- Guarantees `sum(shares.amountCentavos) === totalCentavos`.
- Does not mutate input.

### `validateSplit(result: SplitResult, input: SplitInput): ValidationIssue[]`

Returns an empty array when all invariants hold. Issues include:

- total is not a positive integer number of centavos;
- coverage is missing, duplicated, or references an unknown member/student;
- headcount mismatch;
- share sum mismatch;
- more than one payer marker (payer is stored separately on the outing).

### `computeBalances(outings, shares, settlements, memberIds): Balance[]`

- Considers only finalized, non-deleted outings.
- `paidCentavos` = sum of totals where the member is the payer.
- `owedCentavos` = sum of the member's share amounts.
- `settledOutCentavos` = sum of non-voided settlements from the member.
- `settledInCentavos` = sum of non-voided settlements to the member.
- `netCentavos = paid - owed + settledOut - settledIn`.
- Returns one entry per member, ordered by `memberIds`.

### `suggestSettlements(balances): Transfer[]`

- Splits balances into debtors (`net < 0`) and creditors (`net > 0`).
- Greedily matches the largest debtor to the largest creditor, transferring
  `min(abs(debt), credit)`.
- Returns transfers in centavos. The sum of transfers settles every balance to zero.
- Ignores zero balances.

### `computeFairness(outings, shares, coverage, range): FairnessTally[]`

- Considers finalized, non-deleted outings within `range.start` and `range.end` inclusive.
- For each coverage row, adds one student head and `outing.perHeadCentavos` to the covering adult.
- Returns one entry per member, ordered by `memberIds`.
- The amount is a tracking metric; the authoritative money is in `shares`.

### `autoAssign(presentStudentIds, memberIds, fairness, lastCoveredByStudent): Record<string, string>`

- Ranks adults by `studentHeads` ascending, then `amountCoveredCentavos` ascending, then the
  least-recently-covered date for the specific student ascending, then member order.
- Assigns each student in roster order to the current best adult and updates that adult's local
  tally before the next student.
- Returns a complete mapping of every present student to exactly one adult.
- A manual assignment always overrides the result.

## Invariants

1. Every amount is an integer number of centavos.
2. `sum(shares.amountCentavos) === totalCentavos` for every successful split.
3. Each present student appears exactly once in coverage.
4. `sum(heads) === headcount`.
5. All four adults are present and have `ownHead = 1`.
6. The engine never reads or writes storage, network, or UI state.
7. Rounding is deterministic for the same input and member order.

## Test Requirements

- Unit tests for 1, 2, and 3 students, equal and unequal coverage.
- Rounding cases where the total does not divide evenly (e.g., ₱1,000 across 7 heads).
- Property tests with fast-check: random totals, attendance, and coverage always produce a valid
  split whose shares sum to the total.
- Balance and settlement tests with multiple payers, partial payments, and voided settlements.
- Fairness tests across date ranges and tie-break cases.
