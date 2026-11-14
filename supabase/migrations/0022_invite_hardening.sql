-- Invite hardening: eight-character codes for new invitations, bounded attempts,
-- and a failed-attempt ledger. Existing six-character codes remain claimable.

alter table public.invitations add column if not exists invitee_email text;
create index if not exists invitations_invitee_email_idx
  on public.invitations (lower(invitee_email))
  where invitee_email is not null;

drop function if exists public.create_invitation(text);
drop function if exists public.invite_pending_adult(uuid);

create table if not exists public.invite_attempts (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists invite_attempts_profile_time_idx
  on public.invite_attempts (profile_id, attempted_at desc);

alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from public, anon, authenticated;

create or replace function public.join_group_with_code(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := upper(btrim(invite_code));
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

create or replace function public.create_invitation(adult_display_name text, invitee_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := btrim(adult_display_name);
  v_email text := lower(btrim(invitee_email));
  v_group_id uuid;
  v_adult_id uuid;
  v_code text;
  v_token text;
  v_color text;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 50 then
    raise exception 'Adult name must be 1-50 characters';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address';
  end if;
  select id into v_group_id from public.groups
  where owner_id = auth.uid() and status = 'active' limit 1;
  if v_group_id is null then raise exception 'Only the group owner can invite adults'; end if;

  select (array['#d9efe2', '#f0e4d0', '#dde7ef', '#f2ded6'])[(count(*) % 4) + 1]
  into v_color
  from public.group_adults
  where group_id = v_group_id;

  insert into public.group_adults (group_id, display_name, status, color)
  values (v_group_id, v_name, 'pending', v_color)
  returning id into v_adult_id;

  v_code := upper(encode(gen_random_bytes(4), 'hex'));
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invitations (
    group_id, adult_id, token_hash, code_hash, created_by, expires_at, invitee_email
  ) values (
    v_group_id, v_adult_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    auth.uid(), v_expires_at, v_email
  );

  return jsonb_build_object('adult_id', v_adult_id, 'code', v_code, 'token', v_token, 'expires_at', v_expires_at, 'invitee_email', v_email);
end;
$$;

create or replace function public.invite_pending_adult(p_adult_id uuid, p_invitee_email text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_adult public.group_adults;
  v_group public.groups;
  v_email text;
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

  v_email := lower(btrim(coalesce(
    p_invitee_email,
    (select i.invitee_email from public.invitations i
      where i.adult_id = p_adult_id and i.invitee_email is not null
      order by i.created_at desc limit 1)
  )));

  if v_email is null or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address for this invitation';
  end if;

  update public.invitations
  set revoked_at = now()
  where adult_id = p_adult_id
    and accepted_at is null
    and revoked_at is null;

  v_code := upper(encode(gen_random_bytes(4), 'hex'));
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invitations (
    group_id,
    adult_id,
    token_hash,
    code_hash,
    created_by,
    expires_at,
    invitee_email
  ) values (
    v_adult.group_id,
    p_adult_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    auth.uid(),
    v_expires_at,
    v_email
  );

  return jsonb_build_object(
    'adult_id', p_adult_id,
    'code', v_code,
    'token', v_token,
    'expires_at', v_expires_at,
    'invitee_email', v_email
  );
end;
$$;

revoke all on function public.join_group_with_code(text) from public, anon;
revoke all on function public.create_invitation(text, text) from public, anon;
revoke all on function public.invite_pending_adult(uuid, text) from public, anon;
grant execute on function public.join_group_with_code(text) to authenticated;
grant execute on function public.create_invitation(text, text) to authenticated;
grant execute on function public.invite_pending_adult(uuid, text) to authenticated;
