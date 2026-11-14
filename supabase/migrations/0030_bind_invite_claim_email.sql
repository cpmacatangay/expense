-- Bind a new invitation to the email that owns it. Legacy invitations with a
-- null invitee_email remain claimable by code until they expire.

create or replace function public.join_group_with_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := upper(btrim(invite_code));
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invitation public.invitations%rowtype;
  v_adult public.group_adults%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_code) not in (6, 8) then
    raise exception 'Enter the six- or eight-character invite code';
  end if;

  if (
    select count(*)
    from public.invite_attempts
    where profile_id = auth.uid()
      and attempted_at > now() - interval '15 minutes'
  ) >= 20 then
    raise exception 'Too many invite attempts. Try again later.';
  end if;

  select * into v_invitation
  from public.invitations
  where code_hash = encode(digest(v_code, 'sha256'), 'hex')
    and revoked_at is null
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if v_invitation.id is null then
    insert into public.invite_attempts (profile_id) values (auth.uid());
    return null;
  end if;

  if v_invitation.invitee_email is not null
     and v_email <> lower(v_invitation.invitee_email) then
    insert into public.invite_attempts (profile_id) values (auth.uid());
    raise exception 'This invitation belongs to another email';
  end if;

  select * into v_adult
  from public.group_adults
  where id = v_invitation.adult_id
  for update;

  if v_adult.id is null or v_adult.status <> 'pending' then
    raise exception 'Invitation already claimed';
  end if;

  if exists (
    select 1 from public.group_adults
    where group_id = v_invitation.group_id
      and profile_id = auth.uid()
      and status = 'active'
  ) then
    update public.invitations
    set accepted_by = auth.uid(), accepted_at = now()
    where id = v_invitation.id;
    delete from public.invite_attempts where profile_id = auth.uid();
    return v_invitation.group_id;
  end if;

  update public.group_adults
  set profile_id = auth.uid(), status = 'active', joined_at = now()
  where id = v_adult.id;

  update public.invitations
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invitation.id;

  delete from public.invite_attempts where profile_id = auth.uid();

  return v_invitation.group_id;
end;
$$;

revoke all on function public.join_group_with_code(text) from public, anon;
grant execute on function public.join_group_with_code(text) to authenticated;
