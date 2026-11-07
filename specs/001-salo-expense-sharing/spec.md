# Feature Specification: Salo — Student Meal Expense Sharing

**Feature Branch**: `001-salo-expense-sharing`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "An expense-sharing app for four adults who cover meals for a variable roster of students. Adults scan receipts, select which students each adult covers, split the bill per-head, track who paid, settle balances, and share a recap across Android and iPhone."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Split an outing and assign coverage (Priority: P1)

As one of the four adults, I want to record a meal, mark which students are present, and assign
each student to an adult, so the app tells us exactly what each adult owes without rebuilding the
spreadsheet.

**Why this priority**: This is the core value of the product. Without a correct split and a clear
coverage assignment, nothing else matters.

**Independent Test**: Create an outing with a receipt total, select three students, assign them to
adults, and verify that the displayed shares sum to the total and match the per-head rule.

**Acceptance Scenarios**:

1. **Given** a ₱3,500 receipt and four adults plus three students present, **When** CP covers two
   students, Mai covers one, and Llanmer covers none, **Then** the app shows ₱1,500 for CP, ₱1,000 for
   Mai, ₱500 for Kent, and ₱500 for Llanmer, and the four shares sum to ₱3,500.
2. **Given** a present student with no assigned adult, **When** the adult tries to finalize, **Then**
   the app blocks finalization and identifies the unassigned student.
3. **Given** a student assigned to one adult, **When** another adult is selected for that student,
   **Then** the assignment moves to the new adult rather than creating a second assignment.
4. **Given** a finalized outing, **When** an adult reopens and corrects the total or coverage,
   **Then** the app warns if settlements already exist, recomputes the shares, and records an audit
   event.
5. **Given** zero students present, **When** the outing is finalized, **Then** the total is split
   across the four adults.

---

### User Story 2 - Scan a receipt on-device (Priority: P1)

As an adult at the table, I want to photograph the receipt and have the app read the merchant,
date, total, and line items, so I do not have to type the whole bill while everyone waits.

**Why this priority**: Receipt entry is the most tedious part of the current spreadsheet workflow
and the main reason the process gets abandoned.

**Independent Test**: Scan a clear printed receipt, confirm that the total is extracted, correct one
line item, and finalize an outing using the scanned total.

**Acceptance Scenarios**:

1. **Given** a clear printed receipt, **When** the adult captures it, **Then** the app extracts a
   candidate total and line items and presents them for review.
2. **Given** an OCR result with a wrong or missing total, **When** the adult edits the total,
   **Then** the corrected total becomes the authoritative amount for the split.
3. **Given** a receipt that cannot be read, **When** the adult chooses manual entry, **Then** the
   adult can enter the total and complete the outing without leaving the flow.
4. **Given** a receipt image, **When** text recognition runs, **Then** the image is processed only
   on the device and is not sent to an external recognition service.

---

### User Story 3 - Settle balances across outings (Priority: P1)

As one of the four adults, I want to see who owes whom and record payments, so we can carry a
running balance instead of settling every meal separately.

**Why this priority**: The group already shares expenses repeatedly. A running ledger is the reason
to replace Excel, not just a convenience.

**Independent Test**: Create two outings with different payers, record a partial payment, and verify
that the net balances and simplified debts update correctly.

**Acceptance Scenarios**:

1. **Given** a finalized outing paid by CP with shares of ₱1,500, ₱1,000, ₱500, and ₱500, **When**
   the ledger is viewed, **Then** the app shows that Mai owes CP ₱1,000, Kent owes CP ₱500, and
   Llanmer owes CP ₱500.
2. **Given** a running balance, **When** an adult records a partial payment, **Then** the remaining
   balance decreases by exactly that amount and the payment appears in the history.
3. **Given** multiple outings with different payers, **When** balances are viewed, **Then** the app
   shows a simplified set of transfers that settles the group.

---

### User Story 4 - Use the same ledger together, even offline (Priority: P1)

As one of the four adults, I want the same ledger on my own phone, even when the restaurant has
poor signal, so all four of us can see and trust the records.

**Why this priority**: The group explicitly wants all four adults on their own devices, including
iPhones and Androids. A single-device app would recreate the current bottleneck.

**Independent Test**: Sign in on two devices, create and finalize an outing while one device is
offline, reconnect, and verify that both devices show the same finalized outing and balances.

**Acceptance Scenarios**:

1. **Given** all four adults have signed in, **When** one adult finalizes an outing, **Then** the
   other two adults see the outing and updated balances after syncing.
2. **Given** no network connection, **When** an adult creates, scans, assigns, finalizes, or
   settles, **Then** the action succeeds locally and is queued for sync.
3. **Given** a failed sync, **When** connectivity returns, **Then** the app retries without losing
   the local record and shows the updated sync status.
4. **Given** an adult who is not a member of the group, **When** they attempt to access the data,
   **Then** access is denied.

---

### User Story 5 - Share a clear recap (Priority: P2)

As an adult, I want to share a recap of the meal to our group chat, so everyone can see the split,
who was covered, and who pays whom without asking follow-up questions.

**Why this priority**: The recap is how the other adults receive the result when they are not
looking at the app. It is valuable but not required to complete the ledger.

**Independent Test**: Generate a recap for a finalized outing and verify that the text and image
contain the date, place, total, per-head amount, each adult's share, covered students, payer, and
settlement suggestions.

**Acceptance Scenarios**:

1. **Given** a finalized outing, **When** the adult chooses "Share recap," **Then** the app offers
   both a text version and an image version.
2. **Given** a shared recap, **When** another adult reads it, **Then** the totals and coverage in the
   recap match the finalized outing exactly.

---

### User Story 6 - Review history and fairness (Priority: P2)

As an adult, I want to review past outings, per-student totals, and how often each adult has covered
students, so we can keep the arrangement fair and understand the impact over time.

**Why this priority**: History and fairness make the app useful beyond a single meal and support the
group's informal rotation. They are not needed for the first successful split.

**Independent Test**: Finalize several outings, open reports, filter by date range, and verify that
per-adult and per-student totals and fairness tallies match the finalized records.

**Acceptance Scenarios**:

1. **Given** finalized outings across several months, **When** a date range is selected, **Then** the
   app shows total spend, per-adult shares, student-heads covered, and amount covered per adult.
2. **Given** a student's history, **When** the student detail is opened, **Then** the app shows which
   adult covered the student and when.
3. **Given** a date range, **When** the adult exports data, **Then** the app produces CSV and JSON
   containing outings, coverage, shares, settlements, and the roster.

---

### User Story 7 - Install on both Android and iPhone (Priority: P2)

As an adult, I want to install the app on my own phone without paying for an app store, so the whole
group can use it regardless of device.

**Why this priority**: Installation is the final delivery step. It matters, but the ledger can be
validated before distribution is finalized.

**Independent Test**: Install the app on one Android phone and one iPhone, launch it offline, and
verify that the core flow is available.

**Acceptance Scenarios**:

1. **Given** an Android phone, **When** the adult installs the app, **Then** it launches and can be
   used without a paid store listing.
2. **Given** an iPhone, **When** the adult adds the app to the home screen, **Then** it launches in a
   standalone view and works offline after the first load.
3. **Given** a device with no prior install, **When** the app is opened for the first time, **Then**
   the adult can sign in and join the group.

---

### Edge Cases

- OCR returns no total, a partial total, or a total that conflicts with line items; the adult must
  be able to correct it or enter it manually, and the confirmed total wins.
- The receipt total does not divide evenly by the number of people present; rounding must be
  deterministic and the shares must still sum to the total.
- A student is added to the roster during an outing; the adult can add and assign the student
  without restarting the flow.
- A student is archived after being covered in a finalized outing; the historical record remains
  intact.
- An adults-only outing has zero students present; the split is among the four adults.
- The payer is not the adult currently using the app; the payer can still be selected and the
  settlement suggestions must be correct.
- Two adults edit the same draft outing while offline; the app must preserve one version, flag the
  conflict, and avoid silently discarding money data.
- A receipt photo upload fails or is interrupted; the local copy and the finalized split must remain
  usable, and the upload must retry.
- The same outing is submitted twice; the app must avoid creating duplicate outings.
- A receipt total is zero, negative, or lower than a discount; the app must reject the finalization
  and explain why.
- An adult signs in with a Google account that is not the email pre-added by the group; access must
  be denied or resolved through an explicit invite.
- The device is offline during first sign-in; the app must explain that sign-in needs connectivity
  and preserve any local draft.
- Local web storage is cleared on an iPhone; the app must recover the ledger from the shared
  backend when the adult signs in again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support one private group with exactly four adult members.
- **FR-002**: Adults MUST authenticate with their Google account.
- **FR-003**: The system MUST maintain a student roster of 1–10 students per group, with add, edit,
  archive, and reactivate.
- **FR-004**: An adult MUST be able to create an outing with a date, optional place, optional notes,
  one receipt, and one payer.
- **FR-005**: The system MUST capture or select a receipt image and extract merchant, date, line
  items, tax, service charge, discount, and total on the device.
- **FR-006**: The system MUST allow the adult to correct every extracted field; the total is
  required before the outing can be finalized.
- **FR-007**: The system MUST allow manual entry of the total and line items when scanning is
  unavailable or inaccurate.
- **FR-008**: The system MUST let the adult select which students from the roster are present.
- **FR-009**: The system MUST require each present student to be assigned to exactly one adult
  before finalization.
- **FR-010**: The system MUST prevent a student from being assigned to more than one adult and MUST
  prevent a student from paying for themselves.
- **FR-011**: The system MUST suggest coverage assignments that balance the number of student-heads
  covered per adult using historical coverage, and the adult MUST be able to override every
  suggestion.
- **FR-012**: The system MUST compute the per-head amount as the total divided by the number of
  people present, where people present are the four adults plus the present students.
- **FR-013**: The system MUST compute each adult's share as their own head plus the heads of the
  students they cover.
- **FR-014**: The system MUST store and compute money in integer centavos and MUST guarantee that
  finalized shares sum exactly to the receipt total.
- **FR-015**: The system MUST display each adult's share and the coverage that produced it before
  finalization.
- **FR-016**: The system MUST allow exactly one payer per outing and record that payer.
- **FR-017**: Finalizing an outing MUST lock a share snapshot.
- **FR-018**: The system MUST track running balances across outings and settlements.
- **FR-019**: The system MUST display simplified "who pays whom" suggestions.
- **FR-020**: The system MUST allow recording full and partial settlements between adults.
- **FR-021**: The system MUST allow marking a settlement as complete and viewing settlement history.
- **FR-022**: The system MUST calculate fairness tallies per adult, including student-heads covered
  and amount covered, filterable by date range.
- **FR-023**: The system MUST generate a shareable recap containing date, place, total, per-head
  amount, each adult's share, covered students, payer, and settlement suggestions.
- **FR-024**: The system MUST provide the recap as both text and an image.
- **FR-025**: The system MUST work offline for creating, scanning, assigning, finalizing, and
  settling, and MUST sync automatically when connectivity returns.
- **FR-026**: The system MUST synchronize data across the four adults' devices and show sync
  status.
- **FR-027**: The system MUST preserve local data when sync fails and provide a retry path.
- **FR-028**: The system MUST prevent unauthorized access to another group's data.
- **FR-029**: The system MUST keep receipt text recognition on the device and MUST NOT send receipt
  images to an external recognition service.
- **FR-030**: The system MUST allow receipt photos to be shared privately with the other two adults.
- **FR-031**: The system MUST support installation on Android and iPhone without requiring a paid
  app store.
- **FR-032**: The system MUST export outings, coverage, shares, settlements, and the roster as CSV
  and JSON.
- **FR-033**: The system MUST use Philippine pesos and English.
- **FR-034**: The system MUST warn when recognized line items do not sum to the total, but MUST
  allow the adult to trust the confirmed total.
- **FR-035**: The system MUST record an audit event when a finalized outing is reopened or
  corrected.
- **FR-036**: The system MUST allow an outing to be recorded with zero present students, splitting
  the total among the four adults.
- **FR-037**: The system MUST preserve finalized history when a student is archived.
- **FR-038**: The system MUST show a clear sync indicator for local-only, syncing, and synced data.

### Key Entities

- **Group**: The private circle of exactly four adults and its student roster.
- **Adult**: A member who signs in, can be a payer, can cover students, and can settle balances.
- **Student**: A person covered by an adult; identified by display name and optional notes only.
- **Outing**: One meal event with a date, optional place and notes, one receipt, one payer, present
  students, coverage assignments, shares, status, and a finalized snapshot.
- **Receipt**: One receipt image plus merchant, date, line items, tax, service charge, discount, and
  total. The confirmed total is authoritative.
- **Receipt item**: An optional line on the receipt kept for reference and transparency; line items
  do not change the per-head split.
- **Coverage assignment**: The relationship that assigns one present student to exactly one adult
  for an outing.
- **Share**: The amount one adult owes for an outing, derived from their own head plus covered
  students, and locked when the outing is finalized.
- **Settlement**: A payment from one adult to another, with amount, date, optional note, and status.
- **Fairness tally**: Derived counts and amounts showing how many student-heads and how much each
  adult has covered over a date range.
- **Audit event**: A record of a correction to a finalized outing, including who changed what and
  when.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An adult can create, assign, and finalize a standard outing in under 90 seconds,
  excluding receipt recognition time.
- **SC-002**: 100% of finalized splits sum exactly to the confirmed receipt total across randomized
  and edge-case tests.
- **SC-003**: For clear printed receipts, an adult can scan and confirm the total in under 30
  seconds, including corrections, in at least 90% of attempts.
- **SC-004**: When recognition fails, an adult can complete the same outing manually without leaving
  the flow.
- **SC-005**: A finalized outing appears on the other two adults' devices within 10 seconds of
  reconnection.
- **SC-006**: Offline creation, finalization, and settlement succeed with no network and sync
  without losing data when connectivity returns.
- **SC-007**: An adult can record a full or partial settlement in under 30 seconds.
- **SC-008**: Fairness auto-assignment produces a difference of at most one student-head between
  adults for a single outing, unless an adult manually overrides it.
- **SC-009**: The app installs and launches on both Android and iPhone without a paid store listing;
  the first usable screen appears within 5 seconds after launch.
- **SC-010**: 100% of receipt images used for text recognition stay on the device; no external
  recognition request is made.
- **SC-011**: Export produces valid CSV and JSON files containing all outings, coverage, shares,
  settlements, and the roster.
- **SC-012**: A newly invited adult can sign in and see the shared ledger in under 2 minutes.

## Assumptions

- The group has exactly four adults: CP, Mai, Kent, and Llanmer. All four are present at every outing.
- The student roster contains 1–10 students. The roster changes rarely and is managed manually.
- Each outing has exactly one receipt and exactly one payer. Multiple receipts and multiple payers
  are out of scope for the initial release.
- The per-head split is the agreed rule. Item-level splitting is out of scope for the initial
  release.
- Each present student is covered by exactly one adult. Students never pay for themselves.
- An adults-only outing with zero students is allowed and splits the total among the four adults.
- All four adults have Google accounts and can sign in.
- The adults use a mix of Android and iPhone devices. The Android app and the iPhone web app must
  deliver the same ledger.
- Receipt recognition runs on the device. Receipt photos may sync privately to the group for
  viewing, but the images are never sent to an external recognition service.
- The group starts fresh. Existing Excel or CSV history is not imported; a portable export is
  provided instead.
- The app uses Philippine pesos and English.
- The app is private to the group. Students do not have accounts and cannot sign in.
- Student records contain only a display name and optional notes; no contact details or photos.
- Network connectivity is unreliable at restaurants, so the core flow must be offline-first.
- The project must avoid recurring costs, including paid OCR services and Apple developer fees.
- The Android app is installed as a standalone app without a store listing; the iPhone app is
  installed from the browser without an app store.
