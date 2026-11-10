-- M1: identity, groups, adult identities, and invitations.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.group_status as enum ('active', 'archived', 'deleted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.adult_status as enum ('pending', 'active', 'removed');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#1F5C45',
  owner_id uuid not null references public.profiles (id) on delete restrict,
  currency text not null default 'PHP' check (currency = 'PHP'),
  timezone text not null default 'Asia/Manila' check (timezone = 'Asia/Manila'),
  status public.group_status not null default 'active',
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.group_adults (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete restrict,
  display_name text not null check (char_length(display_name) between 1 and 50),
  color text not null default '#1F5C45',
  status public.adult_status not null default 'pending',
  payment_qr_path text,
  payment_qr_label text check (
    payment_qr_label is null or char_length(payment_qr_label) between 1 and 40
  ),
  payment_qr_updated_at timestamptz,
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint group_adults_status_profile_check check (
    (status = 'pending' and profile_id is null)
    or (status = 'active' and profile_id is not null)
    or status = 'removed'
  )
);

create unique index if not exists group_adults_group_profile_key
  on public.group_adults (group_id, profile_id)
  where profile_id is not null;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  adult_id uuid not null references public.group_adults (id) on delete cascade,
  token_hash text not null unique,
  code_hash text not null unique,
  created_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invitations_group_id_idx on public.invitations (group_id);
create index if not exists group_adults_group_id_idx on public.group_adults (group_id);
create index if not exists groups_owner_id_idx on public.groups (owner_id);

-- Keep profiles.updated_at current.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Bootstrap a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membership helpers used by RLS. Security definer avoids recursive policy evaluation.
create or replace function public.is_group_member(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_adults
    where group_id = target_group
      and profile_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_group_owner(target_group uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups
    where id = target_group
      and owner_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_co_member(target_profile uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_adults mine
    join public.group_adults theirs on theirs.group_id = mine.group_id
    where mine.profile_id = auth.uid()
      and mine.status = 'active'
      and theirs.profile_id = target_profile
      and theirs.status = 'active'
  );
$$;

-- Capacity: at most 12 pending or active adult identities.
create or replace function public.enforce_group_adult_capacity()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*)
    from public.group_adults
    where group_id = new.group_id
      and status <> 'removed'
  ) >= 12 then
    raise exception 'A group can have at most 12 adult identities';
  end if;
  return new;
end;
$$;

drop trigger if exists group_adults_capacity on public.group_adults;
create trigger group_adults_capacity
  before insert on public.group_adults
  for each row execute function public.enforce_group_adult_capacity();

-- The owner must always be an active adult in the group.
create or replace function public.ensure_group_owner_adult()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.group_adults
    where group_id = new.id
      and profile_id = new.owner_id
      and status = 'active'
  ) then
    raise exception 'Group owner must be an active adult';
  end if;
  return new;
end;
$$;

drop trigger if exists groups_owner_adult on public.groups;
create constraint trigger groups_owner_adult
  after insert or update of owner_id on public.groups
  deferrable initially deferred
  for each row execute function public.ensure_group_owner_adult();

-- Create a group and its owner adult atomically.
create or replace function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(group_name);
  v_group_id uuid;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Group name must be 2-60 characters';
  end if;

  if exists (
    select 1 from public.groups
    where owner_id = auth.uid() and status <> 'deleted'
  ) then
    raise exception 'You already own a group';
  end if;

  select display_name into v_display_name
  from public.profiles
  where id = auth.uid();

  if v_display_name is null then
    raise exception 'Profile not found';
  end if;

  insert into public.groups (name, owner_id)
  values (v_name, auth.uid())
  returning id into v_group_id;

  insert into public.group_adults (group_id, profile_id, display_name, status, joined_at)
  values (v_group_id, auth.uid(), v_display_name, 'active', now());

  return v_group_id;
end;
$$;

-- Owner creates a pending adult and a seven-day invitation.
create or replace function public.create_invitation(adult_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := btrim(adult_display_name);
  v_group_id uuid;
  v_adult_id uuid;
  v_code text;
  v_token text;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 50 then
    raise exception 'Adult name must be 1-50 characters';
  end if;

  select id into v_group_id
  from public.groups
  where owner_id = auth.uid() and status = 'active'
  limit 1;

  if v_group_id is null then
    raise exception 'Only the group owner can invite adults';
  end if;

  insert into public.group_adults (group_id, display_name, status)
  values (v_group_id, v_name, 'pending')
  returning id into v_adult_id;

  v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invitations (
    group_id, adult_id, token_hash, code_hash, created_by, expires_at
  ) values (
    v_group_id,
    v_adult_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    auth.uid(),
    v_expires_at
  );

  return jsonb_build_object(
    'adult_id', v_adult_id,
    'code', v_code,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

-- Claim a pending adult identity by its short code.
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

  if char_length(v_code) <> 6 then
    raise exception 'Enter the six-character invite code';
  end if;

  select * into v_invitation
  from public.invitations
  where code_hash = encode(digest(v_code, 'sha256'), 'hex')
    and revoked_at is null
    and accepted_at is null
    and expires_at > now()
  limit 1;

  if v_invitation.id is null then
    raise exception 'Invitation not found or expired';
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
    return v_invitation.group_id;
  end if;

  update public.group_adults
  set profile_id = auth.uid(), status = 'active', joined_at = now()
  where id = v_adult.id;

  update public.invitations
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.group_id;
end;
$$;

-- Row-level security.
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_adults enable row level security;
alter table public.invitations enable row level security;

drop policy if exists profiles_select_self_or_co_member on public.profiles;
create policy profiles_select_self_or_co_member
  on public.profiles for select
  using (id = auth.uid() or public.is_co_member(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists groups_select_member on public.groups;
create policy groups_select_member
  on public.groups for select
  using (owner_id = auth.uid() or public.is_group_member(id));

drop policy if exists groups_update_owner on public.groups;
create policy groups_update_owner
  on public.groups for update
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

drop policy if exists group_adults_select_member on public.group_adults;
create policy group_adults_select_member
  on public.group_adults for select
  using (public.is_group_member(group_id));

drop policy if exists group_adults_insert_owner on public.group_adults;
create policy group_adults_insert_owner
  on public.group_adults for insert
  with check (public.is_group_owner(group_id));

drop policy if exists group_adults_update_owner on public.group_adults;
create policy group_adults_update_owner
  on public.group_adults for update
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

drop policy if exists invitations_select_owner on public.invitations;
create policy invitations_select_owner
  on public.invitations for select
  using (public.is_group_owner(group_id));

-- Function grants.
revoke all on function public.create_group(text) from public;
revoke all on function public.create_invitation(text) from public;
revoke all on function public.join_group_with_code(text) from public;

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.create_invitation(text) to authenticated;
grant execute on function public.join_group_with_code(text) to authenticated;
