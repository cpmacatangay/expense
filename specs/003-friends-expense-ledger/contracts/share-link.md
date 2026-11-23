# Contract: Expense Share Links

**Feature**: `003-friends-expense-ledger` | **Date**: 2026-11-23

Sign-in is Google OAuth only. No authentication or invite email is sent. People are added by name;
the creator or payer shares one link per expense in whatever chat app they already use. A recipient
signs in, claims one open name, and the placeholder is merged into their account.

## Sign-In

- One action: **Continue with Google**.
- Self-service Google sign-up is allowed. A new account lands on an empty Home and sees no expense
  until someone shares one.
- No email one-time code, magic link, password, or Sign in with Apple.
- No custom SMTP, sending domain, or transactional email provider.

## Adding People

- `add_person(name)` trims and validates a name (1–50 characters).
- It reuses the caller's pending placeholder with the same lowercased name, or creates a new one.
- Placeholders have no email and can be listed on an expense, be the payer, or cover someone
  immediately.
- No email is requested, stored for invitation, or sent.

## Share Record

A share link is stored on the expense:

- `share_token` — raw, unguessable 48-character hex value.
- `share_expires_at` — `now() + 7 days` when created or refreshed.
- There is no separate invitation table.
- Only the creator or payer can create, read, or refresh the token through RPCs.

## Link Format

```text
https://salo-pi.vercel.app/join/<raw-token>
```

- The token is 24 random bytes, hex encoded.
- The link identifies exactly one expense.
- Refreshing rotates the token; the previous link stops working immediately.
- Anyone with the link still needs Google sign-in and an open name on that expense to join.

## Preview

`expense_share_preview(token)` is available to any signed-in caller with a live token and returns:

- expense id, description, date, payer display name, total, expiry
- whether the caller is already a participant
- the open names: people on the expense with `status = 'pending'` and no profile
- people count

It never returns items, shares, payments, email addresses, or other participants' balances.

Failure: “This link is no longer available” for a missing, expired, refreshed, or deleted-expense
token.

## Claim

1. The link opens `/join/<token>`.
2. If signed out, the person signs in with Google; the OAuth redirect returns to the same link.
3. The page shows the expense summary and the open names. If exactly one name is open, it is
   preselected.
4. `claim_expense_share(token, personId)` validates the live token and that the chosen person is an
   open name on that expense.
5. The placeholder is merged into the caller's account person across every expense where the
   placeholder appears:
   - insert the account person on each affected expense
   - move items, coverage, shares, payer/creator references, payments, and event actors
   - delete the placeholder person
   - record an `updated` event for each affected expense
6. The generated/recorded shares are unchanged; no duplicate account person is created.

Failure messages:

- Name already taken: “That name is already taken. Reload and choose another.”
- Already a participant: return `alreadyClaimed: true` and open the expense.
- Expired or refreshed: “This link is no longer available.”
- Placeholder already shares an expense with the caller: “Ask the payer to remove the duplicate.”

## Refresh

- `create_expense_share(expenseId, refresh)` requires the creator or payer.
- Without `refresh`, a live token is reused.
- With `refresh`, or when the token is missing/expired, a new token and 7-day expiry are written.
- The old link stops working immediately. The expense, people, and shares remain unchanged.

## Expiry

- Link lifetime: 7 days.
- Expired links cannot be previewed or claimed.
- Open names remain on the expense and in the payer's People list.
- The creator or payer can refresh at any time.

## Item Entry

- The editor uses a persistent quick-add composer; it never creates empty item rows.
- After Add, the name clears and keeps focus, the last-used person remains selected, and the count
  and total update.
- **Split equally** is a composer-only helper. It divides a total into exact integer centavos, shows
  the per-person amounts, and creates one independent line per selected person.
- Remainder cents go to the first selected people in display order.
- The ledger never stores a shared line, a multi-person item, an unequal split, or a fractional
  amount.

## Privacy

- Email addresses are not returned to expense participants.
- The share preview exposes only the summary and open names.
- A recipient sees items, shares, and history only after claiming a name.
- No share link is written to activity, exports (removed), or logs.
- A self-service account with no shared expense sees an empty Home and no other person's data.

## Link Copy

- Share sheet: “Send this link to the people on the expense. They sign in with Google, claim their
  name, and see the share already recorded for them.”
- Primary action: **Copy link**; optional native **Share**.
- Expiry: “The link expires on {date}.”
- Refresh: “Refreshing makes the current link stop working.”
- Join screen, expired: “This link is no longer available.”

## Security Tests

- A signed-in caller with no token cannot preview or claim an expense.
- An expired, refreshed, or deleted-expense token cannot be previewed or claimed.
- A non-creator/non-payer cannot create or refresh a share link.
- A caller cannot claim a name outside the token's expense.
- A claimed name cannot be claimed twice.
- An existing participant cannot claim another name.
- The preview never returns items, shares, payments, or email addresses.
- The raw token is not returned by `people_for_me`, `expense_detail`, or `recent_activity`.
- A self-service account with no shared expense sees an empty Home and no other person's data.
- No authentication or invite email is sent by the product.
