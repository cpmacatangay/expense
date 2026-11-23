# Tasks: Salo Friends Expense Ledger

**Input**: Design documents from `specs/003-friends-expense-ledger/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/rpc.md`, `contracts/ui.md`, `contracts/share-link.md`, `quickstart.md`

**Tests**: Included because the constitution requires money-sum invariants and participant-access tests. Write the SQL and money tests before the implementation they verify. UI tests cover the spec's acceptance scenarios.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

> **Post-release note**: migration `0035_expense_share_links` replaced `person_invitations` with
> per-expense share tokens and replaced the email invite RPCs. Historical T011/T012/T016/T017/T029
> references describe the earlier 0033 schema; the current schema and RPCs are in 0035, and the
> current item-entry tasks are T111–T115 below.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US8, matching `spec.md`
- Every task includes the exact file path

## Path Conventions

- Single repository, single web app: `src/`, `supabase/`, `tests/`, `scripts/`
- Database changes: `supabase/migrations/0033_participant_ledger.sql` and `0034_wipe_legacy_ledger.sql`
- SQL tests: `supabase/tests/`
- Browser tests: `tests/e2e/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove email-auth setup, add the release scripts, and prepare the shared fixtures.

- [ ] T001 Update `supabase/config.toml` for Google-only auth: `[auth] enable_signup = true`, `[auth.email] enabled = false`, Google provider enabled, and redirect URLs for `http://127.0.0.1:5173`, `http://localhost:5173`, and `https://salo-pi.vercel.app`.
- [ ] T002 Remove `VITE_EMAIL_AUTH_ENABLED` from `.env.example`; document `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the only client env values. The client flag and TypeScript type are removed with T034/T035.
- [ ] T003 [P] Remove the edge-money copy workflow: delete `scripts/sync-edge-money.mjs`, remove `sync:edge-money` from `package.json`, and remove the “Check Edge Function money copy” step from `.github/workflows/ci.yml`.
- [ ] T004 [P] Create `scripts/verify-backup.ps1` to check a dump file exists, print its SHA-256, and run `pg_restore --list` against it.
- [ ] T005 [P] Create `scripts/wipe-payment-qr.mjs` to list and delete every object in the private `payment-qr` bucket with the service role.
- [ ] T006 [P] Add `tests/fixtures/money-vectors.json` with assigned, coverage, payer-coverage, netting, mark-paid, undo, and reverse-direction cases.
- [ ] T007 Create the `supabase/functions/delete-account/index.ts` skeleton: verify the JWT, call `can_delete_account`, and delete the caller with the service role.
- [ ] T008 [P] Create `supabase/tests/participant_ledger.test.sql` with the pgTAP plan and helpers for accounts, people, expenses, and shares.
- [ ] T009 [P] Create `supabase/tests/participant_security.test.sql` with the pgTAP plan and three-account fixtures.
- [ ] T010 [P] Create `supabase/tests/money_vectors.test.sql` with the shared golden vectors from T006.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The schema, RPCs, domain engines, and app shell every story needs.

**CRITICAL**: No user story work starts until this phase is complete.

### Database

- [ ] T011 Create `supabase/migrations/0033_participant_ledger.sql`: `person_status` enum and tables `people`, `expenses`, `expense_people`, `expense_items`, `expense_coverage`, `expense_shares`, `payments`, `expense_events`, `person_invitations`, following `data-model.md`.
- [ ] T012 Add constraints and indexes in `0033_participant_ledger.sql`: `people` unique `lower(email)`, unique `profile_id`, status/profile check, QR path starts with `id || '/'`; `profiles` index on `lower(email)`; `expenses` description 1–120 and total/version checks; `expense_people` PK; `expense_items` name 1–120 and amount > 0 with a composite FK to `expense_people`; `expense_coverage` PK on `(expense_id, covered_person_id)`; `expense_shares` checks for owed = items + covered unless covered; `payments` from <> to and marker in the pair; `person_invitations` token hash unique and one open per person.
- [ ] T013 Add deferred integrity triggers in `0033_participant_ledger.sql`: 2–12 participants, payer and creator on the expense, `sum(owed) = total`, coverage rejects self, payer, chains, and loops, and a `before delete on profiles` trigger that sets linked people to `status = 'former'` and `profile_id = null`.
- [ ] T014 Add access helpers in `0033_participant_ledger.sql`: `current_person_id()`, `is_expense_participant(uuid)`, `can_edit_expense(uuid)`, `can_view_person(uuid)`.
- [ ] T015 Enable and force RLS in `0033_participant_ledger.sql`: select policies per `data-model.md`, no direct writes, revoke `anon`/`authenticated` writes, grant select, and replace the `payment-qr` storage policies for paths `{person_id}/{file}`.

### RPCs

- [ ] T016 Add identity RPCs in `0033_participant_ledger.sql`: `ensure_person`, `claim_people_for_me`, `claim_invite`, `update_display_name` (profile and person together).
- [ ] T017 Add people RPCs in `0033_participant_ledger.sql`: `people_for_me` (with `createdByMe`, pending email only to the creator), `add_person`, `create_invite_link`, `correct_pending_email`; 7-day token hash, raw token returned once, 20 actions/hour, no email.
- [ ] T018 Add the share engine and `save_expense` in `0033_participant_ledger.sql`: validate 2–12 people, payer/creator, items/assignees, coverage; compute `items`, `covered`, `owed`; sum = total; replace children atomically; version check; write one self-contained before/after event with payer, people, item, and coverage names.
- [ ] T019 Add expense read/delete RPCs in `0033_participant_ledger.sql`: `expenses_for_me`, `expense_detail` (including `canEdit` and events), and `delete_expense` (creator/payer, soft delete, event).
- [ ] T020 Add ledger RPCs in `0033_participant_ledger.sql`: `ledger_for_me`, `pair_history`, `mark_paid`, `undo_payment`, with transaction-scoped advisory locks on the sorted pair.
- [ ] T021 Add `recent_activity(limit)` in `0033_participant_ledger.sql`: union expense events and payments involving the caller, newest first, deleted expenses as labels.
- [ ] T022 Add QR/account RPCs in `0033_participant_ledger.sql`: `set_payment_qr`, `clear_payment_qr`, `can_delete_account` (both totals zero).
- [ ] T023 Implement `supabase/functions/delete-account/index.ts` with `can_delete_account` and service-role deletion; the profile trigger marks the person `former`.

### Domain and Client

- [ ] T024 [P] Create `src/domain/money/types.ts` and `src/domain/money/computeExpenseShares.ts`: one person per line, coverage, integer centavos, `owed` and total invariants.
- [ ] T025 [P] Create `src/domain/money/computeExpenseShares.test.ts` from `tests/fixtures/money-vectors.json`, and add a seeded property-based generator over random participants, items, and valid coverage; assert `sum(owed) = total` and covered people owe zero.
- [ ] T026 [P] Create `src/domain/ledger/types.ts` and `src/domain/ledger/computePairBalances.ts`: pairwise netting of shares and payments, direction and totals.
- [ ] T027 [P] Create `src/domain/ledger/computePairBalances.test.ts` from the same vectors.
- [ ] T028 Create `src/features/me/api.ts` and `src/features/me/useMe.ts`: `ensure_person`, `claim_people_for_me`, and the current person query.
- [ ] T029 [P] Create `src/features/people/types.ts` and `src/features/people/api.ts` for `people_for_me`, `add_person`, `create_invite_link`, `correct_pending_email`.
- [ ] T030 [P] Create `src/features/expenses/types.ts` and `src/features/expenses/api.ts` for `save_expense`, `expense_detail`, `expenses_for_me`, and `delete_expense`.
- [ ] T031 [P] Create `src/features/ledger/types.ts` and `src/features/ledger/api.ts` for `ledger_for_me`, `pair_history`, `mark_paid`, and `undo_payment`.
- [ ] T032 [P] Create `src/features/activity/types.ts` and `src/features/activity/api.ts` for `recent_activity`.
- [ ] T033 Replace the group gate in `src/app/App.tsx` and `src/app/providers.tsx` with `useMe`; stop rendering `GroupProvider`; route unauthenticated users to `SignInPage`. Leave the old group modules in place until T099 so not-yet-rewritten pages still typecheck.
- [ ] T034 [P] Update `src/features/auth/SignInPage.tsx` to Google only: one Continue with Google action, no email code, no magic link, no group-owner copy. Remove `VITE_EMAIL_AUTH_ENABLED` from `src/lib/env.ts` and `src/vite-env.d.ts` in the same change.
- [ ] T035 [P] Update `src/features/auth/AuthProvider.tsx` and `src/features/auth/authContext.ts` for Google-only sign-in and the claim-after-sign-in hook; remove the email OTP handling.
- [ ] T036 Update `src/ui/primitives/tabs.ts` and the route shell: Home, Ledger, Settings only; replace the old Home, Ledger, and Expenses imports with placeholders until their stories land; add placeholders for `/expenses`, `/expenses/new`, `/expenses/:id`, `/expenses/:id/edit`, `/join/:token`.
- [ ] T037 [P] Create `src/features/realtime/useLedgerRealtime.ts` to invalidate `expenses`, `ledger`, `activity`, and the open detail on `expenses`, `expense_shares`, `payments`, and `expense_events`.
- [ ] T038 [P] Fill `supabase/tests/participant_ledger.test.sql` with share sum, randomized expenses for the share-sum invariant, coverage, stale version, delete, payment direction, netting, and undo tests.
- [ ] T039 [P] Fill `supabase/tests/participant_security.test.sql` with cross-participant denial, pending claim, wrong Google email, hidden email, QR access, non-creator invite tests, account-deletion balance block, and the profile-to-former trigger.
- [ ] T040 Remove `useGroupRealtime` wiring from `src/app/App.tsx` and the selected-group keys from `src/app/legacyStorageCleanup.ts`. Keep `GroupProvider` and `groupContext` until T099.

**Checkpoint**: Schema, RPCs, domain engines, auth, and shell are ready. Test with `npx supabase test db` and `npm run test` before starting a story.

---

## Phase 3: User Story 1 — Record an expense (Priority: P1) — MVP

**Goal**: Create, save, and view an itemized expense with one person per line.

**Independent Test**: With three existing accounts, open New expense, add two people, add three items, assign each, save, and verify the shares and debt.

### Tests first

- [ ] T041 [P] [US1] Add editor validation tests in `src/features/expenses/ExpenseEditorPage.test.tsx`: description, two people, payer included, item name/amount/assignee, and equal-split lines that sum exactly to the total. No stored shared line or unequal split.
- [ ] T042 [P] [US1] Add the browser happy path in `tests/e2e/expense-flow.spec.ts`: sign in, New expense, three people, three items, save, detail.

### Implementation

- [ ] T043 [P] [US1] Create `src/features/expenses/ItemEditor.tsx`: persistent quick-add composer (name, amount, last-used person), saved item rows, inline errors, and an **Split equally** sheet that creates independent one-person lines. No quantity, unit price, stored shared line, or unequal split.
- [ ] T044 [P] [US1] Create `src/features/expenses/SharePreview.tsx`: total, per-person shares, debt preview using `computeExpenseShares`.
- [ ] T045 [P] [US1] Create `src/features/expenses/useExpenses.ts`: expense list/detail queries and mutation invalidation.
- [ ] T046 [US1] Create `src/features/expenses/ExpenseEditorPage.tsx`: description, date, payer, people, items, preview, Save; no draft, finalize, reopen, lock, or total mode. Move `todayInManila()` from `src/features/outings/api.ts` to `src/lib/dates.ts` and use it as the date default.
- [ ] T047 [US1] Create `src/features/expenses/ExpenseDetailPage.tsx`: payer, people, items, shares, total, date, edit/delete controls when `canEdit`.
- [ ] T048 [US1] Create `src/features/expenses/ExpenseHistory.tsx` with the basic creation/update event list from `expense_detail`.
- [ ] T049 [US1] Wire `/expenses/new`, `/expenses/:id`, and `/expenses/:id/edit` in `src/app/App.tsx`; lazy-load the editor and detail.
- [ ] T050 [US1] Update `src/pages/HomePage.tsx`: greeting, New expense, empty state, offline save message, and navigation after save.
- [ ] T051 [US1] Add save error, stale-version reload, delete confirmation, and invalid-form handling in `src/features/expenses/ExpenseEditorPage.tsx`.

**Checkpoint**: US1 is independently testable with seeded accounts and delivers the core expense record.

---

## Phase 4: User Story 2 — See who owes whom and mark a debt paid (Priority: P1)

**Goal**: Home and Ledger show pairwise debts; either person marks the full amount paid or undoes it.

**Independent Test**: Record two expenses with different payers, open Ledger, mark one debt paid, verify only that pair clears and undo restores it.

### Tests first

- [ ] T052 [P] [US2] Add `src/features/ledger/DebtRow.test.tsx` for direction, amount, Mark paid, and QR action.
- [ ] T053 [P] [US2] Add `tests/e2e/ledger-paid.spec.ts`: debt, mark paid, paid history, undo.

### Implementation

- [ ] T054 [P] [US2] Create `src/features/ledger/useLedger.ts`: ledger totals/debts, pair history, mark-paid and undo mutations.
- [ ] T055 [P] [US2] Create `src/features/ledger/DebtRow.tsx`: other person, direction, amount, Mark paid, Scan to pay.
- [ ] T056 [P] [US2] Create `src/features/ledger/PaidHistory.tsx`: active/undone payments, actor, date, Undo.
- [ ] T057 [US2] Rewrite `src/pages/LedgerPage.tsx`: totals, debt rows, paid history, empty “All square”, offline and error states.
- [ ] T058 [US2] Create `src/features/ledger/PaySheet.tsx`: name, amount, Mark paid, missing-QR copy and a QR slot for US8.
- [ ] T059 [US2] Update `src/pages/HomePage.tsx` with the balance card, totals, debt rows, and the shared `PaySheet`.
- [ ] T060 [US2] Add undo, full-amount confirmation, and post-mutation invalidation in `src/pages/LedgerPage.tsx`.

**Checkpoint**: A recorded expense produces a visible debt that either person can settle.

---

## Phase 5: User Story 3 — Add people by name and share the expense (Priority: P1)

**Goal**: Add named placeholders, create one 7-day share link per expense, and let a signed-in recipient claim an open name.

**Independent Test**: Add two names to an expense, save, create the share link, sign in as one of the names, claim it, and see the recorded share.

### Tests first

- [ ] T061 [P] [US3] Add `src/features/people/AddPersonSheet.test.tsx` for a new name, duplicate pending name, max people, and no email field.
- [ ] T062 [P] [US3] Add `tests/e2e/share-link.spec.ts` with a second Google identity: add name, share, preview, claim, refresh, expired, and already-participant.

### Implementation

- [ ] T063 [P] [US3] Create `src/features/people/AddPersonSheet.tsx`: name input, `add_person`, retry; no email or link UI.
- [ ] T064 [P] [US3] Create `src/features/people/PersonPicker.tsx`: selected people, add person, not-joined badge, remove; min 2, max 12.
- [ ] T065 [US3] Create `src/features/people/usePeople.ts`: list/refresh queries and invalidations.
- [ ] T066 [US3] Create `src/pages/SettingsPage.tsx` with profile name edit, People, Install, and sign out; no group, table, student, or invite actions.
- [ ] T067 [US3] Add People rows to `src/pages/SettingsPage.tsx`: joined/not-joined status only.
- [ ] T068 [US3] Create `src/pages/JoinExpensePage.tsx`: `/join/:token`, Google sign-in, limited preview, choose name, claim, route to the expense.
- [ ] T069 [US3] Create `src/features/share/ShareExpenseSheet.tsx` and `api.ts`: copy/native share, 7-day expiry, and refresh.

**Checkpoint**: People can be added by name and can join from one expense link without email delivery.

---

## Phase 6: User Story 4 — Find a past expense (Priority: P2)

**Goal**: A full, newest-first expense list reached from Home.

**Independent Test**: Record three expenses on different dates, open See all, verify order, fields, and that only the viewer's expenses appear.

### Tests first

- [ ] T070 [P] [US4] Add `src/pages/AllExpensesPage.test.tsx` for ordering, fields, empty state, and deleted absence.
- [ ] T071 [P] [US4] Add `tests/e2e/all-expenses.spec.ts` for See all → open detail.

### Implementation

- [ ] T072 [US4] Create `src/pages/AllExpensesPage.tsx`: date, description, payer, total, your share, newest first.
- [ ] T073 [US4] Add the See all action and All expenses route in `src/pages/HomePage.tsx` and `src/app/App.tsx`.

**Checkpoint**: Past expenses are findable without a fourth tab.

---

## Phase 7: User Story 5 — Cover a friend's share (Priority: P2)

**Goal**: One-level coverage inside an expense; the coverer owes the payer for the covered share.

**Independent Test**: Record a three-person expense where B covers C; verify B owes for both and C owes zero.

### Tests first

- [ ] T074 [P] [US5] Add `src/features/expenses/CoverageEditor.test.tsx` for valid coverers, self, payer, chains, and loops.
- [ ] T075 [P] [US5] Add `tests/e2e/coverage.spec.ts` for save, shares, and C’s “Covered by B” detail.

### Implementation

- [ ] T076 [P] [US5] Create `src/features/expenses/CoverageEditor.tsx`: per-person “Pays own share” or “Covered by …”, only valid coverers.
- [ ] T077 [US5] Integrate coverage into `src/features/expenses/ExpenseEditorPage.tsx` and the save payload.
- [ ] T078 [US5] Update `src/features/expenses/SharePreview.tsx` and `src/features/expenses/ExpenseDetailPage.tsx` for covered shares and “Covered by”.
- [ ] T079 [US5] Add removal warnings and recalculation in `src/features/expenses/ExpenseEditorPage.tsx`.

**Checkpoint**: Coverage is one level and reconciles with the save engine.

---

## Phase 8: User Story 6 — Review activity and expense history (Priority: P2)

**Goal**: Five recent events on Home and the full change history inside each expense.

**Independent Test**: Create, edit, cover, mark paid; verify Home recent activity, expense history, and pair paid history.

### Tests first

- [ ] T080 [P] [US6] Add `src/features/activity/describeEvent.test.ts` for created, updated, deleted, and payment summaries.
- [ ] T081 [P] [US6] Add `tests/e2e/activity.spec.ts` for Home recent, expense history, and payment history.

### Implementation

- [ ] T082 [P] [US6] Create `src/features/activity/describeEvent.ts`: diff snapshots into concise, factual summaries.
- [ ] T083 [P] [US6] Create `src/features/activity/ActivityList.tsx`: actor, summary, time; deleted expenses are labels, not links.
- [ ] T084 [US6] Add the five-event recent list to `src/pages/HomePage.tsx`.
- [ ] T085 [US6] Upgrade `src/features/expenses/ExpenseHistory.tsx` with full before/after diffs and deletion labels.
- [ ] T086 [US6] Add activity invalidation to `src/features/realtime/useLedgerRealtime.ts` and the save/delete/pay mutations.

**Checkpoint**: Changes are visible where they happened without an Activity tab.

---

## Phase 9: User Story 7 — Keep expenses private (Priority: P2)

**Goal**: Only participants see an expense; only the pair sees a balance; no emails or QR leak.

**Independent Test**: As C, who shares a different expense with A, try A–B’s expense, items, history, QR, and balance; all denied.

### Tests first

- [ ] T087 [P] [US7] Extend `supabase/tests/participant_security.test.sql` with third-account denial for every table and RPC.
- [ ] T088 [P] [US7] Add `tests/e2e/privacy.spec.ts` for not-found routes, hidden emails, and cross-account QR denial.

### Implementation

- [ ] T089 [US7] Add not-found and access-denied handling in `src/pages/NotFoundPage.tsx` and the expense/pair routes.
- [ ] T090 [US7] Normalize RPC access errors in `src/lib/errors.ts`: “Not found” never reveals existence.
- [ ] T091 [US7] Add account deletion to `src/pages/SettingsPage.tsx` with the zero-balance block and `delete-account` call.

**Checkpoint**: Privacy is enforced by the database and mirrored in the UI.

---

## Phase 10: User Story 8 — Show a payment QR (Priority: P3)

**Goal**: A private QR on the person owed, reachable from Home and Ledger debts.

**Independent Test**: Upload a QR, open the debt, see the image and amount; a third account is denied; a missing QR still allows Mark paid.

### Tests first

- [ ] T092 [P] [US8] Add `src/features/ledger/PaySheet.test.tsx` for image, missing, offline, and Mark paid.
- [ ] T093 [P] [US8] Add `tests/e2e/payment-qr.spec.ts` for upload, view, remove, and third-account denial.

### Implementation

- [ ] T094 [P] [US8] Update `src/features/payments/usePaymentQrUrl.ts` for `{person_id}/{file}` paths and 60-second signed URLs.
- [ ] T095 [P] [US8] Update `src/features/payments/PaymentQrImage.tsx` for person paths, loading, missing, and error states.
- [ ] T096 [US8] Add QR upload, replace, remove, label, and 2 MB PNG/JPEG validation to `src/pages/SettingsPage.tsx`.
- [ ] T097 [US8] Add the QR image, label, amount, missing copy, and offline state to `src/features/ledger/PaySheet.tsx`.
- [ ] T098 [US8] Wire QR reachability from Home’s debt card and Ledger rows in `src/pages/HomePage.tsx` and `src/pages/LedgerPage.tsx`.

**Checkpoint**: QR is private, scannable, and never changes the ledger.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Remove the old product, align docs and CI, and run the full release validation.

- [ ] T099 After US1, US2, and US4, delete `src/features/groups/`, `src/features/history/`, `src/features/outings/`, `src/features/realtime/useGroupRealtime.ts`, `src/pages/ExpensesPage.tsx`, and the other legacy UI folders `src/features/students/`, `src/features/export/`, and `src/features/recap/`.
- [ ] T100 Delete the legacy Edge Functions `supabase/functions/finalize-outing/` and `supabase/functions/invite-adult/`.
- [ ] T101 Delete the old money/ledger code `src/domain/money/computeShares.ts`, `src/domain/money/allocate.ts`, `src/domain/ledger/computeLedger.ts`, their tests, and the legacy SQL tests `supabase/tests/security.test.sql` and `supabase/tests/multi_group.test.sql`; move still-relevant assertions into the new tests.
- [ ] T102 Update `PRODUCT.md`, `DESIGN.md`, and `SECURITY.md` for the participant ledger, Google-only auth, share-link invites, no email delivery, and the new access matrix.
- [ ] T103 Update `README.md` and `.env.example` for Google-only setup and the new commands.
- [ ] T104 Update `.github/workflows/ci.yml` and `package.json` so the database job runs the new SQL tests and the edge-money step is gone.
- [ ] T105 Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`; fix failures in `src/`.
- [ ] T106 Run `npx supabase test db`; fix failures in `supabase/tests/` and `supabase/migrations/0033_participant_ledger.sql`.
- [ ] T107 Run `npm run test:e2e` at 360, 390, 412, 430, and 1440. Run Lighthouse mobile on the production build with 4G throttling; verify first usable under 3 seconds, interactions under 100ms, and live updates under 2 seconds. Fix failures in `tests/e2e/` and `src/`.
- [ ] T108 Review accessibility in `src/styles/global.css` and `src/ui/`: 44-point targets, contrast, focus order, labels, reduced motion.
- [ ] T109 Run the release dry run in `specs/003-friends-expense-ledger/quickstart.md`: backup verification, `0033`, `0034`, QR wipe, Google-only smoke, and the timing checks.
- [ ] T110 Audit `specs/003-friends-expense-ledger/spec.md` against the built app for removed surfaces, no email auth, no groups/students/drafts/finalization/recaps/exports/Activity tab.

## Post-release 7.0.0 - Item composer and equal split

- [ ] T111 [P] [US1] Add `src/domain/money/splitEvenly.ts` and tests: 2–12 people, total > 0, each line at least 1 centavo, deterministic remainder to the first people in display order, and exact sum.
- [ ] T112 [US1] Replace `src/features/expenses/ItemEditor.tsx` with the persistent quick-add composer, saved inline rows, running count/total, and no blank-row creation.
- [ ] T113 [US1] Add the **Split equally** sheet: dish name, total, person checkboxes, per-person preview, and independent generated lines. Composer only; no action on saved rows.
- [ ] T114 [P] [US1] Add composer and split e2e coverage in `tests/e2e/` and verify Name focus/keyboard persistence on iPhone Safari and Android Chrome.
- [ ] T115 Audit the constitution 7.0.0 amendment and spec FR-038/FR-039/FR-122/FR-123 against the built composer before release.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks every story.
- **US1 (Phase 3)**: Depends on Foundational; no dependency on other stories with seeded people.
- **US2 (Phase 4)**: Depends on US1 expenses; can start once the expense save/detail is stable.
- **US3 (Phase 5)**: Depends on Foundational; integrates with the US1 editor for the picker.
- **US4 (Phase 6)**: Depends on US1’s expense list.
- **US5 (Phase 7)**: Depends on US1’s editor and `save_expense`.
- **US6 (Phase 8)**: Depends on US1/US2 events and payments.
- **US7 (Phase 9)**: Depends on Foundational and US1/US2 read paths.
- **US8 (Phase 10)**: Depends on US2’s Ledger/PaySheet and Settings.
- **Polish (Phase 11)**: Depends on all desired stories.

### Story Dependencies

- **US1 (P1)**: independent with seeded accounts.
- **US2 (P1)**: depends on US1.
- **US3 (P1)**: independent; completes the invite loop.
- **US4 (P2)**: depends on US1.
- **US5 (P2)**: depends on US1.
- **US6 (P2)**: depends on US1/US2.
- **US7 (P2)**: depends on Foundational; can run alongside US2.
- **US8 (P3)**: depends on US2/Settings.

### Within Each Story

- Write the listed tests first; they must fail.
- Modals/editors before page integration.
- Hooks before pages.
- Error states before the checkpoint.
- Do not start the next priority until the current story passes its independent test.

### Parallel Opportunities

- Setup: T003–T006 and T008–T010.
- Foundational: T024–T027, T029–T032, T034/T035/T037, T038/T039.
- US1: T041–T045.
- US2: T052–T056.
- US3: T061–T064.
- US8: T092–T095.
- Tests for different files can run together; tasks touching `HomePage.tsx` or `SettingsPage.tsx` are sequential.

### Parallel Example: US1

```text
T041 Editor validation tests
T042 Browser happy path
T043 ItemEditor
T044 SharePreview
T045 useExpenses
```

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Setup and Foundational.
2. Complete US1: record an expense with seeded accounts.
3. Complete US2: see the debt and mark it paid.
4. Stop and validate with two accounts. This is the usable core.

### Incremental Delivery

1. US1 → record and view an expense.
2. US2 → balances and settlement.
3. US3 → add new people with links.
4. US4 → find past expenses.
5. US5 → coverage.
6. US6 → activity history.
7. US7 → privacy hardening.
8. US8 → payment QR.
9. Polish and release dry run.

## Notes

- All money is integer centavos; the server computes, the client previews.
- No task may reintroduce groups, students, drafts, finalization, recaps, exports, an Activity tab, or email auth.
- Commit after each task or logical group.
- Stop at each checkpoint to validate the story independently.
