# Data Model: Salo — Android Meal Ledger

**Feature**: `001-salo-expense-sharing` | **Storage**: Room (local source of truth), Supabase JSONB snapshot (private backup)

All money fields are integer centavos (`Long`). All ids are UUID strings. Timestamps are ISO-8601
strings or epoch milliseconds, stored consistently in Room.

## Entities

### AdultProfile

One of the four local profiles on the owner's phone.

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `displayName` | String | CP, Mai, Kent, Llanmer |
| `order` | Int | Stable display/rounding order |
| `email` | String? | Optional; not used for sign-in |
| `isOwner` | Boolean | Exactly one owner profile |
| `createdAt` | Long | Creation time |
| `archivedAt` | Long? | Soft delete; the four core profiles are not archived |

### Student

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `name` | String | 1–40 characters |
| `notes` | String? | Optional, minimal |
| `active` | Boolean | 1–10 active students |
| `createdAt` | Long | Creation time |
| `archivedAt` | Long? | Soft delete; history remains |

### Outing

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `date` | String (yyyy-MM-dd) | Required |
| `place` | String? | Optional |
| `notes` | String? | Optional |
| `payerAdultId` | String | Exactly one payer |
| `status` | Enum | `DRAFT`, `FINAL` |
| `createdByAdultId` | String | Selected adult profile |
| `createdAt` | Long | Creation time |
| `finalizedAt` | Long? | Set on finalization |
| `deletedAt` | Long? | Soft delete |

### Receipt

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `outingId` | String | One receipt per outing |
| `merchant` | String? | Optional |
| `receiptDate` | String? | Optional |
| `imagePath` | String? | Legacy only; no new images; excluded from backup |
| `totalCentavos` | Long | Item sum or explicit manual total; > 0 |
| `taxCentavos` | Long | Legacy only; new outings write 0 |
| `serviceChargeCentavos` | Long | Legacy only; new outings write 0 |
| `discountCentavos` | Long | Legacy only; new outings write 0 |
| `ocrEngine` | String? | `MANUAL` for new outings; legacy rows may say `ML_KIT` |
| `createdAt` | Long | Creation time |

### ReceiptItem

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `outingId` | String | Parent outing |
| `receiptId` | String | Parent receipt |
| `name` | String | Required |
| `quantity` | Int | >= 1 |
| `unitAmountCentavos` | Long | >= 0 |
| `amountCentavos` | Long | `quantity * unitAmountCentavos` unless manually overridden |
| `assignmentType` | Enum | `ADULT`, `STUDENT`, `SHARED`, `UNASSIGNED` |
| `assignedAdultId` | String? | Required when `assignmentType == ADULT` |
| `assignedStudentId` | String? | Required when `assignmentType == STUDENT` |
| `sortOrder` | Int | Stable display order |
| `createdAt` | Long | Creation time |
| `updatedAt` | Long | Last edit |

Rules:
- Exactly one assignee for `ADULT` and `STUDENT`.
- `SHARED` has no adult/student id.
- `UNASSIGNED` blocks finalization.
- Assigning `STUDENT` auto-marks the student present.
- Splitting an item creates two rows with new ids and independent assignments.
- Merging requires compatible assignment or asks the owner to resolve the combined assignment.

### CoverageAssignment

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `outingId` | String | Parent outing |
| `studentId` | String | Present student |
| `adultId` | String | Covering adult |
| `createdAt` | Long | Creation time |

Unique: `(outingId, studentId)`; one adult per student per outing.

### Share

Persisted at finalization and immutable afterwards.

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `outingId` | String | Parent outing |
| `adultId` | String | Adult profile |
| `ownItemsCentavos` | Long | Items assigned directly to the adult |
| `studentItemsCentavos` | Long | Items assigned to covered students |
| `sharedHeadCentavos` | Long | Adult's own head share of shared items |
| `coveredStudentSharedCentavos` | Long | Shared head shares of covered students |
| `adjustmentCentavos` | Long | Legacy tax + service − discount; 0 for new outings |
| `gapCentavos` | Long | Difference from a manual override or legacy total |
| `totalCentavos` | Long | Final share; sums exactly to the outing total |
| `isPayer` | Boolean | One payer per outing |
| `createdAt` | Long | Finalization time |

### Settlement

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `fromAdultId` | String | Paying adult |
| `toAdultId` | String | Receiving adult |
| `amountCentavos` | Long | > 0 |
| `date` | String (yyyy-MM-dd) | Required |
| `note` | String? | Optional |
| `voidedAt` | Long? | Soft void |
| `createdAt` | Long | Creation time |

Settlements are append-only; voiding sets `voidedAt`.

### AuditEvent

| Field | Type | Rules |
|---|---|---|
| `id` | String (UUID) | Primary key |
| `outingId` | String | Corrected outing |
| `actorAdultId` | String | Selected adult profile |
| `action` | String | e.g. `REOPEN`, `CORRECT_TOTAL`, `CORRECT_COVERAGE` |
| `beforeJson` | String | Snapshot before the change |
| `afterJson` | String | Snapshot after the change |
| `createdAt` | Long | Creation time |

### BackupState

| Field | Type | Rules |
|---|---|---|
| `id` | Int | Singleton row |
| `status` | Enum | `LOCAL_ONLY`, `BACKING_UP`, `BACKED_UP`, `ERROR` |
| `lastSuccessAt` | Long? | Last successful snapshot |
| `lastAttemptAt` | Long? | Last attempt |
| `lastSnapshotId` | String? | Supabase snapshot id |
| `lastError` | String? | Human-readable error |
| `updatedAt` | Long | Last update |

## Relationships

```text
Ledger (single)
├── AdultProfile (4)
├── Student (1–10 active)
├── Outing
│   ├── Receipt (1)
│   │   └── ReceiptItem (0..n)
│   ├── CoverageAssignment (0..n)
│   ├── Share (4 when finalized)
│   ├── Settlement (0..n, ledger-wide)
│   └── AuditEvent (0..n)
└── BackupState (1)
```

Settlements are ledger-wide rather than outing-specific; they reduce running balances.

## Backup Snapshot

The Supabase payload is a versioned JSON object containing:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-11-07T00:00:00Z",
  "deviceId": "uuid",
  "ledger": { "name": "Salo", "currency": "PHP" },
  "adults": [],
  "students": [],
  "outings": [],
  "receipts": [],
  "items": [],
  "coverage": [],
  "shares": [],
  "settlements": [],
  "auditEvents": []
}
```

Excluded: legacy receipt image paths, local file URIs, Supabase session tokens, and Google credentials.

## Invariants

1. Money is integer centavos; no floating point.
2. Every finalized share sums exactly to `receipt.totalCentavos`.
3. Every item has one assignment or is explicitly shared; unassigned items block finalization.
4. Every present student has exactly one covering adult.
5. Student-assigned items charge the covering adult.
6. Shared items split per head across four adults plus present students.
7. New outings use the item sum; a manual override and legacy adjustments use proportional
   largest-remainder allocation.
8. One payer per outing.
9. Finalized shares and item assignments are immutable snapshots.
10. Deleting/archiving a student does not change finalized history.
11. Restore only occurs into an empty local database.
12. Receipt images are never captured and never appear in the backup payload.
