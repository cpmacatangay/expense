# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

**The owner (CP)** is the only person who installs and uses Salo. He is a single adult in a fixed
group of four — CP, Mai, Kent, and Llanmer — who eats out with students in tow and ends up being the
one who pays and does the arithmetic.

The situation is the table at the end of a meal: the bill arrives, one person has already paid, some
items belong to one adult, some belong to a student, some are shared, and everyone wants a number
that is obviously fair before they leave. Later, the same person reconciles the running balance
across many outings, in messages, at home.

The other three adults never install the app. They receive a recap and pay the person who paid.

## Product Purpose

Salo records a shared meal, charges every item to the person or people who consumed it, and produces
an exact peso split plus a running ledger of who owes whom until it is settled.

Success means the owner never opens a spreadsheet again: the split sums to the item total to the
centavo, the recap is clear enough that nobody argues, and the ledger stays correct across months.

## Positioning

Most bill splitters divide evenly and stop at one meal. Salo assigns each line to an adult, a
student, or the table, then charges student lines to the adult covering that student and divides
shared lines per head. The item sum is the bill; the owner can type a total as an explicit override,
but there is no printed-receipt reconciliation. The split and the cross-outing ledger are the same
data, so a past mistake can be reopened, corrected, and audited instead of silently forked.

## Operating Context

- Used one-handed, in poor-signal restaurants, at the moment the bill arrives. Everything that
  matters works offline.
- The receipt is the source of truth for the items. The owner lists each line manually at the table;
  there is no camera or OCR step.
- Four adults are always counted, whether or not they attended. A student who was not at the meal is
  not counted.
- Payment happens outside the app (cash, transfer). The app records the settlement afterwards.
- Recaps leave the app through the Android share sheet as text and as a 1080×1350 image.
- One phone holds the ledger. Supabase holds a private snapshot for restore, not a shared source of
  truth.

## Capabilities and Constraints

- **Native Android only**: Kotlin, Jetpack Compose, Material 3, `ph.salo.app`. `compileSdk`,
  `targetSdk`, and `minSdk` are all 37 (Android 17); the target device is a Samsung S26 Ultra.
- **Exactly four adult participants**, fixed forever: CP, Mai, Kent, Llanmer. Seeded at first launch,
  never added, removed, or reordered. They are participants in the split, not accounts: only CP
  installs and operates the app, and every outing is recorded as him. There is no profile switcher.
  The money engine validates a four-adult set.
- **Hybrid money model**: each item is assigned to one adult, one student, or shared; shared items
  split per head across the four adults plus present students; the item sum is the bill. The total
  is Auto by default, becomes Manual when typed, and is Fixed for a reopened outing. All money is
  integer centavos; a finalized split sums exactly.
- **No fairness score and no auto-balance.** The owner decides who covers a student.
- **Students are a roster of at most 10 active**, with a display name and optional notes, archivable
  and restorable. No contact details, photos, or other personal data.
- **Manual item entry only.** There is no camera, OCR, receipt image, or LLM path.
- **Private backup**: JSON snapshots to the owner's own Supabase project, guarded by row-level
  security and a single allowed owner email. Restore is allowed only into an empty local ledger and
  never overwrites data.
- **Auditable and reversible**: a finalized outing can be reopened with a confirmation, which clears
  its shares and writes an audit event with before/after values. Settlements can be voided.
- **Zero recurring cost** is a constraint: no paid services beyond free tiers, no ads, no analytics
  SDKs.
- **Deliberately absent**: multi-device sync, other-adult accounts, receipt OCR or image capture,
  receipt image archive in the cloud, LLM assists, currency other than PHP, recurring budgets, and
  automatic fairness suggestions.
- **Undecided**: iOS or any second platform; a landing page or public website.

## Brand Commitments

- Name: **Salo**. Application label and launcher name are `Salo`.
- Voice: plain, compact, quietly confident. Philippine context — pesos, "outing", "students",
  "covered by". No hedging, no exclamation marks, no growth-marketing language.
- A green identity: a fixed scheme seeded from `#1F5C45`. The app deliberately does not use
  wallpaper-derived dynamic color.
- The mark is an abstract "S" built from two rounded strokes, shipped as an adaptive icon with a
  monochrome themed layer.
- Interface language is English. Currency formatting is `₱1,234.56`.

## Evidence on Hand

- `specs/001-salo-expense-sharing/spec.md` — seven user stories, edge cases, functional requirements,
  success criteria, explicit out-of-scope list.
- `.specify/memory/constitution.md` (3.0.0) — eight enforceable principles, including money
  correctness, privacy, offline-first, and zero recurring cost.
- `specs/001-salo-expense-sharing/device-test-2026-11-07.md` — real run on the S26 Ultra: the
  historical ₱825 case produced CP ₱451.00 / Mai ₱308.00 / Kent ₱33.00 / Llanmer ₱33.00, plus
  ledger, recap, export, sign-in, backup, and restore. This is a legacy outing under the item-sum
  rule.
- `app/src/test/java/ph/salo/app/core/money/` and `feature/outing/` — unit tests covering
  allocation, rounding, total modes, and merge exactness.
- No testimonials, benchmarks, press, pricing page, or customer logos exist. Future work must not
  invent them.

## Product Principles

1. **The item sum wins.** The visible math reconciles to the items the owner listed. A typed total
   is an explicit override, never a hidden gap.
2. **Assign, don't average.** A number is only trustworthy if it can be traced to who ate what.
3. **The table beats the network.** Recording, splitting, and settling never wait on a connection.
4. **Private by construction.** Students are names on a ledger, not profiles; no receipt images are
   captured; only the owner's snapshot leaves the phone.
5. **Reversible over clever.** A wrong split can be reopened and corrected with a record of what
   changed.

## Accessibility & Inclusion

The project requires an accessibility pass on tap targets (48 dp), contrast in both light and dark
themes, labels for icon-only controls, and focus order, verified on the owner's device. Students and
adults are referred to by first name only; there is no requirement for screen-reader-first operation
beyond standard TalkBack correctness.
