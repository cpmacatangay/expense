# Design

**Product**: Salo - friends expense ledger PWA

**World**: a warm stone desk with an ink receipt. Paper ground, ink chrome, one green used only for
money movement and positive confirmation. The ledger is the content; decoration stays quiet.

## Principles

1. **The expense is the object.** People, lines, shares, and the payer are the content. Never hide
   them behind generic cards or tabs.
2. **One number at a time.** Home leads with the viewer's balance; Ledger separates “You owe” and
   “Owed to you”; the editor ends with the split preview.
3. **Immediate.** No draft, finalize, lock, or total mode. Save is the commit.
4. **One thumb.** Primary actions sit at the bottom of the reachable column. Tap targets are at least
   44px. No interaction depends on hover.
5. **Light only.** `color-scheme: light`; no appearance switch. Dark tokens may remain unused.
6. **Quiet motion.** 120–180ms ease transitions for presses, sheets, and appearing rows. Reduced motion
   removes motion rather than shortening it.

## Palette and type

- Ground: warm paper (`#F2F1ED` at the shell).
- Surface: white-warm panels; ink `#171512`; muted ink for secondary copy; a single `--rule` border.
- Accent: Salo green, used for positive money and confirmation only. Destructive controls use red text
  with a neutral border, never a filled red button.
- Type: Geist for UI, Geist Mono for amounts and dates. Amounts are tabular. The balance uses the KPI
  size; row amounts use the body size.
- One 4px base. Screen gutters 16px phone / 24px wide. Section gap 12px, the same rhythm as the Home
  balance-to-New expense pair. Card padding 16px / 20px.

## Shell

- Header: S mark, “Salo”, and “Friends ledger” at 12px muted; Manila date or “Offline” in mono on the
  right. No table name or switcher.
- Three bottom tabs: Home, Ledger, Settings. All expenses, editor, detail, and invite are pushed
  screens; the tabs hide on the editor/detail stack.
- Offline banner is a thin paper strip with ink text. No red for connectivity.
- Skip link, focus rings, and safe-area padding are mandatory.

## Home

1. Greeting and one-line sub.
2. Balance ticket: “You owe ₱X”, “You are owed ₱X”, or “All square.” The ticket is the anchor.
3. Primary **New expense** directly under the ticket, separated by the 12px section rhythm.
4. Open debts panel: one row per person, direction, amount, Mark paid, optional Scan.
5. Recent activity panel: five events, then **See all** to All expenses.

Empty Home: “No expenses yet. Record the first one.” with New expense. Do not show a setup wizard.

## All expenses

Newest first. Row: description, date, payer, total, “your share”. Tap opens the detail. No filters,
recaps, exports, or bulk actions.

## Expense editor

- Description, date, payer.
- People: chips with an active/invited state, 2–12 people, creator included.
- Items: line name, amount, one assignee. No quantity, unit price, or shared line.
- Coverage: per person, “Pays own share” or “Covered by …”. Only valid coverers; one level.
- Split preview: total, person shares, coverage notes, who owes the payer.
- Save is primary; cancel returns. Delete is a separate destructive panel for editors.
- Inline validation names the problem. A stale save offers Reload latest.

## Expense detail

Description, date, total, payer; people with paid/created badges; item lines grouped by person;
shares with “Covered by”; full history; Edit for the creator/payer; Delete with confirmation. A
deleted expense is not reachable.

## Ledger

Balance ticket with two figures. Debt rows show the other person, direction, amount, Mark paid, Scan,
and History. Pay sheet: name, amount, QR or “Ask them for their QR”, Mark paid. Paid history per pair
with Undo. Empty: “All square.”

## Settings

760px column of titled panels:
1. Profile: display name, email read-only.
2. People: active and pending people, pending email only to the creator, Create invite link, Correct
   email.
3. Payment QR: current image and label, upload/replace/remove.
4. Install Salo.
5. Account: sign out, delete account with the balance block explained.

## Components and states

- Ticket, panel, row, field, primary/secondary/text/icon actions, status chip, sheet, QR frame.
- Text action: 44px, 1px neutral border, 4px radius, 14/500. Card-level Settings actions use the 6px
  control radius and fill the panel.
- Status chips are pale fills with dark ink; never saturated fill with white text.
- Loading uses a short copy line, not a spinner storm. Empty states explain the next action. Errors
  are paper surfaces with a named message and a retry.
- Sheets are modals on phone and centered on wide screens; 44px close target.

## Motion

- Press: 120ms opacity/scale to 0.98. Sheets: 180ms translate/fade. Rows: 120ms fade/slide when a
  mutation lands.
- No looping motion, parallax, or decorative shimmer.
- Respect `prefers-reduced-motion`.

## Accessibility

- 44px targets, visible focus, logical reading order, labelled inputs, and `aria-pressed` on people
  chips.
- Contrast meets WCAG AA for body text and amounts.
- Dynamic Type/large text must not clip amounts or buttons.
- Screen readers announce balance direction, coverage, payment state, and errors.

## Verification

- 360, 390, 412, 430, and 1440 widths, light theme, no horizontal overflow.
- Home, All expenses, editor, detail, Ledger, Settings, and Invite.
- Installed iPhone/Android shell, offline reads, and the “connection required” save state.
- Lighthouse mobile with 4G throttling; first usable under 3s, interactions under 100ms.
