# Research: Salo Shared PWA

**Feature**: `002-salo-pwa` | **Date**: 2026-11-09

This document records the technical decisions behind the plan. The spec owns product behavior; this
document owns how the PWA is built.

## 1. Delivery model: PWA-only

**Decision**: Ship one installable PWA. Archive the native Android app and do not ship a TWA or store
listing in v1.

**Rationale**:
- One codebase and one release replace the Kotlin/Compose client.
- The core flows (manual entry, balances, settlements, recaps) do not require native APIs.
- Browser install is sufficient for a friends-and-family group.
- The existing Android app remains installed until PWA parity, then is uninstalled.

**Alternatives considered**:
- Native Android + PWA: two clients, two data layers, more drift.
- TWA wrapper: still a thin Android shell; adds Play Store setup without product value in v1.
- Capacitor: native wrapper with more build complexity; not needed.

## 2. Two platform shells, one application

**Decision**: A single React application with shared routing, data, domain, and screen composition.
Two visual shells are selected by platform: iPhone-first on iOS, Material 3 on Android.

**Rationale**:
- Users expect native conventions on each platform.
- The domain and money rules must not drift; only the visual layer should differ.
- A manual appearance override de-risks detection and supports testing.

**Alternatives considered**:
- One adaptive design for both: compromises iOS and Android expectations.
- Two separate applications: duplicate logic and release overhead.
- Material 3 everywhere: feels non-native on iPhone.
- iOS design everywhere: feels non-native on Android.

## 3. Frontend stack: Vite + React + TypeScript

**Decision**: Vite 7, React 19, TypeScript 5, React Router, TanStack Query, Dexie, Zod,
`vite-plugin-pwa`, plain CSS tokens and CSS modules.

**Rationale**:
- The product is a client-side, installable app; server-side rendering adds no value.
- Vite produces a small static build that is easy to host on a free tier.
- TanStack Query handles cached server state and retries; Dexie handles local drafts.
- CSS custom properties and CSS modules keep the two shells explicit without a utility-CSS
  dependency.

**Alternatives considered**:
- Next.js: stronger for marketing/SSR; unnecessary for an authenticated offline-first app.
- SvelteKit: smaller runtime, but the team and design tooling are most fluent in React.
- Tailwind: fast for one design system; less suited to two distinct platform systems and the
  design-taste-frontend house rules.
- Angular: heavier than needed.

## 4. Backend: new Supabase project

**Decision**: Create a new Supabase project for the shared PWA. Keep the old snapshot project as a
backup and do not reuse its owner-only policies.

**Rationale**:
- The shared product needs normalized tables, group membership, RLS, realtime, and Edge Functions.
- Reusing the old project risks old policies, old snapshot rows, and accidental data exposure.
- The free tier supports a second project for a friends-and-family product.

**Alternatives considered**:
- Reuse the existing project and migrate: faster at first, but higher security and migration risk.
- Firebase: viable, but the team already knows Supabase and RLS maps cleanly to group isolation.
- Custom Postgres: more operational work and cost.

## 5. Relational model with group-isolated RLS

**Decision**: Model `profiles`, `groups`, `group_adults`, `invitations`, `students`, `outings`,
`outing_adults`, `outing_students`, `items`, `shares`, `settlements`, and `activity_events`.

`group_adults` is both membership and adult identity. A pending adult is a row with no profile; a
joined adult is linked to a profile; a soft-removed adult stays for history.

**Rationale**:
- A shared ledger needs rows that can be authorized, subscribed to, and audited individually.
- The old per-user JSON snapshot cannot express multi-user membership or recipient-only actions.
- A single group-scoped table family makes RLS policies consistent.

**Alternatives considered**:
- Keep JSON snapshots and merge them: conflict-prone and impossible to authorize at row level.
- Store each group as a document: realtime and settlement confirmation become awkward.
- Use a separate database per group: operationally heavy for a small product.

## 6. Auth: Google + email one-time code, no Apple

**Decision**: Supabase Auth with Google OAuth and email one-time code/magic link. Use redirect + PKCE,
never a popup. Use Resend's free tier as custom SMTP. Do not implement Sign in with Apple in v1.

**Rationale**:
- Apple sign-in requires an Apple Developer Program membership and a Services ID, conflicting with the
  zero-recurring-cost principle.
- Google + email covers the group without that fee.
- A one-time code avoids the Safari-to-home-screen handoff problem that magic links can create.
- Redirect + PKCE is the reliable path for an installed PWA.

**Alternatives considered**:
- Apple + Google + email: best coverage, but adds a paid Apple dependency.
- Google only: excludes people without Google accounts.
- Email only: workable, but Google is faster for most.
- Password auth: more security surface and reset flows.

## 7. Invitations bound to pending adults

**Decision**: The owner creates a pending adult and an invitation. The invite contains a random token
(stored hashed) and a six-character code (stored hashed). Accepting links the account to the pending
adult, activates it, and consumes the invite. Invites expire and can be revoked. Capacity is enforced
at 12 adults.

**Rationale**:
- The owner controls who joins and which adult identity they claim.
- A link plus code works from iMessage and in person.
- Hashing tokens and codes limits damage from a database leak.

**Alternatives considered**:
- Open join code: simpler, but anyone could join and claim an adult.
- Email-only invitation: useful, but the product has in-app notifications only.
- Invite creates a new adult: less control over the existing split.

## 8. Server-authoritative money finalization

**Decision**: Keep the money engine in `src/domain/money` as pure TypeScript. Use a Supabase Edge
Function that imports the same module to validate, compute, and write finalized shares. The client
uses the same engine for the preview.

**Rationale**:
- A client-computed split can be tampered with.
- Sharing one engine keeps preview and snapshot identical.
- The server can enforce owner-only finalization, attendance, assignments, and exact totals in one
  place.

**Alternatives considered**:
- Client computes and server trusts: unacceptable for shared money.
- Duplicate a SQL implementation: risks drift between preview and finalization.
- Client computes and server only validates the sum: still allows unfair but summing shares.

## 9. Optimistic concurrency and realtime

**Decision**: `outings` carries a `version`. Shared writes send the expected version; the server
increments and rejects stale writes. Realtime broadcasts outing, item, share, settlement, activity,
and membership changes.

**Rationale**:
- Online shared editing still races; rejecting stale writes is safer than last-write-wins.
- Realtime makes the group feel shared without polling.
- The version is small and easy to test.

**Alternatives considered**:
- Last-write-wins: silent data loss.
- CRDTs: overkill for money rows.
- Pessimistic locks: frustrating on a phone and hard to release after a crash.

## 10. Private drafts and publishing

**Decision**: Private drafts are local-first in Dexie. When the author is online, the draft is
mirrored to the server as an outing with `private_draft` status, visible only to the author and the
owner. The author or owner publishes it, which turns it into a shared draft exactly once. Publishing
is idempotent.

**Rationale**:
- The table-side flow must survive poor signal.
- The owner can help when the author loses connection.
- Other members must not see half-entered bills.

**Alternatives considered**:
- Local-only drafts: the owner cannot help.
- Shared drafts from the start: half-entered bills create noise and stale edits.
- Automatic publish on reconnect: surprises the group and can duplicate.

## 11. Settlement state machine

**Decision**: `pending → confirmed` or `pending → declined`; a settlement may also be `void` by its
payer or the owner. Only `confirmed` affects balances. The recipient confirms or declines with a
note. The owner may record for a pending adult; confirmation waits.

**Rationale**:
- A two-sided record is necessary when one member's action changes another member's balance.
- Pending and confirmed amounts must be visually separate.
- Declines need a durable note for the activity feed.

**Alternatives considered**:
- Unilateral recording: fast, but untrustworthy in a shared group.
- Owner-only recording: a bottleneck.
- Auto-confirm small amounts: surprising and hard to explain.

## 12. iOS PWA constraints

**Decision**: Target iOS Safari 16.4+ with browser install and in-app notifications only.

Known constraints and mitigations:

- Install is manual: onboarding shows Add to Home Screen steps with the Share icon.
- No background sync: shared writes are online; private drafts are local.
- Push is not used in v1: pending actions are in-app.
- Storage can be evicted: the server is the source of truth; a lost private draft is explained.
- Magic links can hand off to Safari: use email one-time codes in the installed app.
- OAuth may open Safari: use redirect + PKCE and allow-listed return URLs.
- Invite links may open in Safari: provide a join code entry inside the app.
- Splash screens: generate `apple-touch-startup-image` assets for the supported sizes.
- Safe areas: use `viewport-fit=cover` and `env(safe-area-inset-*)`.

**Alternatives considered**:
- Native iOS app: out of scope and requires an Apple Developer account.
- TWA/WebView wrapper: Android-only and not useful for iPhone.

## 13. Hosting and CI

**Decision**: Vercel free tier with a `*.vercel.app` subdomain; static Vite build; preview deployments
for review. Supabase Auth redirect URLs allow-list production and preview domains.

**Rationale**:
- Free, stable, and adequate for a small group.
- Preview deployments make design review and E2E checks easy.
- The app has no server runtime beyond Supabase.

**Alternatives considered**:
- Cloudflare Pages: equally viable; Vercel is chosen for preview ergonomics.
- Custom domain: optional; can be added later without changing the app.
- Self-hosting: unnecessary operational burden.

## 14. Testing strategy

**Decision**: Vitest + Testing Library for domain and components, Supabase CLI local stack for RLS
and Edge Functions, Playwright for end-to-end at iPhone and Android widths, Lighthouse for PWA and
performance, axe plus manual checks for accessibility.

**Rationale**:
- Money and RLS are the highest-risk areas; both need deterministic tests.
- The two shells and install flows need browser-level tests.
- Playwright can exercise installed-like layouts and offline drafts.

**Alternatives considered**:
- Unit tests only: cannot catch RLS or shell regressions.
- Manual-only: too risky for shared money.
- Cypress: viable, but Playwright handles multiple device profiles and service workers well.

## 15. Android archive

**Decision**: Move the Kotlin app, Gradle files, and Android configuration to `archive/android/` at
implementation start. Keep git history. Keep the installed APK until PWA parity, then uninstall. Keep
the old local database as an unlisted backup.

**Rationale**:
- The user wants to start fresh and stick to the PWA.
- A rollback path is prudent until the PWA is verified.
- Secrets are not copied into the archive.

**Alternatives considered**:
- Delete the Android code immediately: loses a working fallback.
- Keep two maintained clients: contradicts the PWA-only decision.
- Migrate the old data: explicitly out of scope; the product starts fresh.

## 16. Design direction

**Decision**: iPhone-first shell with warm neutral surfaces, Ledger Green accent, grouped inset lists,
one balance card, SF Pro, light-first, deep green-black/mint dark, a shared-table signature, initials,
and quiet iOS motion. Android shell uses Material 3 light-first with the same green identity.

**Rationale**:
- The iPhone shell is the new design work and should feel native, not like a web dashboard.
- The Material 3 shell preserves Salo's Android identity.
- Shared tokens and components keep the two shells coherent without mixing conventions.

**Alternatives considered**:
- One visual system for both: compromises native expectations.
- A dark-only iPhone shell: the user chose system light-first.
- A generic card dashboard: conflicts with the design-taste-frontend app-screen rules.
