# Feature Specification: Salo — Android Meal Ledger

**Feature Branch**: `001-salo-expense-sharing`

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "An Android-only Kotlin app for one owner on a Samsung S26 Ultra running Android 17. The app maintains a private meal ledger for four local adult profiles — CP, Mai, Kent, and Llanmer — and a student roster. The owner scans or manually enters receipt items, assigns each item to an adult, a student, or shared, splits the bill, tracks who paid, settles balances, shares a recap with the other adults, and backs up ledger data to a private Supabase account."

## Clarifications

### Session 2026-11-07

- Q: What is the platform scope? → Android-only native Kotlin app with Jetpack Compose and Material Design 3. Remove the React/Capacitor/PWA/iPhone implementation.
- Q: Which devices run the app? → Only the owner's Samsung S26 Ultra on Android 17 / One UI 9.0. The other adults do not install the app.
- Q: What is Supabase for? → Private backup and restore of ledger data for the owner's Google account. No multi-user sync or group invites.
- Q: What is the money model? → Hybrid item assignment plus per-head shared costs.
- Q: Can one item be assigned to multiple people? → No. One item has one assignee: one adult, one student, or shared. Use the item split tool for shared portions.
- Q: Who pays for an item assigned to a student? → The adult covering that student for the outing.
- Q: How are shared items split? → Per head across the four adults and all present students; student portions are borne by their covering adult.
- Q: How are tax, service charge, and discounts allocated? → Proportionally to each adult's pre-adjustment subtotal.
- Q: What if item amounts do not equal the receipt total? → The receipt total is authoritative; the gap is distributed proportionally and the split still sums exactly.
- Q: Must every item be assigned? → Yes, every item must be assigned to an adult, a student, or explicitly marked shared before finalization.
- Q: How much item editing is allowed? → Add, edit, delete, split, merge, and change quantity.
- Q: Are fairness scores and auto-balance kept? → No. Fairness scoring and coverage auto-suggestions are removed.
- Q: What if no items are entered? → Fall back to a per-head split across the four adults and present students.
- Q: When does item assignment ship? → Manual item entry and assignment ship in milestone 1; ML Kit OCR ships in milestone 2.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record an itemized outing and assign costs (Priority: P1)

As the owner, I want to assign each receipt item to an adult, a student, or the shared table, so the
app calculates exactly what each adult owes.

**Why this priority**: Item assignment is the core of the revised money model. Without it, the app
cannot accurately reflect who ordered or covered what.

**Independent Test**: Create an outing with adult items, student items, and a shared item; assign
all of them; assign each present student to one adult; finalize; verify every share sums exactly to
the receipt total.

**Acceptance Scenarios**:

1. **Given** a receipt with items assigned to adults, students, and shared, **When** the owner
   reviews the split, **Then** each adult's share includes their own items, their covered students'
   items, their share of shared items, and their proportional adjustments, and the shares sum
   exactly to the receipt total.
2. **Given** a shared rice item, **When** the outing is finalized, **Then** the item is split per
   head across the four adults and present students, and each student's portion is charged to the
   adult covering that student.
3. **Given** an item assigned to a student, **When** the assignment is made, **Then** that student
   is automatically marked present and the covering adult's share includes the item.
4. **Given** an item with no assignment or a present student with no covering adult, **When** the
   owner tries to finalize, **Then** the app blocks finalization and identifies the exact item or
   student that needs attention.
5. **Given** a receipt total that differs from the assigned item sum, **When** the outing is
   finalized, **Then** the gap is distributed proportionally and the shares still sum exactly to
   the receipt total.
6. **Given** no receipt items, **When** the outing is finalized, **Then** the total is split per
   head across the four adults and present students.
7. **Given** an item is split into two portions, **When** the owner assigns the portions to
   different people, **Then** each portion is charged independently and the split remains exact.
8. **Given** a discount or service charge, **When** the split is calculated, **Then** the
   adjustment is allocated proportionally and no centavo is lost.

---

### User Story 2 - Scan a receipt on-device (Priority: P1)

As the owner at the table, I want to photograph the receipt and have the app read the merchant,
date, items, tax, service charge, discount, and total, so I do not have to type the whole bill.

**Why this priority**: Item-level assignment depends on accurate line items. OCR removes the most
tedious part of the flow.

**Independent Test**: Scan a clear printed receipt, confirm that the items and total are extracted,
correct one item, assign the items, and finalize.

**Acceptance Scenarios**:

1. **Given** a clear printed receipt, **When** the owner captures it, **Then** the app extracts a
   candidate merchant, date, items, quantities, tax, service charge, discount, and total for review.
2. **Given** an OCR result with a wrong or missing item, **When** the owner edits, adds, deletes,
   splits, or merges items, **Then** the corrected items become authoritative for the split.
3. **Given** a receipt that cannot be read, **When** the owner chooses manual entry, **Then** the
   owner can enter the total and items and complete the outing without leaving the flow.
4. **Given** a receipt image, **When** text recognition runs, **Then** the image is processed only
   on the device and is never uploaded or sent to an external recognition service.

---

### User Story 3 - Settle balances across outings (Priority: P1)

As the owner, I want to see who owes whom and record payments, so the group can carry a running
balance instead of settling every meal separately.

**Why this priority**: The group already shares expenses repeatedly. A running ledger is the reason
to replace the spreadsheet.

**Independent Test**: Create two itemized outings with different payers, record a partial payment,
and verify that the net balances and simplified debts update correctly.

**Acceptance Scenarios**:

1. **Given** a finalized itemized outing paid by CP, **When** the ledger is viewed, **Then** the app
   shows each adult's net balance and the simplified who-pays-whom transfers.
2. **Given** a running balance, **When** the owner records a partial payment, **Then** the remaining
   balance decreases by exactly that amount and the payment appears in the history.
3. **Given** multiple outings with different payers, **When** balances are viewed, **Then** the app
   shows a simplified set of transfers that settles the group.

---

### User Story 4 - Private backup and restore (Priority: P1)

As the owner, I want my ledger backed up to my private Supabase account, so I can recover it after
reinstalling the app or moving to a new phone.

**Why this priority**: The ledger is the only copy of the group's records. A private backup makes
the single-device model safe.

**Independent Test**: Record an outing, allow the backup to finish, clear the app, sign in with the
authorized Google account, restore, and verify the outing, items, assignments, shares, and
settlements are restored exactly.

**Acceptance Scenarios**:

1. **Given** no network connection, **When** the owner creates, edits, finalizes, or settles,
   **Then** the action succeeds locally and the backup is queued.
2. **Given** connectivity returns, **When** the backup runs, **Then** the ledger data is uploaded
   to the owner's private Supabase account and the status changes to backed up.
3. **Given** a backup failure, **When** the owner views the app, **Then** local data is intact, a
   retry path is available, and the failure is explained.
4. **Given** a fresh install with an empty local database, **When** the owner signs in with the
   authorized Google account, **Then** the latest valid snapshot can be restored.
5. **Given** local data already exists, **When** the owner attempts a restore, **Then** the app
   blocks the restore and requires export or clearing first.
6. **Given** a different Google account, **When** it attempts to access the backup, **Then** access
   is denied.

---

### User Story 5 - Share a clear recap (Priority: P1)

As the owner, I want to share a recap of the meal to the group chat, so the other adults can see the
items, who was covered, each adult's total, and who pays whom.

**Why this priority**: The other adults do not use the app. The recap is the only way they receive
the ledger result.

**Independent Test**: Generate a recap for a finalized itemized outing and verify that the text and
image contain the date, place, receipt total, item assignment summary, each adult's share, covered
students, payer, and settlement suggestions.

**Acceptance Scenarios**:

1. **Given** a finalized outing, **When** the owner chooses "Share recap," **Then** the app offers
   both a text version and an image version through the Android share sheet.
2. **Given** a shared recap, **When** another adult reads it, **Then** the totals, item assignments,
   and coverage match the finalized outing exactly.

---

### User Story 6 - Review spending history (Priority: P2)

As the owner, I want to review past outings, item assignments, and per-student totals, so I can
understand the group's spending over time.

**Why this priority**: History supports the group's record-keeping but is not required to complete a
single meal.

**Independent Test**: Finalize several outings, open history, filter by date range, and verify that
total spend and per-student totals match the finalized records.

**Acceptance Scenarios**:

1. **Given** finalized outings across several months, **When** a date range is selected, **Then**
   the app shows total spend and each adult's assigned share.
2. **Given** a student's history, **When** the student detail is opened, **Then** the app shows the
   items assigned to that student and which adult covered them.
3. **Given** a date range, **When** the owner exports data, **Then** the app produces CSV and JSON
   containing outings, items, assignments, coverage, shares, settlements, and the roster.

---

### User Story 7 - Install and use on my Android phone (Priority: P2)

As the owner, I want to install the app on my Samsung S26 Ultra without an app store, so I can use
it offline at the table.

**Why this priority**: Installation is the delivery step. The ledger can be validated before the
final APK is signed.

**Independent Test**: Install the APK on the S26 Ultra, launch it offline, and complete the core
flow.

**Acceptance Scenarios**:

1. **Given** the APK, **When** the owner installs it, **Then** it launches on Android 17 without a
   paid store listing.
2. **Given** a first launch with no prior data, **When** the app opens, **Then** the owner can use
   the local ledger immediately and sign in later for backup.
3. **Given** a device with no network, **When** the app launches, **Then** the core flow remains
   available.

---

### Edge Cases

- OCR misses, merges, or misreads an item; the owner can add, edit, delete, split, merge, or change
  the quantity before assignment.
- An item is split into portions assigned to different people; each portion is charged
  independently.
- A line has quantity greater than one; assigning it charges all units to one person unless the
  owner splits the line.
- An item is assigned to a student who was not manually marked present; the student is
  automatically marked present.
- An item is assigned to a student with no covering adult; finalization is blocked until coverage
  is set.
- A shared item exists with no person-assigned items; the shared cost is split per head.
- Every item is shared and no item is assigned to a person; the outing still splits correctly.
- Tax, service charge, or discount produces a negative adjustment; proportional allocation and
  largest-remainder rounding still preserve the exact total.
- The itemized total is higher or lower than the receipt total; the receipt total wins and the gap
  is distributed proportionally.
- No items are entered; the outing falls back to per-head.
- The receipt total is zero, negative, or lower than the discount; finalization is rejected.
- A receipt item is assigned to an adult; all four adults are always present, so no attendance
  check is required.
- The payer is not the currently selected adult profile; the payer can still be selected and the
  settlement suggestions remain correct.
- The same outing is submitted twice; the app must avoid creating duplicate outings.
- A student is archived after being covered; historical item assignments and shares remain intact.
- A backup is interrupted; the local ledger remains usable and the backup retries.
- A restore is attempted on a non-empty database; it is blocked.
- Receipt photos are unavailable after a restore because images are local-only; extracted item data
  is restored, and the UI explains the missing photo.
- The authorized Google account is unavailable; local use continues and backup remains queued.
- A different Google account attempts to access the backup; access is denied.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST be a native Android app written in Kotlin with Jetpack Compose and
  Material Design 3, targeting Android 17 (API 37).
- **FR-002**: The system MUST support one private ledger on one device with exactly four adult
  profiles: CP, Mai, Kent, and Llanmer.
- **FR-003**: The owner MUST be able to use the local ledger without signing in. Google sign-in is
  required only for backup and restore.
- **FR-004**: The system MUST authenticate the owner with one authorized Google account for backup
  and restore.
- **FR-005**: The system MUST maintain a student roster of 1–10 students, with add, edit, archive,
  and reactivate.
- **FR-006**: An adult MUST be able to create an outing with a date, optional place, optional notes,
  one receipt, and one payer.
- **FR-007**: The system MUST capture or select a receipt image and extract merchant, date, items,
  quantities, tax, service charge, discount, and total on the device.
- **FR-008**: The system MUST allow the owner to correct every extracted field and to enter the
  total and items manually.
- **FR-009**: Each receipt item MUST have a name, quantity, unit amount, total amount, and
  assignment.
- **FR-010**: Each item MUST be assignable to exactly one adult, one student, or explicitly marked
  shared.
- **FR-011**: Assigning an item to a student MUST automatically mark that student present.
- **FR-012**: The system MUST let the owner select which students from the roster are present.
- **FR-013**: The system MUST require each present student to be assigned to exactly one adult
  before finalization.
- **FR-014**: The system MUST block finalization when any item is unassigned or any present student
  has no covering adult.
- **FR-015**: The system MUST prevent a student from paying for themselves and MUST prevent an item
  from being assigned to more than one person.
- **FR-016**: An item assigned to an adult MUST be charged to that adult.
- **FR-017**: An item assigned to a student MUST be charged to the adult covering that student for
  the outing.
- **FR-018**: Shared items MUST be split per head across the four adults and all present students,
  with each student's portion charged to the covering adult.
- **FR-019**: Tax, service charge, and discount MUST be allocated proportionally to each adult's
  pre-adjustment subtotal.
- **FR-020**: The confirmed receipt total MUST be authoritative. Any gap between the itemized total
  and the receipt total MUST be distributed proportionally.
- **FR-021**: The system MUST store and compute money in integer centavos and MUST guarantee that
  finalized shares sum exactly to the receipt total.
- **FR-022**: The system MUST display each adult's share breakdown before finalization: own items,
  covered-student items, shared head share, proportional adjustments, total gap, and final share.
- **FR-023**: The system MUST allow exactly one payer per outing and record that payer.
- **FR-024**: Finalizing an outing MUST lock an immutable share snapshot including item
  assignments.
- **FR-025**: If no receipt items are entered, the system MUST fall back to a per-head split across
  the four adults and present students.
- **FR-026**: The system MUST track running balances across outings and settlements.
- **FR-027**: The system MUST display simplified "who pays whom" suggestions.
- **FR-028**: The system MUST allow recording full and partial settlements between adults, viewing
  settlement history, and voiding a settlement.
- **FR-029**: All recording, item assignment, finalization, and settlement flows MUST work offline.
- **FR-030**: The system MUST back up ledger data to the owner's private Supabase account when
  connectivity is available.
- **FR-031**: The system MUST preserve local data when backup fails, retry automatically, and show
  a backup status of local-only, backing up, backed up, or error.
- **FR-032**: The system MUST restore the latest valid snapshot only when the local database is
  empty, and MUST require explicit confirmation.
- **FR-033**: The system MUST enforce row-level security so only the authorized owner account can
  read or write backup snapshots.
- **FR-034**: Text recognition MUST run on-device and MUST NOT send receipt images to an external
  OCR service.
- **FR-035**: Receipt images MUST remain in app-private local storage and MUST NOT be uploaded to
  Supabase.
- **FR-036**: The system MUST be installable on Android 17 via a sideloaded debug or signed release
  APK without a store listing.
- **FR-037**: The system MUST export outings, items, assignments, coverage, shares, settlements, and
  the roster as CSV and JSON.
- **FR-038**: The system MUST use Philippine pesos and English.
- **FR-039**: The system MUST warn when recognized item amounts do not reconcile with the receipt
  total, but MUST allow the owner to trust the confirmed total and proceed.
- **FR-040**: The system MUST record an audit event when a finalized outing is reopened or
  corrected, including the adult profile and before/after values.
- **FR-041**: The system MUST allow an adults-only outing with zero present students, splitting the
  total among the four adults.
- **FR-042**: The system MUST preserve finalized history when a student is archived.
- **FR-043**: The system MUST provide an adult profile switcher and attribute each outing, item
  assignment, and settlement to the selected profile.
- **FR-044**: The recap MUST include the date, place, receipt total, item assignment summary, each
  adult's final share, covered students, payer, and settlement suggestions.
- **FR-045**: The recap MUST be available as text and as an image and MUST be shareable through the
  Android share sheet.
- **FR-046**: The system MUST allow full item editing: add, edit, delete, split, merge, and change
  quantity.
- **FR-047**: The system MUST NOT include fairness scores, fairness tallies, or automatic coverage
  suggestions.
- **FR-048**: The system MUST NOT include multi-device synchronization, group membership, invites,
  or accounts for the other adults.
- **FR-049**: All four adults are assumed present at every outing; no adult attendance tracking is
  required.
- **FR-050**: Tax, service charge, and discount are separate adjustment fields and MUST NOT also be
  counted as assignable food items.

### Key Entities

- **Ledger**: The single private ledger on the owner's device, with the owner account, currency,
  group name, and four adult profiles.
- **Adult profile**: A local identity for CP, Mai, Kent, or Llanmer. It has a display name, order,
  optional email, and owner flag. Only the owner authenticates.
- **Student**: A person covered by an adult, identified by display name and optional notes.
- **Outing**: One meal event with a date, optional place and notes, one receipt, one payer, present
  students, coverage assignments, item assignments, shares, status, and a finalized snapshot.
- **Receipt**: One receipt image plus merchant, date, tax, service charge, discount, and confirmed
  total. The confirmed total is authoritative.
- **Receipt item**: A line on the receipt with name, quantity, unit amount, total amount, and an
  assignment to one adult, one student, or shared.
- **Coverage assignment**: The relationship that assigns one present student to exactly one adult
  for an outing.
- **Share**: The amount one adult owes for an outing, with a breakdown of own items,
  covered-student items, shared head share, adjustments, gap, and final total.
- **Settlement**: A payment from one adult to another, with amount, date, optional note, and status.
- **Audit event**: A record of a correction to a finalized outing, including the adult profile,
  before/after values, and timestamp.
- **Backup snapshot**: A versioned JSON payload of the ledger, with schema version, device id, and
  creation time, stored privately in Supabase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An itemized outing with up to 10 items and three students can be created, assigned,
  and finalized in under 3 minutes, excluding OCR time.
- **SC-002**: A per-head outing with no items can be created and finalized in under 90 seconds.
- **SC-003**: 100% of finalized splits sum exactly to the confirmed receipt total across randomized
  tests covering adult items, student items, shared items, adjustments, discounts, and total gaps.
- **SC-004**: For clear printed receipts, the owner can scan and confirm items and the total in
  under 30 seconds in at least 90% of attempts.
- **SC-005**: When recognition fails, the owner can complete the same outing manually without
  leaving the flow.
- **SC-006**: Offline creation, item assignment, finalization, and settlement succeed with no
  network, and the backup succeeds within 10 seconds of reconnection for a typical ledger.
- **SC-007**: A restore on a fresh install completes in under 5 minutes and reproduces every
  outing, item assignment, share, and settlement.
- **SC-008**: A full or partial settlement can be recorded in under 30 seconds.
- **SC-009**: 100% of receipt images used for text recognition stay on the device; no external
  recognition request and no image upload occurs.
- **SC-010**: The app installs and launches on the owner's Android 17 device without a paid store
  listing; the first usable screen appears within 5 seconds.
- **SC-011**: Export produces valid CSV and JSON files containing all outings, items, assignments,
  coverage, shares, settlements, and the roster.
- **SC-012**: A recap can be generated and shared through the Android share sheet in under 30
  seconds, and its totals match the finalized outing exactly.
- **SC-013**: No Google account other than the authorized owner can read or write the backup.
- **SC-014**: 100% of itemized outings block finalization when an item is unassigned or a present
  student lacks coverage.
- **SC-015**: The app never displays a fairness score or automatic coverage suggestion.

## Assumptions

- The app runs only on the owner's Samsung S26 Ultra with Android 17 / One UI 9.0.
- The four adults — CP, Mai, Kent, and Llanmer — are local profiles on that phone. All four are
  present at every outing.
- Only the owner uses the app. The other adults receive shared text/image recaps and do not install
  or sign in.
- The owner has one authorized Google account for private Supabase backup and restore.
- The receipt total is authoritative; item amounts are the basis for allocation before adjustments.
- Tax, service charge, and discount are global receipt adjustments, not assignable food items.
- One person per item; portions of a shared item are created with the split tool.
- Fairness scoring and automatic coverage suggestions are out of scope.
- Receipt photos are local-only and are not restored from backup.
- The group starts fresh; there is no import from the previous web demo.
- The app uses Philippine pesos and English.
- Network connectivity is unreliable at restaurants, so the core flow must be offline-first.
- The project must avoid recurring costs, including paid OCR services, paid sync services, and
  Apple developer fees.
- The app is distributed as a sideloaded APK; no Play Store listing is required.

## Out of Scope

- iPhone, iPad, PWA, web app, React, Capacitor, and any cross-platform UI.
- Multi-device synchronization, group memberships, invitations, and other adult accounts.
- Real-time collaboration and conflict resolution across devices.
- Item-specific custom shares beyond the one-person-per-item rule; use the split tool.
- Unit-level assignment for quantity lines; split the line instead.
- Item-specific discounts; tax, service charge, and discount are global proportional adjustments.
- Fairness scores, fairness tallies, and automatic coverage suggestions.
- Multiple receipts or multiple payers per outing.
- Excel/CSV import of historical spreadsheets.
- Student accounts or student login.
- Play Store distribution.
