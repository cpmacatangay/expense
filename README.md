# Salo

Salo is a shared group meal ledger: a single installable PWA with an iPhone-first shell on iOS and a
Material 3 shell on Android. A group records an outing, marks which adults and students attended,
charges every item to the person or people who consumed it, and keeps a running ledger of who owes
whom until it is settled.

The item sum is the bill. A typed total is an explicit override. Settlements are recorded by the payer
and confirmed by the recipient. Groups, invitations, present adults, live activity, and private
offline drafts are part of the shared product.

## Status

**M2 finalization complete.** The active feature is
[`specs/002-salo-pwa/spec.md`](specs/002-salo-pwa/spec.md). The previous Android app and its legacy
Supabase migrations are archived in [`archive/android/`](archive/android/); signing and SDK secrets
live in the ignored `.secrets/` folder.

Implemented: the PWA scaffold, platform shells, tokens, routing, PWA manifest, tests, CI, Vercel
deployment, Supabase project, M1 migrations/RLS, Google sign-in, group creation, invite codes,
joining, students, the M2 schema, outing drafts, attendance, items, live share preview, and
owner-only server-side finalization through an Edge Function that writes immutable shares and an
activity event atomically. Next: ledger and settlements, reopen, activity feed, recap/export/QR, and
offline/realtime. The old local database is kept as an unlisted backup; there is no migration into the
shared product.

## Product decisions

- **Platform**: one installable PWA. Browser install on iPhone (Safari 16.4+) and Android (Chrome).
  No native app, TWA, or store listing in v1.
- **UI**: iPhone-first shell on iOS; Material 3 shell on Android. Shared information architecture and
  domain rules. Manual appearance override.
- **Identity**: sign-in required. Google OAuth or email one-time code. No Sign in with Apple in v1.
  Every adult has an account; students do not. Pending adults are allowed until they join.
- **Homepage nickname**: four predetermined people get a preset nickname shown only in the Home
  greeting. Every money surface — rosters, payer, shares, ledger, activity, recaps, exports — keeps
  the exact `display_name`.
- **Groups**: 2–12 adults; one owner per group; owner is the only admin in v1. A user may own one
  group and join many. Group switcher on Home.
- **Invitations**: share link plus short code, bound to a pending adult, revocable and expiring.
- **Money**: present adults and students per outing; one present payer; item-sum rule; Auto/Manual/
  Fixed total; no tax, service charge, discount, or printed-receipt reconciliation.
- **Settlements**: payer records; recipient confirms or declines with a note; only confirmed amounts
  affect balances.
- **Payment QR**: one private QR per group adult, shown on Home, Ledger, and finalized outings for
  scanning with the member's banking app; display-only, never in recaps or exports.
- **Collaboration**: live updates; shared edits require connectivity; stale writes are rejected.
  Private drafts are local-first and visible only to the author and owner until published.
- **Activity**: full activity feed with actor and before/after values for sensitive changes.
- **Export**: owner exports the full group; a member exports their own data.
- **Students**: owner manages the roster; members mark present and set coverage.
- **Recap**: text plus a portrait image; no invite link or QR code.
- **Currency/time**: Philippine pesos, English, Asia/Manila.
- **Notifications**: in-app only in v1.
- **Cost**: Supabase free tier, free static host and subdomain, free-tier transactional email. No
  Apple Developer Program, paid OCR, or store fees.

## Design

- **iPhone shell**: Apple-native, warm neutral ground, Ledger Green accent, grouped inset lists, one
  balance card, SF Pro, light-first, deep green-black/mint dark, a shared-table signature, initials.
- **Android shell**: Material 3 light-first, system dark, same green identity, Roboto.
- **Shared idea**: the table — member initials, group presence, and a balance that belongs to the
  group.
- **Prototypes**: iPhone at [`design/pwa-prototype/`](design/pwa-prototype/); Android Material 3 at
  [`design/pwa-prototype-android/`](design/pwa-prototype-android/). Static, same data, demo QR.
- **Preview states**: `?screen=welcome` for onboarding, `?screen=empty` for the first-outing empty state,
  and `?offline=1` for the offline banner and blocked shared writes.
- **Implemented**: S mark header, floating iPhone tab bar, confirm/record settlement split,
  permission-aware payment QR, item and review sheets, onboarding, offline/stale/declined/empty states,
  recap/export/QR management, and class-based motion with reduced-motion support.
- Full design system: [`DESIGN.md`](DESIGN.md).
- Product context: [`PRODUCT.md`](PRODUCT.md).

## Production app

The repository root is now the shared PWA. The native Android app is archived at
[`archive/android/`](archive/android/); its signing and SDK files live in the ignored `.secrets/` folder.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

- iPhone shell: http://127.0.0.1:5173/
- Android shell preview: http://127.0.0.1:5173/?platform=android
- Onboarding skeleton: http://127.0.0.1:5173/welcome
- Production: https://salo-pi.vercel.app

**Status**: M0 foundation only. The shell, platform tokens, routing, PWA manifest, tests, and CI exist.
Auth, groups, the live ledger, and the new Supabase migrations are next.

Commands: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`.

## Architecture

- Vite + React + TypeScript PWA.
- Supabase Auth, Postgres, Row-Level Security, Realtime, and Edge Functions.
- Dexie/IndexedDB for cached reads and private drafts.
- `vite-plugin-pwa` and Workbox for the installable shell.
- Vercel free tier with a `*.vercel.app` subdomain.
- Resend free tier as custom SMTP for email one-time codes.
- Pure TypeScript money engine shared by the client preview and the server finalization function.

See [`specs/002-salo-pwa/plan.md`](specs/002-salo-pwa/plan.md) for the full plan.

## Repository layout

```text
app/                             archived Android app (moves to archive/android/)
gradle/                          archived Android build tooling
specs/
  001-salo-expense-sharing/      superseded Android spec and Material 3 design
  002-salo-pwa/                  active shared-PWA spec, plan, tasks, contracts
.specify/                        Spec Kit scaffolding and constitution 4.0.0
PRODUCT.md                       product context
DESIGN.md                        PWA design system
```

The PWA will live at the repository root once implementation starts: `src/`, `public/`, `supabase/`,
`tests/`, `package.json`, and `vite.config.ts`.

## Documentation

- Product spec: [`specs/002-salo-pwa/spec.md`](specs/002-salo-pwa/spec.md)
- Technical plan: [`specs/002-salo-pwa/plan.md`](specs/002-salo-pwa/plan.md)
- Research: [`specs/002-salo-pwa/research.md`](specs/002-salo-pwa/research.md)
- Data model: [`specs/002-salo-pwa/data-model.md`](specs/002-salo-pwa/data-model.md)
- Contracts: [`specs/002-salo-pwa/contracts/`](specs/002-salo-pwa/contracts/)
- Quickstart: [`specs/002-salo-pwa/quickstart.md`](specs/002-salo-pwa/quickstart.md)
- Tasks: [`specs/002-salo-pwa/tasks.md`](specs/002-salo-pwa/tasks.md)
- Constitution: [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Privacy and cost

- No receipt images, OCR, or LLM extraction.
- Student records are a display name and optional notes only.
- No analytics, ad SDKs, or tracking.
- Group data is isolated by row-level security.
- Only the owner can export the full group; a member can export their own data.
- Free-tier services only; any new recurring cost requires explicit approval.

## Archived Android app

The Kotlin/Compose app is no longer a maintained client. Its spec is preserved at
[`specs/001-salo-expense-sharing/spec.md`](specs/001-salo-expense-sharing/spec.md), its Material 3
design at
[`specs/001-salo-expense-sharing/DESIGN-android.md`](specs/001-salo-expense-sharing/DESIGN-android.md),
and its code will be moved to `archive/android/` with git history retained. The installed APK remains
on the owner's phone until the PWA reaches parity; the old local database is kept as a backup.
