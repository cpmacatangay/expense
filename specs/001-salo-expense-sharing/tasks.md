# Tasks: Salo — Android Meal Ledger

**Input**: `specs/001-salo-expense-sharing/plan.md`, `specs/001-salo-expense-sharing/spec.md`

**Prerequisites**: Constitution 2.0.0, revised spec, revised plan

**Tests**: Required for money allocation, Room, ViewModels, Compose UI, manual entry and total state, backup/restore, and the physical-device smoke test.

**Organization**: Tasks are grouped by milestone and dependency order. `[P]` means the task can run in parallel with other `[P]` tasks in the same phase.

## Phase 0: Baseline and implementation reset

- [x] T001 Confirm the Git baseline commit exists; if not, initialize Git and commit the current tree before deleting anything.
- [x] T002 Delete the React application, Vite/PWA assets, Tailwind styles, and web entry points.
- [x] T003 Delete the Capacitor Android shell, Capacitor configuration, native web bridge, and web release docs.
- [x] T004 Delete web tests, Playwright/Vitest configuration, Tesseract assets, and browser OCR fixtures.
- [x] T005 Delete web dependencies and lockfiles (`package.json`, `package-lock.json`, `node_modules`).
- [x] T006 Replace `.gitignore` with an Android/Kotlin-oriented ignore list.
- [x] T007 Replace the old Supabase multi-user migrations and seed with the new single-owner snapshot schema.
- [x] T008 Rewrite `README.md` for the Android Kotlin project and mark implementation as pending.
- [x] T009 Commit the implementation reset as a separate commit.

## Phase 1: Android project foundation

- [x] T010 Create the root Gradle Android project (`settings.gradle.kts`, `build.gradle.kts`, `gradle.properties`, Gradle wrapper).
- [x] T011 Add the `app` module with `applicationId = "ph.salo.app"`.
- [x] T012 Configure `compileSdk 37`, `targetSdk 37`, `minSdk 37`, JDK 21, and Kotlin/Compose compiler versions.
- [x] T013 Add a Gradle version catalog for Compose, Room, Hilt, WorkManager, Navigation, Kotlinx Serialization, Credential Manager, Supabase, and test libraries.
- [x] T014 Create `SaloApplication` and register it in `AndroidManifest.xml`.
- [x] T015 Configure Hilt application and modules.
- [x] T016 Create the single `MainActivity` with edge-to-edge Compose content.
- [x] T017 Create the Material 3 theme with the Salo green fallback palette.
- [x] T018 Add dynamic color support for Android 12+ with the green fallback.
- [x] T019 Add light/dark color schemes and Material 3 typography.
- [x] T020 Create the app navigation graph and routes for Home, Students, New Outing, Outing Detail, Ledger, History, and Settings.
- [x] T021 Create the root `Scaffold` with Material 3 `NavigationBar` and FAB.
- [ ] T022 Build and launch the empty app on the S26 Ultra.

## Phase 2: Money engine and allocation rules

- [x] T023 Define pure Kotlin domain models for adults, students, items, coverage, shares, and allocation results.
- [x] T024 Implement integer-centavo helpers and peso formatting/parsing.
- [x] T025 Define `MoneyAllocationInput` and `MoneyAllocationResult`.
- [x] T026 Implement input validation: positive total, one receipt, one payer, unique item assignment, valid adult/student ids, one adult per present student.
- [x] T027 Implement adult-assigned item subtotals.
- [x] T028 Implement student-assigned item subtotals charged to the covering adult.
- [x] T029 Implement shared-item per-head allocation across four adults plus present students.
- [x] T030 Implement proportional tax, service-charge, and discount allocation.
- [x] T031 Implement total-gap distribution so the final shares sum exactly to the receipt total.
- [x] T032 Implement deterministic largest-remainder rounding with stable adult order and negative-adjustment handling.
- [x] T033 Implement the no-items per-head fallback.
- [x] T034 Add a debug assertion and production-safe check that finalized shares sum exactly to the receipt total.
- [x] T035 Add unit tests for adult items, student items, shared items, and mixed assignments.
- [x] T036 Add property tests for exact totals across randomized amounts and assignments.
- [x] T037 Add tests for tax, service charge, discounts, negative gaps, and zero-item fallbacks.
- [x] T038 Add a test case for the spec's worked example with four adults, two students, a shared item, and tax.

## Phase 3: Room persistence and repositories

- [x] T039 Create `AdultProfileEntity`, `StudentEntity`, `OutingEntity`, `ReceiptEntity`, and `ReceiptItemEntity`.
- [x] T040 Create `CoverageEntity`, `ShareEntity`, `SettlementEntity`, `AuditEventEntity`, and `BackupStateEntity`.
- [x] T041 Add `assignmentType`, `assignedAdultId`, and `assignedStudentId` to receipt items.
- [x] T042 Add the share breakdown fields: own items, student items, shared head, adjustments, gap, and final total.
- [x] T043 Create Room DAOs for profiles, students, outings, receipts, items, coverage, shares, settlements, audit events, and backup state.
- [x] T044 Create the Room database, converters, and schema export.
- [x] T045 Add a migration policy and initial schema version.
- [x] T046 Seed the four adult profiles: CP, Mai, Kent, Llanmer.
- [x] T047 Implement `AdultProfileRepository` with the profile switcher state.
- [x] T048 Implement `StudentRepository` with add, edit, archive, reactivate, and the 1–10 limit.
- [x] T049 Implement `OutingRepository` for draft creation, details, receipt, items, finalization, and snapshot persistence.
- [x] T050 Implement `ReceiptItemRepository` for add, edit, delete, split, merge, quantity, and assignment.
- [x] T051 Implement `CoverageRepository` for present students and one-adult-per-student mapping.
- [x] T052 Implement `ShareRepository` for persisted share breakdowns and finalized snapshots.
- [x] T053 Implement `SettlementRepository` for full/partial payments, history, and voiding.
- [x] T054 Implement `BackupStateRepository` for last success, last attempt, status, error, and snapshot id.
- [ ] T055 Add Room DAO tests for item assignment, coverage, share persistence, settlements, and backup state.
- [ ] T056 Add repository tests for validation, finalization, and archived-student history.

## Phase 4: Core Compose UI

- [x] T057 Build the adult profile switcher and persist the selected profile.
- [x] T058 Build the Home screen with balances, recent outings, backup status, and a new-outing FAB.
- [x] T059 Build the Students screen with add/edit/archive/reactivate.
- [x] T060 Build the student add/edit dialog with validation.
- [x] T061 Build the New Outing details step: date, place, notes, and selected adult profile.
- [x] T062 Build the receipt step: total, tax, service charge, discount, and manual entry.
- [x] T063 Build the manual item list with name, quantity, unit amount, and total amount.
- [x] T064 Build the item editor for add, edit, delete, split, merge, and quantity changes.
- [x] T065 Build the item assignment control with CP, Mai, Kent, Llanmer, student names, and Shared.
- [x] T066 Add clear unassigned and shared visual states.
- [x] T067 Mark a student present when an item is assigned to them.
- [x] T068 Build the present-student and coverage step with one adult per student.
- [x] T069 Build the review screen with per-adult breakdown: own items, student items, shared head, adjustments, gap, and final share.
- [x] T070 Block finalization when an item is unassigned or a present student lacks coverage.
- [x] T071 Build payer selection and finalize action.
- [x] T072 Build the Outing Detail screen with item assignments, shares, payer, and recap actions.
- [x] T073 Build the Ledger screen with net balances and simplified transfers.
- [x] T074 Build the payment dialog for full and partial settlements.
- [x] T075 Build settlement history with void support.
- [x] T076 Build the History screen with date filters and total spend.
- [x] T077 Build per-student history and item details.
- [x] T078 Build the Settings screen with profiles, group name, backup status, sign-in/out, export, and clear data.
- [ ] T079 Add Compose UI tests for item assignment, shared items, auto-presence, coverage, and finalization blocking.

## Phase 5: Recap and sharing

- [x] T080 Implement the text recap from the finalized snapshot.
- [x] T081 Implement the image recap renderer at 1080×1350 with the Salo receipt style.
- [x] T082 Include item assignment summary, per-adult shares, covered students, payer, and settlement suggestions.
- [x] T083 Add a FileProvider and cache file for the recap image.
- [x] T084 Share text and image through the Android share sheet.
- [ ] T085 Add tests that recap totals and item assignments match the finalized snapshot.

## Phase 6: Google auth and private Supabase backup

- [x] T086 Create the Supabase project configuration for the snapshot schema.
- [x] T087 Apply `0001_ledger_snapshots.sql` with the `ledger_snapshots` table and indexes.
- [x] T088 Add row-level security policies for owner-only select/insert/update/delete.
- [x] T089 Disable Supabase sign-ups and provision the owner account manually.
- [x] T090 Add the Supabase Kotlin client and secure session storage.
- [x] T091 Add Google Credential Manager sign-in.
- [x] T092 Exchange the Google ID token with Supabase `signInWithIdToken`.
- [x] T093 Restrict backup access to the configured owner email.
- [x] T094 Implement the versioned snapshot serializer for all ledger data.
- [x] T095 Exclude receipt image paths from the snapshot.
- [x] T096 Implement snapshot upload and retention/pruning.
- [x] T097 Add WorkManager backup with network constraint and exponential backoff.
- [x] T098 Trigger backup after finalized outings, settlements, roster changes, and profile changes.
- [x] T099 Add a manual "Back up now" action.
- [x] T100 Build the backup status UI: local-only, backing up, backed up, error.
- [x] T101 Implement snapshot validation and schema-version checks before restore.
- [x] T102 Implement restore only when the local database is empty.
- [ ] T103 Block restore when local data exists and require export/clear.
- [x] T104 Add tests for snapshot serialization, backup retry, restore validation, empty-only restore, and unauthorized access.
- [x] T105 Verify local use without sign-in and backup queuing while signed out.

## Phase 7: History, export, and audit (manual entry only)

- [~] T106 (Withdrawn) System camera capture via ActivityResultContracts.TakePicture and FileProvider.
- [~] T107 (Withdrawn) ML Kit Text Recognition v2 on-device processing.
- [~] T108 (Withdrawn) Port the Philippine receipt parser to Kotlin.
- [~] T109 (Withdrawn) Parser fixtures for VAT, service charge, discounts, quantities, comma separators, and malformed OCR.
- [~] T110 (Withdrawn) Feed OCR results into the item review screen.
- [x] T111 Keep manual item and total entry as the only item-entry path.
- [x] T112 Add CSV export through the Storage Access Framework.
- [x] T113 Add JSON export through the Storage Access Framework.
- [x] T114 Include outings, items, assignments, coverage, shares, settlements, and roster in exports.
- [x] T115 Add export tests.
- [x] T116 Implement reopen/correct with confirmation and settlement warning.
- [x] T117 Write audit events with the adult profile and before/after values.
- [x] T118 Add audit tests.

## Phase 8: Release and validation

- [x] T119 Add release signing configuration and keystore instructions.
- [ ] T120 Add R8/ProGuard rules for Supabase, serialization, Room, and Hilt.
- [ ] T121 Review accessibility: 44dp targets, contrast, content descriptions, focus order.
- [x] T122 Review performance: first usable screen under 5 seconds and smooth item assignment. Measured cold start 416 ms on the S26 Ultra.
- [x] T123 Run the full instrumented smoke test on the Samsung S26 Ultra with Android 17 / One UI 9.0.
- [ ] T124 Verify the fixed Ledger Green palette in light and dark themes.
- [ ] T125 Verify offline creation, item assignment, finalization, settlement, and backup retry.
- [x] T126 Verify recap text/image sharing through the Android share sheet.
- [x] T127 Build the signed release APK.
- [x] T128 Update README and quickstart with build, Supabase, Google OAuth, and install instructions.

## Phase 9: Removed OCR hardening

- [~] T129 (Withdrawn) Return ML Kit `Text.Line` text plus bounding boxes as `OcrLine` and sort by top, then left.
- [~] T130 (Withdrawn) Parse `List<OcrLine>`; add multi-line item names and extended quantity patterns.
- [~] T131 (Withdrawn) Prioritise total labels and exclude subtotal/total VAT/total items/total qty; exclude VATable, VAT-exempt, VAT reg, and TIN from tax.
- [~] T132 (Withdrawn) Add item subtotal, difference, and reconciliation warnings to `ParsedReceipt`.
- [~] T133 (Withdrawn) Replace scanned items on rescan after a confirmation dialog; never append duplicates.
- [~] T134 (Withdrawn) Show a scan summary and reconciliation warning in the receipt step.
- [~] T135 (Withdrawn) Add fixture tests for VAT, service charge, discounts, multi-line names, two-column layout, missing total, and total mismatch.
- [~] T136 (Withdrawn) Debug-only raw OCR text export.
- [~] T137 (Withdrawn) Real-receipt OCR baseline.
- [~] T138 (Withdrawn) OCR gate review and Gemini Nano decision.
- [~] T139 (Withdrawn) ML Kit GenAI direct model access.
- [~] T140 (Withdrawn) Gemini Nano fallback tests.

## Phase 10: Manual-only ledger and item-sum total

- [~] T141 Amend the constitution, spec, plan, tasks, contracts, and docs for manual-only entry and the item-sum rule. (In progress)
- [x] T142 Remove the scan button, camera launcher, scan state, scan summary, replace dialog, and scan strings.
- [x] T143 Delete the OCR code and parser tests; remove ML Kit and coroutines-play-services; remove the FileProvider and `file_paths.xml`.
- [x] T144 Preserve legacy receipt rows/images; new writes null/zero/`MANUAL`; no migration.
- [x] T145 Add `TotalMode` and `syncTotalToItems`; call on amount-changing item mutations.
- [x] T146 Remove tax/service/discount fields; stop OCR filling them.
- [x] T147 Wire split/finalize for zero new adjustments and stored legacy adjustments.
- [x] T148 Update review/recap labels and hide zero adjustments.
- [x] T149 Fix merge centavo preservation.
- [x] T150 Add tests for total state, item-sum rule, legacy, and merge.
- [ ] T151 Build, lint, test, install, and verify on the S26.

## Dependencies

- Phase 1 depends on Phase 0.
- Phase 2 can start after Phase 1 project scaffolding.
- Phase 3 depends on Phase 2 domain models.
- Phase 4 depends on Phase 2 and Phase 3.
- Phase 5 depends on Phase 4 finalization and share data.
- Phase 6 depends on Phase 3 repository and Phase 4 settings UI.
- Phase 7 depends on Phase 4 and Phase 6 backup conventions.
- Phase 8 depends on all prior phases.

## Parallel Opportunities

- T023–T038 (money engine) can run alongside T039–T056 (Room) once domain models are defined.
- T057–T078 UI screens can be split across feature packages after navigation and theme are stable.
- T080–T084 recap work can run alongside T086–T105 backup work.
- T112–T118 history/export/audit can be split after the core ledger is stable.

## Implementation Strategy

1. Reset the repository and scaffold the Android project.
2. Build and test the pure Kotlin money engine first.
3. Add Room and repositories, then the Compose core ledger.
4. Add recap sharing.
5. Add Google auth and Supabase snapshot backup/restore.
6. Add manual entry, history/export, and audit.
7. Release and validate on the physical device.

## Notes

- No web, PWA, iPhone, Capacitor, or React work remains.
- No fairness score or auto-balance tasks exist by design.
- Receipt images are not captured or backed up.
- Restore is empty-database-only.
- The physical device is the primary acceptance target.
- T022/T122/T123/T126/T127: verified on a connected SM-S948B (Android 17 / API 37 / One UI 9.0) on 2026-11-07 - install, four profiles, student roster, the itemized PHP 825 case (CP 451 / Mai 308 / Kent 33 / Llanmer 33), ledger payment + void, recap text/image, CSV export, Google sign-in, Supabase backup, and clear-then-restore round trip. Cold start 416 ms.
- Still open: T120 (R8 rules review under a real release build on device), T121 accessibility pass, T124 light theme check, T125 offline + backup retry.
- Release APK is built with debug signing until `keystore.properties` is added.
