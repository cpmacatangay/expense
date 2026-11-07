# Salo

Salo is a private, offline-first meal ledger for four adults — CP, Mai, Kent, and Llanmer — who cover meals
for a roster of students. It replaces the shared spreadsheet with a per-head split, coverage
assignment, a running balance, and a shareable recap.

The app ships as:

- an **Android installable app** built with Capacitor, with on-device ML Kit text recognition;
- an **iPhone home-screen PWA** built from the same code, with on-device Tesseract.js;
- a shared **Supabase** backend design for auth, data, and private receipt photos.

The current build is a working **local-first demo/MVP**. Supabase sync and Google auth are
scaffolded but not end-to-end connected until a Supabase project and the sync milestone are added.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints, choose **CP**, and add students from the Students tab. Then create an
outing, enter the receipt total (or scan a receipt), select the students present, accept or adjust
the coverage suggestions, choose the payer, and finalize.

The local demo seeds CP, Mai, Kent, and Llanmer. It starts with an empty student roster, as requested.

## What works

- Create and finalize an outing with one receipt, one payer, and per-head shares.
- Integer-centavo money engine with largest-remainder rounding; every split sums exactly.
- Students roster (1–10 active), add/edit/archive.
- Attendance and one-adult-per-student coverage, with fairness auto-balance and manual override.
- Receipt capture and on-device OCR (Tesseract.js on the web/PWA; ML Kit adapter for Android).
- Receipt review with merchant, date, total, line items, and warnings; manual total fallback.
- Ledger with net balances, simplified who-pays-whom, partial payments, void, and history.
- Fairness tallies and per-student reporting.
- Text recap and a 1080 × 1350 PNG recap card rendered with Canvas.
- CSV/JSON export.
- PWA install instructions and offline app shell; offline local workflow.
- Android Capacitor shell generated; native camera, share, and ML Kit plugins wired.

## Architecture

```text
React + TypeScript + Vite + Tailwind
├── Android: Capacitor 8 shell, native camera/share, ML Kit OCR
├── iPhone: installable PWA, Tesseract.js OCR in a Web Worker
├── Backend design: Supabase Postgres + Auth (Google) + private Storage
├── Local: Dexie/IndexedDB, integer-centavo money engine
└── Spec Kit: .specify/ plus specs/001-salo-expense-sharing/
```

### Design system

The UI uses the official **Material Design 3** web components from
[`@material/web`](https://material-web.dev/) (the implementation linked from
[M3 Develop](https://m3.material.io/develop)) with a green seed: tonal color roles, the M3 type
scale, filled/tonal/outlined/text buttons, filled and outlined cards, a navigation bar with an
active indicator, an extended FAB, outlined text fields and selects, checkboxes, icon buttons,
progress indicators, and dialogs. React wrappers around the official custom elements live in
`src/components/m3`, and the theme tokens live in `src/styles/index.css`.

Key paths:

- `src/lib/money` — split, fairness, settle-up, centavo helpers.
- `src/lib/ocr` — OCR adapters, parser, and normalized result types.
- `src/lib/db` — Dexie schema and repositories.
- `src/features` — auth, home, students, outings, ledger, reports, settings.
- `supabase/migrations` — schema, RLS, storage policies.
- `supabase/seed.sql` — local demo group and roster.
- `specs/001-salo-expense-sharing` — spec, plan, research, data model, contracts, tasks.

## Scripts

```bash
npm run dev          # Vite dev server
npm run build        # type-check and production PWA build
npm run preview      # preview the production build
npm run typecheck    # tsc project build
npm test             # Vitest unit/integration tests
npm run test:watch   # Vitest watch
npm run test:e2e     # Playwright (install browsers first)
npm run lint         # ESLint
npm run cap:sync     # copy the web build into the Android shell
npm run cap:android  # open the Android project in Android Studio
```

## Receipt OCR

### Web/PWA

The PWA uses Tesseract.js with self-hosted assets:

- `public/tessdata/eng.traineddata.gz` — English language data (~10.9 MB).
- `public/tesseract/worker.min.js` and the SIMD LSTM core files — self-hosted worker/core.

The language model and worker assets are cached by the service worker, so OCR works offline after
the first load. The total is the authoritative field; line items are best-effort and always
reviewable.

### Android

The Android shell uses `@capacitor-mlkit/text-recognition` (`TextRecognition.processImage`) with the
Latin model bundled by the plugin. The camera returns a local file path and the ML Kit adapter uses
that path directly. The Android model has not been exercised on a physical device in this
environment yet; the adapter and build configuration are present.

## Supabase setup

1. Create a Supabase project and copy the URL and anon key into `.env.local`:

   ```text
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   VITE_GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
   ```

2. Apply the schema and seed:

   ```bash
   supabase link --project-ref <ref>
   supabase db push
   supabase db seed
   ```

   For a local stack: `supabase start` and `supabase db reset`.

3. Enable the Google provider in Supabase Auth and add the OAuth redirect URLs:
   `http://localhost:5173/auth/callback` and the deployed PWA `/auth/callback`.

4. Configure Google Cloud:
   - Web client ID for the PWA and native ID-token audience.
   - Android client ID with the app package `ph.salo.app` and the release keystore SHA-1.

The schema and RLS policies are in `supabase/migrations/`; the storage bucket is private and scoped
to the group id in the object path. Full two-way sync is the next milestone; the local ledger is the
source of truth in the current build.

## Android build

```bash
npm run build
npx cap sync android
npx cap open android
```

Release build:

```bash
cd android
./gradlew assembleRelease
```

See `docs/android-release.md` for signing, Google OAuth, and distribution notes. The Android build
requires JDK 21 and the Android SDK/Android Studio. The APK can be sideloaded; no store listing is
required.

## iPhone PWA

Deploy `dist/` to Cloudflare Pages or Vercel, open the URL in Safari, then **Share → Add to Home
Screen**. The app runs standalone and caches its shell, Tesseract assets, and language model for
offline use. No Apple Developer Program membership is required.

## Testing

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Unit tests cover the money engine, rounding invariants with fast-check, balances/settlements,
fairness, and receipt parsing. The Playwright smoke test is in `tests/e2e/`; run
`npx playwright install chromium` once before `npm run test:e2e`.

The core flow was manually validated in a browser: create students, create a ₱3,000 outing with
three students, auto-balance coverage, finalize, record a partial settlement, view reports, and
download the recap image. A synthetic receipt was scanned and produced the correct total, merchant,
date, and line items.

## Costs and privacy

- Supabase free tier, free static hosting, on-device OCR: **$0 recurring**.
- No cloud OCR: receipt images never go to an OCR service.
- Student records are names and optional notes only; no contact details.
- Receipt photos are stored locally in the current build; the Supabase Storage path is private and
  group-scoped.

## Known limitations / next milestones

- Full Supabase sync, member linking, and Google sign-in are scaffolded but not connected
  end-to-end. The local demo does not require them.
- Android ML Kit OCR needs a physical-device pass.
- Receipt cropping is not implemented; the full captured image is compressed and scanned.
- Line items are read-only in the review screen; the total is editable.
- Reopen/audit UI for finalized outings is designed but not implemented.
- No Excel import (by choice); JSON/CSV export is available.
- No push notifications, dark mode, or student accounts in v1.
