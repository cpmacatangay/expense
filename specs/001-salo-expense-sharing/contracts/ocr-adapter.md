# Contract: OCR Adapter

**Implementation**: ML Kit Text Recognition v2 | **Consumers**: receipt capture, item review

OCR is on-device only. No receipt image, bitmap, text, or parsed field may be sent to an external
service.

## Input

```kotlin
data class OcrInput(
    val imageUri: Uri,
    val bitmap: Bitmap? = null,
    val mimeType: String = "image/jpeg"
)
```

The app captures an image with the system camera and keeps it in app-private storage. OCR may use the captured
bitmap or the local URI.

## Output

```kotlin
data class OcrResult(
    val engine: String = "ML_KIT",
    val rawText: String,
    val merchant: String?,
    val receiptDate: String?,
    val items: List<OcrItem>,
    val taxCentavos: Long?,
    val serviceChargeCentavos: Long?,
    val discountCentavos: Long?,
    val totalCentavos: Long?
)

data class OcrItem(
    val name: String,
    val quantity: Int,
    val unitAmountCentavos: Long?,
    val amountCentavos: Long?
)
```

## Behavior

1. Run ML Kit Text Recognition v2 on the local bitmap.
2. Normalize whitespace and common OCR substitutions.
3. Parse merchant, date, item lines, quantities, tax/VAT, service charge, discount, and total.
4. Prefer the last plausible total when multiple totals appear.
5. Return missing fields as `null`; never invent a total.
6. Return line items even when the total is missing.
7. Keep the raw text for diagnostics but do not persist it by default.

## Failure modes

- No text detected → return empty result and show manual entry.
- No total detected → show a warning and focus the total field.
- Item sum does not equal total → show a warning; the owner can trust the total.
- Camera permission denied → offer gallery selection and manual entry.
- ML Kit unavailable → fall back to manual entry; do not call a network service.

## Parsing rules

- Philippine peso formats: `₱1,234.56`, `PHP 1,234.56`, `1,234.56`, `P1,234.56`.
- Ignore lines that are clearly headers, addresses, VAT registration numbers, or cashier text.
- Recognize quantity patterns: `2 x 150`, `2 @ 150`, `2 pcs 150`.
- Recognize tax labels: `VAT`, `VATable`, `Tax`, `12% VAT`.
- Recognize service charge labels: `Service Charge`, `S.C.`, `SC`.
- Recognize discounts: `Discount`, `Less`, `Promo`, `Senior`, `PWD`.
- Recognize total labels: `Total`, `Amount Due`, `Grand Total`, `Total Due`.
- Skip negative or zero item amounts unless they are discounts.

## Privacy

- The image remains in app-private storage.
- The image is excluded from Supabase backups.
- No analytics, logging, or crash report may include receipt text or images.
