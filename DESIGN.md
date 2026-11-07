---
name: Salo
description: A private, offline-first meal ledger for four adults and the students they cover.
colors:
  ledger-green: "#1F5C45"
  ledger-green-light: "#B4F0CE"
  on-ledger-green: "#FFFFFF"
  on-ledger-green-light: "#002114"
  sage-secondary: "#4F6357"
  sage-secondary-light: "#D2E8D8"
  slate-teal: "#3A6468"
  slate-teal-light: "#BEEBF0"
  cool-paper: "#F7FBF4"
  cool-paper-variant: "#DCE5DB"
  night-ledger: "#101410"
  night-ledger-variant: "#414942"
  ink: "#191C19"
  ink-muted: "#414942"
  ink-inverse: "#E1E4DE"
  hairline: "#717970"
  hairline-dark: "#8B938A"
  error-red: "#BA1A1A"
typography:
  display:
    fontFamily: "Roboto, sans-serif"
    fontSize: "36sp"
    fontWeight: 400
    lineHeight: "44sp"
    letterSpacing: "0sp"
  headline:
    fontFamily: "Roboto, sans-serif"
    fontSize: "28sp"
    fontWeight: 400
    lineHeight: "36sp"
    letterSpacing: "0sp"
  title:
    fontFamily: "Roboto, sans-serif"
    fontSize: "16sp"
    fontWeight: 500
    lineHeight: "24sp"
    letterSpacing: "0.15sp"
  body:
    fontFamily: "Roboto, sans-serif"
    fontSize: "14sp"
    fontWeight: 400
    lineHeight: "20sp"
    letterSpacing: "0.25sp"
  label:
    fontFamily: "Roboto, sans-serif"
    fontSize: "12sp"
    fontWeight: 500
    lineHeight: "16sp"
    letterSpacing: "0.5sp"
rounded:
  extra-small: "4dp"
  small: "8dp"
  medium: "12dp"
  large: "16dp"
  extra-large: "28dp"
  full: "50%"
spacing:
  xxs: "4dp"
  xs: "8dp"
  sm: "12dp"
  md: "16dp"
  lg: "20dp"
  xl: "24dp"
  xxl: "32dp"
components:
  button-filled:
    backgroundColor: "{colors.ledger-green-light}"
    textColor: "{colors.on-ledger-green-light}"
    rounded: "{rounded.full}"
    padding: "0 24dp"
    height: "48dp"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.full}"
    padding: "0 24dp"
    height: "48dp"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.small}"
    padding: "0 16dp"
    height: "32dp"
  chip-filter-selected:
    backgroundColor: "{colors.sage-secondary-light}"
    textColor: "{colors.on-ledger-green-light}"
    rounded: "{rounded.small}"
    padding: "0 16dp"
    height: "32dp"
  card-section:
    backgroundColor: "{colors.cool-paper-variant}"
    textColor: "{colors.ink}"
    rounded: "{rounded.medium}"
    padding: "16dp"
  field-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.extra-small}"
    padding: "16dp"
    height: "56dp"
---

# Design System: Salo

## Overview

**Creative North Star: "The Corner Table"**

Salo looks like the table felt calm down after the plates were cleared: paper-quiet surfaces, a
green you would find on a linen napkin rather than a bank logo, and numbers big enough to read from
a hand's width away. Nothing on screen competes with the bill. The interface is a place where five
people lean in to agree on a number, so the design spends its boldness on legibility and exactness
and keeps everything else still.

The system is Material 3 with the volume turned down. There is one accent family, one typeface, and
one shape language: softly rounded rectangles that echo a folded receipt rather than a card grid.
Density is generous on purpose — 16 dp screen gutters, 12 dp between blocks, 16 dp inside cards — so
a thumb at the table never hits two targets at once. Screens read top to bottom as a single column;
the only persistent chrome is the top app bar and the bottom navigation.

Warmth comes from space and typographic confidence, not from decoration. There are no gradients, no
illustrations, no marketing furniture, and no shadows at rest. A ₱825.00 in display size is the
loudest thing the product ever says.

**Key Characteristics:**
- One green accent family, used sparingly; neutral paper carries the page.
- Material 3 tonal surfaces instead of shadows; 1 dp hairlines for separation.
- Money gets display and headline sizes; prose stays at body and label.
- Fully rounded pills for actions, 12–16 dp corners for containers, 4 dp on fields.
- Dark theme is a real scheme, not an inversion.

## Colors

A calm green-on-paper palette, with a single warm red reserved for money the owner owes.

### Primary
- **Ledger Green** (#1F5C45): the brand and the "you are owed" state. Filled buttons, the primary
  avatar, the app mark, positive balances.
- **Ledger Green Light** (#B8F0D2): primary containers in the light scheme. In dark, `Ledger Green
  Light` becomes the primary text-on-surface accent while `#005139` fills containers. It also marks
  the one committing action on Home.
- **On Ledger Green** (#FFFFFF) and **On Ledger Green Light** (#002114): text on the two greens.

### Secondary
- **Sage Secondary** (#4F6357) with **Sage Secondary Light** (#D2E8D8): selected filter chips, the
  "you" emphasis, secondary containers.

### Tertiary
- **Slate Teal** (#3A6468) with **Slate Teal Light** (#BEEBF0): reserved. Present in the scheme so
  Material components that reach for tertiary stay on-brand, not decorative.

### Neutral
- **Cool Paper** (#F7FBF4): light background and surface; the page itself.
- **Cool Paper Variant** (#DCE5DB): light `surfaceVariant`.
- **Night Ledger** (#101410): dark background and surface.
- **Night Ledger Variant** (#414942): dark `surfaceVariant`.

### Tonal surfaces
Elevation is carried by these roles, never by shadows. Light: `surfaceContainerLowest` #FFFFFF,
`Low` #F1F5EF, `Container` #EBF0E9, `High` #E5EAE3, `Highest` #DFE4DD. Dark:
`Lowest` #0B0E0A, `Low` #181C16, `Container` #1C201A, `High` #262B24, `Highest` #31362E.
- **Ink** (#191C19): primary text in light, page text in dark as **Ink Inverse** (#E1E4DE).
- **Ink Muted** (#414942 / #C0C9BF): supporting labels, metadata, secondary rows.
- **Hairline** (#717970 / #8B938A): outlines around fields, chips, and outlined buttons.
- **Error Red** (#BA1A1A / #FFB4AB): the one alarm color; used for money owed, destructive actions,
  and validation.

### Named Rules

**The One Green Rule.** The green family marks state and action only — balances, primary buttons,
selected profile, the FAB. It never becomes a background wash or a decorative fill.

**The One Palette Rule.** The scheme is fixed. Salo does not derive colour from the wallpaper, so
the ledger looks the same on every phone and the green always means the same thing.

## Typography

**Display Font:** Roboto (system default, with `sans-serif` fallback)
**Body Font:** Roboto
**Label Font:** Roboto

**Character:** Unmodified Material 3 type, deliberately. A ledger earns trust by looking like the
platform rather than a brand exercise; the hierarchy does the work, not the letterforms.

### Hierarchy
- **Display** (400, 36 sp / 44 sp): the single number that answers "how much" — the home balance and
  the receipt total.
- **Headline** (400, 28 sp / 36 sp): screen titles (`Ledger`, `History`, `Hi, CP`) and the top of the
  split review.
- **Title** (500, 16 sp / 24 sp, +0.15 sp): section headings, adult names, item names, amounts in
  rows.
- **Body** (400, 14 sp / 20 sp, +0.25 sp): explanatory sentences and values inside rows.
- **Label** (500, 12 sp / 16 sp, +0.5 sp): uppercase eyebrow text (`TOTAL SPEND`, `ALL SETTLED`),
  chip text, captions, and metadata.

### Named Rules

**The One Big Number Rule.** A screen may promote exactly one figure to display or headline
treatment — usually the balance or the receipt total. Item rows and secondary amounts stay at title
or body size so the eye has one destination.

## Layout

A single scrollable column inside a Scaffold, with a top app bar and a bottom navigation bar of five
destinations.

### Spacing scale
One scale, 4 dp base, enforced in `ui/theme/Spacing.kt` (`SaloSpacing`). No intermediate values.

| Token | Value | Use |
| --- | --- | --- |
| `xxs` | 4 dp | icon/label pairing, hairline gaps |
| `xs` | 8 dp | inside a control, between a chip and its text |
| `sm` | 12 dp | stacked rows, card content rhythm |
| `md` | 16 dp | screen gutter, card padding, section gap |
| `lg` | 20 dp | statement card padding |
| `xl` | 24 dp | between major blocks |
| `xxl` | 32 dp | above a screen title, empty states |
| `xxxl` | 48 dp | minimum touch target, large separation |

Horizontal screen padding is `md`; content blocks stack with `sm`; cards pad `md` internally. The primary action lives inside the Home statement card as a full-width filled
button, not as a floating action: at large font scales a FAB permanently covered the last row.

Money rows use a two-column contract: label or name on the left, amount flush right, never a third
column. Long lists (students, outings, payment history) are `LazyColumn`; the rest are
`verticalScroll` columns. In the New Outing wizard the step content scrolls while the Back/Next bar
stays fixed at the bottom.

There is one density, tuned for a phone held in one hand. No layout currently targets tablets,
landscape, or foldables; the 1080×2340 phone viewport is the reference surface.

## Elevation & Depth

**Flat and tonal.** Nothing casts a shadow at rest. Depth is expressed with Material 3 tonal surface
levels — `surface` for the page, `surfaceContainerLow` for cards, `surfaceContainerLowest` for rows
that sit inside a card — plus 1 dp `HorizontalDivider` hairlines and outlined strokes on fields and
secondary buttons. Dialogs and menus are the only surfaces that lift, and they do it through
scrim and tonal contrast rather than blur or drop shadow.

**The Flat-By-Default Rule.** If separation needs a shadow, the surface roles were chosen wrong.
Fix the tonal step, not the elevation.

## Shapes

Softer than stock Material, never playful. Actions are **fully rounded pills** (48 dp tall, 50%
radius). Containers and cards use **12 dp**; larger statement surfaces use **16 dp**. Text fields
use the **4 dp** extra-small corner so they read as inputs, not buttons. Avatars are perfect circles
holding a single initial. Chips are 8 dp rectangles with a hairline outline when unselected.

**The Receipt Rule.** A corner radius above 16 dp belongs only to pills. Nothing should look like a
bubble; the form language is a folded receipt, not a chat app.

## Components

### Buttons
- **Shape:** fully rounded pill (50%), 48 dp minimum height, 24 dp horizontal padding.
- **Primary:** filled `primaryContainer` with `onPrimaryContainer` text; used for the one committing
  action on a screen (`Next`, `Finalize outing`, `Back up`, `Record payment`). An icon may precede
  the label with 6–8 dp gap.
- **Hover / Focus:** Material ripple and state layers only; no color shift, no lift.
- **Secondary / Ghost:** `OutlinedButton` with a hairline border and transparent fill for reversible
  or alternative actions (`Back`, `Export`, `Reopen and edit`, `Use`). `TextButton` for dialog
  actions, inline links, and row-level actions.

### Chips
- **Style:** 32 dp tall, 8 dp radius, 16 dp horizontal padding, hairline outline, label-size text.
- **State:** unselected is transparent with muted text; selected fills `secondaryContainer` with the
  strong on-color. Used for date ranges and for the Adult / Student / Shared assignment choice.

### Cards / Containers
- **Corner Style:** 12 dp.
- **Background:** `surfaceContainerLow` (`SectionCard`); `surfaceContainerLowest` for item rows that
  sit inside one.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** none on cards; hairlines only between list rows.
- **Internal Padding:** 16 dp, with 12 dp between the header row and content.

### Inputs / Fields
- **Style:** `OutlinedTextField`, 4 dp corner, hairline outline at rest, transparent fill, 16 dp
  internal padding. Amount fields carry a `₱` prefix; quantity uses a numeric keyboard.
- **Focus:** the outline thickens and takes `primary`; the floating label activates.
- **Error / Disabled:** supporting text in `error`; disabled controls reduce to 38% opacity.
- **Date:** the value reads as `Nov 8, 2026` and opens a compact calendar built on M3 tokens (48 dp
  day targets, primary circle for the selection, 1 dp outline for today). It lays out only the weeks
  the month needs; the stock `DatePickerDialog` reserves a blank sixth row on five-week months, which
  pushed the actions too far from the last date.

### Navigation
- **Top app bar:** small, surface-colored, the Salo mark plus wordmark on the left, the selected adult
  avatar and name on the right opening a profile switcher. Hidden on the wizard and detail routes so
  those screens own their own header.
- **Bottom navigation:** five `NavigationBarItem`s (Home, Students, Ledger, History, Settings) with
  Material icons and label-size captions; selected state fills an indicator pill. Hidden on the
  wizard, detail, and auth routes.

### Statement Card (signature)
The home balance block: a `primaryContainer` card, 20 dp padding, an uppercase label
(`ALL SETTLED` / `YOU ARE OWED` / `YOU OWE`), the balance in display size, a one-line summary
(`1 recent outing · 4 adults`), and one full-width filled action (`New outing`). It is the only
place the app raises its voice, and it carries the primary action so nothing floats over content.

### Recap Image (signature)
A 1080×1350 PNG rendered on-device for sharing: `Cool Paper` ground, `Ledger Green` wordmark, the
total in monospace, one row per adult with a right-aligned amount, then payer and settlement lines.
It follows this document's palette and spacing at print scale rather than screen scale.

## Do's and Don'ts

### Do:
- **Do** keep the amount column right-aligned and set in title or body weight, so columns of pesos
  line up down the screen.
- **Do** use `surfaceContainerLow` for cards and `surfaceContainerLowest` for rows inside them; that
  two-step tonal difference is the whole depth system.
- **Do** reserve display size for one number per screen.
- **Do** keep destructive and owing states in `error`; the rest of the screen stays neutral.
- **Do** use the Salo scheme on every device. Dynamic color is deliberately off; a wallpaper-derived palette would break the brand and the meaning of green/red.
- **Do** respect 48 dp targets: icon buttons carry 48 dp touch bounds even when the glyph is 24 dp.

### Don't:
- **Don't** add drop shadows, gradients, glass, or glow to communicate elevation.
- **Don't** introduce a second accent color; green and red cover state, everything else is neutral.
- **Don't** use corner radii above 16 dp outside pills.
- **Don't** set money in a decorative or condensed face; Roboto's tabular figures are the identity.
- **Don't** uppercase body copy; uppercase belongs to labels and eyebrows only.
- **Don't** put more than one primary filled button on a screen; alternatives are outlined or text.
