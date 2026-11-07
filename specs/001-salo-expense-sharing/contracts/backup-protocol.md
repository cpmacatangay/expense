# Contract: Private Backup Protocol

**Consumers**: backup repository, WorkManager, Settings UI, restore flow

The backup protocol is a single-owner, versioned JSON snapshot. It is not multi-device sync.

## Supabase Table

```sql
create table public.ledger_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null,
  payload jsonb not null,
  device_id text not null,
  created_at timestamptz not null default now()
);

create index ledger_snapshots_owner_created_idx
  on public.ledger_snapshots (user_id, created_at desc);

alter table public.ledger_snapshots enable row level security;

create policy "owner can read own snapshots"
  on public.ledger_snapshots for select
  using (auth.uid() = user_id);

create policy "owner can insert own snapshots"
  on public.ledger_snapshots for insert
  with check (auth.uid() = user_id);

create policy "owner can update own snapshots"
  on public.ledger_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "owner can delete own snapshots"
  on public.ledger_snapshots for delete
  using (auth.uid() = user_id);
```

## Snapshot Payload

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

Excluded:
- receipt image paths and local file URIs;
- Supabase session tokens;
- Google credentials;
- device-local preferences.

## Backup Behavior

1. A mutation marks the ledger dirty.
2. A debounced worker (default 2 seconds) builds a snapshot.
3. If signed in and online, upload the snapshot.
4. On success, update `BackupState` to `BACKED_UP`, record `lastSuccessAt` and `lastSnapshotId`.
5. On failure, set `ERROR`, keep local data, and schedule retry with exponential backoff.
6. Keep the latest 30 snapshots; prune older snapshots after a successful upload.
7. A manual "Back up now" action triggers the same worker immediately.

Triggers:
- outing finalized;
- settlement recorded or voided;
- student added/edited/archived/reactivated;
- adult profile edited;
- group name changed;
- manual backup.

## Restore Behavior

1. The owner signs in with the authorized Google account.
2. If the local database is not empty, block restore.
3. Fetch the latest snapshot ordered by `created_at desc`.
4. Validate `schema_version` and the payload shape.
5. Import in a single Room transaction.
6. Recompute derived values and verify the exact-total invariant.
7. Set `BackupState` to `BACKED_UP` with the restored snapshot id.
8. Never restore receipt images; show a notice that photos are local-only.

## Auth

- Google Credential Manager ID token → Supabase `signInWithIdToken`.
- Only the configured owner email is accepted.
- Disable Supabase sign-ups.
- The client uses the anon key plus the owner session; never a service-role key.
- RLS enforces owner-only access.

## Failure Modes

| Failure | Behavior |
|---|---|
| Offline | Queue backup; status `LOCAL_ONLY` or existing status |
| Not signed in | Queue backup; prompt for sign-in in Settings |
| 401/403 | Mark `ERROR`; require re-authentication |
| Network timeout | Retry with backoff |
| Invalid payload | Do not restore; show validation error |
| Non-empty local DB | Block restore |
| Unauthorized account | Deny access; no snapshot returned |
| Snapshot schema newer than app | Block restore; ask owner to update the app |

## Guarantees

- Local data is never deleted by a backup failure.
- Restore never overwrites a non-empty local database.
- The backup payload contains no receipt images or credentials.
- A successful restore reproduces outings, items, assignments, coverage, shares, settlements, and
  audit events exactly.
