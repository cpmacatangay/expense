# Feature Specification: Salo Shared PWA

**Feature Branch**: `002-salo-pwa`

**Created**: 2026-11-09

**Status**: Ready for plan

**Input**: User description: "Salo becomes a single installable PWA for shared group meal ledgers. iPhone-first UI on iOS, Material 3 on Android. Full parity with the archived Android app, plus groups, invitations, live activity, confirmed settlements, and private offline drafts."

## Clarifications

### Session 2026-11-09

| Topic | Decision |
|---|---|
| Platform | PWA only. The Android native app is archived. Browser install on iPhone and Android. No Trusted Web Activity and no store listing in v1. |
| UI shells | iPhone-first shell on iOS; Material 3 shell on Android. Shared information architecture and domain rules. Platform detection plus a manual appearance override. |
| Identity | Sign-in is required. Every adult in a group has an account. Students do not have accounts. Pending adults are allowed until they join. |
| Auth | Google OAuth and email one-time code/magic link. No Sign in with Apple in v1. Custom SMTP for reliable email. |
| Groups | Shared group ledger. 2–12 adults. A user may own one group and join many. Group switcher on Home. |
| Owner | One owner per group; owner is the only admin in v1. The owner can transfer ownership and cannot leave a group ownerless. |
| Invitations | Share link plus short code, bound to a pending adult. Revocable and expiring. |
| Attendance | Each outing selects present adults and present students. Shared costs split across present adults plus present students. |
| Payer | Exactly one payer per outing; the payer must be present. |
| Money | Item sum is authoritative. Total is Auto by default, Manual when typed, and Fixed for a reopened outing. No tax, service charge, discount, or printed-receipt reconciliation. No OCR or LLM. |
| Settlements | Payer records; recipient confirms or declines with a note. Only confirmed settlements affect balances. Owner may record for a pending adult; confirmation waits until that adult joins. |
| Collaboration | Live updates. Shared edits require connectivity. Stale writes are rejected and the member sees the latest data. Private drafts are local until published. |
| Drafts | A private draft is visible to its author and the group owner; either may publish it. Other members see it only after publication. |
| Activity | Full activity feed for group members, with actor and before/after values for sensitive changes. |
| Export | Owner exports the full group; a member exports their own data. |
| Students | Owner manages the roster; members mark present and set coverage. Student records hold a display name and optional notes only. |
| Recap | Text plus a portrait image. No invite link or QR code on the recap. |
| Payment QR | One primary uploaded payment QR image per adult identity, with a label. Display-only; members scan it with their own banking app. Private to the group; never in recaps or exports; no in-app scanner. |
| Currency/time | Philippine pesos, English, Asia/Manila. Fixed for all groups in v1. |
| Data | Start fresh. The old Android local database is kept as an unlisted backup. No migration into the shared product. |
| Backend | New isolated shared backend project. The old snapshot project remains as a backup. |
| Hosting | Free static host and subdomain. Custom domain is optional. |
| Notifications | In-app only in v1. No product email or push notifications; email is used only for authentication. |
| Design | Same Salo brand. iPhone shell: warm neutral ground, Ledger Green accent, grouped lists, one balance card, SF Pro, light-first, deep green-black/mint dark, shared-table signature, initials. Android shell: Material 3 light-first, system dark, same green identity. Quiet iOS motion. |
| Out of scope | Apple sign-in, native apps, TWA, store listings, push, OCR, LLM, receipt images, multiple payers, multiple admins, multi-currency, photo avatars, public group discovery, offline shared writes. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create or join a shared group (Priority: P1)

As an adult with an account, I want to create a group or join one through an invitation, so my friends and I can share one ledger.

**Why this priority**: Nothing else can happen until a group exists and its adults are known.

**Independent Test**: Sign in, create a group, invite a second adult, join as that adult, claim the pending identity, and verify both members see the same group.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no group, **When** they create a group with a name and color, **Then** they become the owner and the first adult in the group.
2. **Given** an owner with a pending adult, **When** they share the invitation link and code, **Then** the invited person can sign in, claim that adult identity, and join the group.
3. **Given** an invitation that has expired or been revoked, **When** the recipient tries to join, **Then** access is denied with a clear message.
4. **Given** a user who belongs to several groups, **When** they open Home and switch groups, **Then** only that group's balances, outings, and activity are shown.
5. **Given** a user who is not a member of a group, **When** they try to open its data by any route, **Then** access is denied.
6. **Given** a group with 12 adults, **When** the owner tries to invite another, **Then** the invite is blocked with the group limit explained.

---

### User Story 2 - Record and finalize an outing (Priority: P1)

As a group member, I want to record the meal, who attended, what each person had, and the total, so the split is exact and everyone can see it.

**Why this priority**: This is the core value of the product.

**Independent Test**: Create a draft, select present adults and students, add items, assign them, check the total in Auto and Manual, have the owner finalize, and verify the shares sum exactly.

**Acceptance Scenarios**:

1. **Given** a shared draft, **When** a member adds, edits, deletes, splits, or merges an item, **Then** the total follows the item sum while Auto is active.
2. **Given** a member types a total, **When** an item changes afterward, **Then** the typed total stays put; "Use items total" restores Auto.
3. **Given** a reopened outing, **When** an item changes, **Then** the saved total stays fixed.
4. **Given** present adults and present students, **When** a shared item is split, **Then** each present person receives a head share and each student's share is charged to the covering adult.
5. **Given** an outing with no items, **When** it is finalized, **Then** the total splits per head across present adults and present students.
6. **Given** an unassigned item, a present student without coverage, a payer who is not present, or fewer than two present adults, **When** the owner tries to finalize, **Then** finalization is blocked with the exact issue named.
7. **Given** a non-owner member, **When** they try to finalize or reopen, **Then** the action is not available.
8. **Given** a pending adult who attended and paid, **When** the owner finalizes, **Then** the pending adult may be present and the payer, and their share is recorded.
9. **Given** an outing changed by another member since it was loaded, **When** a member tries to save, **Then** the stale write is rejected and the latest data is shown.
10. **Given** no connection, **When** a member prepares a private draft, **Then** it stays local and is not visible to other members until published.

---

### User Story 3 - See who owes whom and settle (Priority: P1)

As a group member, I want to see the running balances and record payments that the recipient confirms, so the group can settle without arguments.

**Why this priority**: The shared ledger only replaces the group chat if balances and settlements are trustworthy.

**Independent Test**: Finalize two outings with different payers, record a partial payment, have the recipient confirm it, and verify the balances change only after confirmation.

**Acceptance Scenarios**:

1. **Given** finalized outings, **When** Ledger opens, **Then** the member sees their net balance and the pairwise who-owes-whom suggestions.
2. **Given** a member records a payment, **When** the recipient confirms it, **Then** the confirmed amount reduces the balance exactly.
3. **Given** a member records a payment, **When** the recipient declines it with a note, **Then** the balance does not change and the declined record remains visible.
4. **Given** a pending settlement, **When** the member views balances, **Then** pending amounts are shown separately and do not reduce the confirmed balance.
5. **Given** a payer and payee are the same adult, **When** a settlement is recorded, **Then** it is blocked.
6. **Given** a settlement larger than the confirmed outstanding balance, **When** it is recorded, **Then** it is blocked.
7. **Given** a recipient who is still pending, **When** a settlement is recorded for them, **Then** it remains pending until they join and confirm.

---

### User Story 4 - Use Salo on iPhone and Android (Priority: P1)

As a member, I want Salo to feel native on my phone, install from the browser, and keep my work when the signal drops, so I can use it at the table.

**Why this priority**: The PWA is the only client; its platform fit and offline behavior are part of the product.

**Independent Test**: Install on an iPhone and an Android phone, verify the correct shell on each, create a private draft offline, publish it online, and confirm both shells show the same data.

**Acceptance Scenarios**:

1. **Given** an iPhone, **When** the app opens, **Then** the iPhone-first shell is used with safe-area handling, system typography, and bottom tabs.
2. **Given** an Android phone, **When** the app opens, **Then** the Material 3 shell is used with a top app bar, navigation bar, and Material components.
3. **Given** a user who prefers the other shell, **When** they change Appearance in Settings, **Then** the chosen shell is used and remembered.
4. **Given** a supported browser, **When** the user installs the app, **Then** it opens from the home screen and the shell works offline.
5. **Given** no connection, **When** the user opens a cached group, **Then** reads and private drafts work and shared writes explain that a connection is required.
6. **Given** a draft created offline, **When** the user publishes it online, **Then** it becomes a shared draft exactly once, with no duplicate.
7. **Given** the connection returns, **When** live updates resume, **Then** new items, settlements, and activity appear without a manual refresh.

---

### User Story 5 - Track activity, history, and export (Priority: P2)

As a group member, I want a clear activity feed, outing history, and an export, so I can understand what changed and keep a copy.

**Why this priority**: Shared money needs an audit trail and a portable record.

**Independent Test**: Finalize an outing, change a member, confirm a settlement, then verify the activity feed, history, and export contents.

**Acceptance Scenarios**:

1. **Given** group changes, **When** Activity opens, **Then** members see who did what, in reverse chronological order.
2. **Given** a sensitive change, **When** it appears in Activity, **Then** the before and after values are available.
3. **Given** finalized outings, **When** History opens, **Then** the member can filter by date, adult, or student.
4. **Given** the owner, **When** they export the group, **Then** the file contains all outings, items, shares, settlements, and activity.
5. **Given** a member, **When** they export, **Then** the file contains only their own shares and settlements.

---

### User Story 6 - Share a recap (Priority: P2)

As a member, I want to share a clear recap as text or an image, so the group has a record outside the app.

**Why this priority**: The recap is how the result travels into the group chat.

**Independent Test**: Generate a recap for a finalized outing, share the image and text, and verify both match the finalized shares.

**Acceptance Scenarios**:

1. **Given** a finalized outing, **When** the user chooses Share recap, **Then** both text and image options are offered.
2. **Given** the recap, **When** it is rendered, **Then** it shows the group name, date, place, total, each present adult's share, the payer, and the settlement suggestions.
3. **Given** the recap, **When** it is shared, **Then** it contains no invite link or QR code.
4. **Given** the share sheet is unavailable, **When** the user shares, **Then** the text can be copied and the image can be downloaded.
5. **Given** an outing is reopened and corrected, **When** a recap is generated again, **Then** it reflects the new snapshot.

---

### User Story 7 - Manage the group, members, and students (Priority: P2)

As the owner, I want to invite and remove members, manage pending adults and the student roster, transfer ownership, and archive the group, so the group stays correct over time.

**Why this priority**: A shared group needs lifecycle controls without breaking history.

**Independent Test**: Invite an adult, soft-remove a member with a balance, transfer ownership, archive the group, and verify history is retained and access is correct.

**Acceptance Scenarios**:

1. **Given** the owner, **When** they create a pending adult and invite them, **Then** the adult appears as pending until claimed.
2. **Given** a member with history, **When** the owner soft-removes them, **Then** they lose access but their adult identity, shares, and activity remain.
3. **Given** the owner, **When** they transfer ownership to another active adult, **Then** the new owner gains owner actions and the old owner becomes a member.
4. **Given** the owner, **When** they archive the group, **Then** members lose access and the data is retained for the owner.
5. **Given** the owner, **When** they soft-delete the group with confirmation, **Then** it is hidden and can be restored within the retention window.
6. **Given** the owner, **When** they add, edit, archive, or reactivate a student, **Then** the roster changes without altering finalized history.
7. **Given** a member, **When** they mark students present and set coverage, **Then** the outing uses those choices without letting them edit the roster.

---

### User Story 8 - Scan the payee's payment QR (Priority: P2)

As a member who owes money, I want to see the payee's payment QR so I can scan it with my banking app and pay without asking for the details again.

**Why this priority**: It removes the most common back-and-forth at settlement time without changing the ledger rules.

**Independent Test**: Add a payment QR to an adult, open a debt row, view the QR, scan it with a banking app, record the settlement, and verify the recipient still confirms it.

**Acceptance Scenarios**:

1. **Given** an active adult, **When** they upload a payment QR image and label, **Then** the QR is saved privately for that group and shown to group members.
2. **Given** a member who owes a payee with a QR, **When** they open the Home balance card or a debt row, the Ledger, or the payee's outing, **Then** they can open a "Scan to pay" sheet showing the payee's QR and amount.
3. **Given** the payee has no QR, **When** the member opens the pay action, **Then** the sheet says to ask the payee and still lets the member record the settlement.
4. **Given** a pending adult, **When** the owner uploads a QR on their behalf, **Then** members can view it and the adult can manage it after claiming the identity.
5. **Given** a removed adult, **When** a member opens a new payment action, **Then** that adult's QR is no longer served.
6. **Given** a recap, **When** it is shared, **Then** it contains no payment QR, image, or payment handle.
7. **Given** a member scans the QR with their banking app, **When** they return to Salo, **Then** the settlement is still recorded and confirmed manually; scanning does not change the ledger.

---

### Edge Cases

- The group has only one active adult; finalization is blocked until at least two present adults exist.
- The owner tries to leave without transferring ownership; the action is blocked.
- The owner tries to delete their account while owning an active or archived group; they must transfer or delete it first.
- A pending adult is the payer; finalization is allowed, but settlement confirmation waits until they join.
- A pending adult is the recipient of a settlement; the settlement remains pending until they join.
- A member with an outstanding balance is soft-removed; history remains, and the balance remains visible to the group.
- The recipient declines a settlement; the record stays visible, balances do not change, and the payer can void it and re-record. A pending settlement can be edited before the recipient decides.
- A settlement exceeds the confirmed balance; it is blocked.
- The payer and payee are the same adult; it is blocked.
- A duplicate settlement with the same payer, payee, amount, and date is about to be recorded; the user is warned.
- Two members edit the same outing online; the stale write is rejected and the latest data is shown.
- A member loses connection while publishing a draft; the publish retries without creating a duplicate.
- A private draft is mirrored to the server; only the author and owner can see it until it is published.
- Local storage is evicted; the server data remains, and a lost private draft is explained as local-only.
- An invitation expires or is revoked; joining fails with a clear message.
- An invitation code is guessed repeatedly; rate limiting slows or blocks the attempt.
- A group is archived; members lose access and the owner can still export or restore it.
- A group is soft-deleted; it can be restored within the retention window, then purged.
- A student is archived; historical shares and assignments remain readable.
- A present student is unmarked; their item assignments are cleared and finalization is blocked until resolved.
- An item is assigned to a student who is not marked present; the student is marked present automatically.
- An item is assigned to an adult who is not present; the assignment is blocked.
- Every item is shared; the shared total splits per head across present adults and present students.
- No items are entered; the per-head fallback covers present adults and present students.
- The total is zero or invalid; finalization is blocked.
- A manual total differs from the item sum; the difference is distributed proportionally and the shares still sum exactly.
- A reopened outing keeps its saved total even when items change.
- A finalized outing has settlements; reopening warns before clearing shares.
- The owner is offline when the outing is ready; the outing remains a shared draft and members see that finalization is waiting for the owner.
- A member is soft-removed while a settlement involving them is pending; the record remains, the owner may void it, and history is retained.
- The payee has no payment QR; the pay action explains how to ask for it and the settlement can still be recorded.
- A payment QR image is too large or not PNG/JPEG; the upload is rejected with the limit explained.
- A payment QR is replaced; old signed links stop working and group members see the new image.
- A member opens the payment QR while offline; the sheet asks them to connect because the image is private.
- A pending adult has a QR uploaded by the owner; members can view it, and the adult manages it after claiming the identity.
- An adult is soft-removed; their QR is no longer served for new payments.
- A recap or export is generated; it contains no payment QR image, path, or handle.
- The app is opened in a browser that cannot install; it still works, with install guidance.
- Platform detection is wrong; the manual appearance override corrects it.
- Dynamic Type is very large; rows must expand without clipping.
- A screen reader reads a settlement state; pending, confirmed, declined, and void are announced distinctly.

## Requirements *(mandatory)*

### Functional Requirements

#### Platform and installation

- **FR-001**: The system MUST be one installable web application that works on iOS Safari 16.4+ and current Android Chrome.
- **FR-002**: The system MUST NOT ship a native Android or iOS app, a Trusted Web Activity, or a store listing in v1.
- **FR-003**: The system MUST use an iPhone-first shell on iOS and a Material 3 shell on Android.
- **FR-004**: The system MUST detect the platform and MUST provide a manual appearance override in Settings.
- **FR-005**: Both shells MUST share the same information architecture, money rules, permissions, validation, and copy tone.
- **FR-006**: The system MUST support safe-area insets, 44pt minimum targets, system Dynamic Type, reduced motion, and keyboard focus.
- **FR-007**: The system MUST cache the application shell so it opens offline.
- **FR-008**: The system MUST NOT capture, store, or upload receipt images.
- **FR-009**: The system MUST use English, Philippine pesos, and Asia/Manila dates.
- **FR-010**: The system MUST provide install guidance for iPhone and Android, including the iPhone Add to Home Screen steps.

#### Identity and access

- **FR-011**: A user MUST sign in before accessing any group data.
- **FR-012**: The system MUST support Google OAuth and an email one-time code or magic link. Sign in with Apple is out of scope in v1.
- **FR-013**: Authentication MUST use redirect-based OAuth with PKCE and MUST NOT require a popup.
- **FR-014**: Email delivery MUST use a configured transactional email provider; development-only email delivery MUST NOT be used in production.
- **FR-015**: Each account MUST have a display name and a stable identity.
- **FR-016**: A user MUST be able to sign out from any screen in Settings.
- **FR-017**: A user MUST be able to delete their account only after transferring or deleting every group they own.
- **FR-018**: Sessions MUST persist across app launches and MUST renew without losing the current screen when possible.
- **FR-019**: Unauthenticated or unauthorized requests MUST be denied without revealing group data.
- **FR-020**: No user may read or write data for a group they do not belong to.

#### Groups, adults, and invitations

- **FR-021**: A signed-in user MUST be able to create a group; the creator becomes the owner and the first adult.
- **FR-022**: A group MUST have between 2 and 12 adult identities and exactly one owner.
- **FR-023**: A user MAY own at most one group in v1 and MAY join several groups.
- **FR-024**: The system MUST provide a group switcher on Home.
- **FR-025**: The owner MUST invite an adult by sharing a link and a short code bound to a pending adult identity.
- **FR-026**: Invitations MUST expire after 7 days and MUST be revocable by the owner.
- **FR-027**: Accepting an invitation MUST link the signed-in account to the pending adult identity.
- **FR-028**: A pending adult MUST be includable in an outing, finalizable, and selectable as payer, but MUST NOT sign in, read group data, or confirm settlements until they join.
- **FR-029**: The owner MUST be able to create a pending adult without an immediate invitation.
- **FR-030**: Only the owner may invite, revoke invitations, or add pending adults in v1.
- **FR-031**: A member MUST be soft-removed, preserving their adult identity, shares, settlements, and activity.
- **FR-032**: The owner MUST be able to transfer ownership to another active adult; the group MUST NOT become ownerless.
- **FR-033**: The owner MUST be able to archive a group and to soft-delete it with confirmation; data MUST be retained for a documented restoration window.
- **FR-034**: Group identity MUST use a name, a color from a fixed Salo set, and member initials; photo avatars are out of scope.
- **FR-035**: Row-level access control MUST isolate every group's data.

#### Students

- **FR-036**: The owner MUST be able to add, edit, archive, and reactivate students in the group roster.
- **FR-037**: A student record MUST contain only a display name and optional notes.
- **FR-038**: Any active member MUST be able to mark students present for an outing and set each present student's covering adult.
- **FR-039**: Assigning an item to a student MUST mark that student present.
- **FR-040**: Unmarking a present student MUST clear item assignments to that student and MUST block finalization until resolved.
- **FR-041**: Archiving a student MUST preserve historical assignments and shares.

#### Outings and items

- **FR-042**: Any active member MUST be able to create a shared draft outing.
- **FR-043**: An outing MUST record a date, optional place, optional notes, one payer, present adults, present students, items, and a total.
- **FR-044**: An outing MUST select its present adults; at least two present adults are required to finalize.
- **FR-045**: The payer MUST be one of the present adults.
- **FR-046**: Each item MUST have a name, quantity, unit amount, amount, and an assignment to one present adult, one present student, or shared.
- **FR-047**: Any active member MUST be able to add, edit, delete, split, and merge items while the outing is editable.
- **FR-048**: The total MUST support Auto, Manual, and Fixed modes.
- **FR-049**: In Auto, the total MUST update after every item add, edit, delete, split, or merge.
- **FR-050**: Typing a total MUST switch it to Manual; "Use items total" MUST restore Auto.
- **FR-051**: A reopened outing MUST use Fixed mode and MUST NOT auto-update its saved total.
- **FR-052**: New outings MUST NOT use tax, service charge, discount, or printed-receipt reconciliation.
- **FR-053**: With no items, the total MUST split per head across present adults and present students.
- **FR-054**: Shared items MUST split per head across present adults and present students.
- **FR-055**: A student's share MUST be charged to the covering present adult.
- **FR-056**: Every present student MUST have exactly one present covering adult before finalization.
- **FR-057**: Every item MUST be assigned before finalization.
- **FR-058**: Only the owner MUST be able to finalize an outing; finalization MUST write an immutable share snapshot and the shares MUST sum exactly to the outing total.
- **FR-059**: Only the owner MUST be able to reopen a finalized outing; reopening MUST require confirmation, warn when settlements exist, and record an activity event.
- **FR-060**: The system MUST reject a write based on an older version of an outing and show the latest data.
- **FR-061**: A shared draft MUST be visible to all group members; a private draft MUST be visible only to its author and the owner.
- **FR-062**: A private draft MUST be stored locally, mirrored to the server when the author is online, and published by its author or the owner.
- **FR-063**: Cached reads MUST work offline; shared writes MUST require connectivity in v1.
- **FR-064**: Publishing a private draft MUST create exactly one shared draft and MUST NOT create duplicates on retry.
- **FR-065**: Assignments to an adult who is not present MUST be blocked.
- **FR-066**: A total of zero, a negative amount, or an invalid quantity MUST block finalization.

#### Balances and settlements

- **FR-067**: Balances MUST be computed from finalized outings minus confirmed settlements.
- **FR-068**: Pending settlements MUST be shown separately and MUST NOT affect the confirmed balance.
- **FR-069**: The payer MUST record a settlement; the recipient MUST confirm or decline it with an optional note.
- **FR-070**: Only a confirmed settlement MAY affect balances.
- **FR-071**: The owner MAY record a settlement for a pending adult; confirmation MUST wait until that adult joins.
- **FR-072**: A declined settlement MUST remain visible; the payer MAY void it and re-record. A pending settlement MAY be edited before the recipient decides.
- **FR-073**: A settlement MUST NOT exceed the confirmed outstanding balance between the two adults minus any other pending settlements from the same payer to the same payee, and the payer and payee MUST be different.
- **FR-074**: The system MUST warn before recording a likely duplicate settlement with the same payer, payee, amount, and date.
- **FR-075**: A settlement MAY be partial or full and MUST record a date and an optional note.
- **FR-076**: Voiding a settlement MUST retain the original record and an activity event.
- **FR-077**: Only the recipient MAY confirm or decline a settlement addressed to them.
- **FR-078**: The Ledger MUST show pairwise who-owes-whom suggestions and each member's net balance.
- **FR-079**: Settlement history MUST list pending, confirmed, declined, and void records.
- **FR-080**: Balances MUST be visible to every active member of the group.

#### Activity, history, and export

- **FR-081**: Every active member MUST see a full activity feed for the group.
- **FR-082**: Activity MUST cover group creation, invitations, adult changes, student changes, outing changes, finalization, reopening, settlements, ownership transfer, archive, and delete.
- **FR-083**: Sensitive activity MUST include the actor and before/after values.
- **FR-084**: Activity MUST be paginated and ordered newest first.
- **FR-085**: New activity MUST appear live when the connection is available.
- **FR-086**: The owner MUST export the full group as CSV and JSON.
- **FR-087**: A member MUST export only their own shares, settlements, and activity.
- **FR-088**: Exports MUST include outings, items, shares, settlements, activity, adults, and students for the owner's full export.
- **FR-089**: A recap MUST be available as text and as a portrait image.
- **FR-090**: The recap MUST show the group name, date, place, total, each present adult's share, payer, and settlement suggestions, with no invite link or QR code.
- **FR-091**: The recap MUST use the web share sheet when available and MUST fall back to copy and download.
- **FR-092**: The recap MUST match the finalized snapshot exactly.

#### Collaboration, offline, and sync states

- **FR-093**: The system MUST cache reads for offline use.
- **FR-094**: The system MUST receive live updates for outings, items, shares, settlements, activity, and membership.
- **FR-095**: The system MUST show online, offline, connecting, syncing, published, private draft, and error states.
- **FR-096**: A stale shared write MUST be rejected and the member MUST see the latest data before retrying.
- **FR-097**: A private draft MUST remain local until the author is online; when mirrored, only the author and owner may read it.
- **FR-098**: Publishing a draft MUST be idempotent.
- **FR-099**: Failed publishes, finalizations, and settlement writes MUST be retryable without duplicating data.
- **FR-100**: If local storage is evicted, server data MUST remain intact and the app MUST explain that a lost private draft was local-only.

#### Security and privacy

- **FR-101**: Row-level access control MUST enforce group isolation, owner-only actions, member collaboration, and recipient-only settlement confirmation.
- **FR-102**: The client MUST NOT contain the service-role key or any secret that grants privileged access.
- **FR-103**: Invitation codes MUST be revocable, expiring, rate-limited, and bound to one pending adult.
- **FR-104**: Student data MUST be limited to a display name and optional notes.
- **FR-105**: The system MUST NOT include third-party analytics, ad SDKs, or tracking pixels.
- **FR-106**: The system MUST NOT capture or upload receipt images, receipt text, or use OCR/LLM extraction.
- **FR-107**: Only the owner may export the full group; a member's export MUST be limited to their own data.
- **FR-108**: The owner MUST be able to archive and soft-delete a group; soft-deleted data MUST be restorable for a 30-day window.
- **FR-109**: A user MUST be able to delete their account only after transferring or deleting owned groups.
- **FR-110**: Sensitive changes MUST be recorded in the activity feed with actor and before/after values.

#### Experience and accessibility

- **FR-111**: Navigation MUST use four bottom tabs: Home, Ledger, Activity, Settings.
- **FR-112**: Home MUST lead with the member's balance and pending actions, then recent outings.
- **FR-113**: Onboarding MUST guide sign-in, group creation or join, and invitation or claim.
- **FR-114**: The group switcher MUST be available from Home.
- **FR-115**: The iPhone shell MUST use native iOS patterns; the Android shell MUST use Material 3 patterns.
- **FR-116**: The system MUST support system light and dark modes; the iPhone shell is light-first and the Android shell is system light-first.
- **FR-117**: Tap targets MUST be at least 44pt, Dynamic Type MUST not clip content, and reduced motion MUST be respected.
- **FR-118**: Loading, empty, offline, error, pending, and disputed states MUST be explicit.
- **FR-119**: Interactive controls MUST have accessible names, visible focus, and a logical reading order.

#### Payment QR

- **FR-120**: An active adult MUST be able to store one primary payment QR image and a short label for their group adult identity.
- **FR-121**: An adult MUST be able to replace or remove their own payment QR; the owner MUST be able to manage a pending adult's QR.
- **FR-122**: A payment QR MUST be stored privately and served only to active members of that group through short-lived signed access; public URLs are prohibited.
- **FR-123**: Payment QR images MUST be PNG or JPEG up to 2 MB; invalid uploads MUST be rejected with the reason.
- **FR-124**: Uploaded payment QR images MUST have unnecessary metadata stripped before storage.
- **FR-125**: Salo MUST display the payee's QR for scanning by the member's banking app; Salo MUST NOT open the camera or scan QR codes itself.
- **FR-126**: The payee's QR MUST be reachable from Home's balance card and debt rows, the Ledger payee sheet, and the finalized outing detail.
- **FR-127**: The pay sheet MUST show the payee's name, QR label, and the amount owed.
- **FR-128**: When the payee has no QR, the pay sheet MUST say to ask the payee and MUST still allow the member to record the settlement.
- **FR-129**: A payment QR MUST NOT appear in any recap, export, invite, or public surface; its storage path and label MUST be excluded from exports.
- **FR-130**: A soft-removed adult's QR MUST no longer be served for new payments.
- **FR-131**: A pending adult's QR uploaded by the owner MUST be viewable by members and manageable by the adult after claiming the identity.
- **FR-132**: Viewing a payment QR MUST require connectivity; an offline member MUST be told to connect.
- **FR-133**: Scanning a QR with an external banking app MUST NOT change the ledger; the payer still records and the recipient still confirms.
- **FR-134**: The QR sheet MUST size the code for reliable scanning, use sufficient contrast, and provide an accessible name for the image.
- **FR-135**: Payment QR changes MUST NOT expose the image or its contents in the activity feed.

### Key Entities *(include if feature involves data)*

- **Account**: A signed-in person, with a stable identity, email, display name, and session.
- **Group**: A shared ledger with a name, a color, an owner, a currency, a timezone, and a lifecycle status.
- **Adult identity**: A group-scoped participant. It may be pending (no account) or active (linked to an account); removed identities remain for history.
- **Payment QR**: An adult's primary payment QR image and short label, private to the group, display-only, and never part of recaps or exports.
- **Invitation**: A revocable, expiring link and code bound to one pending adult identity.
- **Student**: A group-scoped person covered by an adult, with a display name, optional notes, and an active/archived status.
- **Outing**: A meal event with a date, place, notes, payer, present adults, present students, items, total mode, total, status, version, and author.
- **Outing attendance**: The present adults and present students for one outing, including each present student's covering adult.
- **Item**: A line on an outing with a name, quantity, unit amount, amount, and an assignment to an adult, a student, or shared.
- **Share snapshot**: The immutable per-adult amounts written at finalization, including own items, student items, shared head, covered-student shared, and final total.
- **Settlement**: A payment from one adult to another with an amount, date, note, status (pending, confirmed, declined, void), recorder, confirmer, and decline reason.
- **Activity event**: A group-scoped record of an action, its actor, its subject, and before/after values for sensitive changes.
- **Private draft**: A local-first outing draft visible only to its author and the group owner until published.
- **Export**: A CSV or JSON file containing the owner's full group or a member's own data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can sign in, create a group, and reach Home in under 3 minutes.
- **SC-002**: An invited adult can sign in, claim the pending identity, and join in under 2 minutes.
- **SC-003**: A 10-item outing with two present students can be created, assigned, and finalized in under 3 minutes.
- **SC-004**: A per-head outing with no items can be created and finalized in under 90 seconds.
- **SC-005**: 100% of finalized splits sum exactly to the outing total across randomized tests covering present adults, present students, shared items, manual overrides, and per-head fallbacks.
- **SC-006**: 100% of cross-group access attempts are denied in the access-control test suite.
- **SC-007**: A settlement can be recorded, confirmed, or declined in under 30 seconds.
- **SC-008**: Live updates appear within 2 seconds at the 95th percentile while connected.
- **SC-009**: The first usable screen appears in under 3 seconds on a typical 4G connection.
- **SC-010**: The app installs and opens from the home screen on the owner's iPhone and an Android phone.
- **SC-011**: 100% of settlements involving a pending adult remain pending until that adult joins and confirms.
- **SC-012**: The owner can complete invite, remove, transfer, archive, and soft-delete flows without support.
- **SC-013**: Owner exports contain every outing, item, share, settlement, activity event, adult, and student; member exports contain only their own data.
- **SC-014**: A recap's totals and shares match the finalized outing to the centavo in 100% of checks.
- **SC-015**: All primary flows pass the accessibility review for 44pt targets, contrast, focus order, screen-reader labels, Dynamic Type, and reduced motion.
- **SC-016**: The product contains no receipt-image, OCR, LLM, or analytics path.
- **SC-017**: The iPhone shell and Android shell share the same data and rules; switching appearance changes only the visual shell.
- **SC-018**: A private draft created offline publishes exactly once when the connection returns.
- **SC-019**: A member can open the payee's payment QR from a debt row in under 10 seconds.
- **SC-020**: 100% of payment-QR access attempts by non-members or through public URLs are denied.
- **SC-021**: 100% of recaps and exports contain no payment QR image, path, or label.
- **SC-022**: The displayed QR is scannable by a major Philippine banking or e-wallet app in a manual device check.
- **SC-023**: A missing QR still allows the member to record the settlement in under 30 seconds.

## Assumptions

- The product is a single installable PWA; the archived Android app is not a maintained client.
- The group is friends-and-family scale: 2–12 adults and up to 10 active students per group.
- Every adult eventually has an account; pending adults are temporary identities.
- One owner per group; the owner is the only admin in v1.
- One payer per outing; multiple payers, multiple admins, multi-currency, and photo avatars are out of scope.
- Attendance is selected per outing; not every group adult attends every meal.
- The item sum is the bill; there is no tax, service charge, discount, or printed-receipt reconciliation.
- Shared writes require connectivity; reads are cached and private drafts are local-first.
- The backend is a new isolated project; the old snapshot project remains as a backup.
- The free subdomain is acceptable; a custom domain is optional.
- Email is used for authentication only; there are no product email notifications.
- The product uses Philippine pesos, English, and Asia/Manila dates.
- The old Android local database is kept as an unlisted backup; there is no migration into the shared product.
- The iPhone shell follows Apple-native conventions; the Android shell follows Material 3 conventions.
- iOS users install through Add to Home Screen; Android users install through the browser.
- No receipt images, OCR, LLM, push notifications, or store distribution are required.
- One primary uploaded payment QR per group adult; it is display-only and scanned with the member's own banking app.
- Payment QR images are private to the group, served through short-lived access, and excluded from recaps and exports.

## Out of Scope

- Native Android or iOS apps, Trusted Web Activity wrappers, Play Store, and App Store distribution.
- Sign in with Apple.
- Product push and email notifications; authentication email is required and is not a product notification.
- Multiple payers per outing.
- Multiple admins or shared ownership.
- Multi-currency and per-group timezones.
- Receipt image capture, OCR, and LLM extraction.
- In-app QR scanning, payment-processor integration, public payment QR links, multiple payment methods per adult, and account-wide payment QRs.
- Payment QRs in recaps, exports, invites, or any public surface.
- Photo avatars and group photos.
- Public group discovery, group directories, or open joining.
- Offline shared writes, automatic merging, or CRDT conflict resolution.
- Migration of the old Android ledger into the shared product.
- Third-party analytics, advertising, or tracking.
