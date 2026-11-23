-- Participant-based expense ledger.
-- One person per line, one payer, one-level coverage, pairwise debts, reversible mark-paid.
-- All writes go through security-definer RPCs; tables expose reads only.

create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.person_status as enum ('pending', 'active', 'former');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  display_name text not null,
  profile_id uuid unique references public.profiles (id) on delete set null,
  status public.person_status not null default 'pending',
  payment_qr_path text,
  payment_qr_label text,
  payment_qr_updated_at timestamptz,
  created_by_person_id uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_email_len check (char_length(email) between 3 and 254),
  constraint people_name_len check (char_length(display_name) between 1 and 50),
  constraint people_qr_label_len check (
    payment_qr_label is null or char_length(payment_qr_label) between 1 and 40
  ),
  constraint people_status_profile check (
    (status = 'pending' and profile_id is null)
    or (status = 'active' and profile_id is not null)
    or (status = 'former' and profile_id is null)
  ),
  constraint people_qr_path check (
    payment_qr_path is null or payment_qr_path like id::text || '/%'
  )
);

create unique index if not exists people_email_lower_key
  on public.people (lower(email));
create index if not exists people_profile_idx
  on public.people (profile_id) where profile_id is not null;
create index if not exists people_created_by_idx
  on public.people (created_by_person_id);
create index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  expense_date date not null default ((now() at time zone 'Asia/Manila')::date),
  payer_person_id uuid not null references public.people (id) on delete restrict,
  created_by_person_id uuid not null references public.people (id) on delete restrict,
  total_centavos bigint not null default 0,
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_description_len check (char_length(description) between 1 and 120),
  constraint expenses_total_nonnegative check (total_centavos >= 0),
  constraint expenses_version_positive check (version > 0)
);

create index if not exists expenses_date_idx
  on public.expenses (expense_date desc, created_at desc) where deleted_at is null;
create index if not exists expenses_payer_idx
  on public.expenses (payer_person_id) where deleted_at is null;
create index if not exists expenses_creator_idx
  on public.expenses (created_by_person_id);

create table if not exists public.expense_people (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete restrict,
  added_by_person_id uuid not null references public.people (id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (expense_id, person_id)
);

create index if not exists expense_people_person_idx
  on public.expense_people (person_id, expense_id);

create table if not exists public.expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  name text not null,
  amount_centavos bigint not null,
  assigned_person_id uuid not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint expense_items_name_len check (char_length(name) between 1 and 120),
  constraint expense_items_amount_positive check (amount_centavos > 0),
  constraint expense_items_position_nonnegative check (position >= 0),
  foreign key (expense_id, assigned_person_id)
    references public.expense_people (expense_id, person_id)
    on delete cascade
);

create index if not exists expense_items_expense_idx
  on public.expense_items (expense_id, position, created_at);
create index if not exists expense_items_person_idx
  on public.expense_items (assigned_person_id);

create table if not exists public.expense_coverage (
  expense_id uuid not null,
  covered_person_id uuid not null,
  coverer_person_id uuid not null,
  primary key (expense_id, covered_person_id),
  foreign key (expense_id, covered_person_id)
    references public.expense_people (expense_id, person_id)
    on delete cascade,
  foreign key (expense_id, coverer_person_id)
    references public.expense_people (expense_id, person_id)
    on delete cascade,
  constraint expense_coverage_distinct check (covered_person_id <> coverer_person_id)
);

create table if not exists public.expense_shares (
  expense_id uuid not null,
  person_id uuid not null,
  items_centavos bigint not null default 0,
  covered_centavos bigint not null default 0,
  owed_centavos bigint not null default 0,
  covered_by_person_id uuid,
  primary key (expense_id, person_id),
  foreign key (expense_id, person_id)
    references public.expense_people (expense_id, person_id)
    on delete cascade,
  foreign key (expense_id, covered_by_person_id)
    references public.expense_people (expense_id, person_id)
    on delete cascade,
  constraint expense_shares_nonnegative check (
    items_centavos >= 0 and covered_centavos >= 0 and owed_centavos >= 0
  ),
  constraint expense_shares_not_self_covered check (
    covered_by_person_id is distinct from person_id
  ),
  constraint expense_shares_math check (
    (covered_by_person_id is null
      and owed_centavos = items_centavos + covered_centavos)
    or (covered_by_person_id is not null
      and owed_centavos = 0
      and covered_centavos = 0)
  )
);

create index if not exists expense_shares_person_idx
  on public.expense_shares (person_id, expense_id);
create index if not exists expense_shares_expense_idx
  on public.expense_shares (expense_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  from_person_id uuid not null references public.people (id) on delete restrict,
  to_person_id uuid not null references public.people (id) on delete restrict,
  amount_centavos bigint not null,
  marked_by_person_id uuid not null references public.people (id) on delete restrict,
  marked_at timestamptz not null default now(),
  undone_at timestamptz,
  undone_by_person_id uuid references public.people (id) on delete restrict,
  constraint payments_amount_positive check (amount_centavos > 0),
  constraint payments_distinct_people check (from_person_id <> to_person_id),
  constraint payments_marker_in_pair check (
    marked_by_person_id in (from_person_id, to_person_id)
  ),
  constraint payments_undo_shape check (
    (undone_at is null and undone_by_person_id is null)
    or (undone_at is not null and undone_by_person_id is not null)
  ),
  constraint payments_undo_member check (
    undone_by_person_id is null
    or undone_by_person_id in (from_person_id, to_person_id)
  )
);

create index if not exists payments_from_idx
  on public.payments (from_person_id, to_person_id, marked_at desc);
create index if not exists payments_to_idx
  on public.payments (to_person_id, from_person_id, marked_at desc);
create index if not exists payments_active_idx
  on public.payments (marked_at desc) where undone_at is null;

create table if not exists public.expense_events (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  actor_person_id uuid not null references public.people (id) on delete restrict,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now(),
  constraint expense_events_action check (action in ('created', 'updated', 'deleted'))
);

create index if not exists expense_events_expense_idx
  on public.expense_events (expense_id, created_at desc);

create table if not exists public.person_invitations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  invited_by_person_id uuid not null references public.people (id) on delete restrict,
  expires_at timestamptz not null default now() + interval '7 days',
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint person_invitations_email_len check (char_length(email) between 3 and 254)
);

create unique index if not exists person_invitations_open_key
  on public.person_invitations (person_id)
  where claimed_at is null and revoked_at is null;
create index if not exists person_invitations_token_idx
  on public.person_invitations (token_hash);
create index if not exists person_invitations_expiry_idx
  on public.person_invitations (expires_at);

-- ---------------------------------------------------------------------------
-- Triggers and integrity
-- ---------------------------------------------------------------------------

drop trigger if exists people_touch_updated_at on public.people;
create trigger people_touch_updated_at
  before update on public.people
  for each row execute function public.touch_updated_at();

drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at
  before update on public.expenses
  for each row execute function public.touch_updated_at();

-- Account deletion keeps the person and their history.
create or replace function public.handle_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.people
  set status = 'former', profile_id = null, updated_at = now()
  where profile_id = old.id;
  return old;
end;
$$;

drop trigger if exists profiles_before_delete on public.profiles;
create trigger profiles_before_delete
  before delete on public.profiles
  for each row execute function public.handle_profile_delete();

-- 2-12 people, payer and creator on the expense.
create or replace function public.check_expense_integrity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense uuid;
  v_count integer;
  v_payer uuid;
  v_creator uuid;
begin
  if tg_op = 'DELETE' then
    v_expense := coalesce(
      nullif(to_jsonb(old) ->> 'id', '')::uuid,
      nullif(to_jsonb(old) ->> 'expense_id', '')::uuid
    );
  else
    v_expense := coalesce(
      nullif(to_jsonb(new) ->> 'id', '')::uuid,
      nullif(to_jsonb(new) ->> 'expense_id', '')::uuid,
      nullif(to_jsonb(old) ->> 'id', '')::uuid,
      nullif(to_jsonb(old) ->> 'expense_id', '')::uuid
    );
  end if;
  if v_expense is null then return null; end if;

  select payer_person_id, created_by_person_id
    into v_payer, v_creator
  from public.expenses where id = v_expense;
  if not found then return null; end if;

  select count(*) into v_count
  from public.expense_people where expense_id = v_expense;

  if v_count < 2 or v_count > 12 then
    raise exception 'An expense needs between 2 and 12 people';
  end if;
  if not exists (
    select 1 from public.expense_people
    where expense_id = v_expense and person_id = v_payer
  ) then
    raise exception 'The payer must be on the expense';
  end if;
  if not exists (
    select 1 from public.expense_people
    where expense_id = v_expense and person_id = v_creator
  ) then
    raise exception 'The creator must be on the expense';
  end if;
  return null;
end;
$$;

drop trigger if exists expenses_integrity on public.expenses;
create constraint trigger expenses_integrity
  after insert or update on public.expenses
  deferrable initially deferred
  for each row execute function public.check_expense_integrity();

drop trigger if exists expense_people_integrity on public.expense_people;
create constraint trigger expense_people_integrity
  after insert or update or delete on public.expense_people
  deferrable initially deferred
  for each row execute function public.check_expense_integrity();

-- Shares must sum to the expense total.
create or replace function public.check_share_sum()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense uuid;
  v_total bigint;
  v_sum bigint;
begin
  if tg_op = 'DELETE' then
    v_expense := nullif(to_jsonb(old) ->> 'expense_id', '')::uuid;
  else
    v_expense := nullif(to_jsonb(new) ->> 'expense_id', '')::uuid;
  end if;
  if v_expense is null then return null; end if;

  select total_centavos into v_total from public.expenses where id = v_expense;
  if not found then return null; end if;

  select coalesce(sum(owed_centavos), 0) into v_sum
  from public.expense_shares where expense_id = v_expense;

  if v_sum <> v_total then
    raise exception 'Shares do not sum to the expense total';
  end if;
  return null;
end;
$$;

drop trigger if exists expense_shares_sum on public.expense_shares;
create constraint trigger expense_shares_sum
  after insert or update or delete on public.expense_shares
  deferrable initially deferred
  for each row execute function public.check_share_sum();

-- One-level coverage, no self, no payer, no chains.
create or replace function public.validate_expense_coverage()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payer uuid;
begin
  if new.covered_person_id = new.coverer_person_id then
    raise exception 'A person cannot cover themselves';
  end if;

  select payer_person_id into v_payer
  from public.expenses where id = new.expense_id;

  if v_payer = new.covered_person_id then
    raise exception 'The payer cannot be covered';
  end if;

  if exists (
    select 1 from public.expense_coverage c
    where c.expense_id = new.expense_id
      and c.covered_person_id = new.coverer_person_id
      and c.covered_person_id <> new.covered_person_id
  ) then
    raise exception 'A coverer cannot also be covered';
  end if;

  if exists (
    select 1 from public.expense_coverage c
    where c.expense_id = new.expense_id
      and c.coverer_person_id = new.covered_person_id
      and c.covered_person_id <> new.covered_person_id
  ) then
    raise exception 'A covered person cannot cover someone';
  end if;

  return new;
end;
$$;

drop trigger if exists expense_coverage_validate on public.expense_coverage;
create trigger expense_coverage_validate
  before insert or update on public.expense_coverage
  for each row execute function public.validate_expense_coverage();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.try_uuid(value text)
returns uuid
language plpgsql
immutable
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.people where profile_id = auth.uid() limit 1;
$$;

create or replace function public.is_expense_participant(target_expense uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.expense_people
    where expense_id = target_expense
      and person_id = public.current_person_id()
  );
$$;

create or replace function public.is_expense_live(target_expense uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.expenses
    where id = target_expense and deleted_at is null
  );
$$;

create or replace function public.can_edit_expense(target_expense uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.expenses
    where id = target_expense
      and deleted_at is null
      and (
        created_by_person_id = public.current_person_id()
        or payer_person_id = public.current_person_id()
      )
  );
$$;

create or replace function public.can_view_person(target_person uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    target_person = public.current_person_id()
    or exists (
      select 1
      from public.expense_people mine
      join public.expense_people theirs on theirs.expense_id = mine.expense_id
      join public.expenses e on e.id = mine.expense_id
      where mine.person_id = public.current_person_id()
        and theirs.person_id = target_person
        and e.deleted_at is null
    )
    or exists (
      select 1 from public.payments p
      where (p.from_person_id = public.current_person_id() and p.to_person_id = target_person)
         or (p.from_person_id = target_person and p.to_person_id = public.current_person_id())
    );
$$;

-- Positive means p_a owes p_b. Internal only.
create or replace function public.pair_net(p_a uuid, p_b uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with debts as (
    select s.person_id as debtor, e.payer_person_id as creditor, s.owed_centavos as amount
    from public.expense_shares s
    join public.expenses e on e.id = s.expense_id
    where e.deleted_at is null
      and s.owed_centavos > 0
      and s.person_id <> e.payer_person_id
      and (
        (s.person_id = p_a and e.payer_person_id = p_b)
        or (s.person_id = p_b and e.payer_person_id = p_a)
      )
  ),
  payments as (
    select p.from_person_id as payer, p.to_person_id as payee, p.amount_centavos as amount
    from public.payments p
    where p.undone_at is null
      and (
        (p.from_person_id = p_a and p.to_person_id = p_b)
        or (p.from_person_id = p_b and p.to_person_id = p_a)
      )
  )
  select coalesce(sum(amount), 0)::bigint
  from (
    select case when debtor = p_a then amount else -amount end as amount from debts
    union all
    select case when payer = p_a then -amount else amount end as amount from payments
  ) edges;
$$;

create or replace function public.expense_snapshot(p_expense uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'description', e.description,
    'expenseDate', e.expense_date,
    'payerPersonId', e.payer_person_id,
    'payerName', payer.display_name,
    'totalCentavos', e.total_centavos,
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('personId', p.id, 'displayName', p.display_name)
        order by p.display_name)
      from public.expense_people ep
      join public.people p on p.id = ep.person_id
      where ep.expense_id = e.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', i.name,
        'amountCentavos', i.amount_centavos,
        'assignedPersonId', i.assigned_person_id,
        'assignedName', ap.display_name
      ) order by i.position, i.created_at)
      from public.expense_items i
      join public.people ap on ap.id = i.assigned_person_id
      where i.expense_id = e.id
    ), '[]'::jsonb),
    'coverage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'coveredPersonId', c.covered_person_id,
        'coveredName', cp.display_name,
        'covererPersonId', c.coverer_person_id,
        'covererName', rp.display_name
      ))
      from public.expense_coverage c
      join public.people cp on cp.id = c.covered_person_id
      join public.people rp on rp.id = c.coverer_person_id
      where c.expense_id = e.id
    ), '[]'::jsonb)
  )
  from public.expenses e
  join public.people payer on payer.id = e.payer_person_id
  where e.id = p_expense;
$$;

-- ---------------------------------------------------------------------------
-- Identity RPCs
-- ---------------------------------------------------------------------------

-- Keep profile creation independent of the retired nickname tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = public.profiles.display_name;
  return new;
end;
$$;

create or replace function public.ensure_profile(display_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  insert into public.profiles (id, email, display_name)
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(
      nullif(btrim(display_name), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Member'
    )
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do update set email = excluded.email
  returning * into v_profile;

  if v_profile.id is null then raise exception 'Profile not found'; end if;
  return v_profile;
end;
$$;

create or replace function public.ensure_person()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_person public.people;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null then
    insert into public.profiles (id, email, display_name)
    select
      u.id,
      coalesce(u.email, ''),
      coalesce(
        nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
        'Member'
      )
    from auth.users u
    where u.id = v_uid
    on conflict (id) do nothing
    returning * into v_profile;
  end if;

  if v_profile.id is null then raise exception 'Profile not found'; end if;
  if char_length(coalesce(v_profile.email, '')) < 3 then
    raise exception 'Profile email is required';
  end if;

  select * into v_person from public.people where profile_id = v_uid limit 1;

  if v_person.id is null then
    select * into v_person
    from public.people
    where lower(email) = lower(v_profile.email)
      and status in ('pending', 'former')
    order by created_at
    limit 1
    for update;

    if v_person.id is not null then
      update public.people
      set profile_id = v_uid,
          status = 'active',
          email = lower(v_profile.email),
          display_name = v_profile.display_name,
          updated_at = now()
      where id = v_person.id
      returning * into v_person;
    else
      insert into public.people (email, display_name, profile_id, status)
      values (lower(v_profile.email), v_profile.display_name, v_uid, 'active')
      returning * into v_person;
    end if;
  else
    update public.people
    set email = lower(v_profile.email),
        display_name = v_profile.display_name,
        updated_at = now()
    where id = v_person.id
    returning * into v_person;
  end if;

  return jsonb_build_object(
    'person', jsonb_build_object(
      'id', v_person.id,
      'email', v_person.email,
      'displayName', v_person.display_name,
      'status', v_person.status,
      'paymentQrLabel', v_person.payment_qr_label,
      'paymentQrPath', v_person.payment_qr_path,
      'hasQr', v_person.payment_qr_path is not null
    )
  );
end;
$$;

create or replace function public.claim_people_for_me()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_ids uuid[] := '{}';
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null then
    return jsonb_build_object('claimedPersonIds', '[]'::jsonb);
  end if;

  for v_id in
    select id from public.people
    where lower(email) = lower(v_profile.email)
      and status in ('pending', 'former')
    for update
  loop
    update public.people
    set profile_id = v_uid,
        status = 'active',
        display_name = v_profile.display_name,
        updated_at = now()
    where id = v_id;

    update public.person_invitations
    set claimed_at = now()
    where person_id = v_id and claimed_at is null and revoked_at is null;

    v_ids := array_append(v_ids, v_id);
  end loop;

  return jsonb_build_object('claimedPersonIds', to_jsonb(v_ids));
end;
$$;

create or replace function public.claim_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_inv public.person_invitations;
  v_person public.people;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'This invite is no longer available';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null then raise exception 'Profile not found'; end if;

  select * into v_inv
  from public.person_invitations
  where token_hash = encode(digest(p_token, 'sha256'), 'hex')
  for update;

  if v_inv.id is null then
    raise exception 'This invite is no longer available';
  end if;
  if v_inv.revoked_at is not null or v_inv.expires_at <= now() then
    raise exception 'This invite is no longer available';
  end if;
  if lower(v_inv.email) <> lower(v_profile.email) then
    raise exception 'Sign in with the Google account for the invited email';
  end if;

  select * into v_person from public.people where id = v_inv.person_id for update;
  if v_person.id is null then raise exception 'This invite is no longer available'; end if;

  if v_inv.claimed_at is not null then
    if v_person.profile_id = v_uid then
      return jsonb_build_object('personId', v_person.id, 'alreadyClaimed', true);
    end if;
    raise exception 'That person already joined';
  end if;

  if v_person.profile_id is not null and v_person.profile_id <> v_uid then
    raise exception 'That person already joined';
  end if;

  update public.people
  set profile_id = v_uid,
      status = 'active',
      display_name = v_profile.display_name,
      updated_at = now()
  where id = v_person.id
  returning * into v_person;

  update public.person_invitations set claimed_at = now() where id = v_inv.id;

  return jsonb_build_object('personId', v_person.id, 'alreadyClaimed', false);
end;
$$;

create or replace function public.update_display_name(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_display_name, ''));
  v_person public.people;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 50 then
    raise exception 'Name must be 1-50 characters';
  end if;

  update public.profiles set display_name = v_name where id = v_uid;
  update public.people set display_name = v_name, updated_at = now()
  where profile_id = v_uid
  returning * into v_person;

  if v_person.id is null then raise exception 'Person not found'; end if;
  return jsonb_build_object('person', jsonb_build_object(
    'id', v_person.id,
    'displayName', v_person.display_name
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- People and invite RPCs
-- ---------------------------------------------------------------------------

create or replace function public.people_for_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.current_person_id() as id),
  shared as (
    select distinct theirs.person_id
    from public.expense_people mine
    join public.expense_people theirs on theirs.expense_id = mine.expense_id
    join public.expenses e on e.id = mine.expense_id
    where mine.person_id = (select id from me)
      and theirs.person_id <> (select id from me)
      and e.deleted_at is null
    union
    select case when p.from_person_id = (select id from me) then p.to_person_id else p.from_person_id end
    from public.payments p
    where p.from_person_id = (select id from me)
       or p.to_person_id = (select id from me)
    union
    select id from public.people
    where created_by_person_id = (select id from me) and status = 'pending'
  ),
  ids as (
    select id from me
    union
    select person_id from shared
  )
  select jsonb_build_object(
    'people',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'displayName', p.display_name,
        'status', p.status,
        'isSelf', p.id = (select id from me),
        'hasQr', p.payment_qr_path is not null,
        'createdByMe', p.created_by_person_id = (select id from me),
        'pendingEmail', case
          when p.created_by_person_id = (select id from me) and p.status = 'pending'
          then p.email else null end,
        'invitationExpiresAt', (
          select i.expires_at from public.person_invitations i
          where i.person_id = p.id and i.claimed_at is null and i.revoked_at is null
          order by i.expires_at desc limit 1
        )
      ) order by
        (p.id = (select id from me)) desc,
        case p.status when 'active' then 0 when 'pending' then 1 else 2 end,
        p.display_name)
      from public.people p
      where p.id in (select id from ids)
    ), '[]'::jsonb)
  );
$$;

create or replace function public.add_person(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_profile public.profiles;
  v_person public.people;
  v_token text;
  v_expires timestamptz := now() + interval '7 days';
  v_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(v_email) > 254 then
    raise exception 'Enter a valid email address';
  end if;

  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;
  if v_email = lower(v_me.email) then raise exception 'That is your email'; end if;

  select count(*) into v_count
  from public.person_invitations
  where invited_by_person_id = v_me.id and created_at > now() - interval '1 hour';
  if v_count >= 20 then raise exception 'Too many invites. Try again later.'; end if;

  select * into v_profile from public.profiles where lower(email) = v_email limit 1;
  select * into v_person from public.people where lower(email) = v_email limit 1 for update;

  if v_person.id is null then
    if v_profile.id is not null then
      insert into public.people (email, display_name, profile_id, status, created_by_person_id)
      values (v_email, v_profile.display_name, v_profile.id, 'active', v_me.id)
      returning * into v_person;
    else
      insert into public.people (email, display_name, status, created_by_person_id)
      values (
        v_email,
        coalesce(nullif(split_part(v_email, '@', 1), ''), 'Friend'),
        'pending',
        v_me.id
      )
      returning * into v_person;
    end if;
  else
    if v_profile.id is not null and v_person.profile_id is null then
      update public.people
      set profile_id = v_profile.id,
          status = 'active',
          display_name = v_profile.display_name,
          updated_at = now()
      where id = v_person.id
      returning * into v_person;
    elsif v_person.status = 'former' and v_profile.id is null then
      update public.people
      set status = 'pending', updated_at = now()
      where id = v_person.id
      returning * into v_person;
    end if;

    if v_person.created_by_person_id is null then
      update public.people set created_by_person_id = v_me.id where id = v_person.id;
    end if;
  end if;

  if v_person.status = 'active' then
    return jsonb_build_object(
      'personId', v_person.id,
      'status', 'active',
      'inviteToken', null,
      'expiresAt', null
    );
  end if;

  update public.person_invitations
  set revoked_at = now()
  where person_id = v_person.id and claimed_at is null and revoked_at is null;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.person_invitations (
    person_id, email, token_hash, invited_by_person_id, expires_at
  ) values (
    v_person.id, v_email, encode(digest(v_token, 'sha256'), 'hex'), v_me.id, v_expires
  );

  return jsonb_build_object(
    'personId', v_person.id,
    'status', 'pending',
    'inviteToken', v_token,
    'expiresAt', v_expires
  );
end;
$$;

create or replace function public.create_invite_link(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_person public.people;
  v_token text;
  v_expires timestamptz := now() + interval '7 days';
  v_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_person from public.people where id = p_person_id for update;
  if v_person.id is null then raise exception 'This invite is no longer available'; end if;
  if v_person.status <> 'pending' then raise exception 'That person already joined'; end if;
  if v_person.created_by_person_id <> v_me.id
     and not public.can_view_person(v_person.id) then
    raise exception 'You cannot change this invite';
  end if;

  select count(*) into v_count
  from public.person_invitations
  where invited_by_person_id = v_me.id and created_at > now() - interval '1 hour';
  if v_count >= 20 then raise exception 'Too many invites. Try again later.'; end if;

  update public.person_invitations
  set revoked_at = now()
  where person_id = v_person.id and claimed_at is null and revoked_at is null;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.person_invitations (
    person_id, email, token_hash, invited_by_person_id, expires_at
  ) values (
    v_person.id,
    lower(v_person.email),
    encode(digest(v_token, 'sha256'), 'hex'),
    v_me.id,
    v_expires
  );

  return jsonb_build_object(
    'personId', v_person.id,
    'inviteToken', v_token,
    'expiresAt', v_expires
  );
end;
$$;

create or replace function public.correct_pending_email(
  p_person_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_person public.people;
  v_profile public.profiles;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_token text;
  v_expires timestamptz := now() + interval '7 days';
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(v_email) > 254 then
    raise exception 'Enter a valid email address';
  end if;

  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_person from public.people where id = p_person_id for update;
  if v_person.id is null then raise exception 'This invite is no longer available'; end if;
  if v_person.status <> 'pending' then raise exception 'That person already joined'; end if;
  if v_person.created_by_person_id <> v_me.id then
    raise exception 'You cannot change this invite';
  end if;

  if exists (
    select 1 from public.people
    where lower(email) = v_email and id <> v_person.id
  ) then
    raise exception 'That email already belongs to another person';
  end if;

  -- If an account already exists for the old address, link it instead of changing it.
  select * into v_profile from public.profiles where lower(email) = lower(v_person.email) limit 1;
  if v_profile.id is not null then
    update public.people
    set profile_id = v_profile.id,
        status = 'active',
        display_name = v_profile.display_name,
        updated_at = now()
    where id = v_person.id;
    update public.person_invitations
    set claimed_at = now()
    where person_id = v_person.id and claimed_at is null and revoked_at is null;
    return jsonb_build_object(
      'personId', v_person.id,
      'status', 'active',
      'inviteToken', null,
      'expiresAt', null
    );
  end if;

  -- If the new address already has an account, link it and finish.
  select * into v_profile from public.profiles where lower(email) = v_email limit 1;
  if v_profile.id is not null then
    update public.people
    set email = v_email,
        profile_id = v_profile.id,
        status = 'active',
        display_name = v_profile.display_name,
        updated_at = now()
    where id = v_person.id;
    update public.person_invitations
    set claimed_at = now()
    where person_id = v_person.id and claimed_at is null and revoked_at is null;
    return jsonb_build_object(
      'personId', v_person.id,
      'status', 'active',
      'inviteToken', null,
      'expiresAt', null
    );
  end if;

  update public.people
  set email = v_email, updated_at = now()
  where id = v_person.id;

  update public.person_invitations
  set revoked_at = now()
  where person_id = v_person.id and claimed_at is null and revoked_at is null;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.person_invitations (
    person_id, email, token_hash, invited_by_person_id, expires_at
  ) values (
    v_person.id, v_email, encode(digest(v_token, 'sha256'), 'hex'), v_me.id, v_expires
  );

  return jsonb_build_object(
    'personId', v_person.id,
    'status', 'pending',
    'inviteToken', v_token,
    'expiresAt', v_expires
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Expense RPCs
-- ---------------------------------------------------------------------------

create or replace function public.save_expense(
  p_payload jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_id uuid;
  v_is_update boolean;
  v_old public.expenses;
  v_desc text;
  v_date date;
  v_payer uuid;
  v_people uuid[];
  v_items jsonb;
  v_coverage jsonb;
  v_count integer;
  v_total bigint := 0;
  v_item jsonb;
  v_cov jsonb;
  v_p uuid;
  v_amount bigint;
  v_gross jsonb := '{}'::jsonb;
  v_covered_by jsonb := '{}'::jsonb;
  v_coverers jsonb := '{}'::jsonb;
  v_owed jsonb := '{}'::jsonb;
  v_added jsonb := '{}'::jsonb;
  v_person uuid;
  v_items_amount bigint;
  v_covered_amount bigint;
  v_owed_amount bigint;
  v_share_sum bigint;
  v_version integer;
  v_before jsonb;
  v_after jsonb;
  v_count_people integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  v_id := nullif(p_payload ->> 'id', '')::uuid;
  v_is_update := v_id is not null;
  v_desc := btrim(coalesce(p_payload ->> 'description', ''));
  v_date := coalesce(
    nullif(p_payload ->> 'expenseDate', '')::date,
    (now() at time zone 'Asia/Manila')::date
  );
  v_payer := nullif(p_payload ->> 'payerPersonId', '')::uuid;
  v_items := coalesce(p_payload -> 'items', '[]'::jsonb);
  v_coverage := coalesce(p_payload -> 'coverage', '[]'::jsonb);

  if char_length(v_desc) < 1 or char_length(v_desc) > 120 then
    raise exception 'Enter a description';
  end if;
  if v_payer is null then raise exception 'Choose a payer'; end if;

  select coalesce(array_agg(distinct value::uuid), '{}'::uuid[])
    into v_people
  from jsonb_array_elements_text(coalesce(p_payload -> 'people', '[]'::jsonb));

  v_count := coalesce(array_length(v_people, 1), 0);
  if v_count < 2 or v_count > 12 then
    raise exception 'Choose between 2 and 12 people';
  end if;
  if exists (
    select 1 from unnest(v_people) p
    where not exists (select 1 from public.people where id = p)
  ) then
    raise exception 'That person was not found';
  end if;
  if not (v_payer = any(v_people)) then
    raise exception 'Choose a payer who is on the expense';
  end if;
  if not (v_me.id = any(v_people)) then
    raise exception 'You must be on the expense';
  end if;

  if v_is_update then
    select * into v_old
    from public.expenses
    where id = v_id and deleted_at is null
    for update;

    if v_old.id is null then raise exception 'Not found'; end if;
    if v_old.created_by_person_id <> v_me.id and v_old.payer_person_id <> v_me.id then
      raise exception 'Only the creator or payer can edit this expense';
    end if;
    if p_expected_version is null or p_expected_version <> v_old.version then
      raise exception 'This expense changed. Reload and try again.';
    end if;
    if not (v_old.created_by_person_id = any(v_people)) then
      raise exception 'The creator must remain on the expense';
    end if;

    v_before := public.expense_snapshot(v_id);
    select coalesce(jsonb_object_agg(person_id::text, added_by_person_id::text), '{}'::jsonb)
      into v_added
    from public.expense_people where expense_id = v_id;
  end if;

  if jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) < 1
     or jsonb_array_length(v_items) > 50 then
    raise exception 'Add at least one item';
  end if;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    if char_length(btrim(coalesce(v_item ->> 'name', ''))) < 1
       or char_length(btrim(v_item ->> 'name')) > 120 then
      raise exception 'Every item needs a name';
    end if;

    v_amount := nullif(v_item ->> 'amountCentavos', '')::bigint;
    if v_amount is null or v_amount <= 0 or v_amount > 9007199254740991 then
      raise exception 'Every item needs an amount greater than zero';
    end if;

    v_p := nullif(v_item ->> 'assignedPersonId', '')::uuid;
    if v_p is null or not (v_p = any(v_people)) then
      raise exception 'That item belongs to someone not on this expense';
    end if;

    v_total := v_total + v_amount;
    v_gross := jsonb_set(
      v_gross,
      array[v_p::text],
      to_jsonb(coalesce((v_gross ->> v_p::text)::bigint, 0) + v_amount),
      true
    );
  end loop;

  if v_total <= 0 then
    raise exception 'The expense total must be greater than zero';
  end if;

  if jsonb_typeof(v_coverage) <> 'array' then
    raise exception 'That coverage is not allowed';
  end if;

  for v_cov in select value from jsonb_array_elements(v_coverage)
  loop
    declare
      v_covered_p uuid := nullif(v_cov ->> 'coveredPersonId', '')::uuid;
      v_coverer_p uuid := nullif(v_cov ->> 'covererPersonId', '')::uuid;
    begin
      if v_covered_p is null or v_coverer_p is null
         or not (v_covered_p = any(v_people))
         or not (v_coverer_p = any(v_people)) then
        raise exception 'That coverage is not allowed';
      end if;
      if v_covered_p = v_coverer_p then
        raise exception 'A person cannot cover themselves';
      end if;
      if v_covered_p = v_payer then
        raise exception 'The payer cannot be covered';
      end if;
      if v_covered_by ? v_covered_p::text then
        raise exception 'Each person needs one coverer';
      end if;
      if v_covered_by ? v_coverer_p::text then
        raise exception 'A coverer cannot also be covered';
      end if;
      if v_coverers ? v_covered_p::text then
        raise exception 'A covered person cannot cover someone';
      end if;

      v_covered_by := v_covered_by || jsonb_build_object(v_covered_p::text, v_coverer_p::text);
      v_coverers := v_coverers || jsonb_build_object(v_coverer_p::text, true);
    end;
  end loop;

  for v_person in select unnest(v_people)
  loop
    v_items_amount := coalesce((v_gross ->> v_person::text)::bigint, 0);

    if v_covered_by ? v_person::text then
      v_covered_amount := 0;
      v_owed_amount := 0;
    else
      select coalesce(sum(coalesce((v_gross ->> key)::bigint, 0)), 0)
        into v_covered_amount
      from jsonb_each_text(v_covered_by)
      where value = v_person::text;
      v_owed_amount := v_items_amount + v_covered_amount;
    end if;

    v_owed := v_owed || jsonb_build_object(
      v_person::text,
      jsonb_build_object(
        'items', v_items_amount,
        'covered', v_covered_amount,
        'owed', v_owed_amount,
        'coveredBy', v_covered_by ->> v_person::text
      )
    );
  end loop;

  select coalesce(sum((value ->> 'owed')::bigint), 0)
    into v_share_sum
  from jsonb_each(v_owed);

  if v_share_sum <> v_total then
    raise exception 'Shares do not sum to the total';
  end if;

  -- Serialize balance changes for every pair on this expense.
  perform pg_advisory_xact_lock(hashtextextended(pair_key, 0))
  from (
    select least(v_payer::text, p::text) || ':' || greatest(v_payer::text, p::text) as pair_key
    from unnest(v_people) p
    where p <> v_payer
    order by 1
  ) pairs;

  if v_is_update then
    update public.expenses
    set description = v_desc,
        expense_date = v_date,
        payer_person_id = v_payer,
        total_centavos = v_total,
        version = version + 1,
        updated_at = now()
    where id = v_id
    returning * into v_old;

    v_version := v_old.version;

    delete from public.expense_coverage where expense_id = v_id;
    delete from public.expense_shares where expense_id = v_id;
    delete from public.expense_items where expense_id = v_id;
    delete from public.expense_people where expense_id = v_id;
  else
    insert into public.expenses (
      description, expense_date, payer_person_id, created_by_person_id, total_centavos, version
    ) values (
      v_desc, v_date, v_payer, v_me.id, v_total, 1
    )
    returning * into v_old;

    v_id := v_old.id;
    v_version := 1;
  end if;

  insert into public.expense_people (expense_id, person_id, added_by_person_id)
  select v_id, p, coalesce((v_added ->> p::text)::uuid, v_me.id)
  from unnest(v_people) p;

  insert into public.expense_items (
    expense_id, name, amount_centavos, assigned_person_id, position
  )
  select
    v_id,
    btrim(value ->> 'name'),
    (value ->> 'amountCentavos')::bigint,
    (value ->> 'assignedPersonId')::uuid,
    (ordinality - 1)::integer
  from jsonb_array_elements(v_items) with ordinality;

  insert into public.expense_coverage (
    expense_id, covered_person_id, coverer_person_id
  )
  select
    v_id,
    (value ->> 'coveredPersonId')::uuid,
    (value ->> 'covererPersonId')::uuid
  from jsonb_array_elements(v_coverage);

  insert into public.expense_shares (
    expense_id, person_id, items_centavos, covered_centavos, owed_centavos, covered_by_person_id
  )
  select
    v_id,
    p,
    (v_owed -> p::text ->> 'items')::bigint,
    (v_owed -> p::text ->> 'covered')::bigint,
    (v_owed -> p::text ->> 'owed')::bigint,
    nullif(v_owed -> p::text ->> 'coveredBy', '')::uuid
  from unnest(v_people) p;

  v_after := public.expense_snapshot(v_id);

  insert into public.expense_events (
    expense_id, actor_person_id, action, before_json, after_json
  ) values (
    v_id,
    v_me.id,
    case when v_is_update then 'updated' else 'created' end,
    v_before,
    v_after
  );

  select count(*) into v_count_people from public.expense_people where expense_id = v_id;
  if v_count_people < 2 or v_count_people > 12 then
    raise exception 'An expense needs between 2 and 12 people';
  end if;

  return jsonb_build_object(
    'expenseId', v_id,
    'version', v_version,
    'totalCentavos', v_total,
    'shares', coalesce((
      select jsonb_agg(jsonb_build_object(
        'personId', person_id,
        'itemsCentavos', items_centavos,
        'coveredCentavos', covered_centavos,
        'owedCentavos', owed_centavos,
        'coveredByPersonId', covered_by_person_id
      ) order by person_id)
      from public.expense_shares where expense_id = v_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.delete_expense(p_expense_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_expense public.expenses;
  v_before jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_expense
  from public.expenses
  where id = p_expense_id and deleted_at is null
  for update;

  if v_expense.id is null then raise exception 'Not found'; end if;
  if v_expense.created_by_person_id <> v_me.id and v_expense.payer_person_id <> v_me.id then
    raise exception 'Only the creator or payer can edit this expense';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(pair_key, 0))
  from (
    select least(v_expense.payer_person_id::text, ep.person_id::text)
      || ':' || greatest(v_expense.payer_person_id::text, ep.person_id::text) as pair_key
    from public.expense_people ep
    where ep.expense_id = p_expense_id
      and ep.person_id <> v_expense.payer_person_id
    order by 1
  ) pairs;

  v_before := public.expense_snapshot(p_expense_id);

  update public.expenses
  set deleted_at = now(), updated_at = now()
  where id = p_expense_id;

  insert into public.expense_events (
    expense_id, actor_person_id, action, before_json, after_json
  ) values (p_expense_id, v_me.id, 'deleted', v_before, null);

  return jsonb_build_object('expenseId', p_expense_id);
end;
$$;

create or replace function public.expenses_for_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.current_person_id() as id)
  select jsonb_build_object(
    'expenses',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'description', e.description,
        'expenseDate', e.expense_date,
        'payerPersonId', e.payer_person_id,
        'payerName', payer.display_name,
        'totalCentavos', e.total_centavos,
        'myShareCentavos', coalesce((
          select s.owed_centavos from public.expense_shares s
          where s.expense_id = e.id and s.person_id = (select id from me)
        ), 0),
        'createdAt', e.created_at
      ) order by e.expense_date desc, e.created_at desc)
      from public.expenses e
      join public.people payer on payer.id = e.payer_person_id
      where e.deleted_at is null
        and exists (
          select 1 from public.expense_people ep
          where ep.expense_id = e.id and ep.person_id = (select id from me)
        )
    ), '[]'::jsonb)
  );
$$;

create or replace function public.expense_detail(p_expense_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_expense public.expenses;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Not found'; end if;

  select * into v_expense
  from public.expenses
  where id = p_expense_id and deleted_at is null;

  if v_expense.id is null or not public.is_expense_participant(p_expense_id) then
    raise exception 'Not found';
  end if;

  return jsonb_build_object(
    'expense', jsonb_build_object(
      'id', v_expense.id,
      'description', v_expense.description,
      'expenseDate', v_expense.expense_date,
      'payerPersonId', v_expense.payer_person_id,
      'createdByPersonId', v_expense.created_by_person_id,
      'totalCentavos', v_expense.total_centavos,
      'version', v_expense.version,
      'createdAt', v_expense.created_at,
      'updatedAt', v_expense.updated_at,
      'canEdit', (
        v_expense.created_by_person_id = v_me.id
        or v_expense.payer_person_id = v_me.id
      )
    ),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'displayName', p.display_name,
        'status', p.status,
        'hasQr', p.payment_qr_path is not null,
        'isPayer', p.id = v_expense.payer_person_id,
        'isCreator', p.id = v_expense.created_by_person_id
      ) order by p.display_name)
      from public.expense_people ep
      join public.people p on p.id = ep.person_id
      where ep.expense_id = p_expense_id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'name', i.name,
        'amountCentavos', i.amount_centavos,
        'assignedPersonId', i.assigned_person_id,
        'position', i.position
      ) order by i.position, i.created_at)
      from public.expense_items i
      where i.expense_id = p_expense_id
    ), '[]'::jsonb),
    'coverage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'coveredPersonId', c.covered_person_id,
        'covererPersonId', c.coverer_person_id
      ))
      from public.expense_coverage c
      where c.expense_id = p_expense_id
    ), '[]'::jsonb),
    'shares', coalesce((
      select jsonb_agg(jsonb_build_object(
        'personId', s.person_id,
        'itemsCentavos', s.items_centavos,
        'coveredCentavos', s.covered_centavos,
        'owedCentavos', s.owed_centavos,
        'coveredByPersonId', s.covered_by_person_id
      ) order by s.person_id)
      from public.expense_shares s
      where s.expense_id = p_expense_id
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ev.id,
        'actorPersonId', ev.actor_person_id,
        'actorName', actor.display_name,
        'action', ev.action,
        'before', ev.before_json,
        'after', ev.after_json,
        'createdAt', ev.created_at
      ) order by ev.created_at)
      from public.expense_events ev
      join public.people actor on actor.id = ev.actor_person_id
      where ev.expense_id = p_expense_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Ledger RPCs
-- ---------------------------------------------------------------------------

create or replace function public.ledger_for_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.current_person_id() as id),
  debts as (
    select
      case when s.person_id = (select id from me)
        then e.payer_person_id else s.person_id end as other,
      case when s.person_id = (select id from me)
        then s.owed_centavos else -s.owed_centavos end as amount
    from public.expense_shares s
    join public.expenses e on e.id = s.expense_id
    where e.deleted_at is null
      and s.owed_centavos > 0
      and s.person_id <> e.payer_person_id
      and (
        s.person_id = (select id from me)
        or e.payer_person_id = (select id from me)
      )
  ),
  payment_edges as (
    select
      case when p.from_person_id = (select id from me)
        then p.to_person_id else p.from_person_id end as other,
      case when p.from_person_id = (select id from me)
        then -p.amount_centavos else p.amount_centavos end as amount
    from public.payments p
    where p.undone_at is null
      and (
        p.from_person_id = (select id from me)
        or p.to_person_id = (select id from me)
      )
  ),
  nets as (
    select other, sum(amount) as amount
    from (select * from debts union all select * from payment_edges) edges
    group by other
  ),
  active as (select * from nets where amount <> 0)
  select jsonb_build_object(
    'youOweCentavos', coalesce((select sum(amount) from active where amount > 0), 0),
    'owedToYouCentavos', coalesce((select -sum(amount) from active where amount < 0), 0),
    'debts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'otherPersonId', a.other,
        'otherName', p.display_name,
        'direction', case when a.amount > 0 then 'you_owe' else 'owes_you' end,
        'amountCentavos', abs(a.amount),
        'hasQr', p.payment_qr_path is not null,
        'qrPath', p.payment_qr_path
      ) order by abs(a.amount) desc, p.display_name)
      from active a
      join public.people p on p.id = a.other
    ), '[]'::jsonb)
  );
$$;

create or replace function public.pair_history(p_other_person_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_other public.people;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Not found'; end if;

  select * into v_other from public.people where id = p_other_person_id;
  if v_other.id is null then raise exception 'Not found'; end if;
  if not public.can_view_person(v_other.id) then raise exception 'Not found'; end if;

  return jsonb_build_object(
    'other', jsonb_build_object(
      'id', v_other.id,
      'displayName', v_other.display_name,
      'hasQr', v_other.payment_qr_path is not null,
      'qrPath', v_other.payment_qr_path
    ),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'fromPersonId', p.from_person_id,
        'toPersonId', p.to_person_id,
        'amountCentavos', p.amount_centavos,
        'markedByPersonId', p.marked_by_person_id,
        'markedAt', p.marked_at,
        'undoneAt', p.undone_at,
        'undoneByPersonId', p.undone_by_person_id
      ) order by p.marked_at desc)
      from public.payments p
      where (p.from_person_id = v_me.id and p.to_person_id = v_other.id)
         or (p.from_person_id = v_other.id and p.to_person_id = v_me.id)
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.mark_paid(p_other_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_other public.people;
  v_net bigint;
  v_from uuid;
  v_to uuid;
  v_payment public.payments;
  v_key text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_other from public.people where id = p_other_person_id;
  if v_other.id is null then raise exception 'That person is not in your ledger'; end if;
  if v_other.id = v_me.id then raise exception 'That person is not in your ledger'; end if;

  v_key := least(v_me.id::text, v_other.id::text) || ':' || greatest(v_me.id::text, v_other.id::text);
  perform pg_advisory_xact_lock(hashtextextended(v_key, 0));

  v_net := public.pair_net(v_me.id, v_other.id);
  if v_net = 0 then raise exception 'Nothing to settle'; end if;

  if v_net > 0 then
    v_from := v_me.id;
    v_to := v_other.id;
  else
    v_from := v_other.id;
    v_to := v_me.id;
  end if;

  insert into public.payments (
    from_person_id, to_person_id, amount_centavos, marked_by_person_id
  ) values (
    v_from, v_to, abs(v_net), v_me.id
  )
  returning * into v_payment;

  return jsonb_build_object(
    'id', v_payment.id,
    'fromPersonId', v_payment.from_person_id,
    'toPersonId', v_payment.to_person_id,
    'amountCentavos', v_payment.amount_centavos,
    'markedByPersonId', v_payment.marked_by_person_id,
    'markedAt', v_payment.marked_at,
    'undoneAt', v_payment.undone_at,
    'undoneByPersonId', v_payment.undone_by_person_id
  );
end;
$$;

create or replace function public.undo_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_payment public.payments;
  v_key text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if v_payment.id is null then raise exception 'Payment not found'; end if;
  if v_payment.from_person_id <> v_me.id and v_payment.to_person_id <> v_me.id then
    raise exception 'Payment not found';
  end if;
  if v_payment.undone_at is not null then raise exception 'This payment was already undone'; end if;

  v_key := least(v_payment.from_person_id::text, v_payment.to_person_id::text)
    || ':' || greatest(v_payment.from_person_id::text, v_payment.to_person_id::text);
  perform pg_advisory_xact_lock(hashtextextended(v_key, 0));

  update public.payments
  set undone_at = now(), undone_by_person_id = v_me.id
  where id = p_payment_id
  returning * into v_payment;

  return jsonb_build_object(
    'id', v_payment.id,
    'fromPersonId', v_payment.from_person_id,
    'toPersonId', v_payment.to_person_id,
    'amountCentavos', v_payment.amount_centavos,
    'markedByPersonId', v_payment.marked_by_person_id,
    'markedAt', v_payment.marked_at,
    'undoneAt', v_payment.undone_at,
    'undoneByPersonId', v_payment.undone_by_person_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity and QR RPCs
-- ---------------------------------------------------------------------------

create or replace function public.recent_activity(p_limit integer default 5)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.current_person_id() as id),
  limit_value as (select greatest(1, least(coalesce(p_limit, 5), 20)) as n),
  expense_events as (
    select
      ev.id,
      'expense_' || ev.action as kind,
      ev.created_at,
      ev.actor_person_id,
      ev.expense_id,
      e.description as expense_description,
      null::uuid as other_person_id,
      null::text as other_name,
      null::bigint as amount_centavos,
      case ev.action
        when 'created' then 'Created ' || e.description
        when 'updated' then 'Updated ' || e.description
        else 'Deleted ' || e.description
      end as summary
    from public.expense_events ev
    join public.expenses e on e.id = ev.expense_id
    where exists (
      select 1 from public.expense_people ep
      where ep.expense_id = ev.expense_id and ep.person_id = (select id from me)
    )
  ),
  payment_events as (
    select
      p.id,
      'payment_marked' as kind,
      p.marked_at as created_at,
      p.marked_by_person_id as actor_person_id,
      null::uuid as expense_id,
      null::text as expense_description,
      other.id as other_person_id,
      other.display_name as other_name,
      p.amount_centavos,
      'Marked a payment paid' as summary
    from public.payments p
    join public.people other on other.id = case
      when p.from_person_id = (select id from me) then p.to_person_id else p.from_person_id end
    where p.undone_at is null
      and (p.from_person_id = (select id from me) or p.to_person_id = (select id from me))
    union all
    select
      p.id,
      'payment_undone' as kind,
      p.undone_at as created_at,
      p.undone_by_person_id as actor_person_id,
      null::uuid,
      null::text,
      other.id,
      other.display_name,
      p.amount_centavos,
      'Undid a payment' as summary
    from public.payments p
    join public.people other on other.id = case
      when p.from_person_id = (select id from me) then p.to_person_id else p.from_person_id end
    where p.undone_at is not null
      and (p.from_person_id = (select id from me) or p.to_person_id = (select id from me))
  ),
  all_events as (
    select * from expense_events
    union all
    select * from payment_events
  ),
  limited as (
    select * from all_events
    order by created_at desc
    limit (select n from limit_value)
  )
  select jsonb_build_object(
    'events',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ev.id,
        'kind', ev.kind,
        'createdAt', ev.created_at,
        'actorName', actor.display_name,
        'expenseId', ev.expense_id,
        'expenseDescription', ev.expense_description,
        'otherPersonId', ev.other_person_id,
        'otherName', ev.other_name,
        'amountCentavos', ev.amount_centavos,
        'summary', ev.summary
      ) order by ev.created_at desc)
      from limited ev
      join public.people actor on actor.id = ev.actor_person_id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.set_payment_qr(p_path text, p_label text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_label text := nullif(btrim(coalesce(p_label, '')), '');
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  if p_path is null or p_path not like v_me.id::text || '/%' or char_length(p_path) > 400 then
    raise exception 'Invalid payment QR path';
  end if;
  if v_label is not null and char_length(v_label) > 40 then
    raise exception 'QR label must be 40 characters or fewer';
  end if;

  update public.people
  set payment_qr_path = p_path,
      payment_qr_label = v_label,
      payment_qr_updated_at = now(),
      updated_at = now()
  where id = v_me.id
  returning * into v_me;

  return jsonb_build_object(
    'id', v_me.id,
    'paymentQrLabel', v_me.payment_qr_label,
    'hasQr', v_me.payment_qr_path is not null
  );
end;
$$;

create or replace function public.clear_payment_qr()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  update public.people
  set payment_qr_path = null,
      payment_qr_label = null,
      payment_qr_updated_at = now(),
      updated_at = now()
  where id = v_me.id
  returning * into v_me;

  return jsonb_build_object('id', v_me.id, 'paymentQrLabel', null, 'hasQr', false);
end;
$$;

create or replace function public.can_delete_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_ledger jsonb;
  v_owe bigint;
  v_owed bigint;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  v_ledger := public.ledger_for_me();
  v_owe := coalesce((v_ledger ->> 'youOweCentavos')::bigint, 0);
  v_owed := coalesce((v_ledger ->> 'owedToYouCentavos')::bigint, 0);
  return jsonb_build_object(
    'canDelete', v_owe = 0 and v_owed = 0,
    'youOweCentavos', v_owe,
    'owedToYouCentavos', v_owed
  );
end;
$$;

-- Realtime is optional; enable it when the Supabase publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.expenses;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.expense_shares;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.payments;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.expense_events;
    exception when duplicate_object then null; end;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

alter table public.people enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_people enable row level security;
alter table public.expense_items enable row level security;
alter table public.expense_coverage enable row level security;
alter table public.expense_shares enable row level security;
alter table public.payments enable row level security;
alter table public.expense_events enable row level security;
alter table public.person_invitations enable row level security;

drop policy if exists people_select on public.people;
create policy people_select on public.people
  for select to authenticated
  using (id = public.current_person_id() or public.can_view_person(id));

drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated
  using (public.is_expense_participant(id) and deleted_at is null);

drop policy if exists expense_people_select on public.expense_people;
create policy expense_people_select on public.expense_people
  for select to authenticated
  using (public.is_expense_participant(expense_id) and public.is_expense_live(expense_id));

drop policy if exists expense_items_select on public.expense_items;
create policy expense_items_select on public.expense_items
  for select to authenticated
  using (public.is_expense_participant(expense_id) and public.is_expense_live(expense_id));

drop policy if exists expense_coverage_select on public.expense_coverage;
create policy expense_coverage_select on public.expense_coverage
  for select to authenticated
  using (public.is_expense_participant(expense_id) and public.is_expense_live(expense_id));

drop policy if exists expense_shares_select on public.expense_shares;
create policy expense_shares_select on public.expense_shares
  for select to authenticated
  using (public.is_expense_participant(expense_id) and public.is_expense_live(expense_id));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    from_person_id = public.current_person_id()
    or to_person_id = public.current_person_id()
  );

drop policy if exists expense_events_select on public.expense_events;
create policy expense_events_select on public.expense_events
  for select to authenticated
  using (public.is_expense_participant(expense_id));

revoke all on public.people, public.expenses, public.expense_people,
  public.expense_items, public.expense_coverage, public.expense_shares,
  public.payments, public.expense_events
  from public, anon, authenticated;

grant select on public.people, public.expenses, public.expense_people,
  public.expense_items, public.expense_coverage, public.expense_shares,
  public.payments, public.expense_events
  to authenticated;

revoke all on public.person_invitations from public, anon, authenticated;

-- Storage: paths are {person_id}/{file}.
drop policy if exists payment_qr_read on storage.objects;
create policy payment_qr_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-qr'
    and public.can_view_person(public.try_uuid((storage.foldername(name))[1]))
  );

drop policy if exists payment_qr_insert on storage.objects;
create policy payment_qr_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-qr'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_person_id()
  );

drop policy if exists payment_qr_update on storage.objects;
create policy payment_qr_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'payment-qr'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_person_id()
  )
  with check (
    bucket_id = 'payment-qr'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_person_id()
  );

drop policy if exists payment_qr_delete on storage.objects;
create policy payment_qr_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-qr'
    and public.try_uuid((storage.foldername(name))[1]) = public.current_person_id()
  );

-- Grants: policy helpers.
revoke all on function public.try_uuid(text) from public, anon;
grant execute on function public.try_uuid(text) to authenticated;

revoke all on function public.current_person_id() from public, anon;
grant execute on function public.current_person_id() to authenticated;

revoke all on function public.is_expense_participant(uuid) from public, anon;
grant execute on function public.is_expense_participant(uuid) to authenticated;

revoke all on function public.is_expense_live(uuid) from public, anon;
grant execute on function public.is_expense_live(uuid) to authenticated;

revoke all on function public.can_edit_expense(uuid) from public, anon;
grant execute on function public.can_edit_expense(uuid) to authenticated;

revoke all on function public.can_view_person(uuid) from public, anon;
grant execute on function public.can_view_person(uuid) to authenticated;

-- Internal only.
revoke all on function public.pair_net(uuid, uuid) from public, anon, authenticated;
revoke all on function public.expense_snapshot(uuid) from public, anon, authenticated;

-- Public RPCs.
revoke all on function public.ensure_person() from public, anon;
grant execute on function public.ensure_person() to authenticated;

revoke all on function public.claim_people_for_me() from public, anon;
grant execute on function public.claim_people_for_me() to authenticated;

revoke all on function public.claim_invite(text) from public, anon;
grant execute on function public.claim_invite(text) to authenticated;

revoke all on function public.update_display_name(text) from public, anon;
grant execute on function public.update_display_name(text) to authenticated;

revoke all on function public.people_for_me() from public, anon;
grant execute on function public.people_for_me() to authenticated;

revoke all on function public.add_person(text) from public, anon;
grant execute on function public.add_person(text) to authenticated;

revoke all on function public.create_invite_link(uuid) from public, anon;
grant execute on function public.create_invite_link(uuid) to authenticated;

revoke all on function public.correct_pending_email(uuid, text) from public, anon;
grant execute on function public.correct_pending_email(uuid, text) to authenticated;

revoke all on function public.save_expense(jsonb, integer) from public, anon;
grant execute on function public.save_expense(jsonb, integer) to authenticated;

revoke all on function public.delete_expense(uuid) from public, anon;
grant execute on function public.delete_expense(uuid) to authenticated;

revoke all on function public.expenses_for_me() from public, anon;
grant execute on function public.expenses_for_me() to authenticated;

revoke all on function public.expense_detail(uuid) from public, anon;
grant execute on function public.expense_detail(uuid) to authenticated;

revoke all on function public.ledger_for_me() from public, anon;
grant execute on function public.ledger_for_me() to authenticated;

revoke all on function public.pair_history(uuid) from public, anon;
grant execute on function public.pair_history(uuid) to authenticated;

revoke all on function public.mark_paid(uuid) from public, anon;
grant execute on function public.mark_paid(uuid) to authenticated;

revoke all on function public.undo_payment(uuid) from public, anon;
grant execute on function public.undo_payment(uuid) to authenticated;

revoke all on function public.recent_activity(integer) from public, anon;
grant execute on function public.recent_activity(integer) to authenticated;

revoke all on function public.set_payment_qr(text, text) from public, anon;
grant execute on function public.set_payment_qr(text, text) to authenticated;

revoke all on function public.clear_payment_qr() from public, anon;
grant execute on function public.clear_payment_qr() to authenticated;

revoke all on function public.can_delete_account() from public, anon;
grant execute on function public.can_delete_account() to authenticated;
