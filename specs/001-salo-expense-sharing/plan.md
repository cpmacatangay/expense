# Implementation Plan: Salo — Student Meal Expense Sharing

**Branch**: `001-salo-expense-sharing` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-salo-expense-sharing/spec.md`

## Summary

Salo is a private, offline-first expense ledger for four adults — CP, Mai, Kent, and Llanmer — who cover
meals for a roster of 1–10 students. The core flow is: create an outing, scan one receipt
on-device, select the students present, assign each to exactly one adult, compute per-head shares,
choose the single payer, finalize a share snapshot, and settle running balances.

The app ships as an Android native shell (Capacitor 8 + ML Kit text recognition) and an iPhone
installable PWA (Tesseract.js), both built from one React/TypeScript codebase. Supabase provides
Google authentication, shared Postgres data, and private receipt-photo storage. The local ledger
lives in IndexedDB via Dexie with an outbox sync engine. The design avoids paid OCR, paid sync, and
the Apple Developer Program, keeping recurring cost at zero.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 22 LTS, React 19, Vite 7

**Primary Dependencies**: React Router, Tailwind CSS (layout utilities), `@material/web` (official
Material Design 3 web components) with `@lit/react` wrappers, `material-symbols` and
`@fontsource/roboto`/`@fontsource/roboto-mono` for the M3 type and icon system, Dexie, Zod,
date-fns, Tesseract.js, Capacitor 8, `@capacitor/camera`, `@capacitor/share`,
`@capacitor/browser`, `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`,
`@capacitor-mlkit/text-recognition`, `@capgo/capacitor-social-login`, `@supabase/supabase-js`;
recap images are rendered with the browser Canvas 2D API

**Storage**: Supabase Postgres (shared source of truth), Supabase Storage private bucket (receipt
photos), IndexedDB via Dexie (local ledger and outbox), service-worker cache (app shell and
Tesseract language data)

**Testing**: Vitest + React Testing Library for units and components, fast-check for money
invariants, Playwright for PWA flows, manual device validation on one Android phone and one iPhone

**Target Platform**: Android 8+ (Capacitor minSdk 23), iOS 16.4+ Safari PWA, current Chrome, Edge,
and Safari for development

**Project Type**: Mobile-first web application with an Android native shell and a Supabase backend

**Design System**: Material Design 3 (M3) with a green seed, implemented with the official
[`@material/web`](https://material-web.dev/) components linked from
[M3 Develop](https://m3.material.io/develop) — tonal color roles, M3 type scale, filled/tonal/
outlined/text buttons, filled/outlined cards, navigation bar with active indicator, FAB, outlined
text fields and selects, checkboxes, icon buttons, progress indicators, chips, and dialogs;
React wrappers live in `src/components/m3`

**Performance Goals**: First usable screen under 5 seconds; scan-to-confirmed-total under 30 seconds
for clear printed receipts; create/assign/finalize under 90 seconds; other adults see a finalized
outing within 10 seconds of reconnection; the PWA works offline after the first load

**Constraints**: On-device OCR only; no paid OCR, paid sync, or Apple Developer Program; exactly
four adults; 1–10 students; Philippine pesos and English; one receipt and one payer per outing;
one adult per student; no self-pay; offline-first

**Scale/Scope**: 3 adult users, 1–10 students, roughly 10 screens, hundreds of outings per year,
receipt photos compressed to stay comfortably within Supabase's free tier

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution Gate | Status | Design Evidence |
|---|---|---|
| I. Money correctness | PASS | A pure integer-centavo money module, largest-remainder rounding with a stable member-order tie-break, invariant tests with fast-check, and immutable share snapshots on finalize |
| II. Privacy by default | PASS | ML Kit on Android and Tesseract.js in the browser; no external OCR API; student records limited to name and notes; RLS and a private storage bucket |
| III. Offline-first | PASS | Dexie is the local source of truth; all capture/split/settle flows work without network; an outbox syncs on reconnect and never blocks the table-side flow |
| IV. One codebase, two targets | PASS | One Vite/React app; Capacitor Android shell; iPhone uses the same build as a PWA; camera, OCR, share, and auth are behind platform adapters |
| V. Explicit and simple money rules | PASS | Exactly one receipt, one payer, one adult per student, per-head split, no self-pay, no item-level allocation |
| VI. Auditable and reversible | PASS | Finalize writes an immutable share snapshot; reopening is explicit and audited; settlements are append-only; deletes are soft |
| VII. Low-friction at the table | PASS | Six-step wizard, fairness auto-assign, live share preview, manual total fallback, 44px tap targets |
| VIII. Zero recurring cost | PASS | Supabase free tier, free static hosting, on-device OCR, signed Android APK, iPhone home-screen PWA |

**Complexity note**: The hybrid has two OCR adapters (ML Kit and Tesseract.js) and two auth flows
(web OAuth and native Google ID token). Both are direct consequences of Principles IV and VIII and
are isolated behind explicit interfaces, so they do not leak into feature code.

### Post-Design Re-check

After Phase 1 design, all gates still pass. The data model enforces the share-sum, coverage, and
headcount invariants with database checks and derived views. The OCR contract keeps recognition
on-device on both targets. The sync protocol preserves finalized snapshots and append-only
settlements. Platform adapters isolate the Android/PWA split. No violations require the Complexity
Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/001-salo-expense-sharing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── money-engine.md
│   ├── ocr-adapter.md
│   ├── sync-protocol.md
│   ├── platform-adapters.md
│   └── recap.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── router.tsx
│   ├── providers.tsx
│   └── layout.tsx
├── components/
│   ├── ui/
│   └── shared/
├── features/
│   ├── auth/
│   ├── group/
│   ├── students/
│   ├── outings/
│   ├── receipts/
│   ├── coverage/
│   ├── ledger/
│   ├── reports/
│   └── settings/
├── lib/
│   ├── money/
│   │   ├── centavos.ts
│   │   ├── split.ts
│   │   ├── settle-up.ts
│   │   └── fairness.ts
│   ├── ocr/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── mlkit.ts
│   │   └── tesseract.ts
│   ├── db/
│   │   ├── schema.ts
│   │   ├── repositories/
│   │   └── outbox.ts
│   ├── sync/
│   │   ├── engine.ts
│   │   └── merge.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── auth.ts
│   ├── platform/
│   │   ├── camera.ts
│   │   ├── share.ts
│   │   ├── storage.ts
│   │   └── share-target.ts
│   └── validation/
│       └── schemas.ts
├── styles/
│   └── index.css
└── main.tsx

android/
├── app/
│   └── src/main/
├── build.gradle
└── capacitor.config.ts

supabase/
├── migrations/
│   └── 0001_initial_schema.sql
└── seed.sql

public/
├── icons/
├── manifest.webmanifest
└── tessdata/eng.traineddata

tests/
├── unit/
│   ├── money/
│   ├── parser/
│   └── validation/
├── integration/
│   └── sync/
└── e2e/
    ├── outing.spec.ts
    └── settle.spec.ts
```

**Structure Decision**: A single feature-based Vite application is the shared UI and business-logic
layer. Platform differences live in `src/lib/platform` and `src/lib/ocr`, which select the Capacitor
or browser implementation at runtime. The `android/` directory is the Capacitor shell; the iPhone
target is the same Vite production build served as a PWA. Supabase schema and seed data live under
`supabase/`, and tests mirror the money, parser, validation, sync, and end-to-end flows.

## Environment Configuration

| Variable | Purpose | Exposure |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Public |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key protected by RLS | Public |
| `VITE_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID used by web and native ID-token flows | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Migration and seed scripts only | Server/CLI only, never bundled |

## Release and Distribution

- **Web/PWA**: static build deployed to Cloudflare Pages or Vercel. `manifest.webmanifest` and a
  Workbox service worker provide installation, offline app shell, and cached Tesseract data.
- **Android**: `npx cap sync android`, Gradle release build signed with a private keystore, APK
  distributed by link. No Play Store listing required.
- **iPhone**: Safari → Share → Add to Home Screen. The app shows install instructions on first iOS
  visit and runs standalone after installation.
- **Backend**: Supabase free tier in the Singapore region (closest to the Philippines), with RLS,
  private storage, and compressed receipt photos.
