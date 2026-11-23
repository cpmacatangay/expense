# PRODUCT.md

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Friends who hang out** are the whole audience. One person records the expense at the table; everyone
else sees only the expenses they are on. People may be existing Google accounts or named placeholders
who claim their name from an expense share link. There are no owners, admins, students, or group roles.

## Product Purpose

Salo is a participant-based expense ledger. One expense records a description, a date, exactly one
payer, the people who were there, and itemized lines. Every line belongs to one person. One-level
coverage lets a friend absorb another friend's full share. Saving is immediate. Balances are net
pairwise amounts, and either person can mark a full debt paid or undo a mistaken payment.

Success means the group records an expense in under two minutes, sees exactly who owes whom, and
never needs a spreadsheet, group chat reconstruction, or a finalization step.

## Positioning

Most splitters divide evenly and stop at one meal. Salo keeps the itemized bill, records who covers
whom, and maintains a running pairwise ledger across months. It is deliberately smaller than a group
expense manager: no tables, no membership administration, no drafts, no export workflow.

## Operating Principles

- **Pairwise by default.** An expense is visible only to its people. A balance is visible only to the
  pair.
- **Immediate.** Saving is the commit. There is no draft, finalize, reopen, lock, or fixed total.
- **One person per line.** A shared dish is one line per person; the product does not split a line.
- **One level of coverage.** A coverer absorbs the covered person's full share and cannot be covered
  in the same expense.
- **Full marks, reversible.** Mark the full net paid, or undo it. No partial payments, no recipient
  confirmation.
- **Google only.** Self-service Google sign-up. No email code, magic link, or invite email.
- **Three tabs.** Home, Ledger, Settings. All expenses and expense detail are pushed screens.
- **Light only.** Stone and ink, one accent, no appearance switch.

## Core Flows

1. **Record an expense.** Home → New expense → description/date → payer → people → item lines →
   optional coverage → Save. A persistent composer adds items without blank rows; a shared dish can
   be split equally into one independent line per person. The expense is live immediately.
2. **See and settle.** Home shows the viewer's totals and debts; Ledger lists every pair and paid
   history. Either person marks the full amount paid.
3. **Add and share.** Add a person by name, then share the expense link. The recipient signs in with
   Google, claims an open name, and sees the recorded share. The link lasts 7 days and can be refreshed.
4. **Review.** Home shows five recent events. Each expense shows its full change history. Ledger shows
   payments between a pair.
5. **QR.** Settings stores one private QR and label. A debt row shows it to the pair.

## Removed

Tables, groups, group invitations, the switcher, member management, ownership, archive/delete group,
students, owner finalization, reopening, locks, fixed totals, drafts, recaps, exports, the Activity
tab, email authentication, and email delivery.

## Retained

Itemized bills, per-person payment QR, activity history, install section, the three-tab shell, and the
light stone/ink interface.

## Success

- A three-person, five-item expense is recorded in under 2 minutes.
- Shares sum exactly to the item total.
- A person sees who they owe within 5 seconds of opening the app.
- A debt is marked paid in under 15 seconds.
- No one outside the participants can read the expense or the pair.
