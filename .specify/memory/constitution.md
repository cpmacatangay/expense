<!--
Sync Impact Report
- Version change: 3.0.0 → 4.0.0 (shared PWA rewrite); 4.0.0 → 4.1.0 (payment QR privacy)
- Modified principles:
  - I. Money Correctness Is Non-Negotiable (present adults; item-sum rule; one payer)
  - II. Privacy by Default → II. Shared by Design, Private by Default (payment QR images)
  - III. Offline-First → III. Connected Shared Edits
  - IV. Android-Native, Single Owner → IV. One PWA, Two Native Shells
  - V. Explicit and Simple Money Rules (custom groups; present adults; confirmed settlements)
  - VI. Auditable and Reversible (activity feed; soft removal; group lifecycle)
  - VII. Low-Friction at the Table → VIII. Low-Friction on a Phone
  - VIII. Zero Recurring Cost → IX. Zero Recurring Cost (no Apple Developer Program)
- Added principles:
  - VII. Owner-Controlled, Member-Collaborative
- Added constraints:
  - Payment QR images are group-private, display-only, and excluded from recaps and exports.
- Removed sections: the Android-native single-owner model and snapshot-only backup model
- Follow-up TODOs: implement the shared PWA backend, both platform shells, and private payment-QR storage; archive the Android app
-->

# Salo Constitution

## Core Principles

### I. Money Correctness Is Non-Negotiable

All monetary values MUST be stored and computed as integer centavos. Every finalized split MUST sum
exactly to the outing total. Rounding MUST be deterministic and documented. Floating-point
arithmetic MUST NOT be used for money.

The money engine MUST be a pure, independently testable module covering item assignment, present
adults, present students, shared per-head costs, the per-head fallback, manual total overrides,
settlement netting, and rounding remainders. A change that can alter any peso amount MUST include a
test that proves the ledger still balances.

**Rationale**: A shared ledger is only trusted if every member can reproduce the number. One lost or
invented centavo damages the group faster than any missing feature.

### II. Shared by Design, Private by Default

A group is shared only with its invited members. Every active adult in a group MUST have an account; a
pending adult is an identity that must claim an account before becoming active. Students MUST NOT have
accounts.

Group data MUST be isolated by row-level security. A member MUST NOT read or write another group's
outings, items, shares, settlements, activity, or roster. Student records MUST contain only a display
name and optional notes. The app MUST NOT collect student contact details, photos, or other personal
data, and MUST NOT include third-party analytics or advertising SDKs.

Receipt images MUST NOT be captured or stored. No receipt text or image may be sent to a third-party
OCR or AI service. Payment QR images MAY be stored as a convenience for settlements; they MUST be
private to the group, served through short-lived access, excluded from recaps and exports, and never
processed by an in-app scanner. Only ledger data MAY be stored in the shared backend.

**Rationale**: The product now holds shared financial records and student names. Privacy is a group
boundary, not a device boundary.

### III. Connected Shared Edits

The shared backend is the source of truth. The client MAY cache reads locally and MUST keep private
drafts locally, but shared writes MUST require connectivity in v1.

A write that conflicts with a newer version MUST be rejected rather than silently overwriting it. The
member MUST see the latest data before retrying. Live updates SHOULD appear without a manual refresh.

The app MUST distinguish and display: online, offline, connecting, syncing, published, private draft,
and error states. A private draft MUST remain invisible to other members until its author or the group
owner publishes it.

**Rationale**: Offline shared writes are a conflict-resolution problem that can corrupt money data.
Cached reads and private drafts preserve the table-side flow without pretending the network is
reliable.

### IV. One PWA, Two Native Shells

Salo MUST ship as one installable web application. It MUST NOT ship a native Android or iOS app, a
Trusted Web Activity, or a store listing in v1.

The same information architecture and domain logic MUST serve two platform shells:

- On iOS, the iPhone-first shell MUST follow native iOS conventions: large titles, grouped inset
  lists, sheets, bottom tabs, safe-area handling, system typography, and 44pt targets.
- On Android, the Material 3 shell MUST follow Material 3 conventions: a top app bar, navigation
  bar, cards, filled buttons, Roboto, and Material color roles.

The app MUST detect the platform and MUST offer a manual appearance override. Visual components MUST
NOT be mixed across shells. Both shells MUST share money rules, permissions, validation, and copy
tone.

**Rationale**: A PWA can feel native on both platforms without maintaining two codebases. Sharing the
domain prevents the shells from drifting; separating the visual layer prevents a generic compromise.

### V. Explicit and Simple Money Rules

A group has 2–12 adults. Each adult MUST have an account, though an invited adult MAY remain pending.
Each outing MUST mark which adults and students were present. Shared items and the per-head fallback
MUST split across present adults plus present students; a student's share is borne by the covering
adult.

Each outing has exactly one payer, and the payer MUST be marked present. Each item MUST be assigned
to one present adult, one present student, or explicitly shared. Every present student MUST have
exactly one present covering adult.

For new outings, the item sum is the authoritative bill. The total MUST follow the item sum by
default (Auto). Typing a total MUST switch it to Manual; "Use items total" MUST restore Auto. A
reopened outing MUST keep its saved total (Fixed). Tax, service charge, discount, and printed-receipt
reconciliation MUST NOT be used. OCR and LLM extraction MUST NOT be used.

A settlement MUST be recorded by the payer and confirmed or declined with a note by the recipient.
Only confirmed settlements affect balances. The owner MAY record a settlement for a pending adult;
confirmation MUST wait until that adult joins.

**Rationale**: Attendance, one payer, and confirmed settlements are the minimum rules a group can
explain at the table. Refusing hidden adjustments and OCR guesses keeps the ledger auditable.

### VI. Auditable and Reversible

Finalizing an outing MUST write an immutable share snapshot. Reopening or correcting a finalized
outing MUST require explicit confirmation, MUST warn when settlements already exist, and MUST record
an activity event with the actor and before/after values.

Settlements MUST be append-only in effect: voiding or declining MUST retain the original record.
Removing a member or adult MUST be a soft removal that preserves historical shares and activity.

The group MUST expose a full activity feed to its members. The owner MUST be able to export the whole
group; a member MUST be able to export their own data. The owner MUST be able to archive a group and
soft-delete it with confirmation.

**Rationale**: A shared ledger needs a clear answer to "who changed this, and why?" and a recovery
path for mistakes.

### VII. Owner-Controlled, Member-Collaborative

Each group has exactly one owner. In v1 the owner is the only admin. The owner MUST be able to invite
and soft-remove members, create pending adults and manage claims, manage the student roster, publish any
private draft, finalize and reopen outings, export the full group, transfer ownership, and archive or
delete the group.

Members MUST be able to create and edit shared drafts, add and assign items, mark present adults and
students, set coverage, record their own settlements, confirm or decline settlements addressed to
them, and view group activity.

A group MUST NOT be left ownerless. Ownership transfer MUST be explicit and audited. An outing MUST NOT
be finalized with fewer than two present adults.

**Rationale**: A single accountable owner keeps invitations, finalization, and destructive actions
controlled. Members still need enough freedom to record the meal without waiting for the owner.

### VIII. Low-Friction on a Phone

The primary flow MUST be iPhone-first and usable one-handed. A typical 10-item outing SHOULD be
completable in under 3 minutes; a per-head outing without items SHOULD be completable in under 90
seconds.

Onboarding MUST be guided: sign in, create or join a group, invite or claim adults, then record the
first outing. Navigation MUST use four bottom tabs: Home, Ledger, Activity, Settings. Home MUST lead
with the member's balance and pending actions. The group switcher MUST live on Home.

Private offline drafts MUST preserve the table-side flow when the connection is poor. Tap targets
MUST be at least 44pt. The app MUST support system light/dark, Dynamic Type, reduced motion, screen
readers, and keyboard focus. No interaction may depend on hover.

**Rationale**: The app competes with a group chat at the table. Speed and clarity beat decorative
complexity.

### IX. Zero Recurring Cost

The project MUST run on free tiers: Supabase for backend, a free static host and subdomain, and a
free-tier transactional email provider. It MUST NOT require an Apple Developer Program membership,
paid OCR, paid sync, or a store listing.

Any new recurring cost MUST be explicitly approved by the owner before adoption. Free-tier limits
MUST be monitored; export and cleanup paths MUST exist if a limit is approached.

**Rationale**: The group rejected recurring fees. A small friends-and-family ledger should not create
a subscription.

## Security, Privacy & Data Constraints

- Authentication MUST use Google OAuth or an email one-time code/magic link. Sign in with Apple is
  out of scope in v1.
- Authentication MUST use redirect-based OAuth with PKCE; popups MUST NOT be required.
- Custom SMTP MUST be configured for reliable email delivery. Supabase's built-in email is for
  development only.
- Secrets and the service-role key MUST never ship in the client. Privileged operations MUST run in
  a server-side function or a protected database function.
- Row-level security MUST enforce group isolation, owner-only administration, and recipient-only
  settlement confirmation.
- Invitations MUST be revocable, expiring, and bound to a pending adult identity. A share link or
  code MUST NOT grant access to any other group.
- Student records MUST be limited to display name and optional notes.
- The app MUST NOT include third-party analytics, ad SDKs, or tracking pixels.
- Payment QR images MUST be private to the group, served through short-lived access, excluded from
  recaps and exports, and never read by an in-app scanner.
- A payment QR is a convenience only; it MUST NOT change the settlement state machine.
- The owner MUST be able to export the full group; a member MUST be able to export their own data.
- A user MUST be able to delete their account only after transferring or archiving groups they own.
- Group data MUST be recoverable from soft deletion by the owner for a 30-day retention window, after
  which it may be purged.

## Development Workflow & Quality Gates

- Development MUST follow the Spec Kit stages: constitution, specify, clarify, plan, tasks, implement,
  converge.
- No implementation work may start before the feature spec and plan are approved.
- The money engine MUST have unit tests and property-based invariant tests proving that every
  finalized split sums exactly to the outing total, including present adults, present students,
  shared items, manual overrides, and per-head fallbacks.
- Row-level security MUST have integration tests covering cross-group denial, owner-only actions,
  member collaboration, recipient-only confirmation, and pending-adult restrictions.
- Invitation, ownership transfer, settlement, reopen, and soft-removal transitions MUST have tests.
- The PWA MUST be tested on iOS Safari (installed and browser) and Android Chrome, at 390px and
  430px iPhone widths and 360px and 412px Android widths.
- The PWA MUST pass an installability and performance review: first usable screen under 3 seconds on
  a typical 4G connection, interactions under 100ms, live updates under 2 seconds.
- Accessibility MUST be reviewed for 44pt targets, contrast, focus order, screen-reader labels,
  Dynamic Type, and reduced motion.
- The definition of done for any money-related change includes: tests pass, the ledger balances, RLS
  is verified, and the change is documented in the plan or tasks.
- Code reviews MUST verify compliance with this constitution. Unjustified complexity MUST be removed
  or documented.

## Governance

This constitution supersedes ad hoc practices for the Salo project. Amendments require a written
proposal, a review of affected specs and plans, and explicit approval from the project owner.
Versioning follows semantic rules: MAJOR for incompatible governance or principle changes, MINOR for
new principles or materially expanded guidance, and PATCH for clarifications. Every amendment MUST
update the version, ratification date, and last-amended date. Compliance is reviewed at each Spec Kit
stage and before every release. When a principle conflicts with a feature request, the constitution
wins until it is formally amended.

**Version**: 4.1.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-09
