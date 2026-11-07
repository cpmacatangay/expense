# Data Model: Salo — Student Meal Expense Sharing

**Feature**: `001-salo-expense-sharing` | **Date**: 2026-11-07

## Conventions

- All identifiers are client-generated UUID v4 values so records can be created offline.
- All monetary values are integer centavos (`bigint` in Postgres, `number` in TypeScript). Floating
  point is never used for money.
- Timestamps are `timestamptz` in UTC; date-only fields are `date` in the group's local calendar.
- Deletions are soft (`deleted_at`) so sync and history remain recoverable.
- `updated_at` is maintained by a Postgres trigger and used for conflict resolution.
- The shared database is the source of truth; IndexedDB mirrors the same shapes locally.

## Shared Entities

### Group

Represents the private circle.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Not null, default `Salo` |
| `currency` | char(3) | Not null, default `PHP` |
| `created_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Not null, default now |
| `updated_at` | timestamptz | Not null, default now |

**Validation**: exactly one group is used by the app. `currency` is fixed to `PHP` in the UI.

### GroupMember (Adult)

Represents one of the four adults.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | Not null, references `groups(id)` on delete cascade |
| `user_id` | uuid | Nullable until the adult signs in; references `auth.users(id)` |
| `display_name` | text | Not null |
| `email` | citext | Not null, unique within the group |
| `role` | text | Not null, default `adult`, check in (`adult`) |
| `created_at` | timestamptz | Not null, default now |
| `updated_at` | timestamptz | Not null, default now |

**Validation**: a group has exactly four non-deleted members. `email` must match the Google
account used to sign in. An invited member is linked on first sign-in by matching `email`.

### Student

Represents a student who may be covered.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | Not null, references `groups(id)` on delete cascade |
| `name` | text | Not null, 1–80 characters |
| `notes` | text | Nullable, max 500 characters |
| `is_active` | boolean | Not null, default true |
| `created_at` | timestamptz | Not null, default now |
| `updated_at` | timestamptz | Not null, default now |
| `deleted_at` | timestamptz | Nullable |

**Validation**: the roster supports 1–10 active students. Names are display names or nicknames only;
contact details and photos are not stored. Archiving sets `is_active = false` and preserves history.

### Outing

Represents one meal event.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | Not null, references `groups(id)` on delete cascade |
| `outing_date` | date | Not null, default current date |
| `place` | text | Nullable, max 120 characters |
| `notes` | text | Nullable, max 500 characters |
| `payer_member_id` | uuid | Nullable while draft; not null when final; references `group_members(id)` |
| `status` | text | Not null, default `draft`, check in (`draft`, `final`) |
| `total_centavos` | bigint | Not null, check > 0 |
| `headcount` | integer | Not null when final, check >= 3 |
| `per_head_centavos` | bigint | Nullable while draft; computed when final |
| `created_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Not null, default now |
| `updated_at` | timestamptz | Not null, default now |
| `finalized_at` | timestamptz | Nullable |
| `deleted_at` | timestamptz | Nullable |

**State transitions**:

```text
draft ──finalize──▶ final
  │                   │
  │                   └──reopen (audited)──▶ draft
  └──delete──▶ deleted
```

A finalized outing is an immutable snapshot. Reopening requires confirmation, warns when
settlements exist, recomputes shares, and writes an audit event. Only draft outings may be deleted
directly; a finalized outing must be reopened first.

### Receipt

Represents the single receipt for an outing.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `outing_id` | uuid | Not null, unique, references `outings(id)` on delete cascade |
| `storage_path` | text | Nullable until the photo upload succeeds |
| `merchant` | text | Nullable, max 120 characters |
| `receipt_date` | date | Nullable |
| `subtotal_centavos` | bigint | Nullable, check >= 0 |
| `tax_centavos` | bigint | Nullable, check >= 0 |
| `service_centavos` | bigint | Nullable, check >= 0 |
| `discount_centavos` | bigint | Nullable, check >= 0 |
| `tip_centavos` | bigint | Nullable, check >= 0 |
| `total_centavos` | bigint | Not null, check > 0 |
| `raw_text` | text | Nullable; retained for review and parser debugging |
| `ocr_engine` | text | Nullable, check in (`mlkit`, `tesseract`, `manual`) |
| `parser_version` | text | Nullable |
| `created_at` | timestamptz | Not null, default now |
| `updated_at` | timestamptz | Not null, default now |

**Validation**: the confirmed `total_centavos` is authoritative. Line items do not need to sum to
the total; a mismatch produces a warning, not a block. Tax, service charge, discount, and tip are
informational because the total already includes them.

### ReceiptItem

Optional receipt line kept for transparency.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `receipt_id` | uuid | Not null, references `receipts(id)` on delete cascade |
| `description` | text | Not null, 1–200 characters |
| `quantity` | numeric(10,3) | Nullable, check > 0 |
| `unit_price_centavos` | bigint | Nullable, check >= 0 |
| `line_total_centavos` | bigint | Not null, check >= 0 |
| `confidence` | numeric(4,3) | Nullable, check between 0 and 1 |
| `sort_order` | integer | Not null, default 0 |

### OutingStudent (Attendance)

Records which students were present.

| Field | Type | Constraints |
|---|---|---|
| `outing_id` | uuid | Not null, references `outings(id)` on delete cascade |
| `student_id` | uuid | Not null, references `students(id)` |
| `present` | boolean | Not null, default true |
| Primary key | (`outing_id`, `student_id`) | |

**Validation**: only present students appear as coverage candidates. An adults-only outing has zero
rows.

### Coverage

Assigns a present student to exactly one adult.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `outing_id` | uuid | Not null, references `outings(id)` on delete cascade |
| `student_id` | uuid | Not null, references `students(id)` |
| `member_id` | uuid | Not null, references `group_members(id)` |
| `created_at` | timestamptz | Not null, default now |

**Validation**: unique (`outing_id`, `student_id`). The member must belong to the same group as the
outing. Every present student has exactly one coverage row at finalization.

### Share

The finalized amount owed by one adult for one outing.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `outing_id` | uuid | Not null, references `outings(id)` on delete cascade |
| `member_id` | uuid | Not null, references `group_members(id)` |
| `own_head` | integer | Not null, default 1, check in (0, 1) |
| `covered_students` | integer | Not null, check >= 0 |
| `amount_centavos` | bigint | Not null, check >= 0 |
| `is_payer` | boolean | Not null, default false |
| Unique | (`outing_id`, `member_id`) | |

**Validation**: `sum(amount_centavos) = outings.total_centavos`. Exactly one share per outing has
`is_payer = true`. `own_head` is 1 for all four adults because all four are always present.

### Settlement

A payment between two adults.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | Not null, references `groups(id)` on delete cascade |
| `from_member_id` | uuid | Not null, references `group_members(id)` |
| `to_member_id` | uuid | Not null, references `group_members(id)` |
| `amount_centavos` | bigint | Not null, check > 0 |
| `settled_on` | date | Not null, default current date |
| `note` | text | Nullable, max 300 characters |
| `created_by` | uuid | References `auth.users(id)` |
| `created_at` | timestamptz | Not null, default now |
| `voided_at` | timestamptz | Nullable |

**Validation**: `from_member_id <> to_member_id`. Settlements are append-only; corrections are made
by voiding and creating a new settlement. A voided settlement is excluded from balances.

### AuditEvent

Records a correction to a finalized record.

| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | Not null, references `groups(id)` on delete cascade |
| `actor_member_id` | uuid | Not null, references `group_members(id)` |
| `entity` | text | Not null |
| `entity_id` | uuid | Not null |
| `action` | text | Not null, e.g. `outing.reopened`, `outing.corrected` |
| `payload` | jsonb | Not null; before/after values and reason |
| `created_at` | timestamptz | Not null, default now |

## Local-Only Entities

### SyncOutbox

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid | Primary key |
| `entity` | text | Table name |
| `entity_id` | uuid | Row identifier |
| `action` | text | `upsert`, `delete` |
| `payload` | jsonb | Serialized row |
| `created_at` | timestamptz | Ordering |
| `attempts` | integer | Retry count |
| `last_error` | text | Last failure |
| `next_attempt_at` | timestamptz | Backoff |

### SyncState

| Field | Type | Purpose |
|---|---|---|
| `key` | text | Primary key, e.g. `last_pulled_at` |
| `value` | text | Serialized value |

### LocalPhoto

| Field | Type | Purpose |
|---|---|---|
| `id` | uuid | Primary key; matches receipt id |
| `outing_id` | uuid | Relationship |
| `blob` | blob | Compressed JPEG |
| `mime` | text | `image/jpeg` |
| `uploaded` | boolean | Upload status |
| `remote_path` | text | Supabase Storage path after upload |

## Relationships

```text
Group 1 ─── * GroupMember
Group 1 ─── * Student
Group 1 ─── * Outing
Outing 1 ─── 1 Receipt
Receipt 1 ─── * ReceiptItem
Outing 1 ─── * OutingStudent * ─── 1 Student
Outing 1 ─── * Coverage * ─── 1 GroupMember
Outing 1 ─── * Share * ─── 1 GroupMember
Group 1 ─── * Settlement * ─── 1 GroupMember (from/to)
Group 1 ─── * AuditEvent
```

## Row-Level Security

- A helper function `is_group_member(group_id)` returns true when the authenticated user is linked to
  a `group_members` row in that group.
- Select, insert, update, and delete policies on all shared tables require `is_group_member`.
- `group_members` policies allow a member to read the group roster; only the group owner may invite
  or remove adults.
- Students, outings, receipts, receipt items, attendance, coverage, shares, settlements, and audit
  events are readable and writable only by members of their group.
- The storage bucket `receipts` is private. Object paths begin with `group_id/`; storage policies
  check `is_group_member` for the first path segment.
- The anon key is the only Supabase credential in the client. The service-role key is used only by
  migration and seed scripts.

## Storage Layout

```text
receipts/
└── {group_id}/
    └── {outing_id}/
        └── {receipt_id}.jpg
```

Photos are compressed to a maximum long edge of 1600 px at JPEG quality 0.7 before upload. The
local IndexedDB copy is kept until the upload succeeds.

## Indexes

- `group_members(group_id, email)` unique.
- `students(group_id, is_active, name)`.
- `outings(group_id, outing_date desc)` and `outings(group_id, status)`.
- `receipts(outing_id)` unique.
- `receipt_items(receipt_id, sort_order)`.
- `outing_students(outing_id)`.
- `coverage(outing_id, student_id)` unique and `coverage(outing_id, member_id)`.
- `shares(outing_id, member_id)` unique.
- `settlements(group_id, settled_on desc)`.
- `audit_events(group_id, created_at desc)`.

## Money Invariants

These invariants are enforced by the money engine and verified in tests and database checks:

1. `sum(shares.amount_centavos) = outing.total_centavos` for every finalized outing.
2. `outing.headcount = 4 + count(present students)`.
3. `count(coverage) = count(present students)`.
4. `sum(own_head + covered_students) = outing.headcount`.
5. Exactly one share per finalized outing has `is_payer = true`.
6. Every present student is assigned to exactly one adult.
7. `per_head_centavos` is the display value; exact shares use the largest-remainder computation.
8. A settlement never changes a finalized share; it only changes the derived running balance.

## Derived Views

### Balances

For each adult:

```text
paid = sum(total_centavos of finalized outings where payer = adult)
owed = sum(shares.amount_centavos where member = adult)
settled_out = sum(settlements.amount_centavos where from = adult and not voided)
settled_in = sum(settlements.amount_centavos where to = adult and not voided)
balance = paid - owed + settled_out - settled_in
```

Positive balance means the adult is owed money; negative means the adult owes money.

### Fairness Tally

For each finalized outing and each coverage row:

```text
student_heads += 1
amount_covered += outing.per_head_centavos
```

Group by adult and filter by the `outing_date` range.

### Settlement Suggestions

Greedy matching of negative balances (debtors) to positive balances (creditors), producing a
minimal list of transfers in centavos.
