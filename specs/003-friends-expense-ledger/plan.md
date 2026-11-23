# Implementation Plan: Salo Friends Expense Ledger

> **Revision 2026-11-23**: Email invitations were replaced by one share link per expense. People
> are added by name; a signed-in recipient claims an open name and the placeholder is merged into
> their account. Migration `0035_expense_share_links` implements this. The spec, data model, and
> quickstart are the current source of truth for the sharing flow; older email-invite references
> in this plan are historical.

**Branch**: `003-friends-expense-ledger` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-friends-expense-ledger/spec.md`

## Summary

Replace the group/table ledger with a participant-based one. An expense lists its own people, one
payer, and item lines that each belong to one person. Saving is immediate and authoritative: the
server computes every share, applies one-level coverage, and updates pairwise debts in the same
transaction. Either person can mark a full debt paid or undo that mark. Expenses are visible only to
their participants; people are added by email, with existing Google accounts linked and new emails
becoming pending people with a copyable invite link.

The product keeps the itemized bill, per-person payment QR, activity history, install section, and
the light-only stone/ink interface. Groups, students, drafts, finalization, recaps, exports, the
Activity tab, and owner controls are removed. Old ledger data is wiped at release after a verified
backup; sign-in accounts are retained.

## Technical Context

**Language/Version**: TypeScript 5.6 targeting Node 20+, React 19, Vite 7

**Primary Dependencies**: React Router 7, TanStack Query 5, Zod 3, Supabase JS 2.45,
Supabase Auth with Google OAuth only, `vite-plugin-pwa` 1, Vitest 3 + Testing Library,
Playwright 1.48

**Storage**: Supabase Postgres (hosted), Supabase Auth, private Supabase Storage bucket
`payment-qr`

**Testing**: Vitest and Testing Library for units and components; Playwright for browser flows;
`supabase test db` (pgTAP) for schema, RLS, RPC, and money invariants

**Target Platform**: Installable PWA on iOS Safari 16.4+ and current Android Chrome; desktop at
1440px

**Project Type**: Single-page web application with a serverless Postgres backend in one repository

**Performance Goals**: First usable screen under 3 seconds on typical 4G; expense save reflected in
the UI under 2 seconds; live updates under 2 seconds at p95 while connected; 100-expense list
scrolls without jank

**Constraints**: Free tiers only; Google-only sign-in with self-service sign-up; no SMTP, sending
domain, or authentication/invite email; light-only stone/ink UI; no analytics; no service-role key in
the browser; 44-point targets; 360/390/412/430/1440 verification; offline reads only, saves require a
connection; no third-party payments

**Scale/Scope**: Friends-and-family scale. 2–12 people per expense, roughly 1,000 accounts and
10,000 expenses; three tabs plus pushed screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Evidence in this plan |
|---|---|---|
| I. Money correctness | Integer centavos; shares sum exactly; pure engine; tests | `expense_shares` uses `bigint` centavos; `save_expense` computes in one transaction; TS preview and SQL engine share golden vectors; sum invariant tests |
| II. Pairwise privacy | Participant-only records; pairwise-only balances; no directory; private QR | RLS on every new table; security-definer RPCs re-check the caller; `ledger_for_me` returns only the caller's pairs; emails never returned to participants; private bucket plus short-lived signed URLs |
| III. Immediate saves | No drafts; version-checked writes; connection required | Single `save_expense` RPC; `version` compare-and-swap; no draft or finalize tables; offline save blocked with a named error |
| IV. One PWA, light world | Installable; light-only; 360/390/412/430/1440; 44pt | Existing Vite PWA, tokens, and platform shell retained; no appearance switch; Playwright viewport checks |
| V. Simple money rules | One payer; name+amount lines; one person per line; one-level coverage; full mark-paid | `expense_people`, `expense_items`, `expense_coverage` constraints; no shared or multi-person assignment column; no partial payment amount |
| VI. Corrections visible | History; reversible mark-paid; soft delete | `expense_events` before/after snapshots; `payments.undone_at`; expenses soft-deleted and excluded from reads |
| VII. No owners or groups | No tables/groups/students/ownership | Legacy tables and functions dropped in `0034`; no owner/admin role anywhere in the new schema |
| VIII. Low friction | Three tabs; Home leads; All expenses; no Activity tab | Routes below; Home → New expense and See all; five recent events; full history inside the expense |
| IX. Simplicity | Removed surfaces stay removed | Legacy features deleted from `src/`; no export, recap, student, group, or draft code paths |
| X. Zero recurring cost | Free tiers | Supabase free tier, Vercel free tier; no new paid service or email provider |

**Result**: All gates pass. No violations; Complexity Tracking is empty.

**Security constraints**: Google OAuth only; self-service Google sign-up; email-bound invite links;
no SMTP, sending domain, or authentication/invite email; the service-role key exists only in the
`delete-account` Edge Function.

**Post-design re-check**: After the data model, RPC contracts, and UI contracts were written, every
gate still passes. The participant-only query paths, one-level coverage constraints, immediate-save
transaction, reversible payments, and removal of legacy surfaces are all represented in concrete
artifacts. No new complexity or exception was introduced.

## Project Structure

### Documentation (this feature)

```text
specs/003-friends-expense-ledger/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rpc.md
│   ├── ui.md
│   └── invite-link.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── App.tsx                  # auth gate + routes; no group gate
│   ├── providers.tsx
│   ├── ErrorBoundary.tsx
│   └── RouteErrorBoundary.tsx
├── domain/
│   ├── money/
│   │   ├── types.ts             # Centavos, ExpenseDraft, Coverage
│   │   ├── computeExpenseShares.ts
│   │   ├── computeExpenseShares.test.ts
│   │   ├── format.ts
│   │   └── validate.ts
│   └── ledger/
│       ├── computePairBalances.ts
│       ├── computePairBalances.test.ts
│       └── types.ts
├── features/
│   ├── auth/                    # retained; add claim-on-sign-in
│   ├── me/
│   │   ├── api.ts
│   │   └── useMe.ts
│   ├── people/
│   │   ├── api.ts
│   │   ├── AddPersonSheet.tsx
│   │   ├── PersonPicker.tsx
│   │   ├── usePeople.ts
│   │   └── types.ts
│   ├── expenses/
│   │   ├── api.ts
│   │   ├── useExpenses.ts
│   │   ├── ExpenseEditorPage.tsx
│   │   ├── ExpenseDetailPage.tsx
│   │   ├── ExpenseHistory.tsx
│   │   ├── ItemEditor.tsx
│   │   ├── CoverageEditor.tsx
│   │   ├── SharePreview.tsx
│   │   └── types.ts
│   ├── ledger/
│   │   ├── api.ts
│   │   ├── useLedger.ts
│   │   ├── DebtRow.tsx
│   │   ├── PaySheet.tsx
│   │   └── PaidHistory.tsx
│   ├── activity/
│   │   ├── api.ts
│   │   ├── ActivityList.tsx
│   │   └── describeEvent.ts
│   ├── payments/                # QR upload/view retained
│   ├── pwa/                     # install section retained
│   └── realtime/
│       ├── useLedgerRealtime.ts
│       └── useOnlineStatus.ts
├── pages/
│   ├── HomePage.tsx             # balance, New expense, recent activity, See all
│   ├── AllExpensesPage.tsx
│   ├── LedgerPage.tsx
│   ├── SettingsPage.tsx
│   ├── InvitePage.tsx
│   └── NotFoundPage.tsx
├── ui/                          # primitives and tokens retained
├── lib/
└── styles/global.css

supabase/
├── migrations/
│   ├── 0033_participant_ledger.sql
│   └── 0034_wipe_legacy_ledger.sql
├── functions/
│   └── delete-account/index.ts  # balance gate + service-role account deletion
├── tests/
│   ├── participant_ledger.test.sql
│   ├── participant_security.test.sql
│   └── money_vectors.test.sql
└── config.toml

scripts/
├── verify-backup.ps1            # checks dump, checksum, restore listing
└── wipe-payment-qr.mjs          # empties the private bucket with the service role
```

**Structure Decision**: Keep the single-repository SPA. The browser holds no authority: every read
and write goes through RLS-protected tables or security-definer RPCs. Group-scoped folders
(`features/groups`, `features/outings`, `features/students`, `features/export`, `features/recap`,
`features/history`) are deleted, and their screens are rewritten under `features/expenses`,
`features/people`, `features/ledger`, and `pages/`.

## Phase 0: Research Outcomes

Full decisions and alternatives are in [research.md](./research.md). The design rests on:

1. **Global people rows.** One `people` row per email, optionally linked to one profile. Pending rows
   are pending identities; claiming links by email. This replaces group-scoped adult identities.
2. **Server-authoritative shares.** `save_expense` validates, computes, and persists participants,
   items, coverage, and shares in one transaction. The TypeScript engine exists only for live preview
   and tests.
3. **RPC-first access.** Complex reads and all writes use security-definer functions that re-check
   the caller. RLS protects direct table reads; no direct writes are granted.
4. **Pairwise netting.** Ledger rows are computed from share edges to the payer minus payments,
   netted per pair. Payments are pair-level, full-amount, reversible.
5. **Soft delete.** Deleting an expense sets `deleted_at`, keeps the history event, hides the record
   from every read, and removes its shares from balances.
6. **One-level coverage enforced twice.** A composite constraint and a validation trigger reject
   self-coverage, payer coverage, chains, loops, and non-participants; the UI only offers valid
   coverers.
7. **Invite links.** `add_person` creates or links the person. A new email becomes pending and gets
   a hashed, expiring link the creator copies and sends in chat. No email is sent, and no auth user is
   provisioned by the app.
8. **Release-gated wipe.** New tables ship first; a separate destructive migration drops legacy
   tables only during a maintenance window after a verified backup and explicit sign-off.

## Phase 1: Design

### Data and access

See [data-model.md](./data-model.md) for tables, constraints, indexes, RLS matrix, and state
transitions.

Core tables:

- `people` — one row per email, optional `profile_id`, status `pending|active|former`, display name,
  payment QR metadata.
- `expenses` — description, date, payer, creator, total, version, `deleted_at`.
- `expense_people` — the participants of one expense, including the payer.
- `expense_items` — name, amount, assigned person; composite FK keeps the assignee on the expense.
- `expense_coverage` — covered person → coverer, one row per covered person.
- `expense_shares` — gross items, covered amount, owed amount, covered-by person.
- `payments` — pair-level full payment with marker and undo.
- `expense_events` — expense-scoped before/after history.
- `person_invitations` — hashed token, email, expiry, claim state.

Money rules:

- `total = sum(item amounts) = sum(owed shares)`.
- `owed[p] = 0` when p is covered; otherwise `owed[p] = own items + items of everyone p covers`.
- Each non-payer participant with `owed > 0` owes the payer that amount.
- A pair balance is `shares owed between the pair - payments between the pair`, netted in one
  direction.
- No division, no remainder allocation, no manual total, no taxes or discounts.
- All values are `bigint` centavos; the client sends integer centavos.

### Contracts

- [contracts/rpc.md](./contracts/rpc.md) — every RPC signature, payload, response, error, and access
  check.
- [contracts/ui.md](./contracts/ui.md) — routes, screens, component responsibilities, states, and
  query invalidation.
- [contracts/invite-link.md](./contracts/invite-link.md) - invite link, token handling, expiry,
  refresh, and pending-email correction.

### API surface

The browser calls only these functions:

| Function | Purpose |
|---|---|
| `ensure_person` | Return the caller's person row, creating it from the profile if absent |
| `claim_people_for_me` | Link pending people and invitations matching the signed-in email |
| `update_display_name` | Rename the caller |
| `people_for_me` | People shared with the caller plus pending people they added |
| `expenses_for_me` | All expenses the caller is on, newest first |
| `expense_detail` | One expense with people, items, coverage, shares, history, and edit rights |
| `save_expense` | Create or replace an expense atomically, with version check |
| `delete_expense` | Soft-delete an expense and record the event |
| `ledger_for_me` | Active pairwise debts and totals for the caller |
| `pair_history` | Payments between the caller and one other person |
| `mark_paid` | Record the full current pair balance as paid |
| `undo_payment` | Reverse a marked payment |
| `recent_activity` | Five latest expense events and payments involving the caller |
| `set_payment_qr`, `clear_payment_qr` | Manage the caller's QR metadata |
| `add_person` | Add by email: link an existing Google account or create a pending person with a link |
| `create_invite_link` | Create a fresh, expiring link for a pending person; revokes the old one |
| `correct_pending_email` | Change a pending person's email and create a fresh link |
| `delete-account` (Edge Function) | Delete the caller's account after a zero-balance check |

All RPCs are `security definer`, `set search_path = public, pg_temp`, revoked from `public` and
`anon`, and granted to `authenticated`. Each validates `auth.uid()` and the participant or edit
relationship before touching data.

### Frontend

- Remove `GroupProvider`, the group gate, group switcher, first-run panel, and group realtime.
- Add a small `useMe` query backed by `ensure_person`; it resolves the caller's person row after
  sign-in and runs `claim_people_for_me` once.
- Routes: `/` Home, `/expenses` All expenses, `/expenses/new`, `/expenses/:id`,
  `/expenses/:id/edit`, `/ledger`, `/settings`, `/invite`.
- Editor: description, date, payer, people (with add-by-email), item rows (name, amount, person),
  optional coverage, live share preview, Save. No draft or finalize controls.
- Detail: payer, people, items grouped by person, shares, coverage, total, history, Edit/Delete when
  allowed.
- Ledger: totals, debt rows, Mark paid, QR sheet, paid history, Undo.
- Settings: profile name, People (status, create invite link, correct pending email), payment QR,
  install, sign out, delete account.
- Keep the three-tab shell (`tabs.ts`) and all existing visual tokens; All expenses and detail are
  pushed screens, not new tabs.
- Query keys: `me`, `people`, `expenses`, `expense:id`, `ledger`, `pair:id`, `activity:recent`.
  Mutations invalidate every affected key; a single realtime subscription invalidates `expenses`,
  `ledger`, `activity`, and the open detail on row changes.
- Offline: PWA shell and in-memory query cache only; save, delete, mark-paid, invite, and QR upload
  require a connection and say so.

### Money engine

`src/domain/money/computeExpenseShares.ts` is a pure function used for the editor preview and unit
tests. The SQL function `save_expense` is authoritative. Both implement the same rules and are
checked against the same golden vectors:

1. Participant set is unique, 2–12, includes the payer.
2. Every item amount is a positive integer and the assignee is a participant.
3. Coverage has one coverer per covered person, no self, no payer, no chain, no loop.
4. Gross per person is the sum of assigned items.
5. `covered` people owe zero; coverers add their covered people's gross.
6. Shares sum to the total; otherwise the save fails.
7. Pair edges are written from each non-payer with a positive owed amount to the payer.

### Testing

- **Unit**: compute shares, coverage validation, pair netting, payment undo, version rejection,
  formatting, invite-link token handling, plus a seeded property-based share-sum generator.
- **Component**: editor validation, add-person pending state, coverage picker limits, mark-paid and
  undo, empty Home, deleted expense absent, All expenses ordering.
- **SQL**: share sum invariant, randomized share-sum cases, coverage constraints, non-participant
  denial on every table, pending claim by email, hidden emails, QR access, stale version, soft
  delete, payment direction, netting, undo, concurrent mark-paid lock.
- **E2E**: Home → new expense → ledger → mark paid; copy invite link, Google sign-in, and claim;
  360/390/412/430/1440 layouts; offline save error; install section.
- **Performance and installability**: Lighthouse mobile with 4G throttling; first usable under 3
  seconds, interactions under 100ms, live updates under 2 seconds; record the results in
  `quickstart.md`.
- **Release**: backup verification script and a manual two-account smoke test.

**Tooling and documentation**: remove `scripts/sync-edge-money.mjs`, the
`supabase/functions/finalize-outing/money` copy, and the CI “Check Edge Function money copy” step.
Point the database CI job at the new SQL tests. Update `SECURITY.md`, `PRODUCT.md`, and `DESIGN.md`
to remove group, table, student, draft, finalization, recap, and export language. Keep the deployment
checklist aligned with the release runbook. Audit `SignInPage` and any remaining copy for “group
owner”, “table”, “adult”, “student”, “email code”, and “magic link”; replace it with the participant
model and a single Continue with Google action. Remove `VITE_EMAIL_AUTH_ENABLED` from the client and
env examples. In `supabase/config.toml` and hosted Auth, allow self-service sign-up, disable the email
provider, keep Google, and set the app and localhost redirect URLs. No SMTP or sending domain is
required.

## Migration and Rollout

The destructive wipe is a release operation, not a normal deploy.

1. Build and verify on a branch against a local or staging project.
2. Freeze production writes and show a maintenance response.
3. Take a full schema and data backup. Verify it with a scratch restore and record a SHA-256.
   Store it in an approved durable location; never commit it.
4. Run `scripts/verify-backup.ps1`; it must confirm the restore and print the checksum.
5. Confirm hosted Auth has the Google provider enabled, self-service sign-up allowed, the email
   provider disabled, and the app and localhost redirect URLs configured. No email provider, SMTP, or
   sending domain is needed.
6. Apply `0033_participant_ledger.sql`. It replaces the legacy `payment-qr` storage policies and any
   helper they still reference, so the later function drops do not leave a broken policy.
7. Apply `0034_wipe_legacy_ledger.sql` after explicit sign-off. It runs a dependency query for
   functions and triggers that reference legacy tables, drops only legacy objects, and does not
   touch `auth.users` or `profiles`. It does not truncate the new tables.
8. Empty the `payment-qr` bucket with `scripts/wipe-payment-qr.mjs` using the service role, then
   confirm the bucket is private and empty.
9. Deploy the new app and the `delete-account` function; remove `finalize-outing` and
   `invite-adult`.
10. Smoke test with two accounts: empty Home, record an expense, see the debt, mark it paid, add a
    new email, copy the link, sign in with Google, and claim it.
11. Lift maintenance.

Rollback before step 6 is a normal redeploy. After step 6, recovery means restoring the verified
backup, so the sign-off is explicit.

Production migrations are applied manually for this release; the database CI job continues to apply
all migrations to a scratch database and run the SQL tests.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| RLS or RPC mistake leaks another person's expense | Security-definer RPCs re-check the caller; SQL tests cover every table and every read path; no direct writes |
| Client preview and server shares drift | Server is authoritative; shared golden vectors; save returns the persisted shares |
| Lost data during the wipe | Maintenance window, verified backup, checksum, explicit sign-off, rollback runbook |
| Concurrent mark-paid and expense edit | Row version check plus transaction-scoped advisory lock on the pair |
| Deleted expense still affects balances | Soft delete filtered in every query and covered by SQL tests |
| QR image leaks | Private bucket, participant check in the storage policy, 60-second signed URLs, no public links |
| Wrong invite address or duplicate person | Normalized unique email, pending correction before claim, refresh revokes the old link |
| A pending person cannot act | Claim links by email; `claim_people_for_me` runs after Google sign-in and on app load |
| The invited address has no Google account | Clear "sign in with a Google account using this email" copy; the creator can correct the address |
| A retained account has no Google identity | Before the wipe, verify each existing account can sign in with Google; if not, create a Google account with that address or re-add the person with a Google email |
| Anyone can sign up with Google | Self-service accounts see an empty Home and no data until added; no directory or public profile |

## Complexity Tracking

No constitution violations. No additional projects, layers, or abstractions beyond the tables and
RPCs above.

## Definition of Done

- All 121 functional requirements are implemented or explicitly verified as removed.
- Shares sum exactly to the item total in unit, SQL, and randomized invariant tests.
- Cross-participant reads and writes are denied in SQL tests, including email and QR access.
- The full flow works at 360, 390, 412, 430, and 1440 in the light theme with 44-point targets.
- The legacy group, student, draft, finalization, recap, export, and Activity-tab code is gone.
- No email auth, OTP, magic link, SMTP, or invite-email code remains; sign-in is Google only and
  invites are copyable links.
- The release runbook is executed with a verified backup and recorded sign-off.
