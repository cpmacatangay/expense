-- Invite an existing pending adult and revoke an open invite.
create or replace function public.invite_pending_adult(p_adult_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_adult public.group_adults;
  v_group public.groups;
  v_code text;
  v_token text;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_adult
  from public.group_adults
  where id = p_adult_id;

  if v_adult.id is null then
    raise exception 'Adult not found';
  end if;

  select * into v_group
  from public.groups
  where id = v_adult.group_id;

  if v_group.status <> 'active' or v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can invite this adult';
  end if;

  if v_adult.status <> 'pending' then
    raise exception 'Only pending adults can be invited';
  end if;

  if v_adult.profile_id is not null then
    raise exception 'This adult already has an account';
  end if;

  update public.invitations
  set revoked_at = now()
  where adult_id = p_adult_id
    and accepted_at is null
    and revoked_at is null;

  v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invitations (
    group_id,
    adult_id,
    token_hash,
    code_hash,
    created_by,
    expires_at
  ) values (
    v_adult.group_id,
    p_adult_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    auth.uid(),
    v_expires_at
  );

  return jsonb_build_object(
    'adult_id', p_adult_id,
    'code', v_code,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.revoke_pending_adult_invite(p_adult_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult public.group_adults;
  v_group public.groups;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_adult
  from public.group_adults
  where id = p_adult_id;

  if v_adult.id is null then
    raise exception 'Adult not found';
  end if;

  select * into v_group
  from public.groups
  where id = v_adult.group_id;

  if v_group.status <> 'active' or v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can revoke this invite';
  end if;

  update public.invitations
  set revoked_at = now()
  where adult_id = p_adult_id
    and accepted_at is null
    and revoked_at is null;

  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'This adult has no open invitation';
  end if;

  return v_count;
end;
$$;

revoke all on function public.invite_pending_adult(uuid) from public, anon;
revoke all on function public.revoke_pending_adult_invite(uuid) from public, anon;
grant execute on function public.invite_pending_adult(uuid) to authenticated;
grant execute on function public.revoke_pending_adult_invite(uuid) to authenticated;
