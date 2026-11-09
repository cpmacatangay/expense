# Implementation Plan: Salo - Android Meal Ledger

> **Status: Superseded (2026-11-09).** This plan describes the archived Android app. The active plan
> is [`specs/002-salo-pwa/plan.md`](../002-salo-pwa/plan.md).

**Branch**: `001-salo-expense-sharing` | **Date**: 2026-11-07 | **Spec**: `specs/001-salo-expense-sharing/spec.md`

**Input**: Revised specification for an Android-only Kotlin app with Jetpack Compose, Material Design 3, item-level assignment, shared per-head costs, and private Supabase backup.

## Summary

Salo becomes a native Android app for a single owner device. The owner records meals for four local
adult profiles — CP, Mai, Kent, and Llanmer — manually lists each receipt item, assigns it to an
adult, a student, or the shared table, and finalizes an exact split. The other adults receive
text/image recaps and do not use the app. Ledger data is stored locally in Room and backed up
privately to Supabase as a versioned JSON snapshot under the owner's Google account. The item sum is
the authoritative bill; there is no OCR or receipt-image path. The previous React/Capacitor/PWA
implementation is deleted after a Git baseline commit.

## Technical Context

**Language/Version**: Kotlin (current stable), JDK 21

**Android SDK**: `compileSdk 37`, `targetSdk 37`, `minSdk 37` (Android 17, owner's Samsung S26 Ultra)

**UI**: Jetpack Compose + Material Design 3, Navigation Compose, fixed Ledger Green palette (no
dynamic color)

**Architecture**: Single-activity Compose app, MVVM with unidirectional data flow, repository layer,
Room as the source of truth, Hilt for dependency injection, Coroutines/Flow

**Local Storage**: Room + KSP, DataStore for preferences; no receipt images

**Backup**: Supabase Postgres, `ledger_snapshots` table with versioned JSONB payload, row-level
security scoped to the owner account, WorkManager retry

**Auth**: Google Credential Manager ID token → Supabase `signInWithIdToken`; one authorized owner
account only

**Item entry**: Manual only. No camera, OCR, parser, pre-LLM gate, or LLM.

**Sharing/Export**: Android share sheet for recap text; recap image saved to `Pictures/Salo`;
Storage Access Framework for CSV/JSON export

**Testing**: JUnit/Robolectric, Compose UI tests, Room DAO tests, Turbine, MockK, Kotest property
tests for money invariants, instrumented smoke test on the S26 Ultra

**Target Device**: Samsung S26 Ultra, Android 17, One UI 9.0

**Distribution**: Sideloaded debug APK and signed release APK, application id `ph.salo.app`

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Check |
|---|---|
| I. Money Correctness | Integer centavos; largest-remainder rounding; exact-total invariant tests for item assignment, shared costs, manual overrides, and legacy adjustments. |
| II. Privacy by Default | No receipt images or OCR; only ledger data backed up; minimal student data; no analytics. |
| III. Offline-First | Room is the source of truth; all recording works offline; backup is queued and retryable; restore only on an empty database. |
| IV. Android-Native, Single Owner | Kotlin + Compose M3; Android 17+; no web/PWA/iPhone; one owner account; four local adult profiles; recaps for others. |
| V. Explicit Money Rules | Hybrid item assignment + shared per-head; student items to covering adult; item sum authoritative; explicit manual override; no fairness score or auto-balance. |
| VI. Auditable and Reversible | Immutable finalized snapshot; audit events; append-only settlements; soft deletes; export. |
| VII. Low-Friction | Manual item entry under 3 minutes; per-head fallback under 90 seconds; 44dp targets. |
| VIII. Zero Recurring Cost | Free Supabase tier; no OCR dependency; sideloaded APK; no Apple fees. |

**Result**: PASS. No complexity exceptions required.

## Project Structure

The repository root becomes the Android Gradle project.

```text
.
├── app/
│   ├── build.gradle.kts
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/ph/salo/app/
│       │   │   ├── SaloApplication.kt
│       │   │   ├── MainActivity.kt
│       │   │   ├── core/
│       │   │   │   ├── money/
│       │   │   │   ├── database/
│       │   │   │   ├── datastore/
│       │   │   │   ├── auth/
│       │   │   │   └── backup/
│       │   │   ├── feature/
│       │   │   │   ├── adults/
│       │   │   │   ├── students/
│       │   │   │   ├── outing/
│       │   │   │   ├── ledger/
│       │   │   │   ├── recap/
│       │   │   │   ├── history/
│       │   │   │   └── settings/
│       │   │   └── ui/
│       │   │       ├── theme/
│       │   │       └── components/
│       │   └── res/
│       ├── test/
│       └── androidTest/
├── gradle/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── specs/
├── .specify/
├── README.md
└── .gitignore
```

Package boundaries are used instead of multi-module Gradle initially. The money engine must not
depend on Android classes.

## Architecture Decisions

### 1. Single-activity Compose app

- `MainActivity` hosts a `NavHost`.
- Screens are Composable functions with ViewModels from Hilt.
- Navigation routes: Home, Students, New Outing, Outing Detail, Ledger, History, Settings.
- Material 3 `Scaffold`, `NavigationBar`, `TopAppBar`, `FloatingActionButton`.

### 2. MVVM + repository

- ViewModels expose immutable UI state via `StateFlow`.
- Repositories own Room transactions and backup scheduling.
- Use cases for money allocation, finalization, restore, and export are pure where possible.
- Hilt modules provide database, DAOs, repositories, Supabase client, and dispatchers.

### 3. Room source of truth

Entities: `AdultProfileEntity`, `StudentEntity`, `OutingEntity`, `ReceiptEntity`,
`ReceiptItemEntity`, `CoverageEntity`, `ShareEntity`, `SettlementEntity`, `AuditEventEntity`,
`BackupStateEntity`.

- IDs are UUID strings.
- Money is `Long` centavos.
- Soft deletes via `archivedAt`, `deletedAt`, or `voidedAt`.
- Finalized shares are stored as immutable rows.
- Legacy receipt image paths may remain; no new images are captured.

### 4. Money engine

Pure Kotlin object/use case with no Android dependencies:

```kotlin
data class MoneyAllocationInput(
    val totalCentavos: Long,
    val adults: List<AdultProfile>,
    val presentStudents: List<Student>,
    val coverageByStudent: Map<String, String>,
    val items: List<ReceiptItem>,
    // Legacy only; new outings pass zero.
    val taxCentavos: Long = 0,
    val serviceChargeCentavos: Long = 0,
    val discountCentavos: Long = 0
)
```

Algorithm:

1. Validate the total and assignments.
2. Sum adult-assigned items per adult.
3. Add student-assigned items to the covering adult.
4. Split shared items per head across `adults.size + presentStudents.size`; add each student's
   share to the covering adult.
5. New outings pass zero adjustments. Legacy outings may still allocate
   `tax + serviceCharge - discount` proportionally to the base.
6. Distribute `total - sum(shares)` proportionally using largest-remainder rounding. This covers a
   manual override or a legacy stored total.
7. Assert `sum(shares) == total` and every share is non-negative unless the owner explicitly
   allows a negative legacy adjustment.
8. If there are no items, fall back to per-head across adults + present students.

The total is the item sum in Auto mode or the owner's explicit manual total.

Rounding rules:

- Use `Long` centavos only.
- Floor proportional amounts, then distribute remaining centavos by largest fractional remainder.
- Ties break by stable adult order.
- Legacy negative adjustments (discounts) use the absolute value for ranking and apply the sign.
- The final assertion must fail loudly in debug and be covered by property tests.

### 5. Backup and restore

Supabase schema:

```sql
create table public.ledger_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null,
  payload jsonb not null,
  device_id text not null,
  created_at timestamptz not null default now()
);
```

- RLS: `auth.uid() = user_id` for select/insert/update/delete.
- The app writes a full snapshot after a debounced mutation batch.
- Keep the last N snapshots (default 30); prune older snapshots from the app.
- Snapshot includes all ledger entities, item assignments, coverage, shares, settlements, and audit
  events. Legacy receipt image paths are excluded.
- Restore fetches the latest valid snapshot, validates `schema_version`, and imports only when the
  local Room database is empty.
- `BackupStateEntity` stores last success, last attempt, status, error, and snapshot id.
- WorkManager retries with exponential backoff and a network constraint.
- Manual "Back up now" action in Settings.

### 6. Authentication

- Owner signs in with Google Credential Manager.
- Send the ID token to Supabase Auth (`signInWithIdToken`).
- Store the Supabase session securely; never ship a service-role key.
- Only the configured owner email is allowed. Disable Supabase sign-ups.
- Local use does not require sign-in. Backup/restore prompts for sign-in when needed.
- On sign-out, local data remains and backup status becomes "local only."

### 7. Manual bill entry and total state

- The receipt step has merchant, total, and an items card. There is no camera, scan button, scan
  summary, or replace-scanned-items dialog.
- The owner adds each item with a name, quantity, and unit amount; the item amount is
  `quantity × unitAmount`.
- `TotalMode`:
  - `AUTO` (new outings): the total follows the item sum after every item add, edit, delete, split,
    or merge.
  - `MANUAL`: the owner typed a total; later item changes leave it unchanged.
  - `FIXED`: loaded from a reopened outing; item changes never update it.
- Typing a total moves `AUTO` to `MANUAL`. “Use items total” moves `MANUAL` back to `AUTO`.
- Deleting the last item while `AUTO` clears the total. With no items, the owner types a total for a
  per-head split.
- There is no printed-receipt-total or adjustment reconciliation.
- New outings write zero adjustments and a null image path. Legacy outings keep their stored
  adjustments and image path; the UI hides them and the split does not change on reopen.
- Merging two items preserves the exact total: use the combined quantity only when the amount
  divides evenly, otherwise one line at the exact combined amount.
- Do not add ML Kit, camera capture, FileProvider capture, a receipt parser, parser tests, or a
  Gemini Nano plan.

### 8. Recap

- Text recap built from the finalized snapshot.
- Image recap rendered with Android Canvas or Compose to a 1080×1350 PNG.
- Content: date, place, total, item assignment summary, per-adult share breakdown, covered students,
  payer, settlement suggestions.
- Share the text via `Intent.ACTION_SEND`; save the image to `Pictures/Salo` through MediaStore.
- Use the system share sheet; no network service.

### 9. Export

- CSV and JSON via Storage Access Framework.
- Include outings, items, assignments, coverage, shares, settlements, and roster.
- Use Kotlinx Serialization for JSON and a small CSV writer for CSV.

## UI/UX Flow

1. **Home**: balance summary, recent outings, backup status, FAB for new outing.
2. **Students**: roster, add/edit/archive, 1–10 active limit.
3. **New Outing — Details**: date, place, notes.
4. **New Outing — Receipt**: merchant, total (Auto/Manual), and manual item entry. No scan.
5. **New Outing — Items**: list with name, quantity, amount, assignment control (adult/student/
   shared), add/edit/delete/split/merge.
6. **New Outing — Students**: present roster and one-adult-per-student coverage.
7. **New Outing — Review**: per-adult breakdown, exact total, payer selection, finalize.
8. **Outing Detail**: finalized snapshot, item assignments, shares, recap sharing, audit/reopen.
9. **Ledger**: net balances, simplified transfers, settlement history, record payment.
10. **History**: date filters, total spend, per-student history, CSV/JSON export.
11. **Settings**: group name, adult profiles, backup status, Google sign-in/out, export, clear data.

Assignment control:

- Segmented control or chips: CP, Mai, Kent, Llanmer, each student, Shared.
- Unassigned is visible and blocks finalization.
- Assigning to a student automatically marks them present.
- Bulk actions: "Assign all to adult", "Mark remaining shared", "Split item".

## Testing Strategy

- **Money engine**: unit tests and Kotest property tests for exact totals, item assignment, shared
  items, manual overrides, legacy adjustments, zero items, and zero/one students.
- **Room**: DAO tests for item assignment, coverage, share snapshots, settlements, backup state.
- **ViewModels**: Turbine tests for state transitions and validation blocking.
- **Compose UI**: item assignment, student auto-presence, shared items, final review, restore
  blocking, backup status.
- **Total state**: pure tests for auto-follow, manual override, fixed reopened outings, and exact
  merge totals.
- **Instrumented**: smoke test on the S26 Ultra: create roster, itemized outing, finalize, share
  recap, backup, clear, restore.
- **Manual**: verify the fixed palette, dark theme, one-handed use, 44dp targets, offline behavior.

## Milestones

### M1a — Core local ledger

- Android Gradle project, Compose theme, navigation.
- Room schema and repositories.
- Adult profiles, students.
- Outing details, manual total, and manual item entry/editing/assignment.
- Coverage, hybrid money engine, review, finalize.
- Ledger balances and settlements.
- Recap text/image sharing.

### M1b — Private backup

- Supabase project and `ledger_snapshots` schema.
- Google Credential Manager sign-in.
- Snapshot serialization, WorkManager backup, status UI.
- Restore only on empty database.
- Backup/restore tests.

### M2 — Manual entry and history

- Manual item entry and the Auto/Manual/Fixed total state.
- Retire tax/service/discount from new outings; keep legacy adjustments.
- History, per-student totals, CSV/JSON export.
- Reopen/audit UI.
- Fixed Ledger Green palette and dark theme.

### M3 — Release

- Release signing, ProGuard/R8 rules.
- Physical-device validation on the S26 Ultra.
- Performance and accessibility pass.
- Signed APK.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Android 17 / API 37 is new; libraries may lag | Verify AGP, Compose BOM, Room, Hilt, and Supabase Kotlin versions early; pin compatible versions |
| Supabase Kotlin client support | Use the official `supabase-kt` libraries; fall back to Ktor + REST/Auth if needed |
| Item assignment could slow the flow | Chips/segmented controls, bulk actions, remember last assignee, 44dp targets |
| Auto/manual total could confuse the owner | Supporting text shows whether the total follows items or is manual; “Use items total” restores Auto |
| Largest-remainder rounding with a manual override | Property tests; deterministic order; exact-sum assertions |
| Restore overwrites local data | Restore only on empty DB; export/clear required otherwise |
| Legacy outing data changes on reopen | Keep stored totals and adjustments fixed; never normalize on reopen |
| Google auth setup complexity | Use Credential Manager + Supabase ID token; document OAuth client setup |

## Complexity Tracking

No constitution violations. The hybrid money engine and backup snapshot are justified by the
explicit product decisions. No multi-module Gradle split is used in the first milestone to keep the
build simple; package boundaries preserve testability.
