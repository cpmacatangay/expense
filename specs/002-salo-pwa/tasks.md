# Tasks: Salo Shared PWA

**Input**: Design documents from `/specs/002-salo-pwa/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Required by the constitution. Money, RLS, settlement, invitation, and end-to-end tests are
part of the feature, not optional follow-ups.

**Organization**: Tasks are grouped by user story. Setup and foundational work block every story.
Stories are ordered P1 → P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: `[US1]`-`[US8]` for user-story phases; omitted in setup, foundational, and polish
- Every task names an exact file path

## Path Conventions

The PWA lives at the repository root. Shared domain, data, features, platform shells, and tests use
the structure in `plan.md`. The Android app is moved to `archive/android/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Move the old client aside and scaffold the PWA, backend, hosting, and design tokens.

- [x] T001 Move the Kotlin app, Gradle files, and Android configuration to `archive/android/`; keep secrets out of the archive
- [x] T002 Scaffold Vite + React + TypeScript at the repository root with `package.json`, `tsconfig.json`, and `vite.config.ts`
- [x] T003 Add dependencies for routing, server state, Supabase, Dexie, Zod, PWA, and testing in `package.json`
- [x] T004 Configure ESLint, Prettier, Vitest, Playwright, and npm scripts in `package.json` and `tests/`
- [x] T005 Create `.env.example` with Supabase URL and anon key placeholders
- [x] T006 Initialize Supabase locally in `supabase/config.toml` and `supabase/migrations/`
- [x] T007 Create the new Supabase project and document the project ref in `specs/002-salo-pwa/quickstart.md`
- [x] T008 [P] Create the Vercel project and free subdomain; document the origin in `specs/002-salo-pwa/quickstart.md`
- [x] T009 [P] Create shared design tokens in `src/ui/tokens/tokens.css`
- [x] T010 [P] Create the iPhone shell token layer in `src/platform/ios/iOSTokens.css`
- [x] T011 [P] Create the Material 3 token layer in `src/platform/android/androidTokens.css`
- [x] T012 [P] Create the PWA manifest, icons, and splash assets in `public/`
- [x] T013 Create the app entry, router, and provider skeleton in `src/main.tsx` and `src/app/`
- [x] T014 Add a CI workflow for typecheck, unit tests, build, and Playwright in `.github/workflows/ci.yml`
- [x] T015 Write `archive/android/README.md` explaining that the Kotlin app is archived and how to recover it

**Checkpoint**: The PWA skeleton, backend project, hosting, and design tokens exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, RLS, auth, platform shells, cache, realtime, and the money engine. No user story
can ship without these.

**CRITICAL**: No user-story work until this phase is complete.

### Database and access

- [x] T016 Create the `profiles` and `groups` migrations in `supabase/migrations/`
- [x] T017 Create the `group_adults` migration with pending/active/removed states in `supabase/migrations/`
- [x] T018 Create the `invitations` migration with hashed token/code and expiry in `supabase/migrations/`
- [x] T019 Create the `students` migration in `supabase/migrations/`
- [x] T020 Create the `outings`, `outing_adults`, and `outing_students` migrations in `supabase/migrations/`
- [x] T021 Create the `items` migration with assignment constraints in `supabase/migrations/`
- [x] T022 Create the `shares` migration with exact-total constraints in `supabase/migrations/`
- [x] T023 Create the `settlements` migration with the settlement state machine in `supabase/migrations/`
- [x] T024 Create the `activity_events` migration in `supabase/migrations/`
- [x] T025 [P] Add RLS policies for `profiles`, `groups`, and `group_adults` in `supabase/migrations/`
- [ ] T026 [P] Add RLS policies for `invitations` and `students` in `supabase/migrations/`
- [x] T027 [P] Add RLS policies for `outings`, `outing_adults`, `outing_students`, `items`, and `shares` in `supabase/migrations/`
- [x] T028 [P] Add RLS policies for `settlements` and `activity_events` in `supabase/migrations/`
- [x] T029 Add database triggers or functions for activity events in `supabase/migrations/`

### Auth and state

- [x] T030 Create the Supabase client, session, and auth provider in `src/data/supabase/`
- [x] T031 Create the profile bootstrap on first sign-in in `src/features/auth/`
- [ ] T032 [P] Create the Dexie schema for cached reads and private drafts in `src/data/cache/` and `src/data/drafts/`
- [x] T033 [P] Create the query client and cache invalidation policy in `src/app/providers.tsx`
- [ ] T034 [P] Create the realtime subscription base in `src/data/realtime/`
- [x] T035 Create the platform provider and detection in `src/platform/PlatformProvider.tsx` and `src/platform/detectPlatform.ts`
- [ ] T036 [P] Create shared primitives for buttons, fields, lists, sheets, and empty states in `src/ui/primitives/`
- [x] T037 [P] Create the iPhone shell skeleton in `src/platform/ios/IOSShell.tsx`
- [x] T038 [P] Create the Material 3 shell skeleton in `src/platform/android/AndroidShell.tsx`
- [ ] T039 Create shared loading, error, offline, and sync-state primitives in `src/ui/primitives/`

### Money and tests

- [x] T040 Create the money engine types and validation in `src/domain/money/types.ts` and `src/domain/money/validate.ts`
- [x] T041 Create the money engine allocation and rounding in `src/domain/money/allocate.ts`
- [x] T042 Add money property tests for present adults, present students, shared items, manual overrides, and per-head fallback in `tests/unit/money/`
- [x] T043 Add total-mode tests for Auto, Manual, Fixed, and merge exactness in `tests/unit/totals/`

**Checkpoint**: Schema, RLS, auth, shells, cache, realtime, and the money engine are ready.

---

## Phase 3: User Story 1 - Create or join a shared group (Priority: P1) — MVP

**Goal**: Sign in, create or join a group, invite or claim a pending adult, and switch groups.

**Independent Test**: Sign in, create a group, invite a second adult, claim the pending identity,
and verify both members see the same group.

### Tests

- [ ] T044 [P] [US1] Add RLS tests for group isolation, invitation claim, capacity, and revocation in `tests/integration/groups/`
- [ ] T045 [P] [US1] Add E2E tests for sign-in, create group, invite, join, and switch in `tests/e2e/groups.spec.ts`

### Implementation

- [x] T046 [US1] Build the sign-in screen with Google and email one-time code in `src/features/auth/SignInScreen.tsx`
- [ ] T047 [US1] Build the guided onboarding flow in `src/features/onboarding/`
- [x] T048 [US1] Build group creation with name and color in `src/features/groups/CreateGroupScreen.tsx`
- [ ] T049 [US1] Build invite creation with link, code, expiry, and revocation in `src/features/groups/InviteScreen.tsx`
- [x] T050 [US1] Build the join and claim screen in `src/features/groups/JoinGroupScreen.tsx`
- [ ] T051 [US1] Build pending-adult creation in `src/features/members/PendingAdultSheet.tsx`
- [ ] T052 [US1] Build the group switcher on Home in `src/features/groups/GroupSwitcher.tsx`
- [ ] T053 [US1] Build the members list with pending/active/removed states in `src/features/members/MembersScreen.tsx`
- [x] T054 [US1] Implement invitation acceptance and claim RPC calls in `src/data/supabase/invitations.ts`
- [ ] T055 [US1] Add onboarding empty, error, expired-invite, and full-group states
- [ ] T056 [US1] Add iPhone and Material 3 variants for onboarding and group switcher in `src/platform/`
- [ ] T057 [US1] Add accessibility labels and focus order for onboarding
- [ ] T058 [US1] Add copy for invite, claim, capacity, and expired states
- [ ] T059 [US1] Persist the selected group per account on the device
- [ ] T060 [US1] Verify the full US1 flow on iPhone and Android widths

**Checkpoint**: A user can create or join a group; members are isolated; no outing exists yet.

---

## Phase 4: User Story 2 - Record and finalize an outing (Priority: P1)

**Goal**: Present adults and students, items, total modes, review, finalize, reopen, shared drafts,
private drafts, and stale-write protection.

**Independent Test**: Create a draft, select present adults/students, add items, check Auto and
Manual, have the owner finalize, and verify exact shares.

### Tests

- [ ] T061 [P] [US2] Add Edge Function tests for finalization and reopening in `tests/integration/outings/`
- [ ] T062 [P] [US2] Add E2E tests for the outing flow, total modes, and blocked finalization in `tests/e2e/outings.spec.ts`
- [ ] T063 [P] [US2] Add E2E tests for offline private drafts and publish idempotency in `tests/e2e/drafts.spec.ts`

### Implementation

- [ ] T064 [US2] Build the outing list and new-outing entry in `src/features/outings/OutingsList.tsx`
- [ ] T065 [US2] Build present-adult selection in `src/features/outings/PresentAdults.tsx`
- [ ] T066 [US2] Build present-student selection and coverage in `src/features/outings/PresentStudents.tsx`
- [ ] T067 [US2] Build the item sheet for add/edit/delete in `src/features/outings/ItemSheet.tsx`
- [ ] T068 [US2] Build split and merge actions with exact-sum behavior in `src/features/outings/itemActions.ts`
- [ ] T069 [US2] Build the total field with Auto, Manual, Fixed, and Use items total in `src/features/outings/TotalField.tsx`
- [ ] T070 [US2] Build the outing review with share preview in `src/features/outings/OutingReview.tsx`
- [ ] T071 [US2] Build the finalized outing detail in `src/features/outings/OutingDetail.tsx`
- [x] T072 [US2] Implement the finalize Edge Function in `supabase/functions/finalize-outing/`
- [x] T073 [US2] Implement reopen as the `reopen_outing` RPC in `supabase/migrations/0012_reopen_outing.sql`
- [ ] T074 [US2] Implement version checks and stale-write errors in `src/data/supabase/outings.ts`
- [ ] T075 [US2] Implement shared-draft editing and member visibility in `src/features/outings/`
- [ ] T076 [US2] Implement local private drafts in `src/data/drafts/`
- [ ] T077 [US2] Implement private-draft mirroring and publish in `src/data/drafts/publish.ts`
- [ ] T078 [US2] Implement publish idempotency and retry in `src/data/drafts/publish.ts`
- [ ] T079 [US2] Add blocked-finalization states for unassigned items, coverage, payer, and present adults
- [ ] T080 [US2] Add iPhone and Material 3 variants for the outing flow in `src/platform/`
- [ ] T081 [US2] Add accessibility labels and focus order for the item sheet and total field
- [ ] T082 [US2] Add copy for Auto, Manual, Fixed, stale, blocked, and draft states
- [ ] T083 [US2] Add realtime refresh for outings and items in `src/data/realtime/`
- [ ] T084 [US2] Verify the full US2 flow on iPhone and Android widths
- [ ] T085 [US2] Measure the 10-item outing flow against the 3-minute target

**Checkpoint**: A group can record, finalize, reopen, and share an outing exactly.

---

## Phase 5: User Story 3 - See who owes whom and settle (Priority: P1)

**Goal**: Group balances, pairwise debts, settlement record/confirm/decline/void, pending vs
confirmed.

**Independent Test**: Finalize outings, record a partial payment, confirm it, and verify only
confirmed settlements change balances.

### Tests

- [x] T086 [P] [US3] Add settlement state-machine and balance tests in `src/domain/ledger/computeLedger.test.ts`
- [ ] T087 [P] [US3] Add RLS tests for recipient-only confirmation and cross-group denial in `tests/integration/settlements/`
- [ ] T088 [P] [US3] Add E2E tests for record, confirm, decline, and void in `tests/e2e/settlements.spec.ts`

### Implementation

- [x] T089 [US3] Implement balance computation in `src/domain/ledger/computeLedger.ts`
- [x] T090 [US3] Build the Ledger screen with member balances in `src/pages/LedgerPage.tsx`
- [x] T091 [US3] Build pairwise who-owes-whom rows in `src/pages/LedgerPage.tsx`
- [x] T092 [US3] Build the settlement record form in `src/pages/LedgerPage.tsx`
- [x] T093 [US3] Implement record settlement as the `record_settlement` RPC in `supabase/migrations/0011_settlements.sql`
- [x] T094 [US3] Implement confirm settlement as the `decide_settlement` RPC in `supabase/migrations/0011_settlements.sql`
- [x] T095 [US3] Implement decline settlement as the `decide_settlement` RPC in `supabase/migrations/0011_settlements.sql`
- [x] T096 [US3] Build pending, confirmed, declined, and void history in `src/pages/LedgerPage.tsx`
- [x] T097 [US3] Implement void by payer or owner as the `void_settlement` RPC in `supabase/migrations/0011_settlements.sql`
- [ ] T098 [US3] Add overpayment, self-payment, duplicate, and pending-recipient validation
- [ ] T099 [US3] Add the owner-assisted pending-adult settlement flow
- [ ] T100 [US3] Add iPhone and Material 3 variants for Ledger and settlement sheets
- [ ] T101 [US3] Add accessibility labels and state announcements for settlement states
- [x] T102 [US3] Add copy for pending, confirmed, declined, void, overpayment, and duplicate
- [ ] T103 [US3] Add realtime updates for settlements and balances
- [ ] T104 [US3] Verify the full US3 flow on iPhone and Android widths
- [ ] T105 [US3] Measure record/confirm/decline against the 30-second target

**Checkpoint**: A group can settle with two-sided confirmation and exact balances.

---

## Phase 6: User Story 4 - Use Salo on iPhone and Android (Priority: P1)

**Goal**: Two native-feeling shells, install, offline reads, private drafts, sync states, safe areas,
Dynamic Type, reduced motion.

**Independent Test**: Install on iPhone and Android, verify the correct shell, create a draft offline,
publish online, and confirm shared data.

### Tests

- [ ] T106 [P] [US4] Add platform detection and appearance-override tests in `tests/unit/platform/`
- [ ] T107 [P] [US4] Add Playwright shell tests at iPhone 390/430 and Android 360/412 widths in `tests/e2e/shells.spec.ts`
- [ ] T108 [P] [US4] Add offline-read and installability checks in `tests/e2e/pwa.spec.ts`

### Implementation

- [ ] T109 [US4] Implement the full iPhone shell components in `src/platform/ios/components/`
- [ ] T110 [US4] Implement the full Material 3 shell components in `src/platform/android/components/`
- [ ] T111 [US4] Implement the Appearance setting in `src/features/settings/AppearanceSettings.tsx`
- [ ] T112 [US4] Implement the iOS Add to Home Screen guidance in `src/features/onboarding/InstallGuide.tsx`
- [ ] T113 [US4] Implement the Android install prompt and fallback in `src/features/onboarding/InstallGuide.tsx`
- [ ] T114 [US4] Configure the service worker and offline shell in `vite.config.ts` and `src/app/`
- [ ] T115 [US4] Implement cached reads and last-sync labels in `src/data/cache/`
- [ ] T116 [US4] Implement the online/offline/connecting/syncing state bar in `src/ui/primitives/SyncState.tsx`
- [ ] T117 [US4] Apply safe-area insets and keyboard avoidance in `src/platform/ios/`
- [ ] T118 [US4] Verify Dynamic Type at 200% for the iPhone shell
- [ ] T119 [US4] Respect reduced motion in both shells
- [ ] T120 [US4] Implement share/copy/download fallbacks in `src/ui/share/`
- [ ] T121 [US4] Finalize the manifest, icons, maskable icon, and iOS splash assets
- [ ] T122 [US4] Run Lighthouse installability and fix failures
- [ ] T123 [US4] Run the iPhone Safari installed/browser matrix
- [ ] T124 [US4] Run the Android Chrome matrix
- [ ] T125 [US4] Run the accessibility audit for shells, tabs, sheets, and states

**Checkpoint**: The PWA feels native on both platforms and survives offline reads and drafts.

---

## Phase 7: User Story 5 - Track activity, history, and export (Priority: P2)

**Goal**: Activity feed, outing history, filters, owner full export, member own export.

**Independent Test**: Finalize, invite, settle, reopen; verify activity, history, and export contents.

### Tests

- [ ] T126 [P] [US5] Add activity and export unit tests in `tests/unit/activity/` and `tests/unit/export/`
- [ ] T127 [P] [US5] Add RLS tests for owner full export and member scoped export in `tests/integration/export/`
- [ ] T128 [P] [US5] Add E2E tests for activity, history, and export in `tests/e2e/activity-export.spec.ts`

### Implementation

- [x] T129 [US5] Build the Activity feed with actor, action, and before/after in `src/pages/ActivityPage.tsx`
- [ ] T130 [US5] Implement activity pagination and realtime append in `src/features/activity/`
- [ ] T131 [US5] Build History filters by date, adult, and student in `src/features/outings/HistoryScreen.tsx`
- [ ] T132 [US5] Implement owner CSV export in `src/features/settings/exportCsv.ts`
- [ ] T133 [US5] Implement owner JSON export in `src/features/settings/exportJson.ts`
- [ ] T134 [US5] Implement member scoped export in `src/features/settings/exportMember.ts`
- [ ] T135 [US5] Add export privacy notice and empty-group handling
- [ ] T136 [US5] Add iPhone and Material 3 variants for Activity and History
- [ ] T137 [US5] Add accessibility labels and focus order for the feed and filters
- [x] T138 [US5] Add copy for activity actions and export scope
- [ ] T139 [US5] Verify export contents against the data model
- [ ] T140 [US5] Measure activity pagination and history performance

**Checkpoint**: The group can audit and export its ledger.

---

## Phase 8: User Story 6 - Share a recap (Priority: P2)

**Goal**: Text and portrait image recap, no invite link, share/copy/download fallback.

**Independent Test**: Generate a recap, share text and image, and verify exact shares.

### Tests

- [ ] T141 [P] [US6] Add recap text and image snapshot tests in `tests/unit/recap/`
- [ ] T142 [P] [US6] Add E2E share/copy/download tests in `tests/e2e/recap.spec.ts`

### Implementation

- [ ] T143 [US6] Build the recap data builder from the finalized snapshot in `src/domain/recap/`
- [ ] T144 [US6] Build the text recap in `src/features/recap/recapText.ts`
- [ ] T145 [US6] Build the portrait image renderer in `src/features/recap/recapImage.ts`
- [ ] T146 [US6] Implement Web Share API, copy, and download fallbacks in `src/features/recap/shareRecap.ts`
- [ ] T147 [US6] Add the no-invite-link assertion and test
- [ ] T148 [US6] Add iPhone and Material 3 recap previews
- [ ] T149 [US6] Add accessibility labels and image alt text
- [ ] T150 [US6] Verify recap accuracy after a reopen and re-finalize

**Checkpoint**: A finalized outing can be shared outside the app without leaking an invite.

---

## Phase 9: User Story 7 - Manage the group, members, and students (Priority: P2)

**Goal**: Members, pending adults, soft removal, ownership transfer, archive/restore, soft delete,
student roster.

**Independent Test**: Invite, remove, transfer, archive, restore, soft-delete, and manage students
while preserving history.

### Tests

- [ ] T151 [P] [US7] Add membership, ownership, archive, and student RLS tests in `tests/integration/groups-lifecycle/`
- [ ] T152 [P] [US7] Add E2E lifecycle tests in `tests/e2e/group-lifecycle.spec.ts`

### Implementation

- [ ] T153 [US7] Build the Members and Invites screen in `src/features/members/MembersScreen.tsx`
- [ ] T154 [US7] Build pending-adult management in `src/features/members/PendingAdultSheet.tsx`
- [ ] T155 [US7] Implement soft removal with history retention in `src/features/members/removeMember.ts`
- [ ] T156 [US7] Implement ownership transfer with confirmation and audit in `src/features/groups/transferOwnership.ts`
- [ ] T157 [US7] Implement group archive and restore in `src/features/groups/archiveGroup.ts`
- [ ] T158 [US7] Implement soft delete and restore with confirmation in `src/features/groups/deleteGroup.ts`
- [ ] T159 [US7] Build the student roster UI in `src/features/students/StudentsScreen.tsx`
- [ ] T160 [US7] Implement student add/edit/archive/reactivate in `src/features/students/`
- [ ] T161 [US7] Add member and student permission checks to the UI
- [ ] T162 [US7] Add confirmation dialogs for destructive actions
- [ ] T163 [US7] Add iPhone and Material 3 variants for Settings and Members
- [ ] T164 [US7] Add accessibility labels and focus order
- [ ] T165 [US7] Add copy for removal, transfer, archive, delete, and student states
- [ ] T166 [US7] Add activity events for every lifecycle action
- [ ] T167 [US7] Add empty states for no members, no students, and no outings
- [ ] T168 [US7] Verify history retention after removal and archiving
- [ ] T169 [US7] Measure the group management flows
- [ ] T170 [US7] Verify the full US7 flow on iPhone and Android widths

**Checkpoint**: The group can evolve without losing history or access control.

---

## Phase 9b: User Story 8 - Scan the payee's payment QR (Priority: P2)

**Goal**: A private payment QR per group adult, shown on Home debt rows, Ledger, and outing detail
for scanning with the member's banking app. Display-only; no ledger effect.

**Independent Test**: Upload a QR, open it from a debt row, scan it with a banking app, record and
confirm the settlement, and verify the image never appears in a recap or export.

### Tests

- [ ] T171 [P] [US8] Add storage and RLS tests for group-only access, signed URLs, and public-URL denial in `tests/integration/payment-qr/`
- [ ] T172 [P] [US8] Add E2E tests for upload, view, missing QR, removed adult, and recap/export exclusion in `tests/e2e/payment-qr.spec.ts`
- [ ] T173 [P] [US8] Add the manual bank-app scan check to the device checklist in `tests/e2e/payment-qr.spec.ts`

### Implementation

- [ ] T174 [US8] Create the private `payment-qrs` bucket and storage policies in `supabase/migrations/`
- [ ] T175 [US8] Add `payment_qr_path`, `payment_qr_label`, and `payment_qr_updated_at` to `group_adults` in `supabase/migrations/`
- [ ] T176 [US8] Build self-service QR upload, replace, and remove in `src/features/payments/PaymentQrSettings.tsx`
- [ ] T177 [US8] Build owner-managed QR upload for pending adults in `src/features/payments/PendingAdultQr.tsx`
- [ ] T178 [US8] Add PNG/JPEG validation, the 2 MB limit, and metadata stripping in `src/features/payments/uploadQr.ts`
- [ ] T179 [US8] Implement short-lived signed URL fetching in `src/data/paymentQr/fetchQr.ts`
- [ ] T180 [US8] Build the "Scan to pay" sheet with payee, label, amount, and QR in `src/features/payments/PayQrSheet.tsx`
- [ ] T181 [US8] Wire the pay sheet into the Home balance card and debt rows in `src/features/home/`
- [ ] T182 [US8] Wire the pay sheet into Ledger debt and settlement rows in `src/features/ledger/` and `src/features/settlements/`
- [ ] T183 [US8] Wire the pay sheet into the finalized outing detail in `src/features/outings/OutingDetail.tsx`
- [ ] T184 [US8] Add missing-QR, replaced-QR, offline, removed-adult, and expired-URL states
- [ ] T185 [US8] Add iPhone and Material 3 pay-sheet variants in `src/platform/`
- [ ] T186 [US8] Add accessible names, reading order, and scannable-size/contrast rules
- [ ] T187 [US8] Add copy for scan, ask-the-payee, privacy, and offline states
- [ ] T188 [US8] Exclude QR images, paths, and labels from recaps and exports
- [ ] T189 [US8] Delete the QR object on soft removal and deny all access
- [ ] T190 [US8] Add no-public-URL and no-activity-image assertions
- [ ] T191 [US8] Verify the full QR flow on iPhone and Android widths
- [ ] T192 [US8] Measure the open-QR and record-settlement flows against the 10s/30s targets

**Checkpoint**: The group can pay by scanning the payee's private QR without changing the ledger rules.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Security, accessibility, performance, docs, archiving, and release.

- [ ] T193 Run a full RLS audit across every table and every role in `supabase/migrations/`
- [ ] T194 Run the money invariant audit across 2–12 adults and 0–10 students in `tests/unit/money/`
- [ ] T195 Run the full Playwright suite at iPhone and Android widths
- [ ] T196 Validate the installed iPhone PWA in Safari and from the home screen
- [ ] T197 Validate Android Chrome install and the Material 3 shell
- [ ] T198 Run Lighthouse for installability, performance, and accessibility
- [ ] T199 Complete the accessibility review for both shells
- [ ] T200 Complete the performance review for the first screen, item list, and activity feed
- [ ] T201 Update `README.md`, `PRODUCT.md`, `DESIGN.md`, and `specs/002-salo-pwa/`
- [ ] T202 Archive the Android code under `archive/android/`; confirm git history and no secrets
- [ ] T203 Keep the old local database backup; uninstall the Android APK only after PWA parity
- [ ] T204 Re-run `analyze` for spec/plan/tasks consistency
- [ ] T205 Verify no service-role key or secret appears in the client bundle
- [ ] T206 Review Supabase, Vercel, and Resend free-tier limits; document cleanup/export paths
- [ ] T207 Test account deletion with and without owned groups
- [ ] T208 Test soft-delete retention and owner restore
- [ ] T209 Test sign-out and local cache clearing
- [ ] T210 Test cross-group denial on every route and API call
- [ ] T211 Build the production bundle and verify the PWA manifest and service worker
- [ ] T212 Update the release checklist and hand off the signed/hosted release
- [ ] T213 Add the scheduled 30-day purge for soft-deleted groups in `supabase/functions/` or `supabase/migrations/`
- [ ] T214 Test the 30-day restore window and purge in `tests/integration/groups-lifecycle/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1-US7**: Depend on Foundational. US1 is the MVP; US2 and US3 follow; US4 is parallel with the
  visual shell work; US5-US8 follow the core flows.
- **Polish (Phase 10)**: Depends on the stories being complete.

### User Story Dependencies

- **US1 (P1)**: No story dependency; MVP.
- **US2 (P1)**: Depends on US1 for group/adult context.
- **US3 (P1)**: Depends on US2 for finalized outings.
- **US4 (P1)**: Depends on Foundational for shells; can run alongside US1–US3 visually.
- **US5 (P2)**: Depends on US2 and US3 for activity/history/export.
- **US6 (P2)**: Depends on US2 for the finalized snapshot.
- **US7 (P2)**: Depends on US1 for members and groups.
- **US8 (P2)**: Depends on US3 for settlements and on US1 for adult identities.

### Within Each Story

- Tests before implementation where practical.
- Domain and data before screens.
- Shared components before platform variants.
- Story verified on iPhone and Android widths before moving on.

### Parallel Opportunities

- Setup: T005–T015 can run in parallel where files do not collide.
- Foundational: T025–T028 (RLS), T032–T034 (cache/query/realtime), T036–T038 (primitives/shells), and
  T040–T043 (money/tests) can run in parallel.
- US1–US3: test authoring can run in parallel with UI work once the contracts are stable.
- US4: iOS and Material 3 shell work can run in parallel.
- US5-US8: independent surfaces can run in parallel after US2/US3.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational.
2. Complete US1 (create/join group, invite, claim) and verify on both widths.
3. Complete US2 (outing + money + finalize) and verify exact totals.
4. Complete US3 (settlements) and verify pending vs confirmed.

### Incremental Delivery

1. Foundation ready.
2. US1: a group can exist and invite adults.
3. US2: the group can record and finalize an outing.
4. US3: the group can settle.
5. US4: both shells feel native and installable.
6. US5–US8: audit, export, recap, lifecycle, and payment QR.
7. Polish and archive the Android app.

## Notes

- `[P]` means different files and no dependency on an incomplete task.
- Every money or access-control change needs a test.
- The Android app remains installed until PWA parity; the old database is kept as a backup.
- No task may introduce a native app, TWA, Apple sign-in, push, OCR, LLM, or a paid dependency without
  explicit approval.
