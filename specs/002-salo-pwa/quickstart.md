# Quickstart: Salo Shared PWA

**Feature**: `002-salo-pwa` | **Date**: 2026-11-09

This is a validation guide, not an implementation dump. It proves the PWA works end to end on iPhone
and Android.

> **Current status (export and recap):** the shared shell, auth, groups, students, outing drafts,
> attendance, items, live share preview, owner-only server-side finalization, the shared ledger with
> balances and two-sided settlements, owner-only reopening, the full activity feed, owner/member
> exports, and text-plus-image recaps are implemented. Email sign-in is hidden in production until a
> verified sending domain exists; Google sign-in is live. History filters, payment QR storage, and
> offline/realtime are next. The old Kotlin app and its Supabase migrations are archived under
> `archive/android/`; the new tables are isolated from the legacy `ledger_snapshots` backup table.

## Prerequisites

- Node 22+ and npm.
- Supabase CLI.
- A new Supabase project (free tier).
- A Google Cloud project with an OAuth web client.
- A Resend account (free tier) for custom SMTP.
- A Vercel account (free tier) for hosting and a `*.vercel.app` subdomain.
- An iPhone with Safari 16.4+ and an Android phone with current Chrome.

## 1. Local setup

```powershell
npm install
Copy-Item .env.example .env.local
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
supabase link --project-ref <project-ref>
supabase db reset
npm run dev
```

**Current project**

- Project ref: `rfbnpkhzmxktpkmuhqyf`
- Project URL: `https://rfbnpkhzmxktpkmuhqyf.supabase.co`
- Local `.env.local` is configured with the publishable key and is ignored by Git.
- Production origin: `https://salo-pi.vercel.app` (Vercel project `salo`). The local
  `supabase/config.toml` already lists it as `site_url` and in `additional_redirect_urls`. Run
  `supabase config push` after `supabase login` and `supabase link` to apply it remotely; that step
  needs your Supabase access token.

Expected: the app opens at `http://localhost:5173`, the shared shell appears, and the PWA manifest is
served. Sign-in arrives in M1.

## 2. Supabase setup

1. Create the new project.
2. Apply the migrations in `supabase/migrations/` in order. This includes the private `payment-qrs`
   bucket and its storage policies.
3. Enable Realtime for outings, items, shares, settlements, activity, and group adults.
4. Deploy the Edge Functions in `supabase/functions/`.
5. Set the Edge Function secrets (service-role key stays server-side).
6. Add the local, preview, and production origins to the Auth redirect allow-list.

## 3. Google OAuth

1. Create an OAuth web client in Google Cloud.
2. Add the Supabase callback URL as an authorized redirect URI.
3. Add the local, preview, and production origins as authorized JavaScript origins.
4. Enable Google in Supabase Auth with the client id and secret.
5. Verify the redirect returns to the app without a popup.

## 4. Email one-time code / magic link

1. Configure Resend as custom SMTP in Supabase Auth.
2. Verify the sender domain.
3. Customize the email template with the one-time code.
4. In the installed PWA, use the code path to avoid Safari handoff.

## 5. Vercel

1. Import the repository.
2. Set the Supabase URL and anon key for Production and Preview.
3. Add the production and preview origins to Supabase Auth redirect URLs.
4. Build with `npm run build` and output `dist`.
5. Confirm the service worker and manifest are served over HTTPS.

## 6. Commands

```powershell
npm run dev            # local app
npm run test           # Vitest
npm run test:e2e       # Playwright
npm run build          # production build
npm run preview        # preview the production build
npx lighthouse <url>   # PWA / performance
supabase db reset      # local database and migrations
supabase functions serve
```

## 7. Validation scenarios

### S1 — Create a group

1. Sign in with Google.
2. Create a group with a name and color.
3. Open Home.

**Expected**: the creator is the owner and first adult; the group switcher shows the group; the balance
card shows zero; the empty state offers an invite and a new outing.

### S2 — Invite and claim a pending adult

1. As the owner, create a pending adult "Mai" and invite her.
2. Copy the link and code.
3. Sign in as Mai on another device.
4. Open the link or enter the code; accept.
5. Verify both devices show the same group and the same adult.

**Expected**: Mai is active; the group has two adults; reusing the invite is rejected or returns the
existing membership.

### S3 — Record and finalize an outing

1. Create a shared draft.
2. Mark CP, Mai, and Ana present; cover Ana with CP.
3. Add items: CP ₱200, Mai ₱100, Ana ₱150, shared rice ₱180.
4. Verify the total is Auto and follows the item sum.
5. Type a different total; verify Manual.
6. Tap **Use items total**; verify Auto.
7. As the owner, finalize.
8. Verify the shares sum exactly to the total.

**Expected**: the non-owner cannot finalize; the present adults and students are the only ones in the
split; a stale write is rejected if another member changed the outing.

### S4 — Reopen and fixed total

1. Reopen the finalized outing as the owner.
2. Change an item.
3. Verify the saved total does not change.
4. Re-finalize.

**Expected**: the total stays fixed; reopening warns if settlements exist; activity records the
reopen and re-finalize.

### S5 — Settlement pending, confirmed, declined

1. As the payer, record a partial payment to Mai.
2. As Mai, open Ledger and confirm it.
3. Verify the confirmed balance changes exactly.
4. Record another payment; decline it with a note.
5. Verify the balance does not change and the declined record remains.

**Expected**: pending amounts are separate; only confirmed affects balances; the payer can void and
re-record.

### S6 — Pending adult settlement

1. Include a pending adult as payer in an outing.
2. Finalize.
3. Record a settlement for the pending adult as the owner.
4. Verify it remains pending until the adult joins and confirms.

**Expected**: confirmation is blocked for the pending adult; after claiming, they can confirm.

### S7 — Offline private draft

1. Go offline on the phone.
2. Create a private draft with items.
3. Verify it is visible only to the author and owner.
4. Go online and publish.
5. Verify it becomes a shared draft exactly once.

**Expected**: shared writes are disabled offline; the draft persists; publishing is idempotent.

### S8 — Activity and export

1. Invite, finalize, confirm a settlement, and reopen.
2. Open Activity; verify the actor and before/after values.
3. As the owner, export CSV and JSON.
4. As a member, export your own data.

**Expected**: owner export contains the full group; member export contains only their data; no
cross-group rows.

### S9 — Recap

1. Open a finalized outing.
2. Share the text and the image.
3. Verify the group name, total, shares, payer, and settlement lines.
4. Verify no invite link or QR code appears.

**Expected**: the recap matches the snapshot; the share sheet works or the fallback copies/downloads.

### S10 — Platform shells and install

1. Open the app on an iPhone; install via Add to Home Screen.
2. Open the installed app; verify the iPhone shell and safe areas.
3. Open on Android; install from Chrome.
4. Verify the Material 3 shell.
5. Change Appearance to the other shell; verify data and group state do not change.

**Expected**: both shells show the same data; the override is remembered; the app works offline for
cached reads.

### S11 — RLS denial

1. As a member of group A, attempt to read group B's outing by id and by route.
2. Attempt to invite, finalize, reopen, or export the full group as a non-owner.
3. Attempt to confirm a settlement addressed to someone else.

**Expected**: every attempt is denied; no group B data is revealed.

### S12 — Owner lifecycle

1. Soft-remove a member with a balance; verify history remains.
2. Transfer ownership to another active adult.
3. Archive the group; verify members lose access.
4. Restore the group as the owner.
5. Soft-delete with confirmation; restore within the retention window.

**Expected**: no ownerless group; history retained; access changes correctly.

### S13 — Payment QR

1. As an active adult, upload a PNG payment QR and label.
2. As another member, open a debt row on Home and the Ledger; verify the payee's QR appears.
3. Scan it with a banking app; return to Salo.
4. Record the settlement; as the payee, confirm it.
5. Verify scanning did not change the ledger by itself.
6. Remove the QR; verify the "Ask the payee" fallback and that the settlement can still be recorded.
7. Try to open the QR as a non-member or from a public URL; verify denial.
8. Generate a recap and export; verify no QR image, path, or label appears.

**Expected**: the QR is private, display-only, scannable, and never part of a recap or export.

## 8. Release checks

- `npm run test`, `npm run test:e2e`, `npm run build` pass.
- Lighthouse PWA installability passes.
- The manifest, icons, and service worker are served over HTTPS.
- iPhone Safari (installed and browser) and Android Chrome pass S1–S13.
- RLS tests pass for every table, including payment QR storage and signed URL denial.
- The money property tests pass across 2–12 adults and 0–10 students.
- A payment QR is scannable by at least one major Philippine banking or e-wallet app; no recap or export contains a QR image, path, or label.
- No service-role key or secret appears in the client bundle.
- The old Android app remains available until parity; the local database is backed up before
  uninstalling.
