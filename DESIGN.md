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

**Prototypes**: iPhone at `design/pwa-prototype/`; Android Material 3 at `design/pwa-prototype-android/`.


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
- Shadows only on sheets, dialogs, and the floating iPhone tab bar.

## 4. iPhone Shell

### Structure

- Large title at the top of Home, Ledger, Activity, and Settings.
- The top line carries the S mark, not the wordmark.
- Floating bottom tab bar: Home, Ledger, Activity, Settings. 12px side inset, 10px plus safe area
  from the bottom, 64px tall, 22px radius, solid surface with a 1px border and a soft shadow. The
  active item is a green-soft pill. It is never glass.
- The scroll area ends 12px above the bar, so content never runs underneath it.
- The bar is hidden on outing detail, draft, and new-outing screens.
- Safe-area insets on all edges.
- Content scrolls under the large title; the bar stays put.
- Sheets for new outing, item entry, review/finalize, settlement, invites, recap, QR management, export,
  and appearance.
- Onboarding: sign in, then create or join a group, then invite adults and add students.
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

- Top app bar with the S symbol, group name, and group switcher.
- Navigation bar: Home, Ledger, Activity, Settings, with a 64×32 active indicator pill.
- Content uses Material 3 cards, lists, chips, and filled buttons.
- Sheets for new outing, item entry, review/finalize, settlement, invites, recap, QR management, export,
  and appearance.
- Onboarding: sign in, then create or join a group, then invite adults and add students.
- System light/dark; light-first design with a true dark theme.
- Prototype: `design/pwa-prototype-android/`.

### Tokens

| Role | Value | Use |
|---|---|---|
| `surface` | `#F7FAF5` | Page ground |
| `surfaceContainerLowest` | `#FFFFFF` | Cards and rows |
| `outlineVariant` | `#E1E8DE` | Card and row outlines |
| `primary` | `#1F5C45` | Filled actions, positive money |
| `primaryContainer` | `#B4F0CE` | Selected chips, active indicator |
| `errorContainer` | `#F9DEDC` | "You owe" balance card |
| `onErrorContainer` | `#410E0B` | Text on the owed card |
| `secondaryContainer` | `#D9EFE2` | Confirmed, selected segments |
| `amberContainer` | `#F3E7D2` | Pending |
| Page title | Roboto 400, 28/36 | Screen title |
| Balance | Roboto 500, 36/44 | The one balance number |
| Row title | Roboto 500, 16/24 | Lists |
| Body | Roboto 400, 14/20 | Supporting text |
| `easeStandard` | `cubic-bezier(0.2, 0, 0, 1)` | Exits and simple state changes |
| `easeEmphasized` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Sheet and dialog entrances |
| Duration | 150ms short · 250ms medium | Press feedback, sheets |

Radii: 12px cards, 16px large cards and sheets, 20px buttons, 8px chips, 4px text fields.

### Components

- **Balance card**: a filled card — `errorContainer` when you owe, `secondaryContainer` when you are
  owed — with a display amount, label, and pending count.
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

### Brand mark

- The header uses the bare S symbol, not the Salo wordmark.
- The S sits at 24px tall in both shells, optically matched to the group switcher.
- The wordmark is reserved for splash, share cards, README, and external lockups.
- Install icons and the favicon use the rounded-square app-icon variant.
- Keep the accessible name "Salo"; the mark is decorative next to the group context.

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

### Actions and icons

Three action classes, chosen by what the control does — never by how the old screen happened to style it:

- **Primary action** (`.primary-action`): the one consequential commit on a surface (Finalize,
  Record payment, Save). Filled, pill, leading icon, one per screen where possible.
- **Secondary action** (`.secondary-action`): supporting commands (Cancel, Download, Share with
  owner, Confirm). Quiet outline or muted fill, pill, leading icon.
- **Text action** (`.text-action`): an in-place command inside a card or row (Invite, Rename,
  Add item, Sign out). Quiet pill with muted surface, 44px tall, 13px, leading icon. It must read
  as a button: no underline, no bare accent text. Destructive variants add `.is-danger`.
- **Text link** (`.text-link`): navigation only — moving to another screen. Accent color, no fill,
  no pill, trailing `arrow-right` or leading `chevron-left`. Never use it for a command, and never
  style a command as a link.
- **Icon-only action** (`.icon-action`): dense row controls where a label will not fit (QR, void,
  delete item). 44×44, circular, muted surface, `aria-label` and `title` required. Use it only when
  the icon is unambiguous and the row already carries a text label.

Icon rules:
- One family: the `Icon` primitive, 24px grid, 1.7px stroke, rounded caps, currentColor.
- 16px inside text and 44px controls, 18px in primary and secondary actions, 20px in body rows,
  24px in the tab bar. Never mix filled and stroked icons.
- Every command button carries an icon. A button without one is a bug, not a style choice.
- Icons are decorative (`aria-hidden`); the accessible name comes from the label or `aria-label`.

### File uploads

- Use the `FileField` primitive, never a bare `<input type="file">`.
- Structure: field label, a 52px bordered control showing the upload icon, the chosen file name
  (or "No file chosen"), and a Browse/Replace affordance, then a 12px hint line.
- The native input is visually hidden but focusable; the whole control is the label, and focus
  shows a 2px accent ring on the wrapper.
- Upload, replace, and remove are commands with icons, not links. Errors and limits sit in the
  hint line, not in placeholder copy.

### Total field

- Label "Total"; prefix ₱.
- Auto: "Following N items."
- Manual: "Items total ₱X." plus "Use items total."
- Fixed: "Saved total; item changes do not update it."
- 16px type; no shrinking; single line.

### Settlement sheets

- Confirm sheet (recipient): payer, amount, date, note; Confirm and Decline. Decline requires a note.
- Record sheet (payer): From → To, amount, date, note. Only the payer records; the recipient then confirms.
- Pending/confirmed/declined states.
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
- The QR sheet has a "Record payment" action for the payer only; other members see the QR read-only. Scanning does not change the ledger by itself.
- The owner's own QR sheet offers Replace and Remove. The owner can manage a pending adult's QR from Members.
- iPhone: a sheet with a white QR card and a large code. Android: a bottom sheet/dialog with a tonal
  card. Both use the payee's name and amount above the code.

### Recap

- Share text or an image after an outing is finalized.
- Includes the place, date, total, payer, and each person's share.
- Never includes payment QR codes, invite links, or private claims.

### Export

- The owner exports the full group; a member exports their own data.
- CSV or JSON.
- Includes outings, items, shares, settlements, and activity.
- Never includes QR images or invite tokens.

### Empty, error, offline, and sync states

- Empty: "No outings yet" with one primary action.
- Error: what happened, what to do next, retry.
- Offline: a quiet amber banner; shared writes stay in the sheet with an explanation. Private drafts remain usable.
- Syncing: inline progress; do not block reading.
- Private draft: "Only you and the owner can see this until you publish."
- Stale: "Your edit was rejected as stale" with reload. The client never overwrites a newer version.
- Declined: the recipient's note stays visible; only confirmed payments affect balances.
- Waiting for owner: "Ready — waiting for CP to finalize." The owner is the only finalizer.
- Removed member: history rows show "Removed"; pending settlements involving them can be voided by the owner.
- No payment QR: "Ask <payee> for their payment QR." The record-payment action remains.
- QR offline: "Connect to view this payment QR." The image is not cached.
- QR replaced: the sheet fetches a fresh signed URL; the old one stops working.

## 7. Motion

- Tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`,
  `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`; press 160ms, UI 180ms, sheet enter 240ms, sheet
  exit 180ms.
- Sheets are class-based transitions on opacity and translate only. Enter 240ms with the drawer curve;
  exit 180ms. The backdrop fades over 180ms.
- Toasts enter over 180ms and exit over 140ms. They are class-based, so rapid toasts retarget instead of
  restarting, and the timer pauses when the tab is hidden in production.
- Press feedback: scale 0.97 on buttons, rows, tabs, chips, and segmented controls; rows also take a
  quiet surface tint. Never animate `transition: all`.
- Tab switches are instant by design; the floating bar has no entrance animation.
- Respect `prefers-reduced-motion`: keep opacity, remove travel and press scale.
- One signature moment: the balance card settling after a confirmed payment, or the group's initials
  clustering on Home.
- Android uses Material motion; iPhone uses iOS-like curves. Do not share motion curves.

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
