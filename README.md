# Salo

Salo is a shared group meal ledger: a single installable PWA with an iPhone-first shell on iOS and a
Material 3 shell on Android. A group records an outing, marks which adults and students attended,
charges every item to the person or people who consumed it, and keeps a running ledger of who owes
whom until it is settled.

The item sum is the bill. A typed total is an explicit override. Settlements are recorded by the payer
and confirmed by the recipient. Groups, invitations, present adults, live activity, and private
offline drafts are part of the shared product.

## Status

**Specs hardened; implementation not started.** The active feature is
[`specs/002-salo-pwa`](specs/002-salo-pwa/spec.md). The previous Android app is archived in
[`specs/001-salo-expense-sharing`](specs/001-salo-expense-sharing/spec.md); its code will move to
`archive/android/` when implementation begins. The old local database is kept as an unlisted backup;
there is no migration into the shared product.

## Product decisions

- **Platform**: one installable PWA. Browser install on iPhone (Safari 16.4+) and Android (Chrome).
  No native app, TWA, or store listing in v1.
- **UI**: iPhone-first shell on iOS; Material 3 shell on Android. Shared information architecture and
  domain rules. Manual appearance override.
- **Identity**: sign-in required. Google OAuth or email one-time code. No Sign in with Apple in v1.
  Every adult has an account; students do not. Pending adults are allowed until they join.
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
- Full design system: [`DESIGN.md`](DESIGN.md).
- Product context: [`PRODUCT.md`](PRODUCT.md).

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
