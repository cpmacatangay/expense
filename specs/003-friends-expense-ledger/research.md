# Research: Salo Friends Expense Ledger

**Feature**: `003-friends-expense-ledger` | **Date**: 2026-11-17

This document records the technical decisions behind the plan, the alternatives considered, and the
reason each alternative was rejected. All decisions comply with the constitution v5.0.1.

## 1. Identity model

**Decision**: A global `people` row per normalized email. A row is `pending` when no account is
linked, `active` when linked to a profile, and `former` when the account is deleted. `profile_id` is
unique and nullable. Expenses reference `people.id`, never a profile or a group-scoped adult.

**Rationale**: The product has no groups, so a person must exist independently of any one expense.
Pending people are first-class participants, which lets a creator include a friend who has not
joined. One row per email prevents duplicate "Mai" identities and keeps one QR and display name.

**Alternatives considered**:
- **Profile-only participants**: rejected because a person without an account cannot be listed.
- **Per-expense person rows**: rejected because the same friend would fragment across expenses and
  balances would not net.
- **Group-scoped adults retained**: rejected by the spec and the constitution.

## 2. Access architecture

**Decision**: RLS on every table for direct reads, no direct writes, and security-definer RPCs for
all mutations and all composite reads. Each RPC re-checks `auth.uid()` and the participant or edit
relationship. RLS remains as defense in depth if a new read path is added.

**Rationale**: Participant-only access is the privacy model. Expressing it once in an RPC is easier
to test than composing policies across six tables, while RLS guarantees a forgotten filter still
fails closed. The current codebase already uses this pattern for settlements and finalization.

**Alternatives considered**:
- **Client-side filtering**: rejected; the browser is not a security boundary.
- **RLS-only with direct table writes**: rejected because coverage, share computation, version
  checks, and activity need one atomic transaction.
- **Edge Functions for every write**: rejected; database RPCs are transactional and cheaper.

## 3. Server-authoritative shares

**Decision**: `save_expense` validates the payload, computes gross items, applies coverage, writes
shares, and bumps the version in one transaction. The TypeScript engine is a preview only. Both
implementations are checked against shared golden vectors.

**Rationale**: Immediate save means there is no finalize step to catch errors later. The ledger must
be correct the moment the write commits. A single SQL transaction also makes the share sum invariant
enforceable before commit.

**Alternatives considered**:
- **Client computes and writes shares**: rejected; a tampered or stale client could corrupt the
  ledger.
- **Compute on read**: rejected; editing history and pairwise netting need stable stored shares.
- **Edge Function computes**: rejected; extra network hop and no transaction with the write.

## 4. Coverage constraints

**Decision**: Coverage is a separate table with one row per covered person. A trigger rejects
self-coverage, payer coverage, non-participants, chains, and loops. A composite foreign key keeps
coverer and covered on the expense. The same rules are validated in the RPC and mirrored in the
editor, which only offers valid coverers.

**Rationale**: One-level coverage is easy to describe and hard to enforce with a check constraint
alone because the rule spans rows. A trigger gives a precise error; the RPC gives a friendly one.

**Alternatives considered**:
- **A `covered_by` column on participants**: rejected; it hides the relationship and makes
  one-coverer-per-person harder to index and audit.
- **Allow chains**: rejected by the spec; it complicates who owes whom and invites loops.
- **Coverage across expenses**: rejected; standing coverage is not a product concept.

## 5. Pairwise netting and payment direction

**Decision**: For each expense, every non-payer with a positive owed share creates a debt edge to the
payer. Payments are pair-level edges with an explicit from/to. A pair balance is the sum of debt edges
minus payments, collapsed to one direction. Positive means the viewer owes the other person.

**Rationale**: A payment settles a relationship, not one bill. Netting makes “You owe Mai ₱400” a
single number even after several shared expenses. Direction reversal after an edit falls out of the
same arithmetic.

**Alternatives considered**:
- **Track each payment against an expense**: rejected; one payment often covers several expenses and
  an edit would orphan it.
- **Net per expense then sum**: rejected; equivalent but creates more rows and confusing history.
- **Recipient confirmation**: rejected by the product decision; undo replaces it.

## 6. Mark-paid concurrency

**Decision**: `mark_paid` and every balance-changing write take a transaction-scoped advisory lock on
the sorted pair key, then compute the current net and insert or update in the same transaction. A
zero net is rejected.

**Rationale**: Without a lock, two devices could mark the same debt paid, or an expense edit could
land between the balance read and the payment insert. The lock is cheap at friends-and-family scale
and prevents double settlement.

**Alternatives considered**:
- **Unique constraint on pair and amount**: rejected; legitimate repeat payments exist.
- **Optimistic version only**: rejected; the balance is derived from many rows, not one version.
- **Serializable isolation everywhere**: rejected as heavier than needed for this scale.

## 7. Expense deletion

**Decision**: Deleting sets `deleted_at`, records an `expense.deleted` event, and excludes the
expense and its shares from every read and balance query. The detail RPC returns not found. Items and
participants remain for history integrity, but no client path can open them.

**Rationale**: The spec requires deletion to be visible in recent activity and to be irreversible
from inside the app. A tombstone preserves the event without exposing the expense. Hard deletion
would break the activity reference or force a duplicated snapshot.

**Alternatives considered**:
- **Hard delete**: rejected; the deletion event loses its subject and history becomes ambiguous.
- **Read-only deleted detail**: rejected by the product decision that a deleted expense cannot be
  reopened.
- **No deletion**: rejected; mistakes need a clean removal.

## 8. Activity model

**Decision**: `expense_events` stores one before/after snapshot per save plus creation and deletion.
Payments keep their own history. `recent_activity` unions the two sources for the caller. The expense
detail returns its own events; the Ledger returns pair payments.

**Rationale**: Expense changes and pair payments have different scopes. Storing full snapshots keeps
the history readable even after items change, and the client can render a precise diff. A single
generic activity table would need nullable expense and pair references and weaker constraints.

**Alternatives considered**:
- **One global activity table**: rejected; mixing group-free expense events and pair payments makes
  access checks and rendering harder.
- **Event sourcing the whole expense**: rejected as unnecessary complexity for a small ledger.
- **Only the latest update**: rejected; the spec requires full history.

## 9. Sign-in and invite links

**Decision**: Sign-in is Google OAuth only. Self-service Google sign-up is allowed; a new account
lands on an empty Home and sees no data until added. `add_person` creates or reuses a named
placeholder; no email is required. The creator or payer creates one 7-day share link per expense
(`/join/<token>`), and a signed-in recipient claims an open name on that expense. Claiming merges the
placeholder into the account person across every expense that used the name. Refreshing rotates the
link and invalidates the previous one. No email is sent.

**Rationale**: Without a custom domain, authentication and invite email are unreliable and add a
provider dependency. Google-only sign-in removes SMTP entirely. Self-service sign-up is safe because
a person sees only expenses they are added to. A shareable link works in any chat app; it identifies
one expense and requires the recipient to claim an open name after signing in, so the email bound to
the account no longer has to match anything.

**Alternatives considered**:
- **Keep email invites**: rejected; no domain and no reliable production SMTP.
- **Provision auth users with the service role**: rejected; it requires admin email delivery and was
  only needed for an invite-only model.
- **Existing Google accounts only**: rejected; a new friend could not join at the table.
- **Invite link with no email binding**: rejected; a forwarded link could be claimed by anyone.
- **Enable sign-up without a link**: allowed as the self-service path; a new account still sees
  nothing until someone adds their email.

## 10. Email privacy and enumeration

**Decision**: Emails are never returned to other participants. The People list shows names and
pending status only. Adding an email returns the person and a status to the creator, who supplied the
address; it does not expose emails on an expense. Adds and link refreshes are rate-limited per
caller.

**Rationale**: Names are enough on an expense. The creator already knows the address they typed.
Rate limiting blunts using the add flow as an address-book probe.

**Alternatives considered**:
- **Show emails on the expense**: rejected by the product decision.
- **Hide whether an account exists**: considered, but the creator needs to know whether a link was
  created to correct a typo; the creator already supplied the address.
- **Directory search**: rejected; no public profiles or global directory.

## 11. Payment QR storage

**Decision**: Keep the private `payment-qr` bucket. New paths are `{person_id}/{timestamp}.{ext}`.
Storage policies allow read only when `can_view_person(person_id)` is true and write only for the
caller's own person. Metadata lives on `people`; the client requests a 60-second signed URL. No
public URL, no in-app scanner.

**Rationale**: Reuses the existing bucket, MIME limit, and signed-URL helper. The person id in the
path makes the policy simple and removes the old group folder.

**Alternatives considered**:
- **Public bucket**: rejected; QR images are private financial identifiers.
- **Base64 in the database**: rejected; bloats rows and slows reads.
- **Serve through an Edge Function**: unnecessary; storage RLS plus a signed URL is sufficient.

## 12. All expenses retrieval

**Decision**: `expenses_for_me` returns the caller's expenses with date, description, payer name,
total, and the caller's share, newest first. Home shows five recent activity events and a See all
action. No fourth tab.

**Rationale**: The spec requires a full list but also three tabs. A pushed screen keeps navigation
simple and gives past expenses a stable home.

**Alternatives considered**:
- **Expenses segment in Ledger**: rejected; Ledger is already the balances screen.
- **Only recent activity**: rejected; older expenses would be unfindable.
- **Fourth tab**: rejected by the product decision and the constitution.

## 13. Offline behavior

**Decision**: Keep the installable PWA and cached shell. Reads use the in-memory React Query cache
and show an offline state; saves, deletes, payments, invites, and QR uploads require connectivity and
fail with a clear message. No local drafts or persisted ledger cache.

**Rationale**: The product removed drafts and shared offline writes. The shell can still open at the
table, and cached reads avoid a blank screen, without pretending a write succeeded.

**Alternatives considered**:
- **Offline write queue**: rejected; conflict resolution would return the complexity just removed.
- **Persisted query cache**: rejected; shared financial data on disk adds privacy risk.
- **No PWA**: rejected; install and offline shell are retained requirements.

## 14. Migration and wipe

**Decision**: `0033` adds the new schema alongside the old one. `0034` drops legacy tables, functions,
types, and policies during a maintenance window, after a verified backup and explicit sign-off. New
tables are not truncated. The QR bucket is emptied with a service-role script. Production migrations
are applied manually for this release.

**Rationale**: The old app must keep working until the switch, but the new app must never read legacy
data. Separating additive and destructive migrations makes the release step reviewable. Leaving new
tables untouched avoids deleting expenses created during the window.

**Alternatives considered**:
- **One migration that creates and drops**: rejected; it would break the old app before the new one
  is live and make rollback harder.
- **Automatic destructive migration in CI**: rejected; production data needs a human gate.
- **Keep old tables dormant**: rejected by the spec; the data must be gone.

## 15. UI reuse

**Decision**: Keep the existing tokens, three-tab shell, ticket/panel patterns, 12px section gap,
14px command buttons, and light-only palette. Rewrite the screens that assumed groups; do not start a
new visual system.

**Rationale**: The revamp is a product-model change, not a redesign. Reusing the interface keeps the
work focused and preserves the tested mobile behavior.

**Alternatives considered**:
- **New design system**: rejected as scope creep.
- **Dark mode**: rejected; light-only is a retained decision.
- **Four tabs with Activity**: rejected.

## 16. Testing strategy

**Decision**: Three layers. Vitest covers the pure money preview and netting. SQL tests cover the
authoritative engine, constraints, RLS, and RPC access. Playwright covers the end-to-end flows and
390/1440 rendering. Shared golden vectors keep preview and server aligned.

**Rationale**: The server is authoritative, so the strongest tests must run in Postgres. The preview
still needs fast unit tests because it drives the editor. Browser tests prove the flows and the
removed surfaces.

**Alternatives considered**:
- **Only unit tests**: rejected; RLS and constraints cannot be proven in TypeScript.
- **Only SQL tests**: rejected; the editor preview and accessibility need browser coverage.
- **Snapshot the whole UI**: rejected; brittle and does not prove money correctness.
