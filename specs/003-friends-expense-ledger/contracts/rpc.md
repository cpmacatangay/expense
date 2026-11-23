# Contract: RPC and Edge Function Surface

**Feature**: `003-friends-expense-ledger` | **Date**: 2026-11-17

The browser never writes a table directly. It calls the functions below through
`supabase.rpc(name, args)` or `supabase.functions.invoke("delete-account")`. Every function
authenticates the JWT, resolves the caller's person row, checks access, and returns JSON.

## Conventions

- Argument and response keys are `camelCase`; database columns stay `snake_case`.
- Money is integer centavos. Dates are `YYYY-MM-DD` in Asia/Manila.
- Access failures return “Not found” rather than revealing that a record exists.
- Validation failures return a short, user-facing message.
- All database functions are `security definer` with `set search_path = public, pg_temp`.
- `public`, `anon`, and unauthenticated roles are revoked; `authenticated` is granted explicitly.
- No function accepts a profile id, person id for the caller, or an amount that bypasses the money
  engine.

## Identity

### `ensure_person()`

Returns the caller's person row. If a row is already linked to the profile, it is returned. Otherwise
the function looks up a `pending` or `former` row with the same normalized email, links it, sets it
`active`, and updates the display name from the profile. Only when no row exists does it create one.
This prevents a duplicate person when someone was invited before signing in.

```json
{
  "person": {
    "id": "uuid",
    "email": "me@example.com",
    "displayName": "Mai",
    "status": "active",
    "paymentQrLabel": "GCash",
    "hasQr": true
  }
}
```

Errors: `Not authenticated`, `Profile not found`.

### `claim_people_for_me()`

Links every `pending` or `former` person whose normalized email equals the signed-in profile email,
marks open invitations claimed, and returns the claimed person ids. Called once after sign-in and on
app load. Idempotent.

```json
{ "claimedPersonIds": ["uuid"] }
```

### `claim_invite(p_token text)`

Verifies a hashed, unexpired, unrevoked link and that the signed-in Google email matches the invited
email. Links the person and marks the invitation claimed. A mismatched account is rejected without
revealing the invitation.

```json
{ "personId": "uuid", "alreadyClaimed": false }
```

Errors: `This invite is no longer available`, `Sign in with the Google account for the invited email`.

### `update_display_name(p_display_name text)`

Trims and validates 1–50 characters, updates the caller's profile and person row together, and
returns the person. Both rows stay in sync so the name shown on every expense matches Settings.

```json
{ "person": { "id": "uuid", "displayName": "Mai" } }
```

## People

### `people_for_me()`

Returns people the caller shares an active expense with or has paid, plus pending people the caller
invited. It never returns another person's email. A pending person's email is returned only to the
person who added them.

```json
{
  "people": [
    {
      "id": "uuid",
      "displayName": "Mai",
      "status": "active",
      "isSelf": false,
      "hasQr": true,
      "createdByMe": true,
      "pendingEmail": null,
      "invitationExpiresAt": null
    }
  ]
}
```

Order: self first, then active people by display name, then pending people by display name.
`createdByMe` is true only for a person the caller added; it gates Create invite link and Correct
email in the UI and in the RPCs.

### `add_person(p_email text)`

Normalizes the email and either links an existing Google account or creates a pending person.

```json
{
  "personId": "uuid",
  "status": "active",
  "inviteToken": null,
  "expiresAt": null
}
```

```json
{
  "personId": "uuid",
  "status": "pending",
  "inviteToken": "raw-token",
  "expiresAt": "2026-11-24T12:00:00Z"
}
```

Behavior:

- Any authenticated person may add an email; the person is not yet on an expense, so no expense check
  applies.
- If a profile or person with that email exists, link or return it. An active result has no token.
- If no account exists, create or reuse a pending person and create a hashed, 7-day invitation.
  Return the raw token **once**; the client builds `/invite?token=...` for the creator to copy.
- Adding the caller's own email is rejected.
- No email is sent.
- Rate limit: 20 add/link/correct calls per caller per hour.

### `create_invite_link(p_person_id uuid)`

Creates a fresh link for a pending person. The caller must have created the person or share an active
expense with them. Revokes any open invitation, creates a new hashed token, and returns it once.

```json
{ "personId": "uuid", "inviteToken": "raw-token", "expiresAt": "2026-11-24T12:00:00Z" }
```

Errors: `That person already joined`, `You cannot change this invite`, `Too many invites. Try again
later.`

### `correct_pending_email(p_person_id uuid, p_email text)`

Creator only, before the person is claimed. Validates the new email, updates the person, revokes the
old link, creates a new link, and returns the raw token once.

```json
{ "personId": "uuid", "inviteToken": "raw-token", "expiresAt": "2026-11-24T12:00:00Z" }
```

Errors: `Enter a valid email address`, `That email already belongs to another person`, `That person
already joined`, `You cannot change this invite`.

No function sends email. There is no SMTP or auth-email path.

### `can_delete_account()`

Returns whether the caller may delete their account. True only when both ledger totals are zero.

```json
{ "canDelete": true, "youOweCentavos": 0, "owedToYouCentavos": 0 }
```

### `delete-account` (Edge Function)

No body. The function verifies the JWT, calls `can_delete_account`, rejects a non-zero balance with
“Settle your balances before deleting your account”, then deletes the auth user with the service
role. The profile deletion trigger marks the linked person `former`; past expenses keep the display
name. The function returns `{ "deleted": true }` and the client signs out.

Errors: `Settle your balances before deleting your account`, `Not authenticated`, `Could not delete
the account`.

## Expenses

### `expenses_for_me()`

Returns all live expenses the caller is a participant of, newest first.

```json
{
  "expenses": [
    {
      "id": "uuid",
      "description": "Dinner at Manam",
      "expenseDate": "2026-11-17",
      "payerPersonId": "uuid",
      "payerName": "Mai",
      "totalCentavos": 120000,
      "myShareCentavos": 40000,
      "createdAt": "2026-11-17T12:00:00Z"
    }
  ]
}
```

### `expense_detail(p_expense_id uuid)`

Returns one live expense if the caller is a participant. A deleted expense and a non-participant both
return `Not found`.

```json
{
  "expense": {
    "id": "uuid",
    "description": "Dinner at Manam",
    "expenseDate": "2026-11-17",
    "payerPersonId": "uuid",
    "createdByPersonId": "uuid",
    "totalCentavos": 120000,
    "version": 3,
    "createdAt": "2026-11-17T12:00:00Z",
    "updatedAt": "2026-11-17T12:10:00Z",
    "canEdit": true
  },
  "people": [
    { "id": "uuid", "displayName": "Mai", "status": "active", "hasQr": true,
      "isPayer": true, "isCreator": true }
  ],
  "items": [
    { "id": "uuid", "name": "Pasta", "amountCentavos": 40000,
      "assignedPersonId": "uuid", "position": 0 }
  ],
  "coverage": [
    { "coveredPersonId": "uuid", "covererPersonId": "uuid" }
  ],
  "shares": [
    { "personId": "uuid", "itemsCentavos": 40000, "coveredCentavos": 0,
      "owedCentavos": 40000, "coveredByPersonId": null }
  ],
  "events": [
    { "id": "uuid", "actorPersonId": "uuid", "actorName": "Mai",
      "action": "created", "before": null, "after": { "totalCentavos": 120000 },
      "createdAt": "2026-11-17T12:00:00Z" }
  ]
}
```

### `save_expense(p_payload jsonb, p_expected_version integer)`

Creates when `p_payload.id` is absent or null; updates when it is present. `p_expected_version` is
`null` or `0` on create.

Payload:

```json
{
  "id": "uuid or null",
  "description": "Dinner at Manam",
  "expenseDate": "2026-11-17",
  "payerPersonId": "uuid",
  "people": ["uuid", "uuid"],
  "items": [
    { "name": "Pasta", "amountCentavos": 40000, "assignedPersonId": "uuid" }
  ],
  "coverage": [
    { "coveredPersonId": "uuid", "covererPersonId": "uuid" }
  ]
}
```

Validation:

- 1–120 character description; valid date; 2–12 unique people; payer and creator in the list; every
  person exists.
- 1–50 items; each name 1–120; each amount a positive safe integer; assignee in the list.
- Coverage rules from the data model: one coverer per covered, no self, no payer, no chains, no
  loops, both people on the expense.
- On update: caller is creator or payer; the expense is not deleted; version matches.
- Server computes shares and rejects a total that does not equal the item sum or the share sum.
- New participants record `added_by_person_id =` the caller; retained participants keep their
  original adder.

Response:

```json
{
  "expenseId": "uuid",
  "version": 2,
  "totalCentavos": 120000,
  "shares": [
    { "personId": "uuid", "itemsCentavos": 40000, "coveredCentavos": 0,
      "owedCentavos": 40000, "coveredByPersonId": null }
  ]
}
```

Errors: `Enter a description`, `Choose at least two people`, `Choose a payer who is on the expense`,
`Every item needs a name and an amount`, `That item belongs to someone not on this expense`,
`That coverage is not allowed`, `This expense changed. Reload and try again.`,
`Only the creator or payer can edit this expense`.

The function takes a transaction-scoped advisory lock for every affected pair, replaces participants,
items, coverage, and shares, records one `expense_events` row with before/after snapshots, bumps the
version, and commits once.

### `delete_expense(p_expense_id uuid)`

Creator or payer only. Takes the pair locks, sets `deleted_at`, records an `expense.deleted` event,
and returns `{ "expenseId": "uuid" }`. The expense disappears from lists, detail, and balances. It
cannot be restored from the app.

## Ledger

### `ledger_for_me()`

Returns the caller's active pairwise debts and totals. Settled pairs are omitted.

```json
{
  "youOweCentavos": 40000,
  "owedToYouCentavos": 80000,
  "debts": [
    {
      "otherPersonId": "uuid",
      "otherName": "Mai",
      "direction": "you_owe",
      "amountCentavos": 40000,
      "hasQr": true
    }
  ]
}
```

`direction` is `you_owe` when the net is positive, `owes_you` when negative. Only pairs involving the
caller are returned.

### `pair_history(p_other_person_id uuid)`

Returns the two people and every payment between them, newest first. It does not reveal expenses or
balances involving other people.

```json
{
  "other": { "id": "uuid", "displayName": "Mai", "hasQr": true },
  "payments": [
    {
      "id": "uuid",
      "fromPersonId": "uuid",
      "toPersonId": "uuid",
      "amountCentavos": 40000,
      "markedByPersonId": "uuid",
      "markedAt": "2026-11-17T12:00:00Z",
      "undoneAt": null,
      "undoneByPersonId": null
    }
  ]
}
```

### `mark_paid(p_other_person_id uuid)`

Locks the pair, recomputes the net, rejects zero, and inserts one active payment for the full
absolute amount. The direction is the actual money movement: the debtor pays the creditor. Either
person may call it.

Returns the created payment row in the `pair_history` shape.

Errors: `Nothing to settle`, `That person is not in your ledger`.

### `undo_payment(p_payment_id uuid)`

Either pair member may undo an active payment. Sets `undone_at` and `undone_by_person_id`; the
balance is restored on the next read. A payment can be undone once.

Returns the updated payment row.

Errors: `Payment not found`, `This payment was already undone`.

## Activity

### `recent_activity(p_limit integer default 5)`

Returns up to `p_limit` events (1–20) involving the caller: expense events for expenses they are on,
plus payments they are part of. Newest first. A deleted expense is represented by its description and
id but cannot be opened.

```json
{
  "events": [
    {
      "id": "uuid",
      "kind": "expense_updated",
      "createdAt": "2026-11-17T12:10:00Z",
      "actorName": "Mai",
      "expenseId": "uuid",
      "expenseDescription": "Dinner at Manam",
      "otherPersonId": null,
      "otherName": null,
      "amountCentavos": null,
      "summary": "Total changed from ₱1,000 to ₱1,200"
    },
    {
      "id": "uuid",
      "kind": "payment_marked",
      "createdAt": "2026-11-17T12:15:00Z",
      "actorName": "Mai",
      "expenseId": null,
      "expenseDescription": null,
      "otherPersonId": "uuid",
      "otherName": "Mai",
      "amountCentavos": 40000,
      "summary": "Marked ₱400 paid"
    }
  ]
}
```

`summary` is generated server-side from the snapshots so the client does not need to know every
field shape. The detail screen still receives the full snapshots for its history.

## Payment QR

### `set_payment_qr(p_path text, p_label text)`

Caller only. The path must start with the caller's person id and a slash. The label is 1–40
characters or null. Returns the updated person. The object must already be uploaded to the private
bucket.

### `clear_payment_qr()`

Caller only. Clears the path, label, and timestamp. The object itself can be removed by the client
after the metadata clears.

### Storage

- Upload path: `{person_id}/{timestamp}.{png|jpg|jpeg}`.
- The client calls `storage.from("payment-qr").upload(path, file, { contentType, upsert: false })`.
- The client calls `createSignedUrl(path, 60)` for display.
- The storage policy checks `can_view_person` for reads and `current_person_id()` for writes.
- Bucket is private, 2 MB, PNG/JPEG only.

## Common Errors

| Message | Cause |
|---|---|
| `Not authenticated` | Missing or expired JWT |
| `Not found` | Missing record or no access; never reveal which |
| `Only the creator or payer can edit this expense` | Non-editor update or delete |
| `This expense changed. Reload and try again.` | Version mismatch |
| `Choose at least two people` | Fewer than two participants |
| `That coverage is not allowed` | Self, payer, chain, loop, or non-participant |
| `Enter an amount greater than zero` | Zero or negative item |
| `Nothing to settle` | Net is already zero |
| `No connection. Check your network and try again.` | Client-side offline guard |

## Security Tests

Each mutation and read is covered by SQL tests with three accounts:

1. **Participant**: can read the expense, items, shares, history, and the pair.
2. **Other participant of a different expense**: cannot read the first expense or its QR.
3. **Unrelated account**: cannot read anything, cannot mark another pair paid, cannot claim another
   email's invite.

Additional cases: pending claim, email correction by a non-creator, wrong Google account, stale
version, double mark-paid,
double undo, deleted expense read, and coverage chain/loop.
