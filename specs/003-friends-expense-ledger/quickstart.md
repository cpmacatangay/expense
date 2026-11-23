# Quickstart: Salo Friends Expense Ledger

**Feature**: `003-friends-expense-ledger` | **Date**: 2026-11-17

A validation guide for a developer or reviewer. It proves the product rules and the release gate. It
does not contain migration bodies, service code, or a full test suite.

## Prerequisites

- Node 20+ and npm
- Supabase CLI with Docker for local Postgres and Storage
- Three test accounts: **A**, **B**, and **C**, each with a display name
- A fourth Google account that has not used Salo, for the share-link claim path
- The app running at `http://127.0.0.1:5173`

## Commands

```powershell
npm ci

# Unit and component tests
npm run typecheck
npm run lint
npm run test

# Production build and installability
npm run build

# Browser flows
npm run test:e2e

# Local backend, schema, RLS, and RPC tests
npx supabase start
npx supabase test db

# Account deletion function locally
npx supabase functions serve delete-account --env-file .env.local
```

Expected: typecheck, lint, unit, build, e2e, and SQL tests pass. The SQL job must show no skipped
security tests.

## Scenario 1 — Empty Home and first expense

1. Sign in as A. Expect an empty Home: “No expenses yet”, a zero balance, New expense, and Settings.
2. Confirm there is no group creation, table switcher, first-run panel, or owner language.
3. Tap New expense. Add B and C. Add items: A ₱300, B ₱200, C ₱100. Payer A.
4. Expect the preview total ₱600, shares A ₱300, B ₱200, C ₱100, and debts B → A ₱200, C → A ₱100.
5. Save.

Expected:

- The expense is live immediately. No draft, finalize, reopen, or total-mode control exists.
- A sees the expense in All expenses, newest first, with their ₱300 share.
- B and C see it after sign-in. No other account sees it.
- The Home balance shows A owed ₱300, B owes ₱200, C owes ₱100.

Invalid checks:

- One participant blocks save with “Choose at least two people”.
- Payer not in the list blocks save.
- An item with no assignee or a zero amount blocks save.
- Two decimal places beyond a centavo are rejected or rounded at entry.

## Scenario 2 — Coverage

1. Create a new expense with A, B, C. Items: A ₱300, B ₱200, C ₱100. Payer A.
2. Set B to cover C. Save.
3. Expect B owes A ₱300, C owes nothing, and C's detail says “Covered by B”.
4. Try C covers B, B covers C, B covers B, and A covered by B. Each is blocked with a reason.
5. Add a fourth person D, set D covers B while B covers C. Blocked as a chain.
6. Set one coverer for two people. Allowed; the coverer's debt includes both.
7. Remove C from the expense. Coverage is cleared and the editor warns; B owes A ₱200 after save.
8. Remove B while B covers C. The editor warns that C becomes responsible.

Expected: one level only, no self, no payer, no chains, no loops.

## Scenario 3 — Ledger, mark paid, undo

1. As A, open Ledger. Expect “Mai owes you” style rows and totals.
2. On B's debt, Mark paid. Confirm.
3. Expect the row to disappear from active debts, the totals to update, and the paid history to show
   the amount, date, and who marked it.
4. As B, open Ledger. Expect the same settlement; no confirmation request.
5. As either A or B, Undo the payment. Expect the debt to return and history to show Undone.
6. Record a second expense where B pays A's share, then check the pair nets to one direction.
7. Edit an expense after a payment so the payment exceeds the shares. Expect the debt to reverse
   direction and the editor to have warned before saving.
8. Delete an expense after a payment. Expect the payment to remain and the balance to recalculate.

Expected: one direction and one amount per pair; no partial payments; no recipient confirmation; only
the two people see the pair.

## Scenario 4 — Privacy

1. As A and B, share an expense. As A and C, share a different expense.
2. As C, try to open A–B's expense by id, its items, history, and share rows through the client and a
   direct REST request.

Expected: “Not found” every time. C cannot see the A–B balance, the expense description, the people's
emails, or the QR. A can see both expenses because A is on both; C sees only the A–C expense.

## Scenario 5 — Share link, claim, refresh, expiry

1. As A, add `Mai` by name to an expense and save. Expect the expense detail to show
   “Waiting to join: Mai” and no email field anywhere.
2. Open **Share expense**. Expect a copyable `/join/<token>` link and a 7-day expiry.
3. Open the link in a private window and choose **Continue with Google** as C. Expect the expense
   summary and the open name “Mai” under “Which one is you?”.
4. Claim Mai. Expect the expense detail to open for C with the recorded share, and the Home balance
   to show what C owes A.
5. As A, reopen the expense. Expect C's account name instead of Mai, no waiting names, and the same
   amounts.
6. As A, open Share again. Expect the same link while it is valid. Tap **Refresh link**; the previous
   link must now be refused and the new one must work.
7. As a fourth signed-in person who is already on the expense, open the link. Expect “You're already
   on it.” instead of another claim.
8. Let a link expire. Expect “This link is no longer available” and the expense to remain intact with
   the open name.
9. Sign in with a new Google account that no one has added. Expect an empty Home and no other data.

Expected: names are added without email; one link per expense; the recipient signs in, claims an open
name, and sees every expense that used that name; no duplicate person is created; no email delivery.

## Scenario 6 — Edit, delete, history

1. As the creator, edit the description, date, payer, people, items, and coverage. Save.
2. Expect shares, debts, and the Home balance to update immediately.
3. Open the expense history. Expect creation and update events with actor and before/after values.
4. As a non-editor participant, confirm Edit and Delete are absent.
5. As the payer, delete the expense after a confirmation.
6. Expect it to disappear from All expenses, Home activity, and balances; the deletion event remains
   in recent activity; the detail route returns not found.
7. Open the same expense in a second tab and save an edit after the first tab saved. Expect a stale
   version error and Reload latest.

Expected: creator and payer only; no reopen; no restore.

## Scenario 7 — Payment QR

1. As A, Settings → Payment QR, upload a PNG under 2 MB with label “GCash”.
2. As B, who shares an expense with A, open the A debt and Scan to pay. Expect the image, label, and
   amount in a sheet.
3. As C, who shares no expense or balance with A, request the QR. Expect denial.
4. As A, remove the QR. Expect the B sheet to say “Ask A for their QR” and still allow Mark paid.
5. Try a PDF or a 3 MB file. Expect a named upload error.
6. Open the QR offline. Expect a connect message.

Expected: private bucket, short-lived signed URL, no public link, no in-app scanner.

## Scenario 8 — PWA and layout

1. At 360, 390, 412, 430, and 1440px, open Home, All expenses, the editor, detail, Ledger, and Settings.
2. Expect no horizontal overflow, no clipped text, 44-point targets, visible focus, and the light
   stone/ink palette.
3. Install on iPhone and Android. Open offline: the shell loads. If the screen was opened before
   going offline, cached reads remain visible; after a reload, reads show the offline state and Save
   says a connection is required.
4. Confirm there are exactly three tabs and no Activity tab.
5. Check reduced motion and a screen reader on the balance, debt rows, coverage, and history.
6. Run Lighthouse mobile on the production build with 4G throttling. Expect first usable under 3
   seconds, interactions under 100ms, and live updates under 2 seconds.

## Scenario 9 — Removed surfaces audit

Search the built app and source for:

- `group`, `table`, `owner`, `student`, `draft`, `finalize`, `reopen`, `lock`, `recap`, `export`,
  `activity tab`, `adults`.

Expected: no visible copy, route, or live code path. Words may remain only in historical migrations,
tests that assert removal, or documentation.

## Timing Checks

Record these during the release dry run. Use a stopwatch on a real phone.

| Criterion | Check | Target |
|---|---|---|
| SC-001 | Record a three-person, five-item expense | under 2 minutes |
| SC-004 | Open the app and read who you owe | under 5 seconds |
| SC-005 | Mark a debt paid and clear it | under 15 seconds |
| SC-007 | Edit or delete an expense and see balances update | under 2 seconds |
| SC-010 | Sign in with Google and claim a link | under 2 minutes |
| SC-013 | Record the first expense on a fresh account | under 3 minutes |
| SC-015 | Open a payment QR from a debt row | under 10 seconds |
| SC-017 | Find and open a past expense from Home | under 10 seconds |

## Money Vectors

Use these in unit and SQL tests:

| Case | Input | Expected |
|---|---|---|
| Assigned | A 300, B 200, C 100, payer A | B owes A 200; C owes A 100 |
| Coverage | Same, B covers C | B owes A 300; C owes 0 |
| Payer coverage | Same, A covers C | B owes A 200; C owes 0; A absorbs 100 |
| Multiple covered | B covers C and D | B owes A for B + C + D |
| Netting | A→B 500, B→A 200 | A owes B 300 |
| Mark paid | A owes B 300; A marks | Payment 300 A→B; net 0 |
| Undo | Undo the 300 payment | Net 300 again |
| Reverse | A owes B 300; edit makes B owe A 200 | Direction flips; B owes A 200 |
| Sum invariant | Any valid expense | `sum(owed) = sum(items) = total` |

## Release Checklist

The wipe is a release operation, not a normal deploy.

1. Freeze writes and show maintenance.
2. Take a full schema and data backup with `pg_dump` (or the provider's snapshot).
3. Verify it with `pg_restore --list` on a scratch database and record the SHA-256.
4. Run `scripts/verify-backup.ps1`; it must confirm the dump, checksum, and restore listing.
5. Store the backup in the approved durable location. Never commit it.
6. Get explicit sign-off on the destructive step.
7. Apply `0033_participant_ledger.sql` if it is not already applied.
8. Apply `0034_wipe_legacy_ledger.sql`.
9. Run `scripts/wipe-payment-qr.mjs` with the service role; confirm the bucket is private and empty.
10. Confirm hosted Auth has the Google provider enabled, self-service sign-up allowed, the email
    provider disabled, and the app and localhost redirect URLs configured. No SMTP, sending domain,
    or email provider is needed.
11. Verify every retained account can sign in with Google using its recorded email. For a non-Google
    address, create a Google account with that address or re-add the person by name and share the expense link.
12. Deploy the app and `delete-account`; remove `finalize-outing` and `invite-adult`.
13. Smoke test with A and B: empty Home, record an expense, see the debt, mark paid, add a new name,
    copy the link, sign in with Google, claim it, open the QR.
14. Smoke test account deletion with a zero-balance account C; confirm it is blocked while a balance
    exists and succeeds when zero.
15. Lift maintenance.
16. Record the backup path, checksum, migration ids, deployment id, and sign-off time.

Expected after release:

- Sign-in works with Google for every retained account that has a Google identity.
- Every account opens an empty Home.
- No old group, outing, student, settlement, recap, export, or QR data appears.
- No old table is reachable through the API.
