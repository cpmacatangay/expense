# Contract: UI and Routes

**Feature**: `003-friends-expense-ledger` | **Date**: 2026-11-17

The interface keeps the existing three-tab shell and the light stone/ink visual world. Group setup,
the table switcher, students, drafts, finalization, recaps, exports, and the Activity tab are
removed.

## Route Map

| Path | Screen | Tab |
|---|---|---|
| `/` | Home | Home |
| `/expenses` | All expenses | pushed from Home |
| `/expenses/new` | New expense | pushed |
| `/expenses/:expenseId` | Expense detail | pushed |
| `/expenses/:expenseId/edit` | Edit expense | pushed |
| `/ledger` | Ledger | Ledger |
| `/settings` | Settings | Settings |
| `/join/:token` | Expense share link handler | behind auth |
| `*` | Not found | — |

No `/outings/:id`, `/history`, `/welcome`, group setup, or group switcher routes.

## App Shell

- `AuthProvider` resolves the session. Unauthenticated users see `SignInPage`.
- Sign-in copy is Google only: a single **Continue with Google** action. Do not mention a group
  owner, table, email code, or magic link. A new Google account lands on an empty Home; a friend can
  add them to an expense.
- After sign-in, a `useMe` query calls `ensure_person` and then `claim_people_for_me` once. There is
  no group gate and no first-run setup.
- While `useMe` loads, show `SplashScreen`.
- If `useMe` fails, show a recoverable error with Retry; do not strand the person in a setup screen.
- `PlatformShell` and the three-tab navigation are unchanged. The tab list is Home, Ledger, Settings.
- Use page titles through `usePageTitle`.

## Home

**Purpose**: show the person's money position, start an expense, and surface recent change.

Data:

- `ledger_for_me` → you owe, owed to you, pairwise debts.
- `recent_activity(5)` → five events.
- `useMe` → greeting name.

Layout:

1. Greeting and a short line: “3 people” is removed; use “Your ledger” or no count. Do not claim a
   table or group.
2. Balance card: “You owe ₱X”, “You are owed ₱X”, or “All square”. Each debt row shows the other
   person, direction, amount, and opens the same `PaySheet` used in Ledger (QR, amount, Mark paid) or
   a Ledger link. No debt between other people is ever shown.
3. Primary action **New expense**.
4. Recent activity: five rows, each with actor, summary, and time. Deleted expenses are labels, not
   links. A **See all** action opens `/expenses`.
5. Empty state: “No expenses yet. Record the first one.” with **New expense**.

States:

- Loading: balance skeleton, action disabled briefly, activity skeleton.
- Offline: cached balance if available; New expense explains a connection is required.
- Error: a named error and Retry; the action stays available if the balance failed.

Do not show group names, table names, member counts, pending settlements, or owner language.

## All Expenses

- `expenses_for_me`, newest first.
- Row: date, description, payer name, total, “your share”.
- Tap opens detail.
- Empty state explains how to record the first expense.
- No filters, recaps, exports, or bulk actions.

## Expense Editor

Routes `/expenses/new` and `/expenses/:id/edit`.

Fields:

1. **Description** — required, 1–120.
2. **Date** — defaults to Manila today.
3. **Payer** — a select over the current people; defaults to the creator.
4. **People** — the participant set, including the creator and payer. Add by name opens
   `AddPersonSheet`. Minimum 2, maximum 12.
5. **Items** — a persistent quick-add composer (name, amount, last-used person) plus editable rows.
   Every item belongs to one person. **Split equally** creates independent one-person lines from a
   total. No stored shared line, quantity, unit price, or tax.
6. **Coverage** — optional. For each non-payer, choose “Pays own share” or “Covered by …”. Only valid
   coverers are offered; a coverer cannot be covered, and the payer cannot be chosen.
7. **Preview** — total, each person's share, coverage note, and who owes whom. Updates on change.

Actions:

- **Save expense** (primary). Disabled offline or while invalid, with inline reasons.
- **Cancel** returns to the previous screen. No draft is saved.
- Edit shows **Delete expense** in a destructive section for the creator or payer.

Validation mirrors the RPC:

- Description required.
- At least two people; payer and creator included.
- At least one item; every item has a name and a positive amount; every item assigned.
- Coverage rules.
- Save errors are shown next to the form, with the server message when it is safe.
- A stale-version error offers **Reload latest** and discards the unsaved edit only after confirmation.

Do not show finalize, reopen, lock, total mode, students, shared split, place, notes, or drafts.

## Expense Detail

- Header: description, date, total, payer.
- People: names, payer badge, “covered by X” where relevant.
- Items grouped by person, with each line amount. No shared group.
- Shares: per person items, covered amount, and owed amount.
- Coverage summary.
- History: `events` newest first with actor, action, and values that changed.
- **Edit** for the creator or payer; **Delete** with a confirmation naming the description.
- A deleted expense is not reachable; the route shows the standard not-found state.

Do not show finalization status, version, group, student, or settlement confirmation.

## Ledger

- `ledger_for_me` → totals and debt rows.
- Each row: other person, direction (“You owe Mai” / “Mai owes you”), amount, **Mark paid**, and a QR
  action when available.
- **Mark paid** calls `mark_paid` after a short confirmation that names the full amount. No recipient
  confirmation step.
- **Scan to pay** opens `PaySheet`: name, QR label, amount, the image or “Ask Mai for their QR”, and a
  **Mark paid** action.
- Paid history: `pair_history` on row expansion or a pair sheet, newest first, with Undo on active
  payments and a clear “Undone” state.
- Empty state: “All square.”
- Offline: show cached rows; Mark paid and QR explain that a connection is required.

Do not show pending/confirmed/declined states, partial payments, settlement notes, or a group ledger.

## Settings

Sections, in order:

1. **Profile** — display name with Edit; email read-only; sign out.
2. **People** — people shared with the caller and pending people they added. Pending rows show
   “Invited”, the invited email (creator only), **Create invite link**, and Correct email. Active
   rows show the name and status only. Create link and Correct appear only when `createdByMe` is
   true.
3. **Payment QR** — current image, label, upload/replace, remove. PNG/JPEG up to 2 MB.
4. **Install** — the existing `InstallSection`.
5. **Account** — delete account. Blocked with an explanation when the person owes or is owed; past
   expenses keep the recorded name. Deletion calls the `delete-account` function, then signs out.

No group name, group color, members panel, ownership, archive, delete group, students, or export.

## Join and Share

- **Share expense** appears on the detail page for the creator or payer. It opens a sheet with the
  `/join/<token>` link, Copy, optional native Share, expiry, and Refresh. Refreshing rotates the
  link and the old one stops working.
- `/join/<token>` ensures Google sign-in, then shows the limited expense summary and the open names.
  If one name is open it is preselected; otherwise the person chooses one.
- On success, route to the expense detail. If the caller is already on the expense, show “You're
  already on it.”
- On an expired or refreshed token, show “This link is no longer available.”
- Settings → People lists joined/not-joined status only; it does not create or list personal invite
  links.

## Shared Components

| Component | Responsibility |
|---|---|
| `AddPersonSheet` | Name input, `add_person` action, retry; no email or link |
| `PersonPicker` | Selected people, add person, remove person, not-joined badge |
| `ItemEditor` | Quick-add composer (name, amount, last-used person), saved rows, count/total, Split equally sheet |
| `CoverageEditor` | Per-person coverage choice with only valid coverers |
| `SharePreview` | Total, per-person shares, debt preview |
| `ShareExpenseSheet` | Copy/native share, 7-day expiry, refresh |
| `ActivityList` | Renders recent events and expense history, with deleted labels |
| `DebtRow` | Direction, amount, Mark paid, QR action |
| `PaySheet` | QR image, label, amount, missing-QR copy, Mark paid |
| `PaidHistory` | Payments with active/undone state and Undo |
| `PaymentQrImage` | Signed URL loading, error and missing states |

## Data and Cache

- Query keys: `["me"]`, `["people"]`, `["expenses"]`, `["expense", id]`, `["ledger"]`,
  `["pair", personId]`, `["activity", "recent"]`, `["expense-share", id]`.
- Save/delete invalidate `expenses`, `ledger`, `activity`, and the affected `expense`.
- Mark paid/undo invalidate `ledger`, `activity`, and `pair`.
- Add person/share/claim invalidate `people`, `expenses`, `ledger`, `activity`, and the open detail.
- A single realtime subscription invalidates `expenses`, `ledger`, `activity`, and the open detail on
  changes to `expenses`, `expense_shares`, `payments`, or `expense_events`. Payloads are not trusted;
  queries refetch under RLS.
- No persisted ledger cache, local drafts, or offline write queue.

## Responsive and Accessibility

- 390 and 1440 widths: no horizontal overflow, no clipped text, primary action reachable.
- 44-point minimum targets; visible focus; accessible names; reduced motion respected.
- Light-only. No appearance switch or dark tokens exposed.
- Loading, empty, offline, pending invite, and error states are explicit.
- No interaction depends on hover.

## Removed UI

`features/groups` (FirstRunPanel, GroupProvider, GroupSwitcher, SettingsPage, lifecycle,
invitations), `features/outings/OutingEditorPage`, `features/students`, `features/export`,
`features/recap`, `features/history`, the group-scoped `useGroupRealtime`, and all routes and copy
for tables, groups, owners, students, drafts, finalization, recaps, and exports.
