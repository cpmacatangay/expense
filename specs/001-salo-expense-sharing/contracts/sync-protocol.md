# Contract: Sync Protocol

**Modules**: `src/lib/db/`, `src/lib/sync/`, `src/lib/supabase/` | **Consumers**: all features

The app is offline-first. IndexedDB via Dexie is the local source of truth; Supabase is the shared
eventual source of truth. Sync never blocks capture, split, finalize, or settlement.

## Local Write Contract

Every local mutation runs in one Dexie transaction that writes:

1. the affected row(s), with `updated_at` set to the device clock time;
2. one `SyncOutbox` row per changed entity (`upsert` or `delete`);
3. an optional `LocalPhoto` row for a captured receipt.

If the transaction fails, nothing is committed and the UI shows an error. The UI may proceed
offline after a successful local commit.

## Outbox Push

- Outbox rows are processed in `created_at` order.
- `upsert` maps to a Supabase `upsert` by primary key.
- `delete` maps to a soft delete (`deleted_at`) for shared entities; photos are deleted from storage
  only after the row is tombstoned.
- Push is idempotent: retrying the same row is safe.
- A row leaves the outbox only after the server confirms success.
- Transient failures are retried with exponential backoff: 1 s, 2 s, 4 s, up to 5 minutes, then
  require a manual retry. Permanent validation failures are surfaced to the adult and kept local.
- The engine never pushes service-role credentials; only the anon key and the user's session are
  used.

## Pull

- On sign-in, foreground, reconnect, and manual refresh, pull rows with
  `updated_at > last_pulled_at` for the member's group.
- Pull order: groups, group_members, students, outings, receipts, receipt_items, outing_students,
  coverage, shares, settlements, audit_events.
- Merge into Dexie in a single transaction.
- Update `last_pulled_at` to the server timestamp of the newest pulled row.
- Deletions are represented by `deleted_at` and are merged like updates.

## Conflict Rules

| Entity | Rule |
|---|---|
| Finalized outing | Immutable. A reopen is an explicit audited mutation; last-write-wins if two adults reopen concurrently, with a conflict warning. |
| Draft outing | Last-write-wins by `updated_at`; show a conflict warning with the other adult's name and time. |
| Student | Last-write-wins by `updated_at`; archive instead of hard delete. |
| Group member | Invite/link is server-controlled; display name last-write-wins. |
| Receipt | Belongs to one outing; last-write-wins while draft, immutable after finalize. |
| Coverage / shares | Draft only. Finalized rows are replaced only through an audited reopen. |
| Settlement | Append-only. A correction is a void plus a new settlement. |
| Audit event | Append-only. |

The client must never silently discard a local money record. If a conflict affects a finalized
outing or a settlement, keep both versions locally, surface the conflict, and require a manual
resolution before the next sync.

## Photo Sync

- Compress the receipt to JPEG, longest edge 1600 px, quality 0.7.
- Store the blob in `LocalPhoto`.
- Upload to `receipts/{group_id}/{outing_id}/{receipt_id}.jpg` after the receipt row syncs.
- On success, set `uploaded = true`, store `remote_path`, and rely on signed URLs for viewing.
- On failure, keep the local blob and retry with the outbox backoff.
- Other adults see the photo after the row and object are uploaded; the outing and split remain
  usable without the photo.

## Sync Status

The UI exposes four states:

- `local-only`: saved on this device, not yet confirmed by the server.
- `syncing`: outbox push or pull in progress.
- `synced`: all local changes confirmed and the last pull succeeded.
- `error`: the last attempt failed; show the reason and a manual retry.

## Authentication

- Web/PWA: Supabase Google OAuth redirect.
- Android: Google sign-in through `@capgo/capacitor-social-login`; exchange the ID token with
  `supabase.auth.signInWithIdToken`.
- The session is persisted locally. First sign-in requires connectivity; drafts created before
  sign-in are preserved locally and attached to the group after sign-in.
- A user must match a pre-added group member email or join through an explicit invite.

## Security

- RLS enforces group isolation on every table and storage object.
- The client uses only the anon key. The service-role key never ships.
- Receipt photos are in a private bucket; viewing uses short-lived signed URLs.
- Signing out clears the local session but does not delete the local ledger unless the adult
  explicitly chooses "Remove data from this device."

## Test Requirements

- Offline create/finalize/settle, then reconnect and verify server state.
- Two-device sync with conflicting draft edits.
- Photo upload failure and retry.
- Pull with soft-deleted rows.
- RLS tests proving a non-member cannot read or write group data.
