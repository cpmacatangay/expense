-- Invite-gated account creation. New users must use an invited email and may
-- not create a password. Existing users are unaffected. The first account is
-- allowed so a fresh deployment can bootstrap its first group owner.

create or replace function public.before_user_created_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(event -> 'user' ->> 'email', '')));
  v_provider text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '');
  v_marker text := coalesce(
    event -> 'user' -> 'user_metadata' ->> 'salo_signup',
    event -> 'user' -> 'raw_user_meta_data' ->> 'salo_signup',
    ''
  );
  v_profiles integer;
begin
  -- Email/password sign-up is never part of the product. Email OTP marks its
  -- creation request; Google is allowed because the invited email is checked below.
  if v_marker <> 'otp' and v_provider <> 'google' then
    raise exception 'Password sign-up is disabled. Use Google or an email code.';
  end if;

  select count(*) into v_profiles from public.profiles;

  if v_profiles > 0 and not exists (
    select 1
    from public.invitations i
    where lower(i.invitee_email) = v_email
      and i.accepted_at is null
      and i.revoked_at is null
      and i.expires_at > now()
  ) then
    raise exception 'Salo is invite-only. Ask a group owner for an invitation.';
  end if;

  return event;
end;
$$;

revoke all on function public.before_user_created_hook(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created_hook(jsonb) to supabase_auth_admin, postgres;
