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

- Native Android Gradle project at the repository root.
- Single-activity Compose app with Material 3 theme, dynamic color, and a green fallback.
- Navigation shell for Home, Students, Ledger, and Settings.
- Hilt application wiring and Room/KSP/WorkManager dependencies.
- Pure Kotlin money engine:
  - item assignment to adult, student, or shared;
  - student items charged to the covering adult;
  - shared items split per head;
  - proportional tax/service/discount allocation;
  - total-gap reconciliation;
  - exact-centavo largest-remainder rounding;
  - per-head fallback when there are no items;
  - balances and simplified settlements.
- JUnit unit tests and deterministic randomized invariant tests for the money engine.

Pending: Room schema and repositories, core Compose screens, recap sharing, Google auth/Supabase
backup, OCR, history, export, and release signing.

## Planned architecture

- Single-activity Jetpack Compose app.
- MVVM + repository layer.
- Room + KSP as the local source of truth.
- Hilt for dependency injection.
- WorkManager for retryable backup.
- Google Credential Manager + Supabase Auth.
- CameraX + ML Kit for OCR.
- Android share sheet for recaps; Storage Access Framework for CSV/JSON export.

## Repository layout

```text
app/                     Android application module (to be scaffolded)
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
4. Put the Supabase URL and anon key in an ignored `local.properties` or `secrets.properties`.
5. Never commit the service-role key.

The schema stores versioned JSON snapshots in `public.ledger_snapshots` with owner-only row-level
security. Receipt images and credentials are never included.

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
