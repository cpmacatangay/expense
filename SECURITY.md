# Security model

Salo is a participant-based expense ledger. The database is the authority for money, access, and
history; the browser is a client. The security boundary is Supabase Auth, Postgres row-level
security, security-definer RPCs, and the private `payment-qr` bucket.

## Authentication

- Sign-in is **Google OAuth only**. Self-service Google sign-up is enabled; a new account lands on an
  empty Home and sees no data until someone shares an expense link.
- Email one-time codes, magic links, passwords, and Sign in with Apple are not used.
- There is **no authentication or invite email**. No custom SMTP, sending domain, or transactional
  email provider is required.
- People are added by name as placeholders. The creator or payer creates one unguessable 7-day token
  on the expense; `/join/<token>` requires Google sign-in and shows only the expense summary and open
  names. Claiming merges the placeholder into the account across every expense. Refreshing rotates
  the token and invalidates the previous link.
- The link does not expose items, shares, payments, or email addresses before the claim, and no link
  is written to activity or logs.
- The `delete-account` Edge Function requires `SUPABASE_SERVICE_ROLE_KEY`; no other client path uses
  the service role.

## Access model

- An expense, its items, shares, coverage, and history are readable only by its participants.
- A pairwise balance is readable only by the two people in the pair.
- A person's display name and payment QR are shown only to people who share an active expense or a
  payment with them.
- Emails are never returned to other participants. A pending email is returned only to the person who
  added it.
- No directory, public profile, or search across strangers exists. People are found by exact email.
- Access is enforced in the database. RLS protects direct reads; every write and composite read is a
  security-definer RPC that re-checks `auth.uid()` and the relationship. No direct table writes are
  granted to `authenticated`.

## Money rules

- All amounts are integer centavos; floating point is never used for money.
- `save_expense` validates, computes, and persists participants, items, coverage, and shares in one
  transaction. The TypeScript engine is a preview only.
- `total = sum(items) = sum(owed shares)`. Covered people owe zero; coverers absorb the covered gross.
- Coverage is one level: no self, no payer, no chains, no loops, one coverer per covered person.
- Expenses are version-checked. A stale save is rejected.
- `mark_paid` and `undo_payment` are pair-level. `mark_paid` records the full net; a transaction-scoped
  advisory lock prevents double settlement. Payments are not tied to one expense.
- Deleting an expense soft-deletes it, removes its shares from every balance, and records the deletion
  event. It cannot be reopened.
- Account deletion is blocked while the person owes or is owed anything.

## Browser and local state

- The Supabase client uses PKCE. The service-role key is never shipped in the browser.
- Sign-out clears the React Query cache and the legacy table selection keys.
- There are no local drafts, persisted ledger caches, or offline writes.
- The app does not use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or dynamic code execution.

## Payment QR

- One private PNG/JPEG up to 2 MB per person, with a short label.
- Object path is `{person_id}/{timestamp}.png` in the private `payment-qr` bucket.
- Storage reads require `can_view_person(person_id)`; writes require the caller's own person id.
- The client requests a 60-second signed URL. There is no public URL, no in-app scanner, and no
  payment-processor integration.
- QR changes never appear in activity text, and QR data is never migrated from the old ledger.

## Deployment checklist

1. Confirm hosted Auth has Google enabled, self-service sign-up allowed, the email provider disabled,
   and the app and localhost redirect URLs configured.
2. Verify every retained account can sign in with Google using its recorded email. A non-Google
   address needs a Google account with that address or a new email.
3. Keep the `payment-qr` bucket private with the 2 MB / PNG-JPEG policy.
4. Keep the Vercel header policy in `vercel.json` (CSP, frame-ancestors, HSTS, nosniff,
   Referrer-Policy).
5. Apply `0033_participant_ledger.sql`.
6. Take and verify a full production backup, record the SHA-256, and obtain explicit sign-off.
7. Apply `0034_wipe_legacy_ledger.sql` only in the release window. It drops the legacy group/student/
   outing/settlement tables and policies. It does not touch `auth.users` or `profiles`.
8. Empty the `payment-qr` bucket with `scripts/wipe-payment-qr.mjs` using the service role.
9. Deploy the app and `delete-account`; remove `finalize-outing` and `invite-adult`.
10. Smoke test two accounts, a new invite link, account deletion, and the timing checks in
    `specs/003-friends-expense-ledger/quickstart.md`.

## Verification

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npx supabase test db
```

`supabase/tests/participant_ledger.test.sql` covers share sums, coverage, delete, stale versions,
netting, and undo. `participant_security.test.sql` covers cross-participant denial, invite claims,
hidden emails, QR access, and account deletion. `money_vectors.test.sql` holds the golden money cases.

## Data hygiene

Do not put real names, emails, tokens, or QR images in migrations, tests, fixtures, or docs. Invite
tokens are stored only as hashes. Production backups live outside the repository.
