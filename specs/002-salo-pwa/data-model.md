# Data Model: Salo Shared PWA

**Feature**: `002-salo-pwa` | **Date**: 2026-11-09

This document defines the shared relational model, the local-first draft model, and the access rules.
It intentionally avoids SQL bodies; the migrations and Edge Functions are implementation artifacts.

## Overview

The shared backend is authoritative. The client caches reads in IndexedDB and keeps private drafts
locally. Every group-scoped row carries a `group_id`, and group isolation is enforced by row-level
security.

The model separates:

- **accounts** (`profiles`),
- **group membership and adult identities** (`group_adults`),
- **invitations** (`invitations`),
- **students** (`students`),
- **outings and their snapshots** (`outings`, `outing_adults`, `outing_students`, `items`, `shares`),
- **settlements** (`settlements`),
- **activity** (`activity_events`).

## Enumerations

| Enum | Values | Notes |
|---|---|---|
| `group_status` | `active`, `archived`, `deleted` | Soft delete keeps data for the 30-day retention window. |
| `adult_status` | `pending`, `active`, `removed` | Pending adults have no profile; removed adults stay for history. |
| `student_status` | `active`, `archived` | Archived students keep historical shares. |
| `outing_status` | `private_draft`, `draft`, `finalized`, `reopened` | Private drafts are author/owner only. |
| `total_mode` | `auto`, `manual`, `fixed` | Fixed is used by reopened outings. |
| `assignment_type` | `adult`, `student`, `shared` | No unassigned rows may reach finalization. |
| `settlement_status` | `pending`, `confirmed`, `declined`, `void` | Only confirmed affects balances. |

## Tables

### `profiles`

A signed-in account. Mirrors the auth user and stores the display name.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key; references the auth user |
| `email` | text | Not null; set from auth |
| `display_name` | text | 1–50 characters; required |
| `created_at` | timestamptz | Default now |
| `updated_at` | timestamptz | Updated on change |

### `groups`

A shared ledger.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | 1–60 characters; required |
| `color` | text | One of a fixed Salo set |
| `owner_id` | uuid | References `profiles.id`; one owner |
| `currency` | text | Fixed `PHP` in v1 |
| `timezone` | text | Fixed `Asia/Manila` in v1 |
| `status` | `group_status` | Default `active` |
| `archived_at` | timestamptz | Null unless archived |
| `deleted_at` | timestamptz | Null unless soft-deleted |
| `created_at` | timestamptz | Default now |

Constraints:
- The owner must be an active adult in the group.
- An outing must have at least two present adults to finalize; a group may start with one owner plus
  pending adults.
- Maximum 12 adult identities, including pending and removed? Removed adults do not count against
  capacity; pending and active do.

### `group_adults`

Membership and adult identity. A group adult is either pending (no profile), active (linked profile),
or removed (kept for history).

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | References `groups.id`; cascade |
| `profile_id` | uuid | Null for pending or removed; references `profiles.id` |
| `display_name` | text | 1–50 characters; required |
| `color` | text | Initials color from the fixed set |
| `status` | `adult_status` | Default `pending` |
| `payment_qr_path` | text | Nullable; private storage path for the primary payment QR |
| `payment_qr_label` | text | Optional; 1–40 characters, e.g. GCash, Maya, BPI |
| `payment_qr_updated_at` | timestamptz | Set when the QR is added, replaced, or removed |
| `joined_at` | timestamptz | Set when claimed |
| `removed_at` | timestamptz | Set on soft removal |
| `created_at` | timestamptz | Default now |

Constraints:
- Unique `(group_id, profile_id)` when `profile_id` is not null.
- `profile_id` is null when `status = pending`.
- `profile_id` is not null when `status = active`.
- A removed adult may keep or clear `profile_id`; history keeps `display_name`.
- The owner is an active `group_adults` row whose `profile_id = groups.owner_id`.
- At most one primary payment QR per adult identity.
- A pending adult's QR is managed by the owner; an active adult manages their own.
- A soft-removed adult's payment QR path is cleared and the object is deleted; the adult's history remains.

### `invitations`

A revocable, expiring invitation bound to one pending adult.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | References `groups.id` |
| `adult_id` | uuid | References `group_adults.id`; must be pending |
| `token_hash` | text | Hash of the random invite token |
| `code_hash` | text | Hash of the six-character code |
| `created_by` | uuid | References `profiles.id`; must be the owner |
| `expires_at` | timestamptz | Default 7 days after creation |
| `revoked_at` | timestamptz | Null unless revoked |
| `accepted_by` | uuid | Null until accepted |
| `accepted_at` | timestamptz | Null until accepted |
| `created_at` | timestamptz | Default now |

Constraints:
- One open invitation per pending adult; creating a new one revokes the previous.
- Accepting consumes the invitation and activates the adult.
- Codes and tokens are never stored in plaintext.

### `students`

A group-scoped student covered by an adult.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | References `groups.id` |
| `name` | text | 1–50 characters |
| `notes` | text | Optional; maximum 500 characters |
| `status` | `student_status` | Default `active` |
| `archived_at` | timestamptz | Null unless archived |
| `created_at` | timestamptz | Default now |

### `outings`

A meal event. A private draft is an outing with restricted visibility until published.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | References `groups.id` |
| `author_profile_id` | uuid | Creator; references `profiles.id` |
| `date` | date | Required; group timezone |
| `place` | text | Optional; maximum 120 characters |
| `notes` | text | Optional; maximum 1000 characters |
| `payer_adult_id` | uuid | References `group_adults.id`; must be present |
| `status` | `outing_status` | Default `draft` or `private_draft` |
| `total_mode` | `total_mode` | Default `auto` |
| `total_centavos` | bigint | Non-negative; must be > 0 to finalize |
| `version` | integer | Starts at 1; increments on every shared write |
| `finalized_at` | timestamptz | Null until finalized |
| `reopened_at` | timestamptz | Null unless reopened |
| `created_at` | timestamptz | Default now |
| `updated_at` | timestamptz | Updated on change |

Constraints:
- `status = private_draft` is visible only to `author_profile_id` and the group owner.
- `status = draft` is visible to all active group members.
- `status = finalized` requires shares that sum exactly to `total_centavos`.
- `status = reopened` uses `total_mode = fixed`; it may be edited and re-finalized.
- A finalized outing cannot be edited except through a reopen.
- `version` is the optimistic concurrency token.

### `outing_adults`

Attendance for one outing.

| Field | Type | Rules |
|---|---|---|
| `outing_id` | uuid | References `outings.id`; cascade |
| `adult_id` | uuid | References `group_adults.id` |
| `present` | boolean | Default false |

Constraints:
- Unique `(outing_id, adult_id)`.
- The payer must appear with `present = true`.
- At least two present adults are required to finalize.

### `outing_students`

Attendance and coverage for one outing.

| Field | Type | Rules |
|---|---|---|
| `outing_id` | uuid | References `outings.id`; cascade |
| `student_id` | uuid | References `students.id` |
| `present` | boolean | Default false |
| `covering_adult_id` | uuid | References `group_adults.id`; required when present |

Constraints:
- Unique `(outing_id, student_id)`.
- A present student must have a present covering adult.
- A student assigned to an item must be present.

### `items`

A line on an outing.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `outing_id` | uuid | References `outings.id`; cascade |
| `name` | text | 1–120 characters |
| `quantity` | integer | ≥ 1 |
| `unit_amount_centavos` | bigint | ≥ 0 |
| `amount_centavos` | bigint | `quantity × unit_amount_centavos` |
| `assignment_type` | `assignment_type` | Adult, student, or shared |
| `assigned_adult_id` | uuid | Required for adult; null otherwise |
| `assigned_student_id` | uuid | Required for student; null otherwise |
| `sort_order` | integer | Stable order within the outing |
| `created_at` | timestamptz | Default now |
| `updated_at` | timestamptz | Updated on change |

Constraints:
- Adult assignment references a present adult in the outing.
- Student assignment references a present student with coverage.
- Shared has neither assignment id.
- Items may only be written while the outing is a draft, private draft, or reopened.

### `shares`

Immutable per-adult snapshot written at finalization.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `outing_id` | uuid | References `outings.id`; cascade |
| `adult_id` | uuid | References `group_adults.id` |
| `own_items_centavos` | bigint | ≥ 0 |
| `student_items_centavos` | bigint | ≥ 0 |
| `shared_head_centavos` | bigint | ≥ 0 |
| `covered_student_shared_centavos` | bigint | ≥ 0 |
| `total_difference_centavos` | bigint | Manual override or per-head difference |
| `total_centavos` | bigint | ≥ 0 |
| `created_at` | timestamptz | Default now |

Constraints:
- Unique `(outing_id, adult_id)`.
- Sum of `total_centavos` equals the outing's `total_centavos`.
- Shares are written only by the finalization function.
- No updates; a reopen deletes the snapshot and recomputes on re-finalization, with an activity event.

### `settlements`

A payment from one adult to another.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | References `groups.id` |
| `from_adult_id` | uuid | Payer; references `group_adults.id` |
| `to_adult_id` | uuid | Payee; references `group_adults.id` |
| `amount_centavos` | bigint | > 0 |
| `date` | date | Required; group timezone |
| `note` | text | Optional; maximum 500 characters |
| `status` | `settlement_status` | Default `pending` |
| `recorded_by` | uuid | References `profiles.id` |
| `confirmed_by` | uuid | References `profiles.id`; null until decided |
| `decided_at` | timestamptz | Null until decided |
| `decline_reason` | text | Optional; required on decline |
| `voided_at` | timestamptz | Null unless voided |
| `voided_by` | uuid | References `profiles.id` |
| `created_at` | timestamptz | Default now |

Constraints:
- `from_adult_id <> to_adult_id`.
- The amount must not exceed the confirmed outstanding balance between the two adults minus any other
  pending settlements from the same payer to the same payee.
- Only the recipient may confirm or decline.
- Only the payer or owner may void.
- A declined or void settlement never affects balances.
- A confirmed settlement that is voided reverts the balance and records an activity event.

### `activity_events`

A group-scoped audit and activity record.

| Field | Type | Rules |
|---|---|---|
| `id` | uuid | Primary key |
| `group_id` | uuid | References `groups.id` |
| `actor_profile_id` | uuid | References `profiles.id`; null for system events |
| `action` | text | Enum-like action name |
| `entity_type` | text | Group, adult, invitation, student, outing, item, settlement |
| `entity_id` | uuid | Subject id |
| `before_json` | jsonb | Null for creates; sensitive changes only |
| `after_json` | jsonb | Null for deletes; sensitive changes only |
| `created_at` | timestamptz | Default now |

Constraints:
- Readable by active group members.
- Written by Edge Functions or database triggers, not directly by clients.
- Paginated newest first.

## Payment QR Storage

A payment QR is a convenience image, not ledger data. It lives in a private Supabase Storage bucket
named `payment-qrs`.

| Rule | Requirement |
|---|---|
| Path | `{group_id}/{adult_id}/qr` |
| Formats | PNG or JPEG |
| Size | Maximum 2 MB |
| Metadata | Strip EXIF and other unnecessary metadata before upload |
| Access | Active members of the group only; no public URLs |
| Serving | Short-lived signed URL, maximum 5 minutes, fetched when the pay sheet opens |
| Owner | May manage a pending adult's QR |
| Adult | May manage their own QR while active |
| Removed | QR path cleared and object deleted; no new payment action |
| Recaps | Never included |
| Exports | Path, label, and image excluded |
| Activity | Image and contents never included |
| Offline | Not displayed; the member is asked to connect |

The QR is display-only. Salo does not scan it; the member scans with their banking app. Scanning has no
effect on the ledger; the payer still records and the recipient still confirms.

## Local-First Model (IndexedDB / Dexie)

The local database is a cache and a private-draft store, not a second source of truth.

| Store | Purpose |
|---|---|
| `cachedProfiles` | Current user and group member display data |
| `cachedGroups` | Groups the user belongs to |
| `cachedOutings` | Visible outings for cached groups |
| `cachedItems` | Items for cached outings |
| `cachedShares` | Finalized share snapshots |
| `cachedSettlements` | Settlement history |
| `cachedActivity` | Recent activity events |
| `cachedStudents` | Student roster per group |
| `privateDrafts` | Local-only drafts: group, author, date, place, notes, present adults/students, items, total mode, total, local timestamps, mirrored outing id |
| `pendingWrites` | Short-lived retry records for online writes; cleared on success |

Rules:
- Cached reads are best-effort and must show the last synced time.
- A private draft is always written locally first.
- When online, the draft is mirrored to the server as `private_draft`; only the author and owner can
  read it.
- Publishing is idempotent: the local draft stores the mirrored outing id and the publish result.
- No shared write is queued while offline in v1.

## State Transitions

### Outing

```text
private_draft → draft          (author or owner publishes)
draft         → finalized      (owner finalizes)
finalized     → reopened       (owner reopens, with confirmation)
reopened      → finalized      (owner re-finalizes)
draft         → deleted        (author discards before publish; not an activity event)
```

### Settlement

```text
pending → confirmed            (recipient confirms)
pending → declined             (recipient declines with a note)
pending → void                 (payer or owner voids)
declined → void                (payer or owner voids)
confirmed → void               (payer or owner voids; balance reverts)
```

### Group

```text
active → archived              (owner archives; members lose access)
archived → active              (owner restores)
active → deleted               (owner soft-deletes with confirmation)
deleted → active               (owner restores within the retention window)
deleted → purged               (retention window elapses)
```

### Adult

```text
pending → active               (invitation accepted)
active → removed               (owner soft-removes)
removed → active               (owner re-invites; history retained)
```

### Invitation

```text
open → accepted                (invitee claims the pending adult)
open → revoked                 (owner revokes)
open → expired                 (expiry passes)
```

## Access Rules (RLS Intent)

| Table | Read | Write |
|---|---|---|
| `profiles` | Self; group members see display names | Self update |
| `groups` | Active members | Owner update; create by authenticated user |
| `group_adults` | Group members | Owner insert/update; self update own payment QR; claim via invitation function |
| `payment-qrs` (storage) | Active group members; signed URL only | Self for own active adult; owner for pending adult |
| `invitations` | Owner; invitee via token function | Owner create/revoke; accept via function |
| `students` | Group members | Owner create/update/archive |
| `outings` | Group members; private drafts author + owner | Active members while draft; owner finalize/reopen |
| `outing_adults` | Same as outing | Same as outing while editable |
| `outing_students` | Same as outing | Same as outing while editable |
| `items` | Same as outing | Same as outing while editable |
| `shares` | Group members | Finalization function only |
| `settlements` | Group members | Payer records; recipient confirms/declines; payer/owner voids |
| `activity_events` | Group members | Functions/triggers only |

Cross-cutting rules:
- No client may read or write a row whose `group_id` is not in the caller's active memberships.
- A pending adult has no profile and therefore no table access.
- A removed adult has no access but remains readable to active members for history.
- The service-role key exists only in Edge Functions and is never shipped to the client.
- Every privileged mutation is idempotent where retries are possible.

## Money Invariants

1. All amounts are integer centavos.
2. Every finalized outing's shares sum exactly to `outings.total_centavos`.
3. Shared items split across present adults plus present students using largest-remainder rounding.
4. A student's share is charged to the covering present adult.
5. The per-head fallback uses present adults plus present students.
6. A manual total override distributes the difference proportionally; the shares still sum exactly.
7. A reopened outing keeps its saved total; item changes do not alter it.
8. A settlement never exceeds the confirmed outstanding balance.
9. Confirmed settlements reduce balances; pending, declined, and void do not.
10. No tax, service charge, discount, or printed-receipt reconciliation exists in the PWA.
