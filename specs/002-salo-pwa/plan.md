# Implementation Plan: Salo Shared PWA

**Branch**: `002-salo-pwa` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-salo-pwa/spec.md`

## Summary

Salo becomes one installable PWA for shared group meal ledgers. The same application ships an
iPhone-first shell on iOS and a Material 3 shell on Android, backed by a new isolated shared backend.
The product supports accounts, 2–12 adult groups, pending adults, invitations, present adults and
students per outing, the item-sum money rule, owner-only finalization, confirmed settlements, live
activity, private offline drafts, export, a recap card, and a private payment QR per adult that members
can scan with their banking app.

The archived Android app is not a maintained client. Its code is moved under `archive/android/` and
its local database is kept as an unlisted backup. There is no migration into the shared product.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22+, ES2022

**Primary Dependencies**: React 19, Vite 7, React Router, TanStack Query, Supabase JS, Dexie,
`vite-plugin-pwa`, Zod, `@supabase/ssr` where applicable

**Storage**: Supabase Postgres as the shared source of truth; IndexedDB (Dexie) for cached reads and
private drafts; a private Supabase Storage bucket for payment QR images; no receipt-image storage

**Backend**: Supabase Auth, Postgres, Row-Level Security, Realtime, Edge Functions; new isolated
project

**Authentication**: Google OAuth and email one-time code/magic link through Supabase Auth; redirect
flow with PKCE; custom SMTP (Resend free tier); no Apple sign-in in v1

**Testing**: Vitest + Testing Library, Playwright, Supabase CLI local stack for RLS and function
tests, Lighthouse, axe, iPhone Safari and Android Chrome manual checks

**Target Platform**: Installable PWA; iOS Safari 16.4+; current Android Chrome; iPhone 390px and
430px widths; Android 360px and 412px widths

**Project Type**: Single web application with a shared domain and two platform shells

**Performance Goals**: First usable screen under 3 seconds on 4G; interactions under 100ms; live
updates under 2 seconds at p95

**Constraints**: Online shared writes; offline reads and private drafts; group isolation; PHP and
Asia/Manila; free tiers only; no native app, TWA, store listing, Apple sign-in, push, OCR, or LLM

**Scale/Scope**: Friends-and-family scale: 2–12 adults and up to 10 active students per group;
dozens of outings per group; one owned group per user and any number of joined groups

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check |
|---|---|
| I. Money Correctness | Integer centavos; largest-remainder rounding; exact-total property tests for present adults, present students, shared items, manual overrides, and per-head fallbacks. |
| II. Shared by Design, Private by Default | Accounts for every adult; pending adults; accountless students; group-isolated row-level security; minimal student data; no analytics; no receipt images; private payment QR storage with no recap/export. |
| III. Connected Shared Edits | Backend is the source of truth; cached reads; private local drafts; online shared writes; stale writes rejected; explicit sync states. |
| IV. One PWA, Two Native Shells | One installable PWA; iPhone-first shell on iOS; Material 3 shell on Android; shared information architecture and domain; manual appearance override. |
| V. Explicit and Simple Money Rules | Present adults and students; one present payer; item sum authoritative; Auto/Manual/Fixed total; no tax/service/discount; no OCR/LLM; recipient-confirmed settlements. |
| VI. Auditable and Reversible | Immutable share snapshots; reopen with warning and activity; append-only settlement history; soft removal; owner export; group archive and soft delete. |
| VII. Owner-Controlled, Member-Collaborative | One owner and no other admins in v1; owner invites, manages students, finalizes, reopens, transfers, archives; members draft, edit, mark present, and record their own settlements. |
| VIII. Low-Friction on a Phone | Guided onboarding; four tabs; Home balance and pending actions; one-handed use; 44pt targets; sticky total; private drafts; under 3 minutes for 10 items. |
| IX. Zero Recurring Cost | Supabase free tier; Vercel free subdomain; Resend free tier; no Apple Developer Program; no paid OCR or sync. |

**Result**: PASS. No complexity exceptions required.

## Project Structure

### Documentation (this feature)

```text
specs/002-salo-pwa/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── recap-and-export.md
│   ├── settlements.md
│   ├── realtime-and-sync.md
│   ├── pwa-platform.md
│   ├── auth-and-groups.md
│   ├── money-engine.md
│   └── payment-qr.md
├── checklists/
│   ├── requirements.md
│   └── security.md
└── tasks.md
```

### Source Code (repository root)

```text
.
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── splash/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── AppShell.tsx
│   ├── platform/
│   │   ├── PlatformProvider.tsx
│   │   ├── detectPlatform.ts
│   │   ├── ios/
│   │   │   ├── iOSTokens.css
│   │   │   ├── IOSShell.tsx
│   │   │   └── components/
│   │   └── android/
│   │       ├── androidTokens.css
│   │       ├── AndroidShell.tsx
│   │       └── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── groups/
│   │   ├── members/
│   │   ├── students/
│   │   ├── outings/
│   │   ├── ledger/
│   │   ├── settlements/
│   │   ├── payments/
│   │   ├── activity/
│   │   ├── recap/
│   │   └── settings/
│   ├── domain/
│   │   ├── money/
│   │   ├── outings/
│   │   ├── settlements/
│   │   ├── totals/
│   │   └── validation/
│   ├── data/
│   │   ├── supabase/
│   │   ├── cache/
│   │   ├── drafts/
│   │   ├── paymentQr/
│   │   └── realtime/
│   ├── ui/
│   │   ├── tokens/
│   │   └── primitives/
│   └── styles/
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   ├── functions/
│   │   ├── finalize-outing/
│   │   ├── reopen-outing/
│   │   ├── record-settlement/
│   │   ├── confirm-settlement/
│   │   └── decline-settlement/
│   └── seed.sql
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── archive/
│   └── android/              # moved Kotlin app; not maintained
├── specs/
│   ├── 001-salo-expense-sharing/   # superseded
│   └── 002-salo-pwa/
└── .specify/
```

**Structure Decision**: The repository root becomes the PWA project. The Android Kotlin app, Gradle
wrapper, and Android-only configuration are moved to `archive/android/` at the start of implementation;
git history remains the canonical archive. The installed Android APK remains on the phone until PWA
parity, then it is uninstalled. Secrets such as `keystore.properties` are not copied into the archive.

## Architecture Decisions

### 1. One codebase, two platform shells

A single React application owns routing, data, domain logic, validation, and screen composition. The
visual layer is selected by a `PlatformProvider`:

- `ios`: Apple-native primitives, SF Pro via `-apple-system`, grouped inset lists, large titles,
  sheets, bottom tabs, safe-area handling.
- `android`: Material 3 primitives, Roboto, top app bar, navigation bar, cards, filled buttons,
  Material color roles.

`detectPlatform()` uses user-agent and touch heuristics; Settings offers an override. A small inline
script sets `data-platform` on `<html>` before hydration to avoid a flash of the wrong shell.

**Why**: One domain prevents money and permission drift; separate visual primitives keep each shell
native. A single shared design would compromise both platforms.

### 2. Backend source of truth, local cache and drafts

Supabase Postgres is authoritative. TanStack Query caches reads; Dexie stores an offline cache and
local private drafts. The service worker caches the app shell.

Shared writes require connectivity. A private draft is written to Dexie first and mirrored to the
server as a `private_draft` outing when online. Only its author and the owner may read it until it is
published.

**Why**: Shared offline writes would require conflict resolution over money data. Local drafts keep
the table-side flow without corrupting the shared ledger.

### 3. Relational schema with group-isolated RLS

Tables: `profiles`, `groups`, `group_adults`, `invitations`, `students`, `outings`,
`outing_adults`, `outing_students`, `items`, `shares`, `settlements`, and `activity_events`.

Every group-scoped table carries `group_id`. RLS policies enforce:

- members read their groups;
- the owner performs owner-only writes;
- members write shared drafts and items while the outing is editable;
- the recipient alone confirms or declines a settlement;
- private drafts are visible only to the author and owner;
- no row from another group is readable or writable.

`group_adults` is both membership and adult identity. A pending adult has `profile_id = null`; a
joined adult has a profile. A soft-removed adult keeps the row with a removed status and history.

**Why**: A normalized schema is required for multi-user access, realtime, and auditable state. The
old single-owner JSON snapshot cannot express membership or permissions.

### 4. Server-authoritative money finalization

The pure TypeScript money engine lives in `src/domain/money`. A Supabase Edge Function imports the
same module and owns finalization: it verifies the caller is the owner, validates attendance and
assignments, computes shares, writes the immutable `shares`, sets the outing status, and records the
activity event in one transaction-like sequence. The client uses the same engine for the preview.

**Why**: A client-computed split could be tampered with. Sharing one engine between the preview and
the server keeps the preview and the snapshot identical while making the server authoritative.

### 5. Optimistic concurrency and realtime

`outings` carries a `version` integer. Every shared write sends the expected version; the server
increments it and rejects a stale write. The client refreshes and shows the latest data. Supabase
Realtime broadcasts outing, item, share, settlement, activity, and membership changes.

**Why**: "Online shared edits" still has races. Rejecting stale writes is simpler and safer than
last-write-wins for money data.

### 6. Auth: Google plus email, no Apple

Supabase Auth supports Google OAuth and email one-time codes/magic links. OAuth uses a redirect with
PKCE, never a popup. The email path is implemented as a one-time code in the installed PWA to avoid
magic-link handoff problems between Safari and the home-screen app. Production email uses Resend's
free tier as custom SMTP.

**Why**: Apple sign-in requires an Apple Developer Program membership, which conflicts with the
zero-recurring-cost principle. Google and email cover the group without that fee.

### 7. Invitations bound to pending adults

The owner creates a pending adult and an invitation. The invite contains a random token (stored
hashed) and a short code (stored hashed) for manual entry. Accepting it links the signed-in account to
the pending adult, marks the adult active, and consumes the invitation. Invitations expire and can be
revoked. Capacity is enforced at 12 adults.

**Why**: Group membership must be controlled, and every adult identity must be claimable without
allowing open joins.

### 8. Settlement state machine

Settlements move through `pending`, `confirmed`, `declined`, and `void`. The payer records; the
recipient confirms or declines with a note; only confirmed affects balances. The owner can record for
a pending adult, but confirmation waits. A settlement cannot exceed the confirmed outstanding
balance, and the payer and payee must differ.

**Why**: Shared money needs a two-sided record. A unilateral settlement would let one member change
another member's balance.

### 9. Activity and audit

`activity_events` records group-scoped actions with actor, subject, action, and before/after JSON for
sensitive changes. Events are written by Edge Functions or database triggers. The feed is paginated
and available to every active member.

**Why**: Members need a clear answer to "who changed this?" and reopened outings need an audit trail.

### 10. Platform-adaptive design system

Shared tokens cover color roles, spacing, radius, elevation, and type scale. Each shell maps those
roles to its platform:

- iPhone: warm neutral ground, Ledger Green accent, SF Pro, grouped lists, one balance card, quiet
  iOS motion, shared-table signature.
- Android: Material 3 light-first, system dark, same green identity, Roboto, M3 components.

The design-taste-frontend app-screen process will deal the iPhone direction; the Material 3 shell
will follow the archived Android design language.

### 11. Hosting and delivery

Vite static build hosted on Vercel's free tier with a `*.vercel.app` subdomain. Supabase Auth redirect
URLs are allow-listed for the production and preview domains. The PWA manifest, service worker, icons,
and iOS splash images are build artifacts.

**Why**: Free, stable, and sufficient for a friends-and-family product. Preview deployments make
review easy.

### 12. Private payment QR images

Each group adult may store one primary payment QR image and a short label. Images live in a private
Supabase Storage bucket at `{group_id}/{adult_id}/qr`, are served only through short-lived signed URLs,
and are never public. Members can display the payee's QR from the Home balance card and debt rows, the
Ledger pay sheet, and
the finalized outing detail. Salo does not scan QR codes; the member scans with their banking app.
Payment QRs are excluded from recaps, exports, and activity payloads. A soft-removed adult's QR is no
longer served.

**Why**: The QR is the most convenient way to pay in the Philippines, but it is a static payment
credential. A public URL or a recap image would leak it outside the group.

## UI/UX Flow

1. **Sign in**: Google or email one-time code.
2. **Onboarding**: create a group or join through an invite; claim a pending adult; invite others.
3. **Home**: group switcher, balance card ("you owe" / "you are owed"), pending settlement
   confirmations, recent outings, and a primary "New outing" action.
4. **New outing**: one scrolling screen with date/place/notes, present adults, present students,
   items, sticky total, and review. Item entry opens in a sheet. The owner finalizes; members can
   draft and edit.
5. **Outing detail**: finalized shares, item assignments, settlement suggestions, recap, activity,
   and owner-only reopen.
6. **Ledger**: group net balances, pairwise who-owes-whom, settlement history, and record/confirm
   flows. A debt row opens a "Scan to pay" sheet with the payee's QR and amount.
7. **Payment QR**: an adult uploads one primary QR image and label; the payee's QR is reachable from
   Home balance card and debt rows, Ledger, and the finalized outing detail. Missing-QR, replaced-QR, offline, and
   removed-adult states are explicit.
8. **Activity**: newest-first feed with actor, action, and before/after for sensitive changes.
9. **Settings**: group, members and invites, students, appearance override, export, account, sign out.
10. **States**: loading, empty, offline, connecting, syncing, private draft, pending settlement,
   declined settlement, stale write, no payment QR, and error.

## Testing Strategy

- **Money engine**: Vitest unit tests and property tests for exact totals, present adults, present
  students, shared items, manual overrides, per-head fallback, and rounding.
- **Totals**: auto-follow, manual override, use-items-total, fixed reopen, merge centavo exactness.
- **Settlements**: pending/confirmed/declined/void transitions, overpayment, duplicate warning,
  recipient-only confirmation, pending-adult confirmation wait.
- **Payment QR**: upload validation, private bucket policies, signed-URL expiry, group-only access,
  missing-QR fallback, removed-adult denial, and exclusion from recaps/exports.
- **Backend**: Supabase local stack for RLS (cross-group denial, owner/member/recipient rules),
  invitation claim, ownership transfer, soft removal, finalize/reopen Edge Functions.
- **Playwright**: onboarding, create/join group, outing flow, settlement flow, activity, export,
  recap, offline draft, platform shells, appearance override.
- **PWA**: manifest, service worker, offline shell, installability, Lighthouse.
- **Manual**: iPhone Safari (installed and browser), Android Chrome, safe areas, Dynamic Type,
  reduced motion, screen reader, poor connectivity.
- **Accessibility**: axe plus manual keyboard and screen-reader checks.

## Milestones

### M0 — Repository and foundation

- Move the Android app to `archive/android/`; keep git history and the installed APK.
- Scaffold the PWA, TypeScript, Vite, routing, tokens, testing, and CI.
- Create the new Supabase project, local stack, and hosting project.

### M1 — Identity, groups, and invitations

- Auth, profiles, onboarding, group creation, group switcher.
- Pending adults, invitations, claim, soft removal, ownership transfer, archive.
- RLS and membership tests.

### M2 — Outings and money

- Present adults/students, items, assignments, total modes, review, finalize/reopen.
- Shared drafts, private drafts, publish, stale-write handling.
- Money engine, Edge Function finalization, property tests.

### M3 — Ledger, settlements, and activity

- Balances, pairwise debts, settlement record/confirm/decline, pending vs confirmed.
- Payment QR upload, private storage, and the "Scan to pay" sheet on Home, Ledger, and outing detail.
- Activity feed and audit events.
- Export and recap.

### M4 — Platform shells and PWA

- iPhone-first shell; Material 3 shell; appearance override.
- Install guidance, offline cache, service worker, safe areas, Dynamic Type, reduced motion.
- Accessibility and performance pass.

### M5 — Release and archive

- RLS audit, E2E suite, iPhone/Android device validation.
- Archive Android, uninstall the APK after parity, keep the local DB backup.
- Update README, PRODUCT, DESIGN, and the feature spec.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Scope is a platform rewrite, not a PWA port | Phase by milestone; ship M1–M2 before the Android shell; keep the Android app installed until parity. |
| Two shells drift | Shared domain and IA; platform tokens; visual regression tests at iPhone and Android widths; a manual appearance override. |
| iOS PWA limitations | In-app notifications only; online shared edits; private drafts; install guidance; email one-time code; no push in v1. |
| Auth redirect and email deliverability | Redirect + PKCE; one-time code; Resend custom SMTP; allow-list production and preview URLs; test on installed iPhone. |
| RLS bugs expose group data | Policy tests for every table; cross-group denial tests; security review before release; no service-role key in client. |
| Stale writes frustrate members | Version checks, refreshed data, clear "someone changed this" message, and retry. |
| Owner becomes a finalization bottleneck | Owner can finalize remotely; members can prepare shared drafts; product copy sets the expectation. |
| Free-tier limits | Monitor Supabase rows, realtime connections, and email volume; export and cleanup paths; no paid dependency without approval. |
| Money errors with present adults | Property tests across 2–12 adults, 0–10 students, shared and per-head cases; server-authoritative finalization. |
| Payment QR images leak or are scraped | Private bucket; short-lived signed URLs; group-only RLS; no recap/export; delete on soft removal; test public URL denial. |
| A bank app cannot scan the displayed QR | Show a large, high-contrast code with the payee name and label; keep the "Ask the payee" fallback and manual settlement. |
| Soft-deleted data is lost | Retention window; owner restore; export before purge; documented policy. |

## Complexity Tracking

No constitution violations. The shared backend, two shells, and realtime layer are justified by the
product decisions. The app is a single Vite project with package-level boundaries (`domain`, `data`,
`features`, `platform`, `ui`) rather than a multi-package monorepo, keeping the build simple while
preserving testability.
