# Quickstart: Salo — Android Meal Ledger

**Feature**: `001-salo-expense-sharing`

This quickstart describes the native Android app after the Kotlin project is scaffolded. The
implementation is currently pending; the previous React/Capacitor app has been removed.

## Prerequisites

- Windows development machine with PowerShell.
- Android Studio with Android SDK Platform 37 (`android-37.0`) and build tools.
- JDK 21.
- Samsung S26 Ultra with Android 17 / One UI 9.0 and USB debugging enabled.
- Supabase project for private backup.
- Google Cloud OAuth client for the owner account.

## 1. Build and install

```powershell
.\gradlew.bat assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

Release build:

```powershell
.\gradlew.bat assembleRelease
```

The application id is `ph.salo.app`.

## 2. Supabase backup setup

1. Create a Supabase project.
2. Apply `supabase/migrations/0001_ledger_snapshots.sql`.
3. Confirm RLS is enabled on `public.ledger_snapshots`.
4. Disable sign-ups in Supabase Auth.
5. Provision the owner's Google account.
6. Put the project URL and anon key in `local.properties` or an ignored `secrets.properties` file.
   Never commit the service-role key.

Expected table:

```text
public.ledger_snapshots
- id uuid
- user_id uuid
- schema_version integer
- payload jsonb
- device_id text
- created_at timestamptz
```

## 3. Google sign-in setup

1. Create an Android OAuth client for `ph.salo.app` with the debug/release SHA-1.
2. Create a Web OAuth client for Supabase's Google provider.
3. Configure Supabase Auth → Google with the web client id/secret.
4. Add the Supabase callback URL to the Google OAuth client.
5. Restrict the app to the owner's email.

Local ledger use works without sign-in. Sign-in is required only for backup and restore.

## 4. Manual validation scenarios

### S1 — Adult and student items

1. Create an outing for today.
2. Enter a receipt total of ₱825.
3. Add items: CP ₱200, Mai ₱100, Ana ₱150, Ben ₱120, shared rice ₱180.
4. Assign Ana to CP and Ben to Mai.
5. Mark Ana and Ben present (or let item assignment mark them).
6. Add tax of ₱75.
7. Review the split.
8. Select CP as payer and finalize.
9. Tap **Share recap** and send the text or image.

**Expected**: each item is charged correctly; shared rice is split across 6 heads; tax is
proportional; the four shares sum exactly to ₱825; the recap matches the finalized split.

### S2 — Shared-only items

1. Create an outing with a ₱1,000 total and one shared item.
2. Mark two students present and assign them to adults.
3. Finalize.

**Expected**: the ₱1,000 is split per head across 6 people, with each student's share charged to
their covering adult; the shares sum exactly to ₱1,000.

### S3 — No items

1. Create an outing with a total and no items.
2. Mark students present and assign coverage.
3. Finalize.

**Expected**: the per-head fallback runs and the shares sum exactly.

### S4 — Total mismatch

1. Enter items that sum to ₱700 but a receipt total of ₱750.
2. Finalize.

**Expected**: the ₱50 gap is distributed proportionally; the shares sum exactly to ₱750.

### S5 — Discount

1. Enter items, tax, service charge, and a discount.
2. Finalize.

**Expected**: the discount is allocated proportionally; the exact total is preserved.

### S6 — Unassigned item

1. Leave one item unassigned.
2. Try to finalize.

**Expected**: finalization is blocked and the unassigned item is identified.

### S7 — Student without coverage

1. Assign an item to a student.
2. Leave the student without a covering adult.
3. Try to finalize.

**Expected**: finalization is blocked and the student is identified.

### S8 — Offline backup

1. Turn off Wi-Fi and mobile data.
2. Create and finalize an outing.
3. Turn connectivity back on.

**Expected**: the outing finalizes locally; the backup status shows local-only/queued; the snapshot
uploads when connectivity returns.

### S9 — Restore

1. Back up a ledger.
2. Clear the app's local data or reinstall.
3. Sign in with the authorized Google account.
4. Restore.

**Expected**: outings, items, assignments, shares, and settlements are restored; receipt photos are
not restored and the UI explains why.

### S10 — Restore blocked

1. Keep local data.
2. Attempt to restore.

**Expected**: restore is blocked until the owner exports or clears local data.

### S11 — Unauthorized account

1. Sign in with a different Google account.
2. Attempt to access the backup.

**Expected**: access is denied and no snapshot is returned.

### S12 — OCR

1. Scan a clear printed receipt.
2. Review the extracted items.
3. Correct one item.
4. Assign items and finalize.

**Expected**: OCR stays on-device; items are editable; manual fallback works.

## 5. Quality gates

```powershell
.\gradlew.bat test
.\gradlew.bat connectedAndroidTest
.\gradlew.bat lint
.\gradlew.bat assembleDebug
```

Before release, run the instrumented smoke test on the S26 Ultra and verify dynamic color, dark
theme, offline behavior, backup/restore, and recap sharing.
