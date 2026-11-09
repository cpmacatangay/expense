# Contract: Recap and Export

**Feature**: `002-salo-pwa` | **Consumers**: Outing Detail, Ledger, Activity, share sheet, files

## Recap

A recap communicates a finalized outing to the group. It must match the finalized snapshot exactly.

### Text

```text
Salo — <group name> — <date>
<place or "Meal">

Total: ₱<outing total>
Present: <adult names> · Students: <student names>

<Adult 1> — ₱<final share>
  Own: ₱<own items>
  Students: <covered student names + amounts>
  Shared: ₱<shared head + covered student shared>
  Difference: ₱<manual or per-head difference> (only when non-zero)

<Adult 2> — ₱<final share>
...

Payer: <adult name>
<settlement lines or "All settled.">
```

Rules:
- Use finalized shares, not a recomputation.
- Include every present adult, even at zero.
- Include covered students by name.
- Include item assignments grouped by adult; do not omit shared items.
- Use Philippine peso formatting with two decimals.
- Do not include student contact details or notes.
- Do not include an invite link or QR code.
- Do not include receipt image paths.

### Image

- Portrait card, 1080 × 1350 or a similar 4:5 ratio.
- Group name, date, place, total, one row per present adult, payer, and settlement suggestions.
- iPhone-first visual language: warm neutral ground, Ledger Green accent, SF-like typography,
  tabular numbers, quiet rules.
- No invite link or QR code.
- The image must be readable at 360px wide in a chat preview.
- Render client-side; no web/DOM capture or network service.
- If rendering fails, the text recap must still be shareable.

### Sharing

- Offer **Share text**, **Share image**, and **Copy text**.
- Use the Web Share API when available; fall back to copy and download.
- Use `text/plain` for text and `image/png` for the image.
- No external service.
- The recap is regenerated after a reopen/correction; old recaps are not updated.

## Export

### Permissions

- **Owner**: full group export.
- **Member**: own data only.
- No cross-group export.

### Formats

- CSV for tabular use.
- JSON for complete portability.

### Owner CSV files

| File | Columns |
|---|---|
| `outings.csv` | outing id, date, place, payer, total mode, total centavos, status, finalized at |
| `items.csv` | outing id, item name, quantity, unit centavos, amount centavos, assignment type, adult, student |
| `shares.csv` | outing id, adult, own items, student items, shared head, covered student shared, difference, total |
| `settlements.csv` | date, from adult, to adult, amount centavos, status, note, recorded by, confirmed by |
| `activity.csv` | created at, actor, action, entity type, entity id, before, after |
| `adults.csv` | display name, status, joined at, removed at |
| `students.csv` | name, status, notes |

### Member export

- The member's shares and settlements only.
- The outings that produced those shares, with only the member's rows.
- The member's own activity, not the full group audit.

### JSON

- A versioned document with `schemaVersion`, `exportedAt`, `group`, `adults`, `students`, `outings`,
  `items`, `shares`, `settlements`, and `activity` (owner) or the member-scoped subset.
- Money is integer centavos.
- Dates are ISO strings in Asia/Manila.
- No secrets, tokens, session data, or service-role keys.

### Rules

- Export is a snapshot; it does not change the ledger.
- An empty group exports a valid file with empty arrays.
- File names include the group and date.
- The app explains that exports may contain student names and must be stored privately.
- No export may include another group's data.
- Exports are generated client-side from the authorized snapshot.
