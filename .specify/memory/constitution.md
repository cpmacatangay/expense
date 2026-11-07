<!--
Sync Impact Report
- Version change: 1.0.1 → 2.0.0
- Modified principles:
  - II. Privacy by Default (receipt images are local-only; only ledger data is backed up)
  - III. Offline-First (backup/restore replaces multi-device synchronization)
  - IV. One Codebase, Two Targets → IV. Android-Native, Single Owner
  - V. Explicit and Simple Money Rules (hybrid item assignment + shared per-head allocation)
  - VII. Low-Friction at the Table (item assignment flow and fallback timing)
- Added sections: none
- Removed sections: none
- Follow-up TODOs: scaffold the native Android Kotlin project and implement the revised tasks
-->

# Salo Constitution

## Core Principles

### I. Money Correctness Is Non-Negotiable

All monetary values MUST be stored and computed as integer centavos. Every finalized split MUST sum
exactly to the receipt total. Rounding MUST be deterministic and documented. Floating-point
arithmetic MUST NOT be used for money. The money engine MUST be a pure, independently testable
Kotlin module with automated tests covering item assignment, student coverage, shared per-head
costs, tax/service/discount allocation, total-gap distribution, settlement netting, and rounding
remainders. A change that can alter any peso amount MUST include a test that proves the ledger still
balances.

**Rationale**: This app exists to replace a spreadsheet ledger. A single lost or invented centavo
destroys trust faster than any missing feature.

### II. Privacy by Default

Receipt OCR MUST run on-device. Receipt images MUST NOT be sent to a third-party OCR or AI service
and MUST NOT be uploaded to Supabase. Student records MUST contain only the minimum needed to
operate the ledger: a display name and optional notes. The app MUST NOT collect student contact
details, photos, or other personal data. Third-party analytics and advertising SDKs MUST NOT be
included. Only ledger data — outings, items, assignments, shares, settlements, and the roster — MAY
be backed up to the owner's private Supabase account, and access MUST be enforced by row-level
security.

**Rationale**: The ledger involves students, potentially minors, and private financial records.
On-device processing and local-only receipt images are both a privacy guarantee and a cost
constraint.

### III. Offline-First

Creating an outing, entering items, assigning items, assigning coverage, finalizing a split, and
recording a settlement MUST work without network connectivity. Room is the source of truth for the
active session. Backup MUST be eventual, retryable, and MUST NOT block the table-side flow. The UI
MUST show whether data is local-only, backing up, backed up, or in error. A failed backup MUST
preserve the local record and surface a clear retry path. Restore MUST only populate an empty local
database; existing local data MUST NOT be silently replaced.

**Rationale**: Restaurants frequently have poor signal. The app must be usable at the moment the
bill arrives, and a backup must never put the only copy of the ledger at risk.

### IV. Android-Native, Single Owner

The application MUST be a native Android app written in Kotlin with Jetpack Compose and Material
Design 3. It MUST target Android 17 (API 37) and run on the owner's Samsung S26 Ultra. The app MUST
NOT include a web build, PWA, iPhone target, React, Capacitor, or cross-platform UI layer. The owner
is the only authenticated user. CP, Mai, Kent, and Llanmer are local adult profiles on the same
device, not separate accounts. The other adults receive shared recaps; they do not install the app
or sign in. Google sign-in is used only for the owner's private backup.

**Rationale**: The product is now deliberately single-device. A native Kotlin app removes the web
runtime, iPhone support burden, and multi-user synchronization complexity while keeping the
table-side flow fast.

### V. Explicit and Simple Money Rules

The ledger has exactly four adult profiles: CP, Mai, Kent, and Llanmer. All four are present at
every outing. Each outing has exactly one receipt and exactly one payer. Every present student MUST
be assigned to exactly one adult. Students never pay for themselves.

The split is a hybrid of item assignment and shared per-head costs:

- Each receipt item MUST be assigned to exactly one adult, one student, or explicitly marked shared.
- An item assigned to an adult is that adult's cost.
- An item assigned to a student is the cost of the adult covering that student for the outing.
- Shared items are split per head across the four adults and all present students; a student's
  share is borne by the covering adult.
- Tax, service charge, and discount MUST be allocated proportionally to each adult's
  pre-adjustment subtotal.
- The confirmed receipt total is authoritative. Any gap between the itemized total and the receipt
  total MUST be distributed proportionally, and the finalized shares MUST still sum exactly.
- If no receipt items are entered, the outing falls back to a per-head split across the four adults
  and present students.

Every computed share MUST be visible before finalization. There MUST be no hidden allocations,
multiple payers, fairness scores, or automatic coverage suggestions. Assigning an item to a student
MUST mark that student present.

**Rationale**: Item assignment matches how a table actually orders food, while shared per-head
costs handle rice, appetizers, tax, and other table-wide amounts. Clear rules are easier to explain
at the table and easier to test.

### VI. Auditable and Reversible

Finalizing an outing MUST write an immutable share snapshot. Reopening or correcting a finalized
outing MUST require explicit confirmation, MUST warn when settlements already exist, and MUST
record an audit event with the actor profile and the before/after values. Settlement records MUST be
append-only. Deletions MUST be soft deletes so that history remains recoverable. The app MUST expose
a portable data export. Backup snapshots MUST be versioned and validated before restore.

**Rationale**: A ledger needs a clear answer to "why did my balance change?" and a recovery path
for mistakes.

### VII. Low-Friction at the Table

The primary flow — create outing, scan or enter the receipt, assign items, assign present students
to adults, review the split, and finalize — SHOULD be completable in under 3 minutes for a typical
receipt with up to 10 items. A per-head outing without items SHOULD be completable in under 90
seconds. OCR is assistive: manual total and item entry MUST always be available, and every scanned
field MUST be correctable. Item assignment MUST be fast: one tap per item plus a shared option.
Tap targets MUST be at least 44 logical pixels. The flow MUST be usable one-handed. Steps that do
not affect the split MUST NOT block finalization.

**Rationale**: The app competes with a group chat and a paper receipt. Item assignment is valuable
only if it remains faster than rebuilding the spreadsheet.

### VIII. Zero Recurring Cost

The project MUST run on free service tiers and on-device processing. It MUST NOT require a paid
subscription, paid OCR API, paid sync service, or Apple Developer Program membership. Any new
recurring cost MUST be explicitly approved before adoption. Receipt photos MUST remain on the
device and MUST NOT consume cloud storage. The Android app MUST be distributable as a sideloaded
debug or signed release APK without a store listing. Supabase free-tier usage MUST remain within
the included database and bandwidth limits.

**Rationale**: The group explicitly rejected recurring fees. Cost discipline is a product
constraint, not an optimization.

## Security, Privacy & Data Constraints

- The app is a single private ledger on the owner's Android phone.
- The owner MUST authenticate with one authorized Google account for backup and restore.
- No other adult account, invite, group membership, or shared backend access is supported.
- All Supabase access MUST be scoped to the authenticated owner via row-level security.
- Receipt photos MUST remain in app-private local storage and MUST NOT be uploaded.
- On-device OCR MUST be the only OCR path; no receipt image may be sent to an external OCR API.
- Student records MUST be limited to display name and optional notes; no contact details.
- The app MUST NOT include third-party analytics, ad SDKs, or tracking pixels.
- All data export MUST be initiated by the owner and MUST include outings, items, assignments,
  shares, settlements, and the student roster.
- Secrets and service-role keys MUST never ship in the client.
- The owner MUST be able to delete local data and remote backup snapshots.
- Restore MUST require an empty local database and an explicit confirmation.

## Development Workflow & Quality Gates

- Development MUST follow Spec Kit stages: constitution, specify, clarify, plan, tasks, implement,
  converge.
- No implementation work may start before the feature spec and plan are approved.
- The Kotlin money engine MUST have unit tests and property-based invariant tests proving that
  every finalized split sums to the receipt total, including item assignment, shared costs,
  proportional adjustments, negative discounts, and total gaps.
- Room DAO tests MUST cover item assignment, coverage, settlement, and backup snapshot persistence.
- Compose UI tests MUST cover the item assignment flow, shared items, student auto-presence, and
  the final review.
- Offline and backup behavior MUST be tested on the owner's Samsung S26 Ultra running Android 17.
- Receipt parser fixtures MUST cover Philippine receipt formats, including VAT, service charge,
  discounts, comma separators, quantities, and malformed OCR.
- Accessibility MUST be reviewed for tap target size, contrast, labels, and focus order.
- The definition of done for any money-related change includes: tests pass, the ledger balances,
  and the change is documented in the plan or tasks.
- Code reviews MUST verify compliance with this constitution. Unjustified complexity MUST be
  removed or documented.

## Governance

This constitution supersedes ad hoc practices for the Salo project. Amendments require a written
proposal, a review of affected specs and plans, and explicit approval from the project owner.
Versioning follows semantic rules: MAJOR for incompatible governance or principle changes, MINOR
for new principles or materially expanded guidance, and PATCH for clarifications. Every amendment
MUST update the version, ratification date, and last-amended date. Compliance is reviewed at each
Spec Kit stage and before every release. When a principle conflicts with a feature request, the
constitution wins until it is formally amended.

**Version**: 2.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
