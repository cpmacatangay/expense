# Feature Specification: Salo Friends Expense Ledger

**Feature Branch**: `003-friends-expense-ledger`

**Created**: 2026-11-17

**Status**: Ready for plan

**Input**: User description: "I think we need to revamp the app again. It feels complicated. Me and my friends just want to simply record the expenses every time we hang out. We just want to see how much we owe the one who paid, record who covers who."

## Clarifications

### Session 2026-11-17

| Topic | Decision |
|---|---|
| Shared space | No tables or groups. One ledger per person across every expense they are on. |
| Sign-in | Google only. Self-service Google sign-up is allowed; a new account lands on an empty Home. Email codes, magic links, and Sign in with Apple are out. |
| Expense entry | Keep the itemized bill: one payer, a description and date, the people who were there, and lines with a name and amount, each assigned to one person. |
| Item fields | Name and amount only; no quantity or unit price. |
| Split dishes | One person per line. A dish eaten by several people is entered as one line per person. The editor may offer **Split equally**, which creates those one-person lines from a total; the ledger never stores a shared line. |
| Coverage | Members may cover other members inside an expense. One level only: a coverer absorbs the covered person's full share and cannot also be covered in the same expense. |
| Visibility | An expense is visible only to the people listed on it. Balances are pairwise and only ever shown to the two people involved. |
| Email visibility | Participants see display names only. Email is account identity data; it is never shown on an expense or used to invite someone. |
| All expenses | Home links to a full list of the person's expenses, newest first, in addition to recent activity and balances. |
| Adding people | Add a person by name from inside an expense. A new name is a placeholder that can be listed, be the payer, or cover someone immediately. |
| Sharing | The creator or payer can create one expense link, valid for 7 days. A recipient signs in with Google, claims one of the open names already on the expense, and sees the share recorded for that name. |
| Pending people | A name that has not been claimed stays not joined. The expense and its balances are recorded normally; the person acts on it after claiming the link. |
| People settings | Settings lists people you have shared with and shows joined or not joined. Inviting happens from the expense link, not from Settings. |
| Edit rights | The creator and the payer can edit or delete an expense. Everyone else listed can view it. |
| Deleted expense | Removed from lists and balances, recorded in recent activity, and no longer openable. |
| Saving | Saving is immediate. No draft, finalize, reopen, lock, or fixed-total step. |
| Edits after payment | A payment is kept; the pair's balance is recalculated, and the debt direction flips when payments exceed the recalculated shares. |
| Settling | Either person in a debt can mark the full amount paid. No recipient confirmation and no partial payments. |
| Undo | Either person can undo a mistaken Mark paid at any time; the correction stays in history. |
| Account deletion | Deletion is blocked while the person owes or is owed any amount. |
| Expense fields | Description and date only; no place or notes. |
| Payment history | A payment settles the pair, not one bill. Marked payments live in the Ledger's paid history and Home recent activity; each expense shows only its own changes. |
| Activity | Recent activity on Home and the full change history inside each expense. No Activity tab. |
| Terminology | Replace "adults" with "People" everywhere. |
| Data | Wipe at release, after a fresh verified production backup and sign-off. Existing sign-in accounts are retained; no old ledger data or payment QR survives. |
| Removed | Tables, groups, group invites, switcher, member management, ownership, archive/delete group, students, owner finalization, reopen, locks, fixed totals, drafts, recaps, exports, Activity tab. |
| Kept | Itemized bills, per-person payment QR, activity history, install section, and the light-only stone/ink interface. |
| Platform | The installable web app stays. Sign-in is Google OAuth. No native app, no store listing, no email delivery. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record an expense (Priority: P1)

As a person who was out with friends, I want to record what we spent, who paid, and what each person had, so everyone's share is clear immediately.

**Why this priority**: Recording an expense is the product. Without it there is no ledger.

**Independent Test**: Sign in with three existing accounts, open New expense, add three items, assign each item to a person, save, and verify each person's share and the pairwise debt.

**Acceptance Scenarios**:

1. **Given** a signed-in person on Home, **When** they choose New expense, **Then** they can enter a description and date, choose the payer, select the people who were there, and add items with a name and amount.
2. **Given** an expense with a payer and at least one other person, **When** they add an item with an amount assigned to one person, **Then** that person's share includes the item amount.
3. **Given** every item is assigned to one person, **When** the expense is saved, **Then** each person's share is the sum of their items and the shares sum exactly to the item total.
4. **Given** a complete expense, **When** they save it, **Then** the expense is live immediately, each person's share is stored, and balances update with no draft or finalize step.
5. **Given** a missing description, a payer who is not listed, fewer than two people, an item with no amount, a zero or negative amount, or an item with no assignment, **When** they try to save, **Then** saving is blocked and the specific problem is named.
6. **Given** a saved expense, **When** a participant opens it, **Then** they see the payer, the people, every item and its assignment, each person's share, any coverage, the total, the date, and the change history.
7. **Given** a dish eaten by three people, **When** the creator uses Split equally, **Then** they see the per-person amounts, confirm, and get one independent line per person whose amounts sum exactly to the dish total.
8. **Given** a saved expense, **When** the person opens All expenses from Home, **Then** it appears newest first with its date, description, payer, total, and the person's share.

---

### User Story 2 - See who owes whom and mark a debt paid (Priority: P1)

As a person sharing expenses, I want to see exactly how much I owe each friend and who owes me, and mark a debt paid when money changes hands, so nobody has to reconstruct it from chat.

**Why this priority**: The balances are the reason to record expenses at all.

**Independent Test**: Record two expenses with different payers, open Ledger, mark one debt paid, and verify only that pairwise balance clears.

**Acceptance Scenarios**:

1. **Given** shared expenses, **When** Home opens, **Then** the person sees the total they owe, the total owed to them, and each pairwise amount.
2. **Given** shared expenses, **When** Ledger opens, **Then** every active pairwise debt is listed with the other person, the direction, and the amount.
3. **Given** a debt, **When** either person taps Mark paid, **Then** the full outstanding amount is recorded as paid, the active debt clears immediately, and no confirmation is requested.
4. **Given** a marked payment, **When** either person views the paid history, **Then** they see the amount, the date, and who marked it paid.
5. **Given** a debt that is fully paid, **When** the ledger is viewed, **Then** the pair no longer appears as an active debt.
6. **Given** a later expense between the same two people, **When** it is saved, **Then** a new active debt appears for the new amount.
7. **Given** a mistaken mark-paid, **When** either person undoes it, **Then** the balance is restored and the correction is recorded in history.

---

### User Story 3 - Add people by name and share the expense (Priority: P1)

As the person recording an expense, I want to add a friend by name and send one expense link, so I can include them even if they have never used the app.

**Why this priority**: A new friend must be addable in the moment, at the table, and the product must not depend on knowing their email or sending email.

**Independent Test**: Add a new name to an expense, save it, create the expense link, open it in a second signed-in session, claim the name, and verify the expense and its share appear for that person.

**Acceptance Scenarios**:

1. **Given** an expense being recorded, **When** the creator adds a new name, **Then** that person appears as not joined and can be included in the expense, payer, or coverage immediately.
2. **Given** a saved expense with open names, **When** the creator or payer opens Share, **Then** a copyable link valid for 7 days is created and the old link is reused while it is still valid.
3. **Given** a signed-in recipient, **When** they open the link, **Then** they see the expense summary and the open names on it, and can choose their name.
4. **Given** a recipient who claims a name, **When** they sign in with Google, **Then** the placeholder is merged into their account, the recorded share applies, and the expense appears in their ledger.
5. **Given** a link whose 7 days have passed or that was refreshed, **When** someone opens it, **Then** it is refused and the creator can send the current link.
6. **Given** an expense link, **When** someone who is already a participant opens it, **Then** they are told they are already on the expense instead of claiming another name.
7. **Given** an expense, **When** any participant views its people, **Then** they see display names only and not email addresses.
8. **Given** a new Google account, **When** the person signs in for the first time without a link, **Then** they land on an empty Home and see no expense until someone shares one.
9. **Given** a link, **When** an unrelated person opens it, **Then** they cannot see the expense unless they sign in and claim an open name.
10. **Given** an open name, **When** a second person tries to claim it after it was taken, **Then** the claim fails and they can choose another open name.

---

### User Story 4 - Find a past expense (Priority: P2)

As a person with months of shared expenses, I want to browse all of them from Home, so I can reopen one or check what I spent without hunting through debts.

**Why this priority**: The ledger is only useful if past expenses remain findable, but the first expense can be recorded without a list.

**Independent Test**: Record three expenses on different dates, open All expenses from Home, and verify the order, the fields, and that only the viewer's expenses appear.

**Acceptance Scenarios**:

1. **Given** a person on Home, **When** they choose See all, **Then** every expense they are on is listed newest first with its date, description, payer, total, and their share.
2. **Given** the All expenses list, **When** they select an expense, **Then** its detail opens.
3. **Given** a deleted expense, **When** the list is viewed, **Then** it is absent and cannot be opened.
4. **Given** expenses belonging to other people, **When** the list is viewed, **Then** none of them appear.

---

### User Story 5 - Cover a friend's share (Priority: P2)

As a person recording an expense, I want to mark that one friend covered another friend's share, so the person who actually owes the payer is recorded once and nobody has to chase the covered person.

**Why this priority**: Coverage is the one sharing rule the group asked for by name, but a basic expense is already useful without it.

**Independent Test**: Record an expense with three people where B covers C, save it, and verify C owes nothing while B owes the payer for both shares.

**Acceptance Scenarios**:

1. **Given** three people on an expense, **When** the creator sets B to cover C, **Then** C's full share is added to B's amount and C owes nothing for that expense.
2. **Given** a covered person, **When** they open the expense, **Then** they see their share marked as covered by B.
3. **Given** a person already covering someone, **When** the creator tries to set that person as covered by someone else in the same expense, **Then** the change is blocked with the reason.
4. **Given** a person set to cover someone, **When** the creator removes or changes that coverage, **Then** the shares and debts recalculate immediately.
5. **Given** coverage on one expense, **When** either person is on another expense, **Then** the coverage does not carry over.

---

### User Story 6 - Review activity and expense history (Priority: P2)

As a participant, I want to see recent changes on Home and the full history inside an expense, so I can tell what was added, edited, covered, or paid.

**Why this priority**: A shared ledger needs a plain answer to "what changed?" but it is not needed to record the first expense.

**Independent Test**: Create an expense, edit an item, change coverage, mark a debt paid, then verify Home's recent list shows the expense edits and the payment, the expense history shows the edits, and the Ledger shows the payment.

**Acceptance Scenarios**:

1. **Given** activity on the person's expenses, **When** Home opens, **Then** the five most recent events are shown newest first.
2. **Given** an expense, **When** a participant opens its history, **Then** they see every change to that expense with the person who made it and the values that changed.
3. **Given** a marked payment, **When** the person opens Home or the Ledger, **Then** the payment appears in recent activity and in the pair's paid history.
4. **Given** no activity, **When** Home opens, **Then** an empty state explains how to record the first expense.
5. **Given** activity on an expense the viewer is not on, **When** they use the app, **Then** none of that activity is visible.

---

### User Story 7 - Keep expenses private (Priority: P2)

As a person using Salo, I want each expense and balance visible only to the people involved, so my spending is not exposed to friends who were not there.

**Why this priority**: Privacy is a condition of using a shared ledger with several friend circles.

**Independent Test**: Create an expense between A and B, then sign in as C, who shares a different expense with A, and verify C cannot open the expense, its items, its history, its QR, or the A–B balance.

**Acceptance Scenarios**:

1. **Given** an expense, **When** a person not listed on it requests it by any route, **Then** access is denied without revealing that the expense exists.
2. **Given** two other people share a debt, **When** a third person uses the app, **Then** that balance is never shown to them.
3. **Given** a person's display name or payment QR, **When** someone with no shared expense requests it, **Then** it is not shown.
4. **Given** the creator and payer, **When** they edit an expense, **Then** only they can change it; every other listed person is view-only.

---

### User Story 8 - Show a payment QR (Priority: P3)

As a person who is owed money, I want my payment QR available on the debt I am owed, so the other person can pay without asking for details again.

**Why this priority**: It removes a common back-and-forth but does not change any ledger rule.

**Independent Test**: Add a QR to a person, open a debt they are owed, view the QR, and confirm the amount matches the debt.

**Acceptance Scenarios**:

1. **Given** a person in Settings, **When** they upload a payment QR image and a short label, **Then** it is saved privately to them.
2. **Given** a debt, **When** the person owed has a QR, **Then** the debt row offers a Scan to pay action showing the QR, the label, and the amount.
3. **Given** a debt, **When** the person owed has no QR, **Then** the sheet says to ask them and still allows Mark paid.
4. **Given** a person with no shared expense, **When** they try to view the QR, **Then** it is not shown.

---

### Edge Cases

- The expense has only the payer; saving is blocked until at least one other person is added.
- The payer is not in the participant list; saving is blocked until the payer is added or another payer is chosen.
- An item has no assignment; saving is blocked and the item is named.
- An item amount is zero, negative, or not a valid amount; saving is blocked.
- An item is assigned to one person; the total still equals the sum of items and only the assigned people owe.
- A shared dish is split equally across three people; the helper creates one line per person, the remainder centavo is assigned deterministically, and all lines remain independently editable.
- An item amount has more than two decimal places; it is rejected or rounded at entry, and the stored amount is exact.
- The payer covers someone; the covered share is absorbed by the payer and creates no debt.
- B covers C and C covers B; the change is blocked as a loop.
- D covers B while B covers C; the change is blocked because coverage is one level only.
- The payer is set as covered; the change is blocked.
- The same person is set as coverer for two covered people; it is allowed, and both shares are added to the coverer.
- A covered person is removed from the expense; their coverage is cleared and shares recalculate.
- A coverer is removed from the expense; any people they covered become responsible for their own shares and the editor is warned before saving.
- The payer is removed from the expense; the editor must choose a new payer first.
- The creator tries to remove themselves from the expense; the change is blocked, and they are told to delete the expense instead.
- Two people edit the same expense; the later save is rejected and the latest version is shown.
- An expense is edited after a debt from it was marked paid; the pair's balance is recalculated, the payment record stays, and any excess reverses the direction of the debt.
- An expense is deleted after a payment; the payment record stays and the pair's balance is recalculated.
- A marked payment is undone; the balance returns and the correction is recorded.
- The same name is added twice to one expense; the existing placeholder is returned, not duplicated.
- The creator adds their own name; it is allowed only as a separate placeholder, which they cannot claim because they are already on the expense.
- A placeholder is the payer; the expense records who entered it, and the person sees it after claiming the link.
- A placeholder is a coverer; the debt is recorded against them and becomes visible and actionable after they claim the link.
- Two people open the same link; the first claim wins and the second sees the name as taken.
- A link is refreshed after someone has already joined; the person stays joined and only new claims need the new link.
- A link is opened by someone who is already on the expense; they are told they are already on it.
- The creator loses the link; refreshing creates a new 7-day link and invalidates the old one while the expense remains.
- A person signs in with Google before anyone shares an expense; Home is empty and no expense is visible.
- A person has no shared expense with the viewer; their name and QR are not shown.
- Participants open an expense; they see display names and never email addresses.
- The connection drops while saving; the save fails with a clear message and no partial expense is created.
- The app is opened offline; cached expenses can be read, and saving explains that a connection is needed.
- The expense history is empty because the expense was just created; it shows the creation event.
- A deleted expense is removed from balances and lists; its deletion appears in the recent activity of its participants and it cannot be opened again.
- A person opens All expenses; only the expenses they are on appear, newest first.
- A person with an outstanding debt tries to delete their account; deletion is blocked until the balance is settled.
- A payment QR is larger than the limit or not PNG/JPEG; the upload is rejected with the limit explained.
- A payment QR is replaced or removed; the old image is no longer served.
- No old payment QR is carried over; every person starts with none after the wipe.
- A QR is opened while offline; the sheet asks the person to connect.
- The QR is scanned with a banking app; Salo does not change the ledger, and the debt is still cleared by Mark paid.

## Requirements *(mandatory)*

### Functional Requirements

#### Accounts and access

- **FR-001**: A person MUST sign in before seeing any expense, balance, person, activity, or payment QR.
- **FR-002**: Sign-in MUST use Google OAuth only. Self-service Google sign-up MUST be allowed, and a new account MUST land on an empty Home. Email one-time codes, magic links, Sign in with Apple, and any authentication or invite email MUST NOT be used.
- **FR-003**: Every person MUST have a stable identity and an editable display name; email is account identity data and MUST NOT be required for a person on an expense.
- **FR-004**: A person MUST be able to sign out and to delete their account from Settings.
- **FR-005**: Account deletion MUST be blocked while the person owes or is owed any amount, and past expenses MUST keep the display name recorded on them.
- **FR-006**: Sessions MUST persist across app launches and renew without losing the current screen when possible.
- **FR-007**: An expense, its items, its shares, its coverage, and its history MUST be visible only to the people listed on it.
- **FR-008**: A pairwise balance MUST be visible only to the two people in that pair.
- **FR-009**: A person's display name and payment QR MUST be shown only to people who share at least one expense or open balance with them.
- **FR-010**: The product MUST NOT offer a directory, search across strangers, or public profiles; people are added by name to an expense.
- **FR-011**: Email addresses MUST NOT be shown to other participants and MUST NOT be required to add a person.
- **FR-012**: A request for an expense, balance, or image outside the viewer's access MUST be denied without revealing whether it exists, except for the limited expense summary available through a valid share link.
- **FR-013**: A person MUST NOT be able to bypass these access rules by any route, link, or repeated request.

#### People and sharing

- **FR-014**: A person MUST be able to add another person to an expense by name.
- **FR-015**: A new name MUST create a placeholder person that can be listed on the expense, be the payer, or cover someone immediately.
- **FR-016**: The creator or payer MUST be able to create one expense share link, valid for 7 days, and reuse it while it is valid.
- **FR-017**: A share link MUST identify exactly one expense, be unguessable, and grant only the ability to preview that expense and claim one open name on it.
- **FR-018**: Opening a share link MUST require Google sign-in; the recipient MUST see the expense summary and the open names before claiming.
- **FR-019**: Claiming an open name MUST merge the placeholder into the recipient's account person, apply the recorded share, and make the expense visible in their ledger.
- **FR-020**: A claimed name MUST stop being listed as open; a claim on a taken name MUST fail with a clear message.
- **FR-021**: The creator or payer MUST be able to refresh the link; refreshing MUST invalidate the previous link and start a new 7-day window.
- **FR-022**: An expired or refreshed link MUST be refused without revealing the expense.
- **FR-023**: Settings MUST list the people the viewer has shared an expense with, with joined or not joined status; it MUST NOT create or list personal invite links.
- **FR-024**: A display name MUST be editable by its owner and MUST be shown the same way on every expense.
- **FR-025**: A payer MUST NOT be removed from an expense; the editor MUST choose a different payer first.
- **FR-026**: Removing a participant MUST remove their share, clear any coverage involving them, and warn the editor when someone they covered becomes responsible for their own share. The creator MUST NOT remove themselves; the creator and payer MUST remain participants.
- **FR-027**: An expense MUST have at least two participants, including the payer, and at most twelve participants.
- **FR-028**: The product MUST use the term "People" wherever people are listed or added; "adults" and "students" MUST NOT appear.

#### Recording an expense

- **FR-029**: Any signed-in person MUST be able to create an expense, and the creator MUST be one of its participants.
- **FR-030**: An expense MUST record a description, a date, one payer, the people who were there, the items, and any coverage.
- **FR-031**: The payer MUST be one of the listed people.
- **FR-032**: The description MUST be required; the date MUST default to today and MUST be editable.
- **FR-033**: Each item MUST have a name and an amount greater than zero.
- **FR-034**: Each item MUST be assigned to exactly one listed person.
- **FR-035**: The expense total MUST be the sum of its items; the product MUST NOT offer a manual total, a fixed total, tax, service charge, discount, or receipt reconciliation.
- **FR-036**: Saving MUST be immediate; the product MUST NOT have a draft, finalize, reopen, lock, or fixed-total step.
- **FR-037**: Saving MUST compute and store each person's share, and the shares MUST sum exactly to the item total.
- **FR-038**: Item amounts MUST be recorded to the centavo. Every stored item MUST have an exact positive integer amount, and a share MUST remain a sum of assigned amounts. The ledger MUST NOT store a fractional or multi-person amount. An equal-split helper MAY divide a user-entered total before adding items; it MUST create exact integer-centavo lines, assign any remainder deterministically, show the per-person amounts before adding, and prove that the generated lines sum exactly to the entered total.
- **FR-039**: A dish eaten by several people MUST be recorded as one line per person. The editor MAY offer an equal-split helper that creates those lines from a user-entered total; it MUST NOT store a shared line, a multi-person item, or an unequal custom split.
- **FR-040**: Saving MUST be blocked with a named reason when the expense is incomplete or invalid.
- **FR-041**: The expense detail MUST show the description, date, payer, every person, every item and its assignment, each person's share, any coverage, the total, and the change history.
- **FR-042**: The creator and the payer MUST be able to edit the description, date, payer, people, items, and coverage; every other listed person MUST be view-only.
- **FR-043**: The creator and the payer MUST be able to delete an expense after a confirmation that names it.
- **FR-044**: An edit MUST recalculate shares and every affected balance immediately.
- **FR-045**: A delete MUST remove the expense and its shares from every balance and list, keep the deletion in the participants' recent activity, and make the expense impossible to open again.
- **FR-046**: A save based on an older version of the expense MUST be rejected, and the latest version MUST be shown before retrying.
- **FR-047**: Saving MUST require a connection; cached expenses MAY be read offline, and the save MUST fail cleanly without creating a partial expense.
- **FR-048**: All expenses MUST list every expense the viewer is on, newest first, with the date, description, payer, total, and the viewer's share.
- **FR-049**: Home MUST provide a See all action that opens All expenses.

#### Shares and coverage

- **FR-050**: Every listed person who is not covered MUST owe their share to the payer.
- **FR-051**: A covered person's full share MUST be charged to their coverer.
- **FR-052**: A covered person MUST owe nothing for that expense and MUST see who covered them.
- **FR-053**: A coverer MUST be one of the listed people.
- **FR-054**: Each covered person MUST have exactly one coverer.
- **FR-055**: A person MUST NOT cover themselves.
- **FR-056**: The payer MUST NOT be covered.
- **FR-057**: Coverage MUST be one level only: a person who covers someone MUST NOT also be covered in the same expense.
- **FR-058**: Coverage loops and chains MUST be rejected with a clear reason.
- **FR-059**: Coverage MUST NOT change any item assignment or the item total.
- **FR-060**: Coverage MUST apply to one expense only and MUST NOT carry into another expense.
- **FR-061**: Changing or removing coverage MUST recalculate the affected shares immediately.
- **FR-062**: When the payer covers someone, the covered share MUST be absorbed by the payer and MUST NOT create a debt.

#### Balances and payments

- **FR-063**: A pairwise balance MUST be the sum of the two people's shares across shared expenses, minus the payments marked between them.
- **FR-064**: Balances MUST be netted per pair, so a person sees one amount and one direction per other person.
- **FR-065**: A fully settled pair MUST NOT appear as an active debt.
- **FR-066**: Home MUST show the total the viewer owes, the total owed to the viewer, and each active pairwise amount.
- **FR-067**: Ledger MUST list every active pairwise debt with the other person, the direction, and the amount.
- **FR-068**: Ledger MUST show the paid history between the viewer and each other person.
- **FR-069**: Either person in a debt MUST be able to mark the full outstanding amount paid.
- **FR-070**: Marking paid MUST NOT require confirmation, a note, or a partial amount.
- **FR-071**: A marked payment MUST record the pair, the amount, the date, and who marked it.
- **FR-072**: Marking paid MUST clear the active debt immediately.
- **FR-073**: Either person MUST be able to undo a marked payment by mistake; the balance MUST be restored and the correction recorded in history.
- **FR-074**: Editing or deleting an expense MUST recalculate the pair's balance while keeping every marked payment; if payments exceed the recalculated shares, the direction MUST reverse and the net debt MUST be shown the other way. The editor MUST be warned when the change affects a pair with a marked payment.
- **FR-075**: A new expense between two people MUST create a new active debt even after an earlier debt was settled.
- **FR-076**: Amounts MUST be Philippine pesos, stored and displayed to the centavo.
- **FR-077**: A zero balance MUST NOT be shown as a debt.
- **FR-078**: Only the viewer's own pairwise debts MUST be listed; debts between two other people MUST NOT be shown.

#### Activity and history

- **FR-079**: Home MUST show the five most recent events across the viewer's expenses, newest first.
- **FR-080**: Each expense MUST show its full change history to its participants.
- **FR-081**: Expense history MUST include creation, edits with the values that changed, people added or removed, and coverage changes; a deletion MUST appear in the participants' recent activity instead.
- **FR-082**: Marked payments MUST appear in the pair's paid history and in recent activity.
- **FR-083**: Activity MUST name the person who made the change and MUST show before and after values for money-relevant edits.
- **FR-084**: Activity MUST NOT reveal an expense, a person, or a balance the viewer cannot otherwise see.
- **FR-085**: Activity MUST show an explicit empty state when there is nothing to show.
- **FR-086**: The product MUST NOT have a separate Activity tab or a group-wide activity feed.

#### Payment QR

- **FR-087**: A person MUST be able to store one payment QR image and a short label on their own profile.
- **FR-088**: A person MUST be able to replace or remove their own payment QR; nobody else may change it.
- **FR-089**: A payment QR MUST be PNG or JPEG up to 2 MB; any other upload MUST be rejected with the reason.
- **FR-090**: A payment QR MUST be private and shown only to people who share at least one expense or open balance with its owner.
- **FR-091**: A payment QR MUST NOT have a public link and MUST NOT appear in activity text.
- **FR-092**: The app MUST display the QR for scanning by the viewer's own banking app and MUST NOT open the camera or scan QR codes.
- **FR-093**: The QR MUST be reachable from Home's debt card and from a Ledger debt row.
- **FR-094**: The pay sheet MUST show the owner's name, the QR label, and the amount owed.
- **FR-095**: When the owner has no QR, the sheet MUST say to ask them and MUST still allow Mark paid.
- **FR-096**: Viewing a QR MUST require a connection, and the viewer MUST be told to connect when offline.

#### Navigation and experience

- **FR-097**: Navigation MUST use three tabs: Home, Ledger, Settings.
- **FR-098**: Home MUST lead with the viewer's balance and New expense, followed by recent activity and a See all action for expenses.
- **FR-099**: Ledger MUST show active debts and paid history.
- **FR-100**: Settings MUST contain the person's profile, People, payment QR, install guidance, and account actions.
- **FR-101**: There MUST be no table or group switcher, group setup, members panel, ownership, archive, or lifecycle screen.
- **FR-102**: A new account MUST land on an empty Home and MUST be able to record the first expense without any setup step.
- **FR-103**: The interface MUST remain light-only in the stone/ink visual world, with no appearance switch.
- **FR-104**: Tap targets MUST be at least 44 points, focus MUST be visible, controls MUST have accessible names, and reduced motion MUST be respected.
- **FR-105**: Loading, empty, offline, error, and not-joined states MUST be explicit.
- **FR-106**: Settings MUST provide install guidance for iPhone and Android.
- **FR-107**: The expense editor MUST be usable one-handed, with the primary action reachable without horizontal scrolling.
- **FR-108**: Every primary screen MUST render without clipping or horizontal overflow at 360, 390, 412, 430, and 1440 widths.
- **FR-109**: No interaction may depend on hover.
- **FR-110**: The product MUST NOT include third-party analytics, ad software, tracking pixels, receipt images, OCR, or AI extraction.

#### Data and rollout

- **FR-111**: Existing sign-in accounts MUST be retained through the change.
- **FR-112**: All old group, table, outing, student, expense, settlement, activity, and payment QR data MUST be discarded at release, after a fresh verified production backup and explicit sign-off.
- **FR-113**: The system MUST NOT migrate, import, archive, or carry over old ledger data or payment QR images into the new product.
- **FR-114**: After rollout, every existing account MUST open an empty Home with no group or table setup.
- **FR-115**: Old ledger data and payment QR images MUST NOT be restorable from inside the app.

#### Removed surfaces

- **FR-116**: The product MUST NOT include tables, groups, group invites, a switcher, group member management, ownership transfer, archiving, or group deletion.
- **FR-117**: The product MUST NOT include students, a student roster, or student coverage.
- **FR-118**: The product MUST NOT include owner-only finalization, reopening, locking, fixed totals, or drafts.
- **FR-119**: The product MUST NOT include recaps, share images, CSV exports, or JSON exports.
- **FR-120**: The product MUST NOT include an Activity tab.
- **FR-121**: The product MUST NOT include multiple payers, unequal custom splits, stored multi-person items, per-line multi-person splits, partial payments, recipient confirmation, or disputes.

#### Item entry

- **FR-122**: The equal-split helper MUST divide the total using integer centavos: each person receives `floor(total / people)`, and the first `total % people` people in display order receive one extra centavo. It MUST support 2–12 people, a total greater than zero, and a dish name. Generated items MUST be independent after creation.
- **FR-123**: The editor MUST offer a persistent quick-add composer that appends a named, exact-amount item without creating a blank row. After adding, the name field MUST clear and keep focus, the last-used person MUST remain selected, and the item count and total MUST update immediately. Removing the last item MUST be allowed while the composer remains.

### Key Entities

- **Account**: A signed-in person, with a stable identity, an account email, a display name, and a payment QR.
- **Person**: A participant identity on expenses, linked to an account or waiting to be claimed through an expense link.
- **Share link**: An expiring, unguessable link to one expense that lets a signed-in recipient claim one open name on it.
- **Expense**: A shared purchase with a description, date, one payer, listed people, items, coverage, computed shares, creator, and version.
- **Expense item**: A line on an expense with a name, an amount, and an assignment to one person.
- **Share**: The amount a person owes for one expense: their assigned items, plus any share they cover, and zero when they are covered.
- **Coverage**: A one-level link inside one expense where a coverer absorbs a covered person's full share.
- **Debt**: The net pairwise amount between two people across shared expenses minus marked payments, with one direction and one amount.
- **Payment**: A marked-paid record between two people, with the amount, the date, and who marked it; reversible by either person.
- **Activity event**: A change to one expense, with the actor, the affected values, and the time.
- **Payment QR**: A private image and short label owned by one person and shown only to people who share an expense or balance with them.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in person can record a three-person, five-item expense from Home in under 2 minutes.
- **SC-002**: 100% of saved expenses have shares that sum exactly to the item total across randomized checks covering assigned items and coverage.
- **SC-003**: 100% of attempts by a non-participant to open an expense, its items, its history, or a QR are denied in the access tests.
- **SC-004**: A person can see who they owe and who owes them within 5 seconds of opening the app.
- **SC-005**: A debt can be marked paid and cleared from the active list in under 15 seconds with no confirmation step.
- **SC-006**: In 100% of covered shares, the amount is charged to the coverer and the covered person owes zero for that expense.
- **SC-007**: Editing or deleting an expense updates every affected balance within 2 seconds of saving.
- **SC-008**: No screen offers tables, groups, students, drafts, finalize, lock, reopen, recaps, exports, or a fourth tab in the release review.
- **SC-009**: 100% of newly added names create a placeholder person that can be claimed from the expense link.
- **SC-010**: A person who has never used the app can open a share link, sign in with Google, claim a name, and see their expense in under 2 minutes.
- **SC-011**: Every primary screen renders without clipping or horizontal overflow at 360, 390, 412, 430, and 1440 widths in the light theme.
- **SC-012**: All primary flows pass the accessibility review for 44-point targets, contrast, focus order, labels, and reduced motion.
- **SC-013**: A fresh account can record its first expense in under 3 minutes without a group or table setup.
- **SC-014**: After rollout, sign-in works with Google for every retained account that has a Google identity, and no old ledger data or payment QR appears anywhere in the app.
- **SC-015**: A person can open the owed person's payment QR from a debt row in under 10 seconds.
- **SC-016**: 100% of payment-QR requests from people with no shared expense are denied, and no QR is reachable by public link.
- **SC-017**: A person can find and open a past expense from Home in under 10 seconds.
- **SC-018**: 100% of equal-split operations across randomized totals and 2–12 people produce per-person lines that sum exactly to the entered total, with no amount differing by more than one centavo.

## Assumptions

- The product stays an installable web app; the iPhone and Android shells, install guidance, and offline reads are retained.
- The interface stays light-only in the stone/ink visual world; there is no dark-mode switch in this release.
- The product stays single-currency: Philippine pesos, English, and Asia/Manila dates.
- Existing sign-in accounts are retained while old ledger data is wiped at release, after a fresh verified production backup and explicit sign-off.
- Existing accounts are expected to sign in with Google using their recorded email; an account without a Google identity must create one with that address or be re-added by name and claim the expense link.
- Every person eventually has a Google account; a not-joined placeholder is a temporary identity that can be listed, pay, or cover before signing in.
- A placeholder may be recorded as the payer or a coverer by the creator; they can act on it only after claiming the expense link.
- One payer per expense; multiple payers, unequal custom splits, and per-line multi-person splits are out of scope.
- Every item belongs to one person and has a name and amount; split dishes are entered as one line per person.
- Coverage is one level and per expense; standing coverage, chains, and coverage across expenses are out of scope.
- Payments are full-amount marks, not partial installments; mistakes are corrected by an undo, not by editing the amount.
- An expense share link expires after 7 days and can be refreshed; the placeholder and their expenses remain.
- Account deletion requires a zero net balance in both directions, whether the person owes or is owed.
- An active person can mark a debt paid even while the other person has not joined; the other person sees the record after claiming the link.
- Balances are net pairwise amounts; an edit or delete after a payment can reverse the direction of a debt.
- Saving requires a connection; cached expenses may be read offline.
- Group size is friends-and-family scale: 2–12 people per expense.
- Sign-in is Google only; no custom SMTP, sending domain, or authentication email is required.
- Email is account identity data only; no invite email is sent, and there are no product notifications, push messages, or digests.
- All expenses is reached from Home; navigation stays three tabs.
- No old payment QR image is carried over; each person starts with none.
- The product has no analytics, advertising, receipt capture, OCR, or AI extraction.
- The existing visual identity, typography, spacing rhythm, and light stone/ink palette are kept; this release changes the product model, not the visual world.

## Out of Scope

- Tables, groups, group invitations, group switcher, group member management, ownership transfer, archive, and group deletion.
- Students, a student roster, and student coverage.
- Drafts, finalization, reopening, locking, fixed totals, owner-only controls, and manual totals.
- Recaps, share images, CSV exports, JSON exports, and data portability features.
- A fourth Activity tab and group-wide activity feeds.
- Multiple payers, unequal custom splits, shared-item splits, per-line multi-person splits, partial payments, recipient confirmation, and disputes.
- Email one-time codes, magic links, custom SMTP, sending domains, authentication or invite email delivery, and per-email invitation links.
- Sign in with Apple.
- Multi-currency, taxes, service charges, discounts, and printed-receipt reconciliation.
- Quantity, unit price, and other receipt line details.
- Public profiles, friend discovery, and global friend directories.
- Receipt images, OCR, AI extraction, analytics, advertising, and tracking.
- Native apps, store listings, and Trusted Web Activity wrappers.
- Dark mode and an appearance switch.
- Migration, archiving, or carry-over of the old group/table ledger or its payment QR images.
