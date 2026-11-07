# Research: Salo — Student Meal Expense Sharing

**Feature**: `001-salo-expense-sharing` | **Date**: 2026-11-07

No `NEEDS CLARIFICATION` items remain. The decisions below resolve the technical context and record
the alternatives that were considered.

## 1. Cross-Platform Delivery

- **Decision**: One React + TypeScript + Vite web application. Android is wrapped with Capacitor 8;
  iPhone uses the same production build as an installable PWA.
- **Rationale**: The Android and iPhone experiences must share one ledger and one codebase without
  an Apple Developer Program fee. Capacitor provides a native Android shell, native camera, sharing,
  and ML Kit access while keeping the shared UI in web technology. The PWA gives iPhone users a
  home-screen app with offline caching at zero distribution cost.
- **Alternatives considered**:
  - **Expo/React Native + React Native Web**: stronger native UI on Android, but web storage,
    camera, auth, and PWA support require more platform branches, and Expo Go cannot host ML Kit.
  - **Two codebases (native Android + separate PWA)**: best per-platform fit, but doubles UI work
    and creates drift between the two ledgers.
  - **All-PWA**: simplest, but loses native Android camera/ML Kit quality and the Android app
    package the group wants.

## 2. Backend and Authentication

- **Decision**: Supabase for Postgres, Google authentication, and private receipt-photo storage.
  Web uses Supabase OAuth redirect; Android uses `@capgo/capacitor-social-login` to obtain a Google
  ID token and exchanges it with `supabase.auth.signInWithIdToken`.
- **Rationale**: Supabase's free tier covers four users comfortably, provides row-level security,
  and has first-class Google auth. The split auth flow keeps the PWA simple and avoids embedding a
  Google login in the Android WebView, which Google blocks.
- **Alternatives considered**:
  - **Firebase**: excellent offline SDK, but NoSQL modeling of coverage, shares, and settlements is
    less natural, and vendor lock-in is higher.
  - **Custom backend**: unnecessary operational work for four users.
  - **Email magic links only**: simpler setup, but the group chose Google and all four already have
    Google accounts.

## 3. Local Storage and Offline Sync

- **Decision**: IndexedDB via Dexie is the local source of truth. Every local mutation is written to
  an outbox; a sync engine pushes the outbox and pulls changes since the last successful pull.
- **Rationale**: The dataset is tiny (four adults, 1–10 students, hundreds of outings). Dexie works
  in both the Android WebView and mobile browsers, needs no native SQLite bridge, and keeps one
  storage implementation for both targets. A small custom outbox is easier to reason about than a
  full sync framework for this scale.
- **Alternatives considered**:
  - **WatermelonDB**: strong sync primitives, but heavier and less straightforward in a pure Vite
    PWA plus Capacitor WebView.
  - **RxDB**: capable, but adds replication configuration and bundle weight for a four-user app.
  - **PowerSync**: excellent offline sync, but another service and cost surface.
  - **Supabase only, online-first**: fails the offline-first principle and the restaurant reality.

## 4. Conflict and Immutability Strategy

- **Decision**: Finalized outings are immutable snapshots. Reopening is explicit and audited.
  Settlements are append-only. Roster edits are last-write-wins by `updated_at`. Draft outings use
  last-write-wins with a visible conflict warning.
- **Rationale**: Most conflicts disappear when money records become immutable after finalization.
  The remaining conflicts are low-value edits that can be resolved by timestamp without risking the
  ledger.
- **Alternatives considered**:
  - **CRDTs for every table**: overkill for four users and difficult to audit.
  - **Server-authoritative locking**: requires a live connection and blocks the table-side flow.

## 5. Android Receipt Recognition

- **Decision**: ML Kit Text Recognition v2 through `@capacitor-mlkit/text-recognition` (Capawesome),
  on-device, with the model made available for offline use.
- **Rationale**: ML Kit is free, fast, offline, and significantly more accurate than browser OCR on
  printed receipts. The Capacitor plugin exposes it without writing a custom native module. It
  supports both Android and iOS if the project later adds a native iOS target.
- **Alternatives considered**:
  - **Custom native plugin**: more control, but unnecessary maintenance for a stable capability.
  - **Tesseract.js on Android**: one OCR path for both targets, but slower and less accurate on
    phone photos.
  - **Cloud OCR**: rejected by the constitution's privacy and zero-cost principles.

## 6. iPhone/PWA Receipt Recognition

- **Decision**: Tesseract.js running in a Web Worker, with English language data self-hosted under
  `public/tessdata/` and precached by the service worker.
- **Rationale**: Tesseract.js runs entirely on-device in Safari, is free, and satisfies the
  no-cloud-OCR constraint. Receipts are high-contrast printed text, and the app treats OCR as
  assistive; the total is always reviewed and correctable.
- **Alternatives considered**:
  - **PaddleOCR via ONNX Runtime Web**: potentially more accurate, but heavier integration and
    model management; kept as a future upgrade path if Tesseract accuracy is insufficient.
  - **Cloud vision API**: rejected by privacy and cost principles.
  - **Manual entry only on iPhone**: unacceptable friction for the primary capture flow.

## 7. Receipt Parser

- **Decision**: A deterministic, geometry-aware TypeScript parser that uses OCR lines and bounding
  boxes. It prioritizes the total, then merchant/date, then line items. The parsed result is always
  editable.
- **Rationale**: A deterministic parser is testable, offline, and has no API cost. The split only
  requires the total, so line-item mistakes never block the flow. Bounding boxes improve price
  alignment and total detection on receipt layouts.
- **Alternatives considered**:
  - **LLM extraction**: higher tolerance for messy receipts, but requires a cloud service, adds
    cost, and violates the on-device privacy principle.
  - **Pure regex without geometry**: simpler, but brittle on multi-column receipts.

## 8. Money Arithmetic

- **Decision**: A custom integer-centavo module. All amounts are integer centavos. Per-head shares
  are computed with the largest-remainder method; the payer's share absorbs any final centavo
  tie-break deterministically.
- **Rationale**: Money must never use floating point. Integer arithmetic is exact, easy to test, and
  small enough to avoid a dependency. Largest-remainder rounding keeps every share within one
  centavo of the exact value and guarantees the sum equals the total.
- **Alternatives considered**:
  - **Decimal.js**: correct, but adds a dependency and decimal objects for a simple centavo problem.
  - **Dinero.js**: capable, but more API surface than needed.
  - **Floating-point with rounding at display time**: rejected; it can lose or invent centavos.

## 9. Fairness Auto-Assignment

- **Decision**: A greedy assignment that ranks adults by cumulative student-heads covered, then
  peso amount covered, then least-recently-covered for the specific student. Manual override always
  wins.
- **Rationale**: The metric is explainable at the table, balances the burden over time, and avoids
  repeatedly assigning the same student to the same adult. It is deterministic enough to test.
- **Alternatives considered**:
  - **Random assignment**: fair on average but hard to explain and can cluster.
  - **Round-robin only**: ignores the long-run imbalance.
  - **Optimization solver**: overkill for at most ten students and four adults.

## 10. Settlement Simplification

- **Decision**: Derive net balances from finalized shares and settlements, then produce a greedy
  minimal set of transfers between debtors and creditors.
- **Rationale**: Four adults make the problem tiny. The greedy result is easy to understand and
  usually optimal; partial payments are recorded as settlements and recomputed.
- **Alternatives considered**:
  - **Per-outing payment only**: creates unnecessary transfers and ignores carry-over.
  - **Full graph optimization**: unnecessary for four people.

## 11. Recap Generation

- **Decision**: Generate a text recap and a 1080 × 1350 PNG image card from the same finalized
  data. The image is drawn with the Canvas 2D API; the PWA uses the Web Share API and Android uses
  Capacitor Share, with copy-to-clipboard and image download fallbacks.
- **Rationale**: Canvas 2D is deterministic, dependency-free, and does not depend on DOM capture or
  embedded fonts. Text is fast and universally shareable; the image is readable and visually
  confirms the split.
- **Alternatives considered**:
  - **`html-to-image` DOM capture**: the initial choice, but off-screen capture hung in the
    development environment and added a dependency. Canvas is more reliable.
  - **Server-generated PDF**: adds backend work and a network dependency.
  - **Text only**: simpler, but the user explicitly asked for both.

## 12. State Management and Data Access

- **Decision**: TanStack Query for async reads and mutations, Dexie repositories for local
  persistence, Zod schemas for validation, React Hook Form for forms, and a small Zustand store for
  ephemeral UI state.
- **Rationale**: Clear separation between persisted data, async state, and UI state. TanStack Query
  handles retries and cache invalidation; Dexie keeps offline writes; Zod gives one validation source
  for forms and sync payloads.
- **Alternatives considered**:
  - **Redux Toolkit**: more ceremony for a small app.
  - **Local component state only**: insufficient for the multi-step outing wizard and sync status.

## 13. PWA and Offline Assets

- **Decision**: `vite-plugin-pwa` with Workbox. Precache the app shell, icons, manifest, and
  Tesseract language data. Runtime-cache only immutable assets; never cache Supabase API responses.
- **Rationale**: The app must launch and scan a receipt offline after first load. Self-hosting the
  Tesseract data avoids a CDN dependency and makes the offline story deterministic.
- **Alternatives considered**:
  - **Hand-written service worker**: more control, more bugs.
  - **CDN-hosted Tesseract data**: simpler build, but fails offline on first use and adds a
    third-party dependency.

## 14. Hosting and Distribution

- **Decision**: Cloudflare Pages (primary) or Vercel (alternative) for the static PWA. Android APK
  is built with Gradle and distributed by link. Supabase hosts the backend.
- **Rationale**: All four have free tiers suitable for four users. Static hosting gives instant
  updates for the PWA; the APK is only rebuilt when native dependencies change.
- **Alternatives considered**:
  - **Google Play internal testing**: easier updates for Android, but a $25 one-time fee and store
    setup are unnecessary for four users.
  - **Apple App Store/TestFlight**: rejected by the zero-recurring-cost principle.
  - **Self-hosted VPS**: unnecessary operational burden.

## 15. Testing Strategy

- **Decision**: Vitest for money, parser, and validation units; fast-check for money invariants;
  React Testing Library for critical components; Playwright for PWA end-to-end flows; manual device
  validation on Android and iPhone for camera, OCR, sharing, and offline behavior.
- **Rationale**: Money and parser logic are pure and deserve exhaustive unit coverage. Device
  capabilities cannot be fully validated in a desktop browser, so a small manual matrix is explicit.
- **Alternatives considered**:
  - **Detox/Appium for Android**: heavier setup for a four-user app; manual checks plus Playwright
    cover the risk.
  - **No automated tests**: unacceptable for a ledger.

## 16. OCR Accuracy Fallback

- **Decision**: Ship Tesseract.js for the PWA and ML Kit for Android in v1. If iPhone OCR accuracy
  or speed proves insufficient, evaluate PaddleOCR via ONNX Runtime Web before considering a paid
  native iOS route.
- **Rationale**: The total is the only field required for the split, and manual entry is always
  available. The fallback ladder (Tesseract → ONNX/Paddle → native iOS) keeps the zero-cost
  constraint intact as long as possible.
- **Alternatives considered**:
  - **Immediate native iOS**: violates the zero-recurring-cost principle.
  - **Cloud OCR**: violates the privacy principle.
