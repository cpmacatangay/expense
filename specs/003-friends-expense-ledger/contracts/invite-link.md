# Contract: Invite Links

**Feature**: `003-friends-expense-ledger` | **Date**: 2026-11-17

Sign-in is Google OAuth only. No authentication or invite email is sent. A new person is added by
email, and the creator shares a copyable link in whatever chat app they already use.

## Sign-In

- One action: **Continue with Google**.
- Self-service Google sign-up is allowed. A new account lands on an empty Home and sees no expense
  until someone adds it.
- No email one-time code, magic link, password, or Sign in with Apple.
- No custom SMTP, sending domain, or transactional email provider.

## Provisioning Paths

| Case | Action | Result |
|---|---|---|
| Email belongs to an existing Google account | Link the person row to the profile | `status: active`, visible immediately, no link needed |
| Email has no account | Create or reuse a pending person and a hashed invite token | `status: pending`, link returned once |
| Email matches an existing pending person | Reuse the row; link a profile if one now exists; otherwise create a fresh link | No duplicate person |
| Person already active | Reject with “That person already joined” | No new link |
| Creator adds their own email | Reject with “That is your email” | No person created |
| Email corrected before claim | Update the row, revoke the old token, create a new one | Old link can no longer be claimed |

A new email is **not** provisioned into an auth account by the app. The invited person signs up with
Google themselves when they open the link.

## Invite Record

`person_invitations` stores:

- `person_id`, `email` snapshot, `invited_by_person_id`
- `token_hash` (SHA-256, unique)
- `expires_at` default `now() + 7 days`
- `claimed_at`, `revoked_at`

Only one open invitation per person. Creating a fresh link revokes the open row first, then creates a
new one. The raw token is returned to the creator once and never stored.

## Link Format

```text
https://salo-pi.vercel.app/invite?token=<raw-token>
```

- The token is 24 random bytes, hex or base64url encoded.
- The database stores only its SHA-256 hash.
- The link is bound to the invited email. A different Google account cannot claim it.
- The creator copies the link from the add sheet or Settings → People.

## Add Flow

1. The creator enters an email in the expense editor or Settings → People.
2. `add_person` normalizes the email.
3. Existing Google account: link and return `status: active`, no token.
4. No account: create/reuse the pending person, create a token, return `status: pending` and the
   raw token once.
5. The UI shows **Copy invite link** and **Done**. No message says an email was sent.
6. The creator sends the link in chat. The person opens it, signs in with Google using the invited
   email, and claims.

## Claim

1. The link opens `/invite`.
2. If signed out, the person signs in with Google.
3. `claim_invite(token)` validates the hash, expiry, revocation, and that
   `lower(profile.email) = lower(invitation.email)`.
4. The function links `people.profile_id`, sets `status = 'active'`, replaces the pending display
   name with the Google profile name, sets `claimed_at`, and returns the person id.
5. `claim_people_for_me()` also links any pending or former person with the same Google email, so a
   lost link does not block access after sign-in.

Failure messages:

- Wrong account: “Sign in with the Google account for the email this link was created for.”
- Expired or revoked: “This invite is no longer available. Ask for a new link.”
- Already claimed: route to Home; no error.

## Refresh

- `create_invite_link(personId)` requires the caller to have created the person or share an active
  expense with them.
- The person must be `pending` with no claimed invitation.
- Revoke open invitations, create a new token and 7-day expiry, return it once.
- The person and their expense memberships remain unchanged.
- The previous link stops working immediately.

## Correct Pending Email

- `correct_pending_email(personId, email)` requires the creator.
- The person must be `pending` and not claimed.
- Validate the new email and ensure it does not belong to another person.
- If a Google profile already exists for the old address, link it and stop; the person already has an
  account and the email must not be changed.
- Update `people.email`, revoke the old token, create a new token, and return it once.
- A claimed person's email cannot be changed from the app.
- If the new address is not a Google account, the person must create one with that address or the
  creator must correct it again.

## Expiry

- Link lifetime: 7 days.
- Expired links remain as history but cannot be claimed.
- The person row remains `pending` and stays on their expenses.
- The creator can create a fresh link at any time.

## Privacy

- Emails are not returned to expense participants.
- The invited email is visible only to the creator while the person is pending.
- Activity records “Added <name>” or “Corrected an invite email”; it never records the address.
- No invite link is written to activity, exports (removed), or logs.
- Tokens are hashed at rest.
- Anyone with Google can sign up, but an account with no shared expense sees an empty Home and no
  other data.

## Link Copy

The UI copy is factual and contains no claim about email delivery:

- Add sheet, pending result: “Invite link ready. Send it to {email} in chat.”
- Primary action: **Copy invite link**.
- Settings row: **Create invite link** and **Correct email**.
- Invite screen, wrong account: “Sign in with the Google account for the email this link was created
  for.”
- Invite screen, expired: “This invite is no longer available. Ask for a new link.”

No amount, description, or other participant's name appears in the link or the copy.

## Security Tests

- A different Google account cannot claim the link.
- An expired or revoked token cannot be claimed.
- A non-creator cannot create a link or correct the email.
- A claimed person's email cannot be corrected.
- The invited address is not visible to other participants.
- The raw token is not returned by `people_for_me`, `expense_detail`, or `recent_activity`.
- Refreshing revokes the previous link.
- A self-service account with no shared expense sees an empty Home and no other person's data.
- No authentication or invite email is sent by the product.
