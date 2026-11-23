<!--
Sync Impact Report
- Version change: 6.0.0 -> 7.0.0 (share-link model aligned; equal-split helper added)
- Modified principles:
  - II. Pairwise Privacy by Default (name placeholders, no email invites)
  - V. Explicit and Simple Money Rules (equal-split helper creates one-person lines)
  - VII. No Owners, No Groups (one share link per expense replaces per-email invites)
- Added constraints: name-based placeholders, one 7-day expense share link, deterministic
  equal-split remainder, no stored shared lines, no email delivery
- Follow-up TODOs: implement the item composer and equal-split helper with tests; no migration
-->

# Salo Constitution

## Core Principles

### I. Money Correctness Is Non-Negotiable

All monetary values MUST be stored and computed as integer centavos. Every saved expense MUST have
per-person shares that sum exactly to the sum of its items. Rounding MUST be deterministic and
documented. Floating-point arithmetic MUST NOT be used for money.

The money engine MUST be a pure, independently testable module covering item assignment, one payer,
one person per line, one-level coverage, pairwise netting, marked payments, payment reversal, and
rounding. A change that can alter any peso amount MUST include a test that proves the ledger still
balances.

**Rationale**: A shared ledger is only trusted if every person can reproduce the number. One lost or
invented centavo damages the group faster than any missing feature.

### II. Pairwise Privacy by Default

An expense is private to the people listed on it. Its items, shares, coverage, and history MUST NOT
be readable by anyone else. A balance is private to the two people in that pair; a person MUST NEVER
see a debt between two other people.

A person's display name and payment QR MUST be shown only to people who share an expense or an open
balance with them. There is no directory, public profile, or search across strangers; people are
added by name to an expense. A person may remain a named placeholder until they claim an expense
share link. Email addresses MUST NOT be shown to other participants and MUST NOT be used to invite
someone. No authentication or invite email is sent.

Expense and balance access MUST be enforced on the server, not only hidden in the interface. A
request outside the viewer's access MUST be denied without revealing whether the record exists. The
app MUST NOT collect receipt images, and no receipt text or image may be sent to a third-party OCR
or AI service. Payment QR images are private, display-only, and MUST NOT be reachable by public link
or appear in activity text.

**Rationale**: Without groups, the expense itself is the sharing boundary. Privacy must be a property
of the record, not a convention in the UI.

### III. Immediate Saves, Connected Writes

Saving an expense MUST make it live immediately. There MUST be no draft, finalize, reopen, lock, or
fixed-total step. The creator and the payer MUST be able to edit or delete the expense afterwards,
and balances MUST recalculate immediately.

The shared backend is the source of truth. The client MAY cache reads, but saving MUST require
connectivity. A save based on an older version of an expense MUST be rejected, and the person MUST
see the latest version before retrying. A failed save MUST NOT leave a partial expense.

Live updates SHOULD appear without a manual refresh. The app MUST distinguish and display: online,
offline, saving, saved, and error states.

**Rationale**: The group asked to record expenses at the table, not to manage a document lifecycle.
Immediate, version-checked saves keep the ledger honest without a workflow to learn.

### IV. One Installable PWA, One Light Visual World

Salo MUST ship as one installable web application. It MUST NOT ship a native Android or iOS app, a
Trusted Web Activity, or a store listing in v1.

The interface MUST keep the stone/ink visual world, the established type and spacing rhythm, and the
light-only palette. It MUST provide install guidance for iPhone and Android, safe-area handling,
44-point targets, visible focus, accessible names, and reduced-motion support. No interaction may
depend on hover.

Every primary screen MUST be verified at 390 and 1440 widths without clipping or horizontal
overflow. The app MUST remain usable one-handed on a phone.

**Rationale**: The product is used on a phone at the table. A single installable app and one visual
world keep the cost and the surface area small.

### V. Explicit and Simple Money Rules

An expense MUST record a description, a date, one payer, the people who were there, and its items.
The payer MUST be one of the listed people. An expense MUST have at least two and at most twelve
people.

Each item MUST have a name and an amount and MUST be assigned to exactly one listed person. A dish
eaten by several people MUST be recorded as one line per person. The editor MAY offer an equal-split
helper that creates those lines from a user-entered total; the helper MUST show the resulting
per-person amounts before adding and MUST NOT store a shared line. The product MUST NOT offer an
unequal custom split or a per-line multi-person split. Quantity, unit price, and receipt line details
are out of scope. The expense total MUST be the sum of its items; the product MUST NOT offer a manual
total, a fixed total, tax, service charge, or discount.

Coverage MUST be one level inside one expense. A coverer absorbs the covered person's full share and
MUST NOT also be covered in the same expense. The payer MUST NOT be covered, nobody may cover
themselves, and loops or chains MUST be rejected.

A balance MUST be the net pairwise amount across shared expenses minus marked payments. A debt MUST
be settled in full; partial payments, recipient confirmation, and disputes are out of scope.

**Rationale**: These rules are the minimum a group can explain at the table. Every additional split
mode is a new way for two people to disagree about the same bill.

### VI. Corrections Stay Visible

Every expense MUST keep a change history visible to its participants: creation, edits with the values
that changed, people added or removed, and coverage changes. Marked payments MUST appear in the pair's
paid history and in recent activity.

Either person in a pair MUST be able to mark the full outstanding debt paid, and either person MUST
be able to undo a mistaken payment. An undo MUST restore the balance and MUST remain in history.
Payments MUST NOT be silently deleted or overwritten.

Editing or deleting an expense after a payment MUST keep the payment record and recalculate the pair's
balance. If payments exceed the recalculated shares, the direction of the debt MUST reverse and the
net amount MUST be shown the other way.

**Rationale**: A ledger without confirmation still needs a trustworthy account of what happened. An
append-only history plus a reversible mark-paid is simpler than a confirmation workflow and safer
than silent edits.

### VII. No Owners, No Groups

The product MUST NOT have tables, groups, group invitations, a switcher, group member management,
ownership, archiving, or group deletion. There MUST be no students, student roster, or student
coverage.

Any signed-in person MUST be able to record an expense. The creator and the payer MUST be the only
people who can edit or delete it; every other listed person is view-only. There MUST be no
owner-only or admin-only action.

Any signed-in person can add a named placeholder to an expense. The creator or payer can create one
share link per expense, valid for 7 days and refreshable. Opening the link requires Google sign-in;
the recipient sees a limited expense summary and claims one open name. Claiming merges the
placeholder into the recipient's account person across every expense that used the name. The product
MUST use the term "People"; "adults" and "students" MUST NOT appear.

**Rationale**: The friction the group felt came from administering a shared space. Removing ownership
and group lifecycle removes the work that was never about the expenses.

### VIII. Low-Friction on a Phone

Navigation MUST use three tabs: Home, Ledger, Settings. Home MUST lead with the person's balance and
New expense, followed by recent activity and a See all action for All expenses. Ledger MUST show
active pairwise debts and paid history. Settings MUST contain the profile, People, payment QR,
install guidance, and account actions. There MUST NOT be an Activity tab and there MUST NOT be a
fourth tab.

A person with a new account MUST land on an empty Home and record the first expense without any setup
step. Recent activity MUST show the five most recent events across the person's expenses. The full
change history MUST live inside each expense.

A three-person, five-item expense SHOULD be completable in under 2 minutes. Marking a debt paid
SHOULD take under 15 seconds. Loading, empty, offline, and error states MUST be explicit. Controls
MUST be reachable one-handed, and the primary action MUST not require horizontal scrolling.

**Rationale**: The app competes with a group chat at the table. Speed and clarity beat decorative
complexity, and every extra tab is another place to get lost.

### IX. Simplicity Is the Product

A feature that was removed MUST NOT return without an explicit product decision that names what will
be removed in exchange. Recaps, exports, drafts, finalization, groups, students, and activity tabs are
not "temporarily hidden"; they are out of scope.

New scope MUST be justified by a user problem observed in real use, not by parity with another app.
The default answer to "can we also add..." is no.

**Rationale**: The product was rebuilt because it became complicated. Without a rule that subtraction
is progress, the same surfaces will grow back one request at a time.

### X. Zero Recurring Cost

The project MUST run on free tiers: a managed backend, a free static host and subdomain, and free
tooling. It MUST NOT require an Apple Developer Program membership, a paid email provider, paid OCR,
paid sync, or a store listing.

Any new recurring cost MUST be explicitly approved by the project owner before adoption. Free-tier
limits MUST be monitored, and a cleanup path MUST exist if a limit is approached.

**Rationale**: The group rejected recurring fees. A small friends-and-family ledger should not create
a subscription.

## Security, Privacy & Data Constraints

- Authentication MUST use Google OAuth only. Self-service Google sign-up MUST be allowed; a new
  account sees an empty Home. Email one-time codes, magic links, and Sign in with Apple MUST NOT be
  used.
- Authentication MUST use redirect-based OAuth with PKCE; popups MUST NOT be required.
- No custom SMTP, sending domain, or authentication/invite email delivery is required. The product
  MUST NOT send authentication or invite email.
- Secrets and privileged keys MUST never ship in the client. Privileged operations MUST run
  server-side.
- Expense access MUST be limited to the people listed on it. Balance access MUST be limited to the
  two people in the pair. Payment QR access MUST be limited to people who share an expense or open
  balance with its owner.
- Expense share links MUST be unguessable, expire after 7 days, be refreshable by the creator or
  payer, and grant only a limited expense preview plus the right to claim one open name on that
  expense. They MUST NOT expose items, shares, payments, or email addresses before the claim.
- Account deletion MUST be blocked while the person owes or is owed any amount. Past expenses MUST
  keep the display name recorded on them.
- Old ledger data and payment QR images MUST be discarded at release, only after a fresh verified
  production backup and explicit sign-off. Existing sign-in accounts MUST be retained. No old group,
  outing, student, settlement, expense, or QR data may be migrated, archived, or carried over into
  the new product.
- The product MUST NOT include third-party analytics, ad software, or tracking pixels.
- Receipt images, OCR, and AI extraction MUST NOT be used.

## Development Workflow & Quality Gates

- Development MUST follow the Spec Kit stages: constitution, specify, clarify, plan, tasks, implement,
  converge. No implementation work may start before the feature spec and plan are approved.
- The money engine MUST have unit tests and property-based invariant tests proving that every saved
  expense sums exactly to its item total across assigned items, coverage, rounding, and pairwise
  netting.
- Access tests MUST cover participant-only expense access, pairwise-only balances, QR visibility,
  edit and delete rights, pending-person claims, and denial without revealing existence.
- Coverage tests MUST cover one-level coverage, self-coverage, payer coverage, loops, chains, and
  removal of a coverer or covered person.
- Payment tests MUST cover full-amount marking, undo, netting, direction reversal after an edit,
  deletion after a payment, and a later expense reopening a settled pair.
- Saving MUST reject stale writes and MUST NOT create partial expenses on failure.
- The PWA MUST be tested on iOS Safari (installed and browser) and Android Chrome, at 390px and 430px
  iPhone widths and 360px and 412px Android widths, plus a 1440px desktop width.
- The PWA MUST pass an installability review, with the first usable screen under 3 seconds on a
  typical 4G connection.
- Accessibility MUST be reviewed for 44-point targets, contrast, focus order, accessible names,
  reduced motion, and a light-only palette.
- The definition of done for any money-related change includes: tests pass, the ledger balances,
  access rules are verified, and the change is recorded in the plan or tasks.
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

**Version**: 7.0.0 | **Ratified**: 2026-11-07 | **Last Amended**: 2026-11-23
