# DESIGN.md

# Design System

**Product**: Salo — shared group meal ledger PWA
**Mode**: Operate
**Platforms**: one Salo interface on iPhone and Android; only safe areas and input behavior differ
**Direction**: Achromatic ledger, redrawn for Salo · seed `656333293`
**Face**: Geist with Geist Mono for every figure
**Signature**: the table split — one band that shows exactly how a bill divides, and a balance printed as a ticket

## 1. Design intent

Salo is used one-handed at the table, often with poor signal, while a bill is being discussed. A member
should answer three questions in seconds:

1. What do I owe, or what am I owed?
2. Who else is at this table?
3. What do I do next?

The world is **the shared table and the printed ticket**. Paper ground, ink chrome, one green used only
on the data, and figures set like a receipt. The interface is not a dashboard and not a phone imitation
of Material or iOS; it is one Salo language that adapts in width, not in personality.

**Direction redraws** (state them, don't hide them):

- **The style's #F8F8F8 chrome → a low-chroma warm stone.** The table world needs paper, but the first
  warm cream read as the assistant palette. The ground is a neutral stone (`#F2F1ED`), not a yellow
  cream; the warmth comes from ink, the ticket surface, and the green data.
- **The style's blue chart hue → Salo green.** The brand's own hue is kept and used only on data.
- **The style's sparse density → calm Home, dense Ledger.** Two jobs, two densities.
- **The dealt Manrope face → Geist + Geist Mono.** The style's own face is the mono figure; it is the
  product's ledger voice. Loaded locally, no network at runtime.
- **The single-column phone shell → a responsive top nav.** Four tabs on a phone; the same four
  destinations as text links on a wide screen. No sidebar, no floating pill bar.

## 2. Principles

- **One question per screen.** The balance answers Home; who owes whom answers Ledger; what changed
  answers Activity.
- **The table is the product.** People, shares, and the exact split are the content; never generic
  finance tiles.
- **Paper, not chrome.** Surfaces are flat, separated by one line or one tone step. No gradients,
  glows, glass, or resting shadows.
- **Ink for structure, green for data.** The primary action is ink; Salo green appears on the balance's
  split, the viewer's share, and positive states. Red is status, never decoration.
- **Figures are printed.** Every amount uses Geist Mono, tabular, right-aligned against its row edge.
- **One language, two widths.** Same components at 390px and 1440px; only density and navigation
  placement change.

## 3. Tokens

### Colour

| Role | Light | Dark | Use |
|---|---|---|---|
| `ground` | `#F2F1ED` | `#12100D` | Page |
| `surface` | `#FBFAF7` | `#191713` | Panels, tickets, nav |
| `raised` | `#E9E7E0` | `#211F1A` | Wells, selected rows |
| `active` | `#E2DFD6` | `#2A2721` | Pressed / selected |
| `border` | `#D9D5CC` | `#302D27` | Panel and control edges |
| `rule` | `#E9E6DF` | `#24211C` | Row rules |
| `control` | `#C7C2B8` | `#4A463D` | Input edges |
| `text` | `#171512` | `#F2F2F2` | Primary ink |
| `muted` | `#625E55` | `#B4B2AC` | Secondary text, 4.5:1+ |
| `accent` | `#1F5C45` | `#8FD6B4` | The one data hue |
| `accent-soft` | `#DCEBE1` | `#1B3326` | Selected data tint |
| `primary` | `#171512` | `#EFEEEA` | Filled action |
| `on-primary` | `#FBFAF7` | `#171512` | Filled action label |
| `negative` | `#8E2F22` | `#F0A79A` | You owe; destructive |
| `warning` | `#7A4E12` | `#E8C68A` | Pending |
| positive / warning / negative / neutral pills | pale pairs in `tokens.css` | dark tints | Status only |

Rules:
- The accent is data, not chrome. It never fills a button, a nav row, or a heading.
- Status pills are pale surface + dark ink of the same family; no saturated fill with white text.
- The identity circles keep their pale adult colour from the database, with a constant dark ink in
  both themes.
- Dark mode is a warm black, not navy; text is a neutral off-white, not cream.

### Type

| Role | Face / size | Use |
|---|---|---|
| Page title | Geist 24 (26 at ≥760) / 600 | One `h1` per screen |
| Section title | Geist 16 / 600 | Panel heading |
| Body | Geist 14 / 400, 1.5 | Rows and running text |
| Small | Geist 13 / 400–500 | Labels, helper copy, sublines |
| Micro | Geist 12 / 500 | Meta, tabs, legends |
| Pill | Geist 11 / 500 | Status only |
| Initials | Geist 10 / 600 | In the identity circle |
| Figure | Geist Mono 34 / 500 | The balance |
| Figure | Geist Mono 13–26 / 500 | Amounts, totals, codes |

Rules:
- Two faces only: Geist for words, Geist Mono for every figure. No monospace labels.
- `font-variant-numeric: tabular-nums` everywhere a figure updates.
- No display type: the title stays at 24–26, the balance at 34, nothing at 48.
- Sentence case. No tracked uppercase, no eyebrow labels above headings.

### Spacing, shape, and depth

- One 4px base; screen gutters 16px on a phone, 24px on a wide screen; section gap 24–28px.
- Panel padding 16px (20px at ≥760), card gap 16px.
- Radii: panel/ticket 8px, control 6px, chip 4px, sheet 12px. No 9–16px middle values elsewhere.
- No shadows at rest. A sheet is the only floating surface, with a soft shadow and a scrim.
- Touch controls 44px on a phone; 32–36px on a wide screen.

## 4. Shell

**One shell.** `PlatformShell` renders the same markup on both platforms; `data-platform` remains only
as a detection flag.

- **Header (60px phone / 64px wide):** the S mark in ink, "Salo" at 16/600, the group name at 12 muted,
  and the Manila date in mono on the right. No wordmark lockup; the splash carries the wordmark.
- **Navigation:** four destinations — Home, Ledger, Activity, Settings — as 20px outline icons and 12px
  labels in a bottom bar on a phone (56px + safe area). At ≥760px the same nav becomes a text row under
  the header. Active: ink label/label weight and a 2px ink rule; never a coloured pill.
- **Detail routes** (`/outings/:id`, `/drafts/:id`) hide the nav; the page carries a back link. The
  editor total is a fixed bottom bar on the surface with a 1px top rule.
- **Widths:** the app frame is 960px; every page is a 760px column centered inside it, so the header
  brand, page title, panels, and nav all share one left edge. Editors use 720px; Settings and lists use
  760px. The Home is a single calm column; the Ledger is the same column with denser rows.
- No sidebars, no responsive dashboard, no floating action button.

## 5. Components

### The ticket balance

- Home's largest element: a surface panel with two 14px punch notches on its sides (the ground showing
  through), an 8px radius, and a 1px border.
- Label (12 muted), figure (Geist Mono 34), one or two 13px lines of copy, a 1px rule, then the split.
- State: "You owe" sets the label and figure to `negative`; "You are owed" keeps ink; zero recedes to
  muted. The amount is always the absolute figure; the label carries the direction.

### The table split

- One horizontal band of segments sized by each adult's exact share, 10px tall with 2px seams.
- The viewer's segment is the only green. Everyone else is ink at one of five fixed opacities, never a
  separate hue. The legend repeats the band's tones as 7px squares with name + mono amount.
- Used on Home (last finalized meal) and on the outing/draft "Who pays what" panel. It replaces any
  share table; it is the product's signature.
- A flat amount is never shown twice: the legend is the only list of shares.

### Ledger rows

- 44px rows separated by 1px rules; no cards inside cards, no zebra.
- Identity circle 28px (22px for attendance), name 14/500, status/sublines 13/400 muted, amount Geist
  Mono 13 right-aligned on a single edge.
- Transfer rows read left to right: from initial → arrow → to initial → to-name + "From …" → amount →
  one 36–44px action. The action is a `+` ("Record payment"), not an arrow; the QR is its own button.
- Balances: "is owed"/"owes"/"even" as the subline; green/red only on the figure and subline.

### Status and stamp

- Status pills: 20px tall, 11/500, pale fill, dark ink, 4px radius.
- `Finalized` is a stamp: a 22px unfilled tag with a 1px ink border, used once in the editor total.
- One status mark per row. Pending adults show one `Pending` label; the initials are not tinted again.

### Actions

- **Primary:** 44px, 6px radius, ink fill, warm-white label, 16px icon. One per screen. The only
  exception is the dark theme's inverted light fill.
- **Secondary:** 44px, transparent, 1px control border, ink label.
- **Text action:** 44px on phone / 34px on wide, transparent, 1px border, 4px radius, 13/500. A command
  is never styled as bare underlined text. Destructive: red text with the same neutral border.
- **Icon action:** 44px phone / 36px wide, 1px border, 16px icon, accessible name + title.
- **Text link:** navigation only, 44px hit area, 13/500 ink, trailing arrow; underline on hover. Never
  use it for a command.

### Forms

- Label above the field, 13/500 muted; control 44px, 1px `control` border, 6px radius, surface fill.
- Inputs and selects share one height and radius; native date controls are mono 13. Placeholder uses
  `faint`, never a label.
- File upload is the shared `FileField`: 44px bordered control, upload icon, file name, Browse/Replace,
  a 13px hint, and a focus ring on the wrapper. No bare native file input.
- Action rows: 44px controls; primary right, cancel/secondary left. Destructive confirmation names the
  object and the consequence.

### Sheet

- Payment QR opens a bottom sheet, not an inline panel: scrim, 12px top radius, 430px max width, focus
  on Close, Escape closes, Tab is trapped, focus returns to the QR button, body scroll locks. On wide
  screens it centers as a 460px dialog.
- The QR surface stays white in both themes; its label ink stays dark, independent of the theme.

### Recap / export / payment QR

- Recap stays a paper receipt: Geist text, mono numbers, one image, share/copy/download as buttons.
- Exports are secondary actions with download icons; never green.
- The QR never appears in a recap or export.

## 6. Screens

- **Home (calm):** greeting h1, group + attendance subline, the ticket balance with the last meal's
  split, New outing (primary), private draft (text action), recent outings (4 rows + View all), private
  drafts if present, and the table roster with each person's net. One column, 24px rhythm.
- **Ledger (dense):** a compact balance strip, then Balances, Who owes whom, Confirm payments, Payment
  history. 44px rows, one-line sublines, one action per row.
- **Activity:** filter chips (44px), the activity log with actor, relative time, tag, and a "Before and
  after" disclosure. No tabs that pretend to be tabs.
- **Settings:** a 760px column of titled panels in task order: group, members, invite, students,
  ownership, payment QR, export, lifecycle, install, account. No eyebrow labels; every panel is named.
- **Outing editor / draft:** back link, place and date, attendance toggles, a receipt of items with mono
  amounts and a delete action, the table split, and a fixed total bar with the stamp or Finalize.
- **History:** back link, date/adult/student filters, a count title, and outing rows.
- **Onboarding:** paper ground, the S mark, a 28px title, one sentence, one primary. No shell.
- **Splash:** Ledger Green with the white S and "Loading Salo…"; the same splash is inlined in
  `index.html` so the first paint is green before React mounts.

## 7. States

- **Empty:** keep the panel frame and header; one sentence naming the state and the next action.
- **Loading:** keep the final layout, labels at once, values replaced by a flat tonal bar. No shimmer.
  Existing copy may name the operation ("Loading outings…") until the skeleton exists.
- **Error:** inside the panel that failed, one sentence and a retry; role="alert".
- **Success:** role="status"; brief, no toast layer.
- **Offline:** a 13px warning strip under the header; shared writes disabled with the reason.
- Missing value: a muted dash. A real zero prints as `₱0.00`.

## 8. Motion and accessibility

- Motion is feedback, not entrance choreography: press scale 0.99 on buttons, 0.97 on tabs, the sheet's
  14px rise, the activity chevron. No page-load animations.
- `prefers-reduced-motion` removes press scales, chevron rotation, and sheet animation while keeping
  state changes.
- 44px targets on phones; visible 2px accent focus rings; skip link; one h1 and section headings;
  labels on every control; icon-only controls have `aria-label` and `title`; live regions for async
  notices; sheet focus trap and restore.
- Contrast: body copy ≥4.5:1 in both themes; status pills ≥7:1 in the pairs used.

## 9. Do / Don't

**Do**
- Let the balance and the split be the loudest things on Home.
- Keep green on data and one action state; keep chrome ink.
- Set every figure in Geist Mono, tabular, right-aligned.
- Use one column and one left edge; let wide screens stay calm.

**Don't**
- Don't reintroduce iOS large titles, Material app bars, or platform-specific cards.
- Don't use gradients, glows, glass, resting shadows, icon tiles, sparklines, or a coloured nav.
- Don't use cream grounds, violet, or indigo.
- Don't put a label above a heading; don't use uppercase tracked labels or index numbers.
- Don't style a command as a bare link, or a navigation link as a button.
- Don't show the same figure twice in a card.

## 10. Reference

- Direction sheet: `.taste-skill/direction.json` (Achromatic ledger, seed `656333293`).
- Tokens: `src/ui/tokens/tokens.css`; fonts: `src/ui/tokens/fonts.css` + `public/fonts/`.
- Shell: `src/platform/PlatformShell.tsx`.
- Signature: `src/ui/primitives/ShareBand.tsx`.
- Gate: `node <design-taste-frontend>/scripts/inspect.mjs --app <url>` and `lint.mjs --app src`.
