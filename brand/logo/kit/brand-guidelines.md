# Salo — Brand Guidelines

## The idea

**Salo** means to share a meal. The mark is a bold **S** built from the same rounded geometry as a
shared table: four equal curves meeting at a common centre, with no food, receipts, or money symbols.
The result is warm enough for a family table and precise enough for a ledger.

## The mark

- **Symbol:** the Salo S. One colour. Rounded terminals and joins.
- **Wordmark:** custom-drawn “Salo”; the letters are paths, not a stock font.
- **Horizontal lockup:** symbol left, wordmark right. Primary use.
- **Stacked lockup:** symbol above, wordmark below. Use where width is limited.

## Colour

| Token | Hex | Use |
|---|---|---|
| Salo Green | `#1F5C45` | Primary brand, icon tile, primary actions |
| Warm Cream | `#F7FBF4` | Primary background, reversed mark |
| Terracotta | `#C96F4A` | Small accent only; never body text |
| Ink | `#191C19` | Primary text on light surfaces |
| Muted Ink | `#414942` | Secondary text |
| Outline | `#717970` | Borders and dividers |
| Error | `#BA1A1A` | Errors and destructive actions |

The logo itself is one colour. Use **Salo Green on cream/white**, or **cream/white on Salo Green**.
Use black or white one-colour versions when reproduction requires it. Terracotta is a supporting
brand colour for small highlights, charts, or a single accent shape — not a logo colour.

## Typography

- The wordmark is custom lettering. Do not retype “Salo” in a system font for the logo.
- The app uses Android’s Roboto / Material 3 type scale. Keep body copy in the system font; reserve
  the custom wordmark for brand moments.

## Clear space

- Symbol: keep a margin equal to **25% of the symbol’s height** on all sides.
- Lockups: keep a margin equal to **50% of the symbol’s height** on all sides.
- Never crowd the mark with text, icons, or screen edges.

## Minimum sizes

| Asset | Minimum |
|---|---|
| Symbol | 16 px / 16 dp |
| Horizontal lockup | 120 px wide |
| Stacked lockup | 80 px wide |
| Wordmark | 80 px wide |

The favicon and small app-icon variants use the same symbol; test at 16 px before shipping.

## Approved backgrounds

- Warm Cream `#F7FBF4`
- White `#FFFFFF`
- Salo Green `#1F5C45` (reversed cream/white mark)
- Ink `#191C19` (reversed white mark)

Avoid busy photography or patterned backgrounds. If a photo is unavoidable, place the mark on a
solid cream or green tile.

## Misuse

Do not:

- stretch, squash, rotate, or skew the mark;
- add shadows, glows, gradients, outlines, or 3D effects;
- recolour outside the approved palette;
- rearrange the symbol and wordmark;
- use the S as a substitute letter in running text;
- place green on terracotta or other low-contrast combinations;
- crop the mark or place it inside a shape that cuts the S.

## Android app icon

- Adaptive icon canvas: **108 × 108 dp**; safe zone: **72 dp** diameter.
- Background: Salo Green.
- Foreground: cream Salo S at about **61%** of the canvas width/height.
- Monochrome layer included for Android 13+ themed icons.
- Legacy square icon: green tile with cream S.
- Application id: `ph.salo.app`.

The production vector resources live in `app/src/main/res/drawable/` and
`app/src/main/res/mipmap-anydpi-v26/`. Copies are in `brand/logo/kit/android/`.

## Voice

Warm, exact, private, calm. Say “shared table”, “fair share”, “covered”, “settled”. Avoid
restaurant-menu language and banking jargon.

## Ownership

This is a custom identity for Salo. Before commercial use, run a trademark search in the relevant
jurisdictions. The mark is original, but trademark clearance is a legal step, not a design step.
