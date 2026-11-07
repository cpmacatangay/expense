# Contract: Recap

**Consumers**: Outing Detail, Android share sheet, image renderer

The recap communicates a finalized outing to the other adults, who do not use the app. It MUST match
the finalized snapshot exactly.

## Text Recap

Plain text, ready for a group chat:

```text
Salo — <place or "Meal"> — <date>

Total: ₱<receipt total>
Items: <item count> · Shared: <shared count>

<Adult 1> — ₱<final share>
  Own: ₱<own items>
  Students: <student names + amounts>
  Shared: ₱<shared head + covered student shared>
  Adjustments: ₱<tax + service − discount and gap>

<Adult 2> — ₱<final share>
...

Payer: <adult name>
<settlement lines or "All settled.">
```

Rules:
- Use the finalized share amounts, not a recomputation.
- Include every adult, even if their share is zero.
- Include covered students by name.
- Include item assignments grouped by adult; do not omit shared items.
- Use Philippine peso formatting with two decimal places.
- Do not include student contact details or notes.
- Do not include receipt image paths.

## Image Card

- Size: 1080 × 1350 px (4:5), safe margin 72 px.
- Visual style: receipt-paper card, cream background, ink text, monospaced tabular amounts, one
  accent color, dashed separators.
- Content, top to bottom:
  1. Salo wordmark and outing date.
  2. Place and total, with the total as the largest element.
  3. Item summary: total items, shared items, and each adult's assigned item count.
  4. Four adult rows: name, covered students, final share.
  5. Payer line.
  6. Settlement lines or "All settled."
  7. Small footer: "On-device receipt scan · Private ledger."
- Use the same fonts as the app or system-safe fonts; no network font dependency.
- Render with Android Canvas or Compose to a bitmap; no web/DOM capture.
- The image must be readable at 360 px wide in a chat preview.

## Share Behavior

- Offer **Share text**, **Share image**, and **Copy text**.
- Use `Intent.ACTION_SEND` with a FileProvider URI for the image.
- Use `text/plain` for text and `image/png` for the image.
- Respect the Android share sheet; no external service.
- If image rendering fails, the text recap MUST still be shareable.

## Accuracy

- The recap MUST be generated from the immutable finalized snapshot.
- Totals, item assignments, covered students, and payer MUST match the finalized outing.
- Reopening/correcting an outing invalidates the old recap; generate a new one after the correction.
