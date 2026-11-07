-- Salo — initial schema
-- Feature: 001-salo-expense-sharing

create extension if not exists "pgcrypto";
create extension if not exists "citext";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'outing_status') then
    create type public.outing_status as enum ('draft', 'final');
  end if;
  if not exists (select 1 from pg_type where typname = 'ocr_engine') then
    create type public.ocr_engine as enum ('mlkit', 'tesseract', 'manual');
  end if;
end $$;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Salo',
  currency char(3) not null default 'PHP',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 80),
  email citext not null,
  role text not null default 'adult' check (role in ('adult')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, email)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.outings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  outing_date date not null default current_date,
  place text check (place is null or char_length(place) <= 120),
  notes text check (notes is null or char_length(notes) <= 500),
  payer_member_id uuid references public.group_members(id),
  status public.outing_status not null default 'draft',
  total_centavos bigint not null check (total_centavos > 0),
  headcount integer check (headcount is null or headcount >= 3),
  per_head_centavos bigint check (per_head_centavos is null or per_head_centavos >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null unique references public.outings(id) on delete cascade,
  storage_path text,
  merchant text check (merchant is null or char_length(merchant) <= 120),
  receipt_date date,
  subtotal_centavos bigint check (subtotal_centavos is null or subtotal_centavos >= 0),
  tax_centavos bigint check (tax_centavos is null or tax_centavos >= 0),
  service_centavos bigint check (service_centavos is null or service_centavos >= 0),
  discount_centavos bigint check (discount_centavos is null or discount_centavos >= 0),
  tip_centavos bigint check (tip_centavos is null or tip_centavos >= 0),
  total_centavos bigint not null check (total_centavos > 0),
  raw_text text,
  ocr_engine public.ocr_engine,
  parser_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 200),
  quantity numeric(10, 3) check (quantity is null or quantity > 0),
  unit_price_centavos bigint check (unit_price_centavos is null or unit_price_centavos >= 0),
  line_total_centavos bigint not null check (line_total_centavos >= 0),
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  sort_order integer not null default 0
);

create table if not exists public.outing_students (
  outing_id uuid not null references public.outings(id) on delete cascade,
  student_id uuid not null references public.students(id),
  present boolean not null default true,
  primary key (outing_id, student_id)
);

create table if not exists public.coverage (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.outings(id) on delete cascade,
  student_id uuid not null references public.students(id),
  member_id uuid not null references public.group_members(id),
  created_at timestamptz not null default now(),
  unique (outing_id, student_id)
);

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.outings(id) on delete cascade,
  member_id uuid not null references public.group_members(id),
  own_head integer not null default 1 check (own_head in (0, 1)),
  covered_students integer not null default 0 check (covered_students >= 0),
  amount_centavos bigint not null check (amount_centavos >= 0),
  is_payer boolean not null default false,
  unique (outing_id, member_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_member_id uuid not null references public.group_members(id),
  to_member_id uuid not null references public.group_members(id),
  amount_centavos bigint not null check (amount_centavos > 0),
  settled_on date not null default current_date,
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  check (from_member_id <> to_member_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_member_id uuid not null references public.group_members(id),
  entity text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_students_group_active on public.students(group_id, is_active, name);
create index if not exists idx_outings_group_date on public.outings(group_id, outing_date desc);
create index if not exists idx_outings_group_status on public.outings(group_id, status);
create index if not exists idx_receipt_items_receipt on public.receipt_items(receipt_id, sort_order);
create index if not exists idx_outing_students_outing on public.outing_students(outing_id);
create index if not exists idx_coverage_outing on public.coverage(outing_id);
create index if not exists idx_coverage_member on public.coverage(member_id);
create index if not exists idx_shares_outing on public.shares(outing_id);
create index if not exists idx_settlements_group_date on public.settlements(group_id, settled_on desc);
create index if not exists idx_audit_group_date on public.audit_events(group_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_groups_updated on public.groups;
create trigger trg_groups_updated before update on public.groups
for each row execute function public.set_updated_at();

drop trigger if exists trg_group_members_updated on public.group_members;
create trigger trg_group_members_updated before update on public.group_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_students_updated on public.students;
create trigger trg_students_updated before update on public.students
for each row execute function public.set_updated_at();

drop trigger if exists trg_outings_updated on public.outings;
create trigger trg_outings_updated before update on public.outings
for each row execute function public.set_updated_at();

drop trigger if exists trg_receipts_updated on public.receipts;
create trigger trg_receipts_updated before update on public.receipts
for each row execute function public.set_updated_at();

create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_outing_member(target_outing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.outings o
    where o.id = target_outing_id
      and public.is_group_member(o.group_id)
  );
$$;

create or replace function public.link_group_member()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  linked_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select gm.id into linked_id
  from public.group_members gm
  where gm.email = (auth.jwt() ->> 'email')::citext
    and gm.user_id is null
  limit 1;

  if linked_id is not null then
    update public.group_members
    set user_id = auth.uid()
    where id = linked_id;
  end if;

  return linked_id;
end;
$$;

create or replace function public.create_group_with_members(
  p_name text,
  p_member_names text[],
  p_member_emails text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Sign-in required';
  end if;
  if array_length(p_member_names, 1) <> 3 or array_length(p_member_emails, 1) <> 3 then
    raise exception 'Exactly three adults are required';
  end if;

  insert into public.groups (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Salo'), auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, display_name, email)
  select new_group_id, p_member_names[i], p_member_emails[i]::citext
  from generate_subscripts(p_member_names, 1) as i;

  caller_email := auth.jwt() ->> 'email';
  update public.group_members
  set user_id = auth.uid()
  where group_id = new_group_id
    and email = caller_email::citext;

  return new_group_id;
end;
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_outing_member(uuid) to authenticated;
grant execute on function public.link_group_member() to authenticated;
grant execute on function public.create_group_with_members(text, text[], text[]) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.students enable row level security;
alter table public.outings enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.outing_students enable row level security;
alter table public.coverage enable row level security;
alter table public.shares enable row level security;
alter table public.settlements enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
for select to authenticated using (public.is_group_member(id));

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
for insert to authenticated with check (auth.uid() is not null);

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
for update to authenticated using (public.is_group_member(id))
with check (public.is_group_member(id));

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
for select to authenticated using (public.is_group_member(group_id));

drop policy if exists group_members_update_self on public.group_members;
create policy group_members_update_self on public.group_members
for update to authenticated using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists students_all on public.students;
create policy students_all on public.students
for all to authenticated using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

drop policy if exists outings_all on public.outings;
create policy outings_all on public.outings
for all to authenticated using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

drop policy if exists receipts_all on public.receipts;
create policy receipts_all on public.receipts
for all to authenticated using (public.is_outing_member(outing_id))
with check (public.is_outing_member(outing_id));

drop policy if exists receipt_items_all on public.receipt_items;
create policy receipt_items_all on public.receipt_items
for all to authenticated
using (
  exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.is_outing_member(r.outing_id)
  )
)
with check (
  exists (
    select 1 from public.receipts r
    where r.id = receipt_id and public.is_outing_member(r.outing_id)
  )
);

drop policy if exists outing_students_all on public.outing_students;
create policy outing_students_all on public.outing_students
for all to authenticated using (public.is_outing_member(outing_id))
with check (public.is_outing_member(outing_id));

drop policy if exists coverage_all on public.coverage;
create policy coverage_all on public.coverage
for all to authenticated using (public.is_outing_member(outing_id))
with check (public.is_outing_member(outing_id));

drop policy if exists shares_all on public.shares;
create policy shares_all on public.shares
for all to authenticated using (public.is_outing_member(outing_id))
with check (public.is_outing_member(outing_id));

drop policy if exists settlements_all on public.settlements;
create policy settlements_all on public.settlements
for all to authenticated using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

drop policy if exists audit_events_select on public.audit_events;
create policy audit_events_select on public.audit_events
for select to authenticated using (public.is_group_member(group_id));

drop policy if exists audit_events_insert on public.audit_events;
create policy audit_events_insert on public.audit_events
for insert to authenticated with check (public.is_group_member(group_id));
