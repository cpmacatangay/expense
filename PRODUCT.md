# PRODUCT.md

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**The owner (CP)** is the person who creates the group and keeps it correct. He eats out with friends
and students, usually pays, and wants the split to be obvious before everyone leaves.

**The other adults** are invited members with their own accounts: Mai, Kent, Llanmer, and the friends
who join later. They install the PWA from a link, claim an adult identity, and see the same shared
ledger. Some adults may stay pending for a while; the app still lets the owner record an outing that
includes them.

**Students** are names on the ledger, not users. They are covered by an adult and never sign in.

The situation is the table at the end of a meal: the bill arrives, one person has paid, some items
belong to one adult, some belong to a student, some are shared, and everyone wants a number that is
obviously fair. Later, the same group reconciles the running balance across many outings, in the app
and in messages.

## Product Purpose

Salo is a shared group meal ledger. A group records an outing, marks which adults and students were
present, charges every item to the person or people who consumed it, and produces an exact peso split
plus a running ledger of who owes whom until it is settled.

Success means the group never opens a spreadsheet again: the split sums to the item total to the
centavo, the recap is clear enough that nobody argues, and the ledger stays correct across months.

## Positioning

Most bill splitters divide evenly and stop at one meal. Salo assigns each line to an adult, a student,
or the table, then charges student lines to the adult covering that student and divides shared lines
per head across the people who actually attended. The item sum is the bill. A typed total is an
explicit override, not a hidden adjustment.

Salo is one installable PWA with two native-feeling shells: an iPhone-first shell on iOS and a
Material 3 shell on Android. The group is shared, the ledger is live, and settlements are confirmed by
the person who receives the money.

## Operating Context

- Used one-handed on a phone, at the table, often with poor signal.
- One person records the meal; the owner finalizes; everyone can see the draft and the result.
- A private draft can be prepared offline and published when the connection returns.
- Payment happens outside the app (cash, transfer). The app records a settlement and the recipient
  confirms it.
- Recaps leave the app through the web share sheet or a download.
- Supabase holds the shared ledger; no receipt images are captured.

## Capabilities and Constraints

- **Installable PWA only**: iPhone Safari 16.4+ and current Android Chrome. No native app, Trusted Web
  Activity, or store listing in v1.
- **Two platform shells**: iPhone-first on iOS; Material 3 on Android. Shared information
  architecture, money rules, permissions, and copy. A manual appearance override exists.
- **Accounts for every adult**: Google OAuth or email one-time code. No Sign in with Apple in v1.
  Students never have accounts. Pending adults are allowed until they join.
- **Shared groups of 2–12 adults**: one owner per group; the owner is the only admin in v1. A user may
  own one group and join many; a group switcher lives on Home.
- **Invitations**: share link and short code, bound to a pending adult, revocable and expiring.
- **Present adults and students per outing**: shared items and the per-head fallback split across the
  people who attended; student shares go to their covering adult.
- **One payer per outing**: the payer must be present.
- **Item-sum money rule**: Auto follows the items; typing switches to Manual; a reopened outing is
  Fixed. No tax, service charge, discount, or printed-receipt reconciliation.
- **Settlements**: payer records; recipient confirms or declines with a note. Only confirmed amounts
  affect balances. The owner can record for a pending adult, but confirmation waits until they join.
- **Live activity**: outings, items, shares, settlements, and membership update in real time when
  connected. A full activity feed records who changed what.
- **Offline reads and private drafts**: shared writes require connectivity; cached reads and private
  drafts keep the table-side flow.
- **Owner controls**: invite, remove, manage students, finalize, reopen, transfer ownership, archive,
  soft-delete, and export the full group. A member can export their own data.
- **No OCR or LLM**: manual entry only. No receipt images, no external recognition.
- **Currency and time**: Philippine pesos, English, Asia/Manila.
- **Zero recurring cost**: Supabase free tier, a free static host and subdomain, a free-tier email
  provider. No Apple Developer Program, paid OCR, or store fees.
- **Deliberately absent**: multiple payers, multiple admins, multi-currency, photo avatars, public
  group discovery, push notifications, and offline shared writes.

## Brand Commitments

- Name: **Salo**. Application label and install name are `Salo`.
- Voice: plain, compact, quietly confident. Philippine context — pesos, "outing", "students",
  "covered by". No hedging, no exclamation marks, no growth-marketing language.
- A green identity: Ledger Green `#1F5C45`, warm neutral surfaces, mint in dark mode.
- iPhone shell: SF Pro, large titles, grouped inset lists, sheets, bottom tabs, safe areas, quiet iOS
  motion. The "shared table" is the signature: member initials, group presence, and the table around
  which the split happens.
- Android shell: Material 3, Roboto, top app bar, navigation bar, cards, filled buttons, system
  light-first with a true dark theme.
- Interface language is English. Currency formatting is `₱1,234.56`.

## Evidence on Hand

- `specs/002-salo-pwa/spec.md` — seven user stories, edge cases, functional requirements, success
  criteria, assumptions, and explicit out-of-scope.
- `specs/002-salo-pwa/plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, and
  `tasks.md` — the shared-PWA architecture and validation plan.
- `.specify/memory/constitution.md` (4.0.0) — nine enforceable principles, including money
  correctness, shared privacy, connected edits, two shells, and zero recurring cost.
- `specs/001-salo-expense-sharing/` — the archived Android app spec and its Material 3 design.
- No testimonials, benchmarks, press, pricing page, or customer logos exist. Future work must not
  invent them.

## Product Principles

1. **The item sum wins.** The visible math reconciles to the items the group listed. A typed total is
   an explicit override, never a hidden gap.
2. **Present people only.** Shared costs go to the adults and students who were actually there.
3. **Assign, don't average.** A number is only trustworthy if it can be traced to who ate what.
4. **Shared by design, private by default.** A group sees its own ledger; no one else does. Students
   are names, not profiles.
5. **Confirmed money.** A settlement changes a balance only after the recipient confirms it.
6. **Native on both phones.** The PWA should feel like an iPhone app on iOS and a Material app on
   Android, without two codebases.
7. **The table beats the network.** Cached reads and private drafts keep the flow alive when the
   signal drops.

## Accessibility & Inclusion

The product requires 44pt targets, contrast in both themes, accessible names for icon-only controls,
visible focus, Dynamic Type support, reduced-motion support, and a logical reading order. It is
verified on the owner's iPhone and Android phone, in both installed and browser modes.
