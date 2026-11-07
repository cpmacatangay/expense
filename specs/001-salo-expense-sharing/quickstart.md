# Quickstart: Salo — Student Meal Expense Sharing

**Feature**: `001-salo-expense-sharing` | **Date**: 2026-11-07

This guide proves the feature works end to end. It describes setup and validation scenarios; it does
not contain implementation code.

## Prerequisites

- Node.js 22 LTS and npm 10+
- Supabase CLI and a Supabase project (or local Supabase stack)
- Android Studio with JDK 21 for the Capacitor Android build
- One Android phone and one iPhone for device validation
- A Google Cloud project with an OAuth consent screen and a web client ID
- A free Cloudflare Pages or Vercel account for the PWA deployment

## Environment

Create `.env.local` from `.env.example`:

```text
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

The service-role key is used only by local migration and seed scripts. It must never appear in a
`VITE_*` variable.

## Install and Run

```bash
npm install
npm run dev          # Vite dev server
npm run build        # production web/PWA bundle
npm run preview      # serve the production bundle locally
npm run lint
npm run typecheck
npm test             # Vitest unit and integration tests
npm run test:e2e     # Playwright PWA flows
```

## Supabase Setup

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase db seed
```

For a fully local stack:

```bash
supabase start
supabase db reset
```

The seed creates the group, the four adults (CP, Mai, Kent, and Llanmer), and a small sample roster. The seed
must be safe to run repeatedly and must not create duplicate members.

## Android Build

```bash
npm run build
npx cap sync android
npx cap open android
```

For a release APK:

```bash
cd android
./gradlew assembleRelease
```

The signed APK is the Android delivery artifact. It must install on a phone without a store listing.
The app must still work when the phone is in airplane mode after the first sign-in.

## PWA Deployment

```bash
npm run build
# deploy dist/ to Cloudflare Pages or Vercel
```

On iPhone: open the deployed URL in Safari → Share → Add to Home Screen. On Android: open in Chrome
→ Install app (or use the APK).

## Validation Scenarios

### S1 — Group and roster

1. Sign in as CP with Google.
2. Confirm the group has CP, Mai, Kent, and Llanmer.
3. Add students A, B, and C; archive C and reactivate it.
4. Sign in as Mai on a second device and confirm the roster appears.

**Expected**: exactly four adults, the roster syncs, and archived students remain visible in
history but not in the present-student picker by default.

### S2 — Manual per-head split

1. Create an outing dated today at "Test Restaurant."
2. Enter a total of ₱3,500 manually.
3. Mark students A, B, and C present.
4. Assign A and B to CP, C to Mai, and none to Kent or Llanmer.
5. Select CP as payer and finalize.

**Expected**: headcount 7, per-head ₱500, CP ₱1,500, Mai ₱1,000, Kent ₱500, Llanmer ₱500. The
shares sum to ₱3,500. The ledger shows Mai owes CP ₱1,000, Kent owes CP ₱500, and Llanmer owes CP
₱500.

### S3 — Uneven rounding

1. Create an outing with a total of ₱1,000 and three students present.
2. Assign the students across the four adults.
3. Finalize.

**Expected**: headcount 7, per-head displayed as ₱142.86, exact shares sum to ₱1,000 with no lost
centavo. Reloading the outing shows the same amounts.

### S4 — Receipt scan

1. From a new outing, tap "Scan receipt."
2. Grant camera permission and capture a clear printed receipt.
3. Review the extracted total, merchant, date, and line items.
4. Correct one line item and the total.
5. Finalize.

**Expected**: the total is extracted or easy to correct; the confirmed total is authoritative; line
items do not change the split; the receipt photo is visible to the other adults after sync.

### S5 — OCR failure fallback

1. Scan a blank or unreadable image.
2. Confirm the app offers retry and manual entry.
3. Enter the total manually and complete the outing.

**Expected**: no dead end; the outing finalizes with the manual total; the failed image is not sent
to any external service.

### S6 — Fairness auto-assignment

1. Finalize two outings where CP covers two students and Mai covers one.
2. Start a third outing with three students present.
3. Tap "Auto-balance."

**Expected**: the suggestion favors Kent and Llanmer before CP and Mai, based on cumulative
student-heads; every suggestion can be overridden; the final mapping still assigns each student to
exactly one adult.

### S7 — Partial settlement

1. From the ledger, record a ₱400 payment from Mai to CP.
2. Confirm the remaining balance decreases by ₱400.
3. Record the rest and confirm the balance reaches zero.
4. Void the second payment and confirm the balance returns.

**Expected**: partial payments work, balances recalculate exactly, and voided settlements are
excluded.

### S8 — Offline capture and sync

1. Put the Android phone in airplane mode.
2. Create, scan (or manually enter), assign, finalize, and settle an outing.
3. Confirm the app shows `local-only`.
4. Re-enable connectivity.

**Expected**: the entire flow works offline; the record survives an app restart; sync completes and
the other devices show the outing within 10 seconds.

### S9 — Recap and export

1. Open a finalized outing and share the recap.
2. Confirm both text and image are available.
3. Open reports, choose "This month," and export CSV and JSON.
4. Verify the exports contain the outing, coverage, shares, settlements, and roster.

**Expected**: the recap matches the finalized numbers; the image is readable at chat-preview size;
the exports are valid and complete.

### S10 — Installation

1. Install the APK on Android and launch it offline.
2. Add the PWA to the iPhone home screen and launch it standalone.
3. Sign in on both and confirm the same ledger.

**Expected**: both targets are installable without a paid store, launch in under 5 seconds, and show
the same finalized outings and balances.

## Manual Device Matrix

| Capability | Android APK | iPhone PWA |
|---|---|---|
| Camera capture | Native camera via Capacitor | File input with camera capture |
| Receipt OCR | ML Kit, offline | Tesseract.js, offline after model cache |
| Google sign-in | Native Google ID token | OAuth redirect |
| Share recap | Native share sheet | Web Share API with copy/download fallback |
| Offline | Full flow | Full flow after first load |
| Install | APK sideload | Add to Home Screen |

## Troubleshooting

- **Google sign-in fails on Android**: confirm the package name and SHA-1 in the Google Cloud
  Android client, and that Supabase accepts the ID token audience.
- **Google sign-in fails on the PWA**: add the deployed URL and `/auth/callback` to the Supabase
  redirect allow list.
- **No data appears**: check RLS membership and the `group_members.email` match.
- **Tesseract is slow or missing**: confirm `public/tessdata/eng.traineddata` is present and cached
  by the service worker.
- **Capacitor plugin missing**: run `npx cap sync android` after installing a native plugin.
- **Photos do not appear**: confirm the storage bucket is private, the path starts with the group
  id, and the signed URL has not expired.

## Definition of Done

- All ten validation scenarios pass on the target devices.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` pass.
- The money invariants hold for every finalized outing.
- No external OCR request is made.
- The PWA installs and works offline; the APK installs and works offline.
- The constitution gates are re-checked and pass.
