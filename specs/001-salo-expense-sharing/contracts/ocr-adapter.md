# Contract: OCR Adapter and Receipt Parser

**Modules**: `src/lib/ocr/`, `src/lib/platform/camera.ts` | **Consumers**: receipt capture flow

OCR runs on-device on both targets. No receipt image is sent to a server or third-party OCR API.

## Engine Selection

```ts
type OcrEngine = 'mlkit' | 'tesseract';

interface ReceiptOcr {
  readonly engine: OcrEngine;
  recognize(image: ImageSource): Promise<OcrResult>;
}

interface ImageSource {
  blob: Blob;
  width: number;
  height: number;
  mime: 'image/jpeg' | 'image/png';
}
```

- Android native shell: `MlKitOcr` using `@capacitor-mlkit/text-recognition`.
- iPhone/desktop PWA: `TesseractOcr` using a Web Worker and the self-hosted `eng` language data.
- Selection is centralized in `createOcrAdapter()`; feature code never imports a platform OCR
  library directly.

## Normalized OCR Result

```ts
interface OcrLine {
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence?: number; // 0..1
}

interface OcrResult {
  engine: OcrEngine;
  lines: OcrLine[];
  rawText: string;
  imageWidth: number;
  imageHeight: number;
  durationMs: number;
  warnings: string[];
}
```

Both engines normalize their native output to this shape. Bounding boxes are in image pixels.

## Parser Contract

```ts
interface ParsedReceiptItem {
  description: string;
  quantity?: number;
  unitPriceCentavos?: number;
  lineTotalCentavos: number;
  confidence: number; // 0..1
}

interface ParsedReceipt {
  merchant?: string;
  receiptDate?: string; // YYYY-MM-DD
  subtotalCentavos?: number;
  taxCentavos?: number;
  serviceCentavos?: number;
  discountCentavos?: number;
  tipCentavos?: number;
  totalCentavos?: number;
  items: ParsedReceiptItem[];
  warnings: string[];
  confidence: number; // 0..1 overall
  parserVersion: string;
}

function parseReceipt(result: OcrResult): ParsedReceipt;
```

## Parsing Rules

- Normalize whitespace, currency symbols (₱, PHP, P), and decimal separators (1,234.56).
- Identify totals by keywords: `TOTAL`, `TOTAL DUE`, `GRAND TOTAL`, `AMOUNT DUE`, `BALANCE DUE`,
  `AMOUNT PAYABLE`, `TOTAL AMOUNT`.
- Exclude `SUBTOTAL`, `VAT`, `TAX`, `SERVICE`, `DISCOUNT`, `CHANGE`, `CASH`, `TENDER` from total
  candidates.
- Prefer the total on the same line as the keyword; if absent, use the nearest amount below it.
- If multiple candidates remain, choose the largest plausible amount and add a warning.
- Cross-check against `subtotal + tax + service + tip - discount` when those fields exist; a
  mismatch adds a warning but does not change the confirmed total.
- Parse line items from lines ending in a price that are not total/tax/discount lines. Support
  quantity patterns such as `2 x 150.00`, `2 @ 150`, and `QTY 2`.
- Merchant: first meaningful non-address, non-phone lines; the adult can edit it.
- Date: common `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD`, and month-name formats.
- Never block on missing optional fields; only the total is required by the capture flow.
- Every parsed field is editable in the review screen.
- Store `parserVersion` with the receipt so parser improvements do not silently rewrite history.

## Image Preprocessing

- Respect EXIF orientation before recognition.
- Crop to the receipt area; downscale the longest edge to 1600–2000 px.
- Apply grayscale, contrast, and optional thresholding for Tesseract; ML Kit receives the original
  color image or a lightly enhanced version.
- Compress the stored photo to JPEG quality 0.7, longest edge 1600 px.

## Failure and Fallback

- Camera permission denied: show an explanation and a gallery/file-picker fallback.
- OCR produces no total: prefill the largest candidate amount if available and focus the total
  field; otherwise leave it empty.
- OCR times out or crashes: keep the captured image, show a retry, and offer manual entry.
- The adult always retains a manual path to enter the total and finish the outing.
- The OCR module must not make network requests. The only network activity in the capture flow is
  the optional photo upload after finalization.

## Test Requirements

- Fixture tests for printed Philippine receipts with VAT, service charge, discounts, and comma
  separators.
- Tests for missing total, multiple totals, and totals that conflict with line items.
- Tests for malformed OCR lines, rotated text, and missing bounding boxes.
- Engine adapters are tested with mocked native/browser results; real recognition is validated
  manually on one Android device and one iPhone.
