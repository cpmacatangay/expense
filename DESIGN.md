# DESIGN.md

# Design System

**Product**: Salo — shared group meal ledger PWA
**Mode**: Operate
**Platforms**: iPhone-first shell on iOS; Material 3 shell on Android
**Status**: Committed direction; iPhone prototype built at `design/pwa-prototype/`
**Direction**: Achromatic ledger, adapted · seed `476852879`
**Face**: warm sage-stone ground, ink figures, Ledger Green as the one hue, SF Pro system stack
**Signature**: the shared table — member initials and group presence

### Direction redraws

- **Desktop open-plane sidebar → iPhone bottom tabs.** The product is iPhone-first and the brief
  chooses four bottom tabs. The sidebar composition is not used.
- **Wallet action tiles → one balance card plus one primary action.** The brief asks for one balance
  card, pending actions, recent outings, and a single primary action, not a row of four tiles.
- **30px title → 28px.** Keeps the iPhone large-title presence while staying inside the app-screen
  phone guidance.
- **Ledger Green replaces the style's blue chart hue.** The brand is fixed; the one hue is green, and
  red is reserved for "you owe" and destructive confirmation.


## 1. Design Intent

Salo is used one-handed at the table, often with poor signal, while a bill is being discussed. The
design succeeds when a member can answer three questions in seconds:

1. What do I owe or what am I owed?
2. Who else is at this table?
3. What do I need to do next?

The iPhone shell should feel like a native iPhone app: large titles, grouped inset lists, sheets,
bottom tabs, safe areas, system type, quiet motion. The Android shell should feel like a Material 3
app: top app bar, navigation bar, cards, filled buttons, Roboto, tonal surfaces. Neither shell should
look like a responsive web dashboard.

The shared idea is **the table**: a small cluster of member initials, group presence, and a balance
that belongs to the table rather than to a generic wallet.

## 2. Shared Principles

- **One decision per screen.** The balance or the next action leads; everything else is secondary.
- **Money is the anchor.** One strong balance card per screen. Secondary amounts sit in lists.
- **Present people only.** Avatars and rows show who attended; absent adults are not implied.
- **Quiet confidence.** No gradients, glows, glass, or decorative charts. Tone, type, and spacing do
  the work.
- **Native, not neutral.** Each platform uses its own conventions. Shared tokens do not force a
  compromise.
- **State is explicit.** Pending, confirmed, declined, offline, syncing, private draft, and stale are
  visible states, not hidden implementation details.

## 3. Tokens

### Color

Shared roles:

| Role | Light | Dark | Use |
|---|---|---|---|
| `ground` | warm sage-stone `#F2F4F0` | deep green-black `#0C1511` | Page background |
| `surface` | `#FCFDFB` | `#12201A` | Cards, grouped rows |
| `surfaceMuted` | `#EAEDE7` | `#1A2A22` | Secondary panels |
| `ink` | `#15221C` | `#EDF5EF` | Primary text |
| `inkMuted` | `#5D6B63` | `#A9B8AF` | Secondary text |
| `green` | `#1F5C45` | `#8FE3B6` | Primary action, positive balance |
| `greenSoft` | `#D9EFE2` | `#1D3A2C` | Selected/positive tint |
| `mint` | `#B4F0CE` | `#B4F0CE` | Dark-mode accent |
| `red` | `#A83232` | `#FF8A80` | "You owe"; destructive confirmation |
| `amber` | `#8A5A12` | `#F2C36B` | Pending/disputed |
| `line` | `#D8DDD4` | `#2A3A31` | Hairline separators |

Rules:
- Green is the action and positive state. Red is "you owe" and destructive confirmation. Amber is
  pending or disputed.
- Never use green for a destructive action.
- Running text uses `ink`, not a soft gray.
- Dark mode is a deep green-black, not pure black, with mint accents.

### Type

**iPhone shell**: SF Pro via `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
system-ui, sans-serif`.
**Android shell**: Roboto, with Material 3 type roles.

Shared scale:

| Role | Size / line | Use |
|---|---|---|
| Display | 34/40 (iPhone), 36/44 (M3) | The one balance number |
| Title 1 | 28/34 | Screen title |
| Title 2 | 22/28 | Section title |
| Headline | 20/26 | Card title |
| Body | 16/24 | Running text, rows |
| Label | 13/18 | Metadata, tab labels |
| Caption | 12/16 | Timestamps, helper text |

Rules:
- Dynamic Type must be respected; layouts expand rather than clip.
- Amounts use tabular figures.
- No monospace outside real code.
- No tiny uppercase letter-spaced labels.
- One headline, one supporting sentence, one primary action per screen.

### Spacing

One 4px base scale:

| Token | Value | Use |
|---|---|---|
| `2xs` | 4 | icon/label pairing |
| `xs` | 8 | inside a control |
| `sm` | 12 | stacked rows |
| `md` | 16 | screen gutter, card padding |
| `lg` | 20 | statement card padding |
| `xl` | 24 | between blocks |
| `2xl` | 32 | above a title, empty states |
| `3xl` | 48 | minimum touch target, large separation |

iPhone screens use 16–20px outer gutters. Android uses 16px and Material layout margins. Both use the
same rhythm; only the component chrome differs.

### Shape and depth

- iPhone: grouped inset cards at 12–16px radius, sheets at 16px top radius, buttons as pills or plain
  text actions.
- Android: Material 3 cards at 12px, filled buttons as pills, text fields at 4px, sheets at 16px top
  radius.
- No shadows at rest. Depth comes from tonal steps and separators.
- Shadows only on sheets and dialogs that truly float.

## 4. iPhone Shell

### Structure

- Large title at the top of Home, Ledger, Activity, and Settings.
- Bottom tab bar: Home, Ledger, Activity, Settings.
- Safe-area insets on all edges.
- Content scrolls under the large title; the tab bar stays fixed.
- Sheets for new outing, item entry, settlement, invites, and appearance.
- A sticky total at the bottom of the outing editor, above the safe area.

### Home

1. Group switcher (chevron + group name + initials cluster).
2. Balance card: "You owe" in red or "You are owed" in green; the amount is the display number.
3. Pending actions: settlements to confirm, drafts to publish, invites to claim.
4. Recent outings: date, place, total, payer, member initials.
5. Primary "New outing" action.

The balance card is the only card with a filled field color. Everything else is grouped rows.

### Ledger

- A group net-balance summary at the top.
- One row per adult: initials, name, net amount, state.
- "Who owes whom" rows with payer → payee and amount.
- Settlement history: pending, confirmed, declined, void with distinct labels.
- A "Record payment" action at the bottom.

### Outing editor

- One scrolling screen, not a four-step wizard.
- Date, place, notes.
- Present adults: a horizontal initials row with checkmarks.
- Present students: rows with a covering-adult selector.
- Items: grouped rows; add/edit in a sheet; split/merge in a row menu.
- Sticky total: Auto/Manual/Fixed label, amount, and "Use items total" when Manual.
- Review and finalize at the bottom; only the owner sees finalize.
- Private draft state is a small banner; publish is explicit.

### Activity

- Newest first.
- Actor initials, action sentence, subject, relative time.
- Sensitive changes expand to show before/after.
- Pending settlement and dispute events are visually distinct.

### Settings

- Group card: name, color, members, invites.
- Payment QR: upload, replace, or remove your private QR and label; the owner can add one for a pending adult.
- Students: roster and archive.
- Appearance: Automatic, iPhone, Android.
- Export: full group for owner, own data for member.
- Account: sign out, delete account.
- Install Salo: Add to Home Screen guidance.

## 5. Material 3 Shell

### Structure

- Top app bar with the Salo mark, group name, and group switcher.
- Navigation bar: Home, Ledger, Activity, Settings.
- Content uses Material 3 cards, lists, chips, and filled buttons.
- Sheets for new outing, item entry, settlement, and invites.
- System light/dark; light-first design with a true dark theme.

### Components

- **Balance card**: filled tonal card, display amount, label, and pending count.
- **Group switcher**: exposed dropdown or bottom sheet.
- **Member rows**: initials in tonal circles, name, role, net amount.
- **Outing rows**: card with place, date, total, payer, and member initials.
- **Item rows**: name, quantity × unit, amount, assignment chip.
- **Total field**: outlined field with supporting text and a text action.
- **Settlement rows**: status chip (pending, confirmed, declined, void), amount, date.
- **Activity rows**: list items with leading icon/initials, action text, timestamp.

Material 3 rules:
- Use `primary` for actions and selected states.
- Use `error` only for "you owe" and destructive actions.
- Use tonal surfaces rather than shadows.
- Use Material motion and state layers; respect reduced motion.

## 6. Shared Components

### Initials

- Two-letter initials in a circle; color from the group's fixed set.
- Pending adults use a dashed outline or a small "Pending" label.
- Removed adults are shown in history with muted initials and a "Removed" label.
- No photos.

### Balance card

- One per Home and Ledger.
- Label, amount, optional pending count.
- Red for "you owe," green for "you are owed," neutral for zero.
- Tap opens Ledger.

### Total field

- Label "Total"; prefix ₱.
- Auto: "Following N items."
- Manual: "Items total ₱X." plus "Use items total."
- Fixed: "Saved total; item changes do not update it."
- 16px type; no shrinking; single line.

### Settlement sheet

- From → To, amount, date, note.
- Pending/confirmed/declined states.
- Confirm and Decline actions for the recipient; Decline requires a note.
- Payer sees Void/Edit for pending or declined.
- A "Scan to pay" action opens the payee's payment QR sheet when one exists.

### Payment QR

- One primary QR per group adult, uploaded in Settings → Payment QR. The owner can upload for a pending adult.
- The pay sheet shows the payee's name, QR label, and amount on a white, high-contrast card at a
  scannable size. Copy: "Scan with your GCash, Maya, or bank app."
- Entry points: Home balance card and debt rows, Ledger who-owes-whom and settlement sheets, and finalized outing detail. A single Home creditor opens that QR; several open the Ledger debt list.
- Missing QR: "Ask <payee> for their payment QR." The record-payment action stays available.
- Privacy line: "Only members of this group can see this QR."
- The QR is never in a recap, export, invite, or public surface, and Salo never opens the camera.
- The QR sheet has a "Record payment" action; scanning does not change the ledger by itself.
- iPhone: a sheet with a white QR card and a large code. Android: a bottom sheet/dialog with a tonal
  card. Both use the payee's name and amount above the code.

### Empty, error, offline, and sync states

- Empty: one sentence, one action.
- Error: what happened, what to do next, retry.
- Offline: a quiet banner; shared actions disabled with an explanation.
- Syncing: inline progress; do not block reading.
- Private draft: "Only you and the owner can see this until you publish."
- Stale: "Someone changed this outing" with refresh.
- Waiting for owner: "Ready — waiting for CP to finalize." The owner is the only finalizer.
- Removed member: history rows show "Removed"; pending settlements involving them can be voided by the owner.
- No payment QR: "Ask <payee> for their payment QR." The record-payment action remains.
- QR offline: "Connect to view this payment QR." The image is not cached.
- QR replaced: the sheet fetches a fresh signed URL; the old one stops working.

## 7. Motion

- Quiet iOS-native: sheet springs, 180–260ms; list insertion/removal; number transitions.
- No decorative loops.
- Respect `prefers-reduced-motion`; remove travel, keep content.
- One signature moment: the balance card settling after a confirmed payment, or the group's initials
  clustering on Home.
- Android uses Material motion; iPhone uses iOS-like springs. Do not share motion curves.

## 8. Accessibility

- 44pt minimum targets.
- Dynamic Type at 200% must not clip names, amounts, or tab labels.
- Screen-reader labels for initials, state chips, icon-only controls, and the group switcher.
- Announce settlement state changes, stale writes, and sync status.
- Visible focus for keyboard and assistive technology.
- Contrast AA in both themes.
- No hover-only interactions.

## 9. Do / Don't

**Do**
- Lead with one balance or one action.
- Use grouped lists for people, outings, and settings.
- Keep amounts right-aligned and tabular.
- Show who was present, not just who owes.
- Use the group's initials as the recurring visual motif.
- Keep the green for action and positive state; red for debt.

**Don't**
- Don't build a dashboard of identical cards.
- Don't use gradients, glows, glass, or decorative charts.
- Don't use tiny uppercase labels or monospace outside code.
- Don't show photo avatars or fake member photos.
- Don't mix iPhone and Material components in one shell.
- Don't hide pending or disputed states inside a generic "settled" label.

## 10. Reference

- iPhone shell references: Apple Health, Apple Wallet, iOS Settings, Apple Cash.
- Android shell references: Material 3 lists, cards, navigation bar, and filled buttons.
- Shared-expense references: Splitwise's clarity of balances, without its visual clutter.
- Archived Android design: `specs/001-salo-expense-sharing/DESIGN-android.md`.
