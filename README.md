# Salo

Salo is a private, Android-only meal ledger for four adult profiles — CP, Mai, Kent, and Llanmer —
who cover meals for a roster of students. The owner records outings and receipt items, assigns each
item to an adult, a student, or the shared table, and shares a recap with the other adults.

## Status

The specification and plan have been revised for a native Kotlin Android app. The previous
React/Capacitor/PWA implementation has been removed and preserved in Git history.

The Kotlin project is scaffolded with Jetpack Compose, Material 3, Room, Hilt, WorkManager, and
the navigation shell. The pure Kotlin money engine is implemented and tested, including item
assignment, shared per-head costs, proportional adjustments, total-gap reconciliation, balances,
and settlements. The feature screens and persistence layer are next.

## Product decisions

- **Platform**: Android only; Samsung S26 Ultra, Android 17 / One UI 9.0.
- **UI**: Kotlin + Jetpack Compose + Material Design 3.
- **SDK**: `compileSdk 37`, `targetSdk 37`, `minSdk 37`.
- **Adults**: four local profiles on one phone. Only the owner uses the app.
- **Other adults**: receive text/image recaps; they do not install or sign in.
- **Money model**: hybrid item assignment + per-head shared costs.
  - Each item is assigned to one adult, one student, or shared.
  - Student items are charged to the adult covering that student.
  - Shared items split per head across four adults and present students.
  - Tax, service, and discount are allocated proportionally.
  - The receipt total is authoritative; the gap is distributed proportionally.
  - Every finalized split sums exactly in integer centavos.
- **No items**: fall back to a per-head split.
- **Fairness**: fairness scores and auto-balance are removed.
- **Backup**: private Supabase JSON snapshots for the owner's Google account.
- **Restore**: only when the local database is empty.
- **Receipt photos**: local-only; never uploaded.
- **OCR**: ML Kit Text Recognition v2, on-device.
- **Distribution**: sideloaded APK, application id `ph.salo.app`.

## Current implementation

- Native Android Gradle project at the repository root, openable in Android Studio.
- Single-activity Compose app with Material 3 theme, dynamic color, and a green fallback.
- Full navigation: Home, Students, New Outing, Outing Detail, Ledger, History, and Settings.
- Room database, DAOs, and repositories for adults, students, outings, receipts, items,
  coverage, shares, settlements, audit events, and backup state.
- Hilt dependency injection, WorkManager backup scheduling, DataStore preferences and session.
- Pure Kotlin money engine:
  - item assignment to adult, student, or shared;
  - student items charged to the covering adult;
  - shared items split per head;
  - proportional tax/service/discount allocation;
  - total-gap reconciliation;
  - exact-centavo largest-remainder rounding;
  - per-head fallback when there are no items;
  - balances and simplified settlements.
- New Outing wizard: details, receipt, manual/OCR items, item editing/splitting/merging,
  assignment, coverage, review, payer, and finalize.
- On-device OCR using the system camera and ML Kit Text Recognition.
- Text and 1080×1350 image recaps through the Android share sheet.
- Ledger with balances, suggested transfers, partial payments, and void.
- History with date filters, per-student summaries, and CSV/JSON export.
- Private Supabase snapshot backup and restore, Google Credential Manager sign-in, retry worker,
  and owner-only RLS. Backup is disabled until the config keys are added.
- Adaptive launcher icon and Android 13+ monochrome themed icon.
- JUnit tests for the money engine and receipt parser, including randomized exact-total invariants.

Pending: physical-device/emulator UI validation, reopen/audit UI, release signing, and instrumented
tests. The app has been compiled, unit-tested, and linted, but not run on the S26 Ultra yet.

## Planned architecture

- Single-activity Jetpack Compose app.
- MVVM + repository layer.
- Room + KSP as the local source of truth.
- Hilt for dependency injection.
- WorkManager for retryable backup.
- Google Credential Manager + Supabase Auth.
- System camera capture + ML Kit for OCR.
- Android share sheet for recaps; Storage Access Framework for CSV/JSON export.

## Repository layout

```text
app/                     Android application module
gradle/                  Gradle wrapper and version catalog
supabase/
  migrations/            Private ledger snapshot schema
  seed.sql               No demo data
specs/
  001-salo-expense-sharing/
    spec.md              Revised product specification
    plan.md              Revised Kotlin/Compose plan
    tasks.md             Implementation tasks
    data-model.md        Room entities and snapshot shape
    quickstart.md        Build, Supabase, and validation scenarios
    contracts/           Money, backup, OCR, recap, and platform contracts
.specify/                Spec Kit scaffolding and constitution
```

## Supabase backup

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_ledger_snapshots.sql`.
3. Disable sign-ups and provision the owner's Google account.
4. Add these ignored values to `local.properties`:

   ```properties
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_ANON_KEY=<anon-key>
   GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
   OWNER_EMAIL=<your-google-account>
   ```

5. Never commit the service-role key or these values.

The schema stores versioned JSON snapshots in `public.ledger_snapshots` with owner-only row-level
security. Receipt images and credentials are never included.

## Brand

The final identity is **Salo S** — a bold custom S built from the same rounded geometry as a shared
table. Brand sources and the full kit live in `brand/logo/`:

- `brand/logo/final-salo-s.svg` — symbol master
- `brand/logo/final-wordmark.svg` — custom wordmark
- `brand/logo/salo-horizontal.svg` — primary lockup
- `brand/logo/salo-stacked.svg` — stacked lockup
- `brand/logo/kit/` — colour variants, Android adaptive icon, web icons, guidelines, and presentation

The Android launcher icon has been updated to the new mark. See
`brand/logo/kit/brand-guidelines.md` for colour, clear space, minimum sizes, and misuse rules.

## Build

The Kotlin project is scaffolded at the repository root.

```powershell
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Toolchain used by the scaffold:

- Gradle 9.5.0
- Android Gradle Plugin 9.2.1
- Kotlin 2.2.20
- JDK 21
- compileSdk / targetSdk / minSdk 37

KSP and Hilt currently require opting out of AGP's built-in Kotlin support, so
`gradle.properties` contains:

```properties
android.builtInKotlin=false
android.newDsl=false
```

These options are required until the KSP/Hilt toolchain supports built-in Kotlin.
The app builds and produces `app/build/outputs/apk/debug/app-debug.apk`.

## Specification

The authoritative documents are:

- `specs/001-salo-expense-sharing/spec.md`
- `specs/001-salo-expense-sharing/plan.md`
- `specs/001-salo-expense-sharing/tasks.md`
- `.specify/memory/constitution.md`

## Privacy and cost

- On-device OCR only; no external OCR service.
- Receipt images stay on the phone.
- Ledger data is backed up privately to the owner's Supabase account.
- Student records are display name and optional notes only.
- No analytics, ad SDKs, or tracking.
- Free-tier Supabase and a sideloaded APK; no recurring cost.
