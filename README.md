# Salo

Salo is a friends expense ledger: one installable web app for recording who paid, what each person
had, who covers whom, and what each person still owes. It signs in with Google only. There is no
email authentication and no invite email; a new person gets a copyable invite link.

The active feature is [`specs/003-friends-expense-ledger/spec.md`](specs/003-friends-expense-ledger/spec.md).

## What the product does

- Record one expense with a description, date, payer, people, and itemized lines.
- Every line belongs to exactly one person. A shared dish is one line per person.
- One-level coverage: B can cover C, so B owes C's share to the payer and C owes nothing.
- See pairwise debts: “You owe Mai ₱400” or “Mai owes you ₱800”.
- Mark a full debt paid, or undo a mistaken payment; history keeps both.
- Keep a personal payment QR, shown only to people who share a debt or expense with you.
- Keep all expenses private to their participants.
- Recent activity on Home and the full change history inside each expense.

Removed: groups, tables, group invites, the table switcher, students, owner finalization, reopening,
locks, fixed totals, drafts, recaps, exports, the Activity tab, email sign-in, and email delivery.

## Stack

- React 19, Vite 7, React Router 7, TanStack Query 5, Zod 3
- Supabase Auth with Google OAuth only
- Supabase Postgres with RLS and security-definer RPCs
- Private Supabase Storage bucket for payment QR images
- Vitest + Testing Library, Playwright, pgTAP SQL tests

## Run

```powershell
npm ci
npm run dev
```

Environment:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For local Supabase:

```powershell
npx supabase start
npx supabase test db
```

## Verify

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npx supabase test db
```

## Release note

The revamp replaces the old group/table ledger. `0033_participant_ledger.sql` adds the participant
schema; `0034_wipe_legacy_ledger.sql` is destructive and must run only after a verified production
backup and explicit sign-off. Existing sign-in accounts are retained. No old ledger data or payment
QR image is migrated.

## Structure

```text
src/
  app/                 auth gate, providers, routes
  domain/money/        share preview engine
  domain/ledger/       pairwise netting
  features/expenses/   editor, detail, history, items, coverage
  features/people/     add by email, invite links, picker
  features/ledger/     debts, pay sheet, paid history
  features/activity/   recent activity and summaries
  features/me/         current person and claim
  features/payments/   private QR upload and signed viewing
  pages/               Home, All expenses, Ledger, Settings, Invite
supabase/
  migrations/          0033 participant ledger, 0034 legacy wipe
  functions/           delete-account
  tests/               money, ledger, and security SQL tests
```
