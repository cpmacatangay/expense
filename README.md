# Salo

Salo is a shared group meal ledger: a single installable PWA with one Salo interface on iPhone and
Android. A group records an outing, marks which adults and students attended, charges every item to the
person or people who consumed it, and keeps a running ledger of who owes whom until it is settled.

The item sum is the bill. A typed total is an explicit override. Settlements are recorded by the payer
and confirmed by the recipient. Groups, invitations, present adults, live activity, and private
offline drafts are part of the shared product.

## Status

**Shared ledger complete.** The active feature is
[`specs/002-salo-pwa/spec.md`](specs/002-salo-pwa/spec.md). The previous Android app and its legacy
Supabase migrations are archived in [`archive/android/`](archive/android/); signing and SDK secrets
live in the ignored `.secrets/` folder.

Implemented: the PWA scaffold, the Salo shell, tokens, routing, PWA manifest, tests, CI, Vercel
deployment, Supabase project, M1 migrations/RLS, Google sign-in, group creation, invite codes,
joining, students, the M2 schema, outing drafts, attendance, items, live share preview,
owner-only server-side finalization through an Edge Function that writes immutable shares and an
activity event atomically, the shared ledger with exact balances, who-owes-whom transfers, and
two-sided settlement record/confirm/decline/void, owner-only reopening with a fixed total, the full
activity feed with actor and before/after details, owner and member exports as JSON or zipped CSV,
text plus portrait-image recaps, date/adult/student history filters, private per-adult payment QR
images with short-lived signed links, member removal/restore, ownership transfer, group
archive/delete/restore, live cross-device refresh, an offline state banner, pending-adult re-invites
and revokes, a student roster with rename/archive/reactivate, offline reads from a local cache, local
private drafts that publish or share with the owner idempotently, install guidance, a skip link, 44px
touch targets, and visible focus states. Next: device matrices and Lighthouse, then the remaining QA
passes. The old local database is kept as an unlisted backup; there is no migration into the shared
product.

## Product decisions

- **Platform**: one installable PWA. Browser install on iPhone (Safari 16.4+) and Android (Chrome).
  No native app, TWA, or store listing in v1.
- **UI**: one Salo interface on iPhone and Android. Shared information architecture, components, and
  domain rules; only safe areas and input behavior differ.
- **Identity**: sign-in required. Invite-gated Google OAuth or email one-time code; password sign-up is
  disabled. Every adult has an account; students do not. Pending adults are allowed until they join.
- **Homepage nickname**: an explicit, owner-managed nickname lookup. No personal email or name seed is
  stored in the repository. Every money surface keeps the exact `display_name`.
- **Groups**: 2–12 adults; one owner per group; owner is the only admin in v1. A user may own one
  group and join many. Group switcher on Home.
- **Invitations**: bound to the invited email and a pending adult, with an eight-character code,
  seven-day expiry, revocation, and bounded claim attempts.
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

- **Interface**: one Salo language — paper ground, ink chrome, Salo green only on data, Geist with Geist
  Mono for every figure, warm stone light and warm-black dark.
- **Signature**: the table split — one band showing exactly how a bill divides — and the balance
  printed as a ticket.
- **Density**: calm Home, dense Ledger, a focused 760px column on wide screens.
- **Components**: ticket balance, share band, ledger rows, ink primary actions, outlined secondary,
  compact text actions, the shared file field, and a native dialog payment QR sheet.
- **Implemented**: S mark header, one responsive shell (bottom tabs on a phone, a text nav on wide
  screens), confirm/record settlement split, permission-aware payment QR, item and review panels,
  onboarding, offline/stale/declined/empty states, recap/export/QR management, and class-based motion
  with reduced-motion support.
- **Legacy prototypes**: the earlier iPhone and Material 3 experiments remain in `design/` for
  reference; they are not the current system.
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

- App: http://127.0.0.1:5173/
- Android detection preview: http://127.0.0.1:5173/?platform=android (same interface)
- Production: https://salo-pi.vercel.app

**Status**: the shared PWA is implemented; see Status above. The design system is in `DESIGN.md`.

Commands: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`.
Database checks: `npx supabase start`, `npx supabase test db`.

Security model and hosted setup: [`SECURITY.md`](SECURITY.md).

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
- Group data is isolated by row-level security; member-writable outing columns are limited to
  presentation fields.
- Only the owner can export the full group; a member can export their own data.
- No personal email or name seed data is committed.
- Free-tier services only; any new recurring cost requires explicit approval.

## Archived Android app

The Kotlin/Compose app is no longer a maintained client. Its spec is preserved at
[`specs/001-salo-expense-sharing/spec.md`](specs/001-salo-expense-sharing/spec.md), its Material 3
design at
[`specs/001-salo-expense-sharing/DESIGN-android.md`](specs/001-salo-expense-sharing/DESIGN-android.md),
and its code will be moved to `archive/android/` with git history retained. The installed APK remains
on the owner's phone until the PWA reaches parity; the old local database is kept as a backup.
