<!--
Sync Impact Report
- Version change: 1.0.0 → 1.0.1
- Modified principles: V. Explicit and Simple Money Rules (clarified the adult roster as four)
- Added sections: none
- Removed sections: none
- Follow-up TODOs: none
-->

# Salo Constitution

## Core Principles

### I. Money Correctness Is Non-Negotiable

All monetary values MUST be stored and computed as integer centavos. Every finalized split MUST
sum exactly to the receipt total. Rounding MUST be deterministic and documented. Floating-point
arithmetic MUST NOT be used for money. The money engine MUST be a pure, independently testable
module with automated tests covering per-head splitting, rounding remainders, settlement netting,
and fairness tallies. A change that can alter any peso amount MUST include a test that proves the
ledger still balances.

**Rationale**: This app exists to replace a spreadsheet ledger. A single lost or invented centavo
destroys trust faster than any missing feature.

### II. Privacy by Default

Receipt OCR MUST run on-device. Receipt images MUST NOT be sent to a third-party OCR or AI service.
Student records MUST contain only the minimum needed to operate the ledger: a display name and
optional notes. The app MUST NOT collect student contact details, photos, or other personal data.
Third-party analytics and advertising SDKs MUST NOT be included. Receipt photos MAY sync only to
private, group-scoped storage for the four adult members to view, and access MUST be enforced by
row-level security and signed URLs.

**Rationale**: The ledger involves students, potentially minors, and private financial records.
On-device processing is both a privacy guarantee and a cost constraint.

### III. Offline-First

Creating an outing, scanning a receipt, assigning coverage, finalizing a split, and recording a
settlement MUST work without network connectivity. Local storage is the source of truth for the
active session. Synchronization MUST be eventual, retryable, and MUST NOT block the table-side
flow. The UI MUST show whether data is local-only, syncing, or synced. A failed sync MUST preserve
the local record and surface a clear retry path.

**Rationale**: Restaurants frequently have poor signal. The app must be usable at the moment the
bill arrives.

### IV. One Codebase, Two Targets

The shared user interface and business logic MUST serve both an Android installable app and an
iPhone installable web app. Platform-specific capabilities — camera, file storage, sharing, and
text recognition — MUST be isolated behind adapters with a documented fallback. Android MAY use
native ML Kit text recognition; the iPhone web app MUST use an on-device browser OCR fallback. A
feature that works on only one target MUST be explicitly labeled as partial in the spec and plan.

**Rationale**: The group uses both iPhones and Androids, and the project cannot absorb separate
native codebases or Apple developer fees.

### V. Explicit and Simple Money Rules

The group has exactly four adult members. Each outing has exactly one receipt and exactly one
payer. Every student present MUST be assigned to exactly one adult. Students never pay for
themselves. The split MUST be per-head across the four adults and all students present. There
MUST be no hidden allocations, multiple payers, or item-level splits in the initial release. Every
computed share MUST be visible and editable before finalization, subject to the rule that the
finalized shares sum to the receipt total.

**Rationale**: Predictable rules are easier to explain at the table and easier to test. Complexity
in the money model creates disputes.

### VI. Auditable and Reversible

Finalizing an outing MUST write an immutable share snapshot. Reopening or correcting a finalized
outing MUST require explicit confirmation, MUST warn when settlements already exist, and MUST
record an audit event with the actor and the before/after values. Settlement records MUST be
append-only. Deletions MUST be soft deletes so that sync and history remain recoverable. The app
MUST expose a data export in a portable format.

**Rationale**: A shared ledger needs a clear answer to "why did my balance change?" and a recovery
path for mistakes.

### VII. Low-Friction at the Table

The primary flow — create outing, scan receipt, select students, accept or adjust coverage,
confirm the split, and finalize — SHOULD be completable in under 90 seconds, excluding OCR
processing time. OCR is assistive: manual total entry MUST always be available, and every scanned
field MUST be correctable. Tap targets MUST be at least 44 logical pixels. The flow MUST be usable
one-handed. Steps that do not affect the split MUST NOT block finalization.

**Rationale**: The app competes with a group chat and a paper receipt. Friction is the main reason
the spreadsheet gets abandoned.

### VIII. Zero Recurring Cost

The project MUST run on free service tiers and on-device processing. It MUST NOT require a paid
subscription, paid OCR API, paid sync service, or Apple Developer Program membership for the
initial release. Any new recurring cost MUST be explicitly approved before adoption. Receipt photos
MUST be compressed to keep storage within the free tier. The Android app MUST be distributable as
a signed APK without a store listing.

**Rationale**: The group explicitly rejected recurring fees. Cost discipline is a product
constraint, not an optimization.

## Security, Privacy & Data Constraints

- The workspace is a single private group with exactly four adult members.
- Authentication MUST use Google sign-in for all four adults.
- All server-side data access MUST be scoped to the authenticated adult's group.
- Receipt photos MUST live in a private storage bucket with group-scoped access.
- On-device OCR MUST be the only OCR path; no receipt image may be sent to an external OCR API.
- Student records MUST be limited to display name and optional notes; no contact details.
- The app MUST NOT include third-party analytics, ad SDKs, or tracking pixels.
- All data export MUST be initiated by an adult and MUST include outings, coverage, shares,
  settlements, and the student roster.
- Secrets and service-role keys MUST never ship in the client.
- A user MUST be able to delete their data, subject to the other group members' need for the
  shared ledger.

## Development Workflow & Quality Gates

- Development MUST follow Spec Kit stages: constitution, specify, clarify, plan, tasks, implement,
  converge.
- No implementation work may start before the feature spec and plan are approved.
- The money engine MUST have unit tests and invariant tests proving that every finalized split
  sums to the receipt total.
- The receipt parser MUST have fixture tests for Philippine receipt formats, including VAT,
  service charge, discounts, comma separators, and malformed OCR.
- Offline and sync behavior MUST be tested on at least one Android device and one iPhone.
- Accessibility MUST be reviewed for tap target size, contrast, labels, and focus order.
- The definition of done for any money-related change includes: tests pass, the ledger balances,
  and the change is documented in the plan or tasks.
- Pull requests and reviews MUST verify compliance with this constitution. Unjustified complexity
  MUST be removed or documented.

## Governance

This constitution supersedes ad hoc practices for the Salo project. Amendments require a written
proposal, a review of affected specs and plans, and an explicit approval from the project owner.
Versioning follows semantic rules: MAJOR for incompatible governance or principle changes, MINOR
for new principles or materially expanded guidance, and PATCH for clarifications. Every amendment
MUST update the version, ratification date, and last-amended date. Compliance is reviewed at each
Spec Kit stage and before every release. When a principle conflicts with a feature request, the
constitution wins until it is formally amended.

**Version**: 1.0.1 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-07
