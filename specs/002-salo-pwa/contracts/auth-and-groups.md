# Contract: Authentication, Groups, and Invitations

**Feature**: `002-salo-pwa` | **Consumers**: onboarding, group switcher, members, settings, RLS

## Authentication

**Methods**:
- Google OAuth (redirect, PKCE, no popup).
- Email one-time code or magic link. Use a one-time code in the installed PWA to avoid Safari
  handoff problems.

**Session**:
- Sessions persist across launches and refresh without losing the current screen.
- Signing out clears local caches and private drafts for the current account.
- All group data requires an authenticated session.

**Redirect rules**:
- Production and preview origins are allow-listed in the auth provider.
- OAuth returns to the origin that started it.
- Failed or cancelled auth returns to the sign-in screen with a readable message.

**Account lifecycle**:
- A profile is created on first successful sign-in.
- Account deletion is blocked while the user owns an active or archived group; the user must transfer
  or delete owned groups first.- Deleting an account removes the profile and the user's access; historical group rows keep the adult
  display name and shares.

## Group Membership

**Roles**:
- `owner`: exactly one per group. In v1 the owner is the only admin.
- `member`: an active adult linked to a profile.
- `pending`: an adult identity with no account.
- `removed`: a soft-removed adult identity retained for history.

**Group creation**:
- The creator becomes the owner and the first active adult.
- A group starts with 1 owner; at least 2 present adults are required to finalize an outing.
- A user may own at most one group and join any number.
- A group may have at most 12 adult identities, counting pending and active but not removed.

**Group switcher**:
- Lists every active membership, newest activity first.
- Switching changes the group context; no cross-group data is merged.
- The current group is remembered per account on the device.

## Invitations

**Creation**:
- Only the owner may invite.
- The owner creates a pending adult (`display_name`, `color`) and an invitation bound to that adult.
- The invitation contains a random token and a six-character code.
- Tokens and codes are stored hashed; the plaintext is shown once to the owner.
- An invitation expires after 7 days and may be revoked.
- Creating a new invitation for the same pending adult revokes the prior open invitation.

**Acceptance**:
1. The invitee opens the link or enters the code.
2. The invitee signs in.
3. The app shows the group name and the pending adult name.
4. Accepting links the profile to the pending adult, sets the adult active, consumes the invitation,
   and adds the group to the user's switcher.
5. Re-accepting the same invitation is idempotent and returns the existing membership.
6. An expired, revoked, or consumed invitation is rejected with a clear message.
7. Repeated wrong codes are rate-limited.

**Capacity**:
- Acceptance fails if the group already has 12 pending/active adults.
- The owner can revoke an invitation to free a slot.

## Owner Actions

The owner alone may:
- invite and revoke invitations;
- create pending adults;
- soft-remove members;
- manage students;
- publish any private draft;
- finalize and reopen outings;
- transfer ownership;
- export the full group;
- archive and soft-delete the group.

Transfer rules:
- The new owner must be an active adult.
- The transfer is explicit and audited.
- A group must never be ownerless.
- The old owner becomes a member.

## RLS Intent

| Action | Policy |
|---|---|
| Read group | Caller is an active adult in the group |
| Update group | Caller is the owner |
| Create group | Authenticated user; owner_id = caller |
| Read adults | Caller is an active adult in the group |
| Create pending adult | Caller is the owner |
| Claim adult | Invitation function verifies token/code, pending status, capacity, and expiry |
| Read invitation | Owner, or invitee through the token function |
| Revoke invitation | Owner |
| Remove adult | Owner; soft remove, history retained |
| Transfer ownership | Owner; target is active; audited |
| Read student | Caller is an active adult in the group |
| Write student | Owner |
| Read activity | Caller is an active adult in the group |
| Read/write another group | Denied |

## Error States

- Not signed in: open sign-in.
- Expired session: refresh; if refresh fails, return to sign-in with a message.
- Wrong group: deny without revealing whether the group exists.
- Invite expired/revoked: explain and ask the owner for a new invite.
- Group full: explain the 12-adult limit.
- Removed member: deny access; history remains for the group.
- Ownerless transfer attempt: block.
