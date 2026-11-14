# Security model

Salo is a shared group meal ledger. The database is the authority for money and membership; the
browser is a client. The security boundary is enforced by Supabase Auth, Postgres row-level security,
column privileges, SECURITY DEFINER RPCs, the private `payment-qr` bucket, and the
`finalize-outing` Edge Function.

## Account lifecycle

- Client sign-up is disabled (`enable_signup = false`). New accounts are provisioned by the owner-only
  `invite-adult` Edge Function, which creates the auth user with the service role and then calls
  `create_invitation` as the owner.
- Existing users can sign in with Google or email OTP. The first owner is provisioned by the operator
  in Supabase Auth before the group is created.
- Invitations are bound to `invitee_email`, use an eight-character code, expire after seven days, and
  are throttled after repeated failed claims.

The `invite-adult` function requires `SUPABASE_SERVICE_ROLE_KEY` in its environment. Hosted Auth must
keep self-service sign-up disabled; configuring `supabase/config.toml` alone does not change a
deployed project.

## Money and membership

- Members may update only `date`, `place`, `notes`, and `payer_adult_id` on an outing. `status`,
  `total_mode`, `total_centavos`, `group_id`, `author_profile_id`, `version`, and finalization fields
  are server-controlled.
- Finalization is owner-only and service-role-only. `apply_finalization` validates the owner, version,
  present adults, payer, total, and share sum.
- Settlements are RPC-only. Only confirmed settlements affect the ledger.
- Removed adults and archived/deleted groups are rejected by outing status transitions, settlement
  decisions, private-draft publication, participant writes, and payment-QR metadata writes.
- Historical finalized shares remain readable; removed or archived identities cannot be added to new
  or reopened attendance, assignments, or finalization.

## Browser and local state

- The Supabase client uses PKCE (`flowType: "pkce"`).
- Sign-out and any auth user-id change clear the React Query cache, the persisted query cache, the
  group snapshot, and local drafts.
- The offline snapshot is accepted only when its profile id matches the signed-in user.
- The app does not use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or dynamic code execution.

## Deployment checklist

1. Apply migrations through `0026_reset_untrusted_outing_totals.sql`.
2. Disable self-service sign-up in the hosted Auth settings and deploy the `invite-adult` function with
   `SUPABASE_SERVICE_ROLE_KEY`.
3. Keep the hosted redirect allowlist to Salo-controlled HTTPS origins. Remove cleartext loopback
   origins from the production project; keep them only in local development.
4. Confirm the `payment-qr` bucket is private with the 2 MB / PNG-JPEG policy.
5. Keep the Vercel header policy in `vercel.json` (CSP, frame-ancestors, HSTS, nosniff,
   Referrer-Policy).
6. Rotate any Supabase personal access token used during earlier setup.

## Verification

```sh
npx supabase start
npx supabase test db
npm run typecheck
npm run lint
npm run test
npm run build
```

`supabase/tests/security.test.sql` covers column privileges, private-draft activity redaction,
removed-author reads and publishes, revoked QR metadata, removed-recipient settlement decisions,
participant lifecycle checks, and fail-closed child writes after finalization.

## Data hygiene

Personal emails and names used by the original nickname matching were removed from the working tree
and from git history. Do not reintroduce real identifiers in migrations, tests, fixtures, or docs.
Use `example.test` addresses in tests.
