# Research Notes: Salo — Android Meal Ledger

**Feature**: `001-salo-expense-sharing` | **Date**: 2026-11-07

This document records the technical and product decisions behind the revised Android-only plan.

## 1. Platform: Android-only native Kotlin

**Decision**: Build a native Android app in Kotlin with Jetpack Compose and Material Design 3.

**Rationale**:
- The app is used on one phone: the owner's Samsung S26 Ultra on Android 17 / One UI 9.0.
- The other adults do not install or sign in; they receive recaps.
- A native app removes the React/Capacitor runtime, PWA limitations, and iPhone support burden.
- Compose + Material 3 gives the official Android Material 3 components and dynamic color.

**Alternatives rejected**:
- React + Capacitor + PWA: unnecessary web layer and iPhone support.
- Kotlin Multiplatform or Flutter: cross-platform complexity with no second platform to serve.
- XML Views: more boilerplate and less modern M3 support than Compose.

## 2. Architecture: single-activity Compose, MVVM, Room, Hilt

**Decision**: Single-activity Compose app with MVVM, repository layer, Room, Hilt, Coroutines/Flow,
Navigation Compose, and WorkManager.

**Rationale**:
- Small single-device app; a single Gradle module with package boundaries is sufficient.
- Room is reliable, testable, and offline-first.
- Hilt standardizes dependency wiring and test replacement.
- WorkManager is the right tool for retryable backup with network constraints.

**Alternatives rejected**:
- Multi-module Gradle: unnecessary overhead for this size.
- Manual dependency injection: more wiring and harder testing.
- SQLite without Room: more boilerplate and less type safety.

## 3. Money model: hybrid item assignment + shared per-head

**Decision**: Assign each item to one adult, one student, or shared. Shared items split per head.
Student items charge the covering adult. Tax/service/discount and total gaps are allocated
proportionally.

**Rationale**:
- Matches how a table orders food and how the group actually shares costs.
- Keeps per-head behavior for rice, appetizers, and table-wide charges.
- Preserves the exact-centavo guarantee with largest-remainder rounding.
- One person per item keeps the UI fast; the split tool handles shared portions.

**Alternatives rejected**:
- Pure per-head: ignores who ordered expensive items.
- Pure itemized: awkward for shared dishes and adjustments.
- Multiple assignees per item: more UI complexity; split the line instead.
- Item-specific discounts: global proportional allocation is simpler and sufficient.

## 4. Total reconciliation

**Decision**: The confirmed receipt total is authoritative. Item amounts determine allocation; any
gap is spread proportionally by largest-remainder rounding.

**Rationale**:
- OCR and hand-entered items are imperfect.
- The receipt total is what was actually paid.
- Proportional gap distribution preserves fairness and exact totals.

**Alternatives rejected**:
- Blocking on exact item/total equality: too brittle with OCR and rounding.
- Item sum as the final total: conflicts with the receipt.

## 5. Fairness removal

**Decision**: Remove fairness scores, fairness tallies, and automatic coverage suggestions.

**Rationale**:
- Item assignment already makes coverage explicit.
- The group is four adults; manual coverage is fast.
- Fairness scoring adds complexity without changing who owes what.

**Alternatives rejected**:
- Keep fairness for reporting: the owner does not want a fairness score.
- Auto-balance: unnecessary with item-level assignments and manual coverage.

## 6. Local storage: Room

**Decision**: Room with KSP, UUID string ids, `Long` centavos, and soft deletes.

**Rationale**:
- Strong offline support.
- Testable DAOs and migrations.
- Easy snapshot serialization for backup.

## 7. Backup: Supabase JSON snapshot

**Decision**: Store versioned JSON snapshots in a single `ledger_snapshots` table, scoped by
`user_id` with RLS. Back up after mutations; keep the latest N snapshots; restore only into an empty
local database.

**Rationale**:
- One device means row-level multi-device sync is unnecessary.
- A full snapshot is atomic, simple to validate, and easy to restore.
- JSONB handles schema evolution with a `schema_version`.
- RLS keeps the backup private to the owner.

**Alternatives rejected**:
- Relational row sync: conflict resolution and tombstones are unnecessary for one device.
- Supabase Storage files: JSONB is easier to query and version.
- Local-only: the owner explicitly wants private cloud backup.

## 8. Auth: Google Credential Manager + Supabase

**Decision**: Owner signs in with Google Credential Manager; exchange the ID token with Supabase
`signInWithIdToken`. Local use works without sign-in; sign-in is required only for backup/restore.

**Rationale**:
- One owner account; no other users.
- Credential Manager is the modern Android Google sign-in API.
- Supabase Auth integrates with the same account used for RLS.

**Alternatives rejected**:
- Email/password: extra credential to manage.
- Anonymous key: weaker account recovery.
- Multi-user group auth: explicitly removed.

## 9. OCR: ML Kit Text Recognition v2

**Decision**: System camera capture + ML Kit Text Recognition v2, on-device only. Parse items, quantities,
tax, service, discount, and total. Full item editing.

**Rationale**:
- On-device privacy.
- Good printed-text accuracy.
- No recurring cost.
- Existing parser logic can be ported.

**Alternatives rejected**:
- Tesseract.js: web-only.
- Cloud OCR: violates privacy and cost constraints.
- Manual-only: too slow at the table.

## 10. Sharing and export

**Decision**: Recap text/image through the Android share sheet with FileProvider. CSV/JSON export
through the Storage Access Framework.

**Rationale**:
- Native Android patterns; no storage permissions.
- Works with the group chat.
- No external service.

## 11. Android 17 / API 37

**Decision**: `compileSdk 37`, `targetSdk 37`, `minSdk 37`.

**Rationale**:
- The only target device is the S26 Ultra on Android 17.
- The installed SDK `android-37.0` is available.
- No backward compatibility work is needed.

**Risk**: Some libraries may not yet officially target API 37. Verify versions early and keep the
build reproducible.

## 12. Testing

**Decision**: Kotlin/JVM unit tests, Kotest property tests for money, Room DAO tests, Turbine
ViewModel tests, Compose UI tests, OCR parser fixtures, and an instrumented smoke test on the S26
Ultra.

**Rationale**:
- The money engine is the highest-risk area.
- The item assignment flow is the core UX.
- Physical-device validation covers One UI 9.0 and ML Kit.
