-- M2: students, outings, attendance, items, shares, settlements, and activity.

do $$ begin
  create type public.student_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outing_status as enum ('private_draft', 'draft', 'finalized', 'reopened');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.total_mode as enum ('auto', 'manual', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_type as enum ('adult', 'student', 'shared');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.settlement_status as enum ('pending', 'confirmed', 'declined', 'void');
exception when duplicate_object then null; end $$;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  notes text check (notes is null or char_length(notes) <= 500),
  status public.student_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.outings (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete restrict,
  date date not null default ((now() at time zone 'Asia/Manila')::date),
  place text check (place is null or char_length(place) <= 120),
  notes text check (notes is null or char_length(notes) <= 1000),
  payer_adult_id uuid references public.group_adults (id) on delete restrict,
  status public.outing_status not null default 'draft',
  total_mode public.total_mode not null default 'auto',
  total_centavos bigint not null default 0 check (total_centavos >= 0),
  version integer not null default 1 check (version > 0),
  finalized_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outing_adults (
  outing_id uuid not null references public.outings (id) on delete cascade,
  adult_id uuid not null references public.group_adults (id) on delete restrict,
  present boolean not null default false,
  primary key (outing_id, adult_id)
);

create table if not exists public.outing_students (
  outing_id uuid not null references public.outings (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete restrict,
  present boolean not null default false,
  covering_adult_id uuid references public.group_adults (id) on delete restrict,
  primary key (outing_id, student_id),
  constraint outing_students_cover_check check (not present or covering_adult_id is not null)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.outings (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity integer not null default 1 check (quantity >= 1),
  unit_amount_centavos bigint not null check (unit_amount_centavos >= 0),
  amount_centavos bigint generated always as (quantity::bigint * unit_amount_centavos) stored,
  assignment_type public.assignment_type not null,
  assigned_adult_id uuid references public.group_adults (id) on delete restrict,
  assigned_student_id uuid references public.students (id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_assignment_check check (
    (assignment_type = 'adult' and assigned_adult_id is not null and assigned_student_id is null)
    or (assignment_type = 'student' and assigned_student_id is not null and assigned_adult_id is null)
    or (assignment_type = 'shared' and assigned_adult_id is null and assigned_student_id is null)
  )
);

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  outing_id uuid not null references public.outings (id) on delete cascade,
  adult_id uuid not null references public.group_adults (id) on delete restrict,
  own_items_centavos bigint not null default 0 check (own_items_centavos >= 0),
  student_items_centavos bigint not null default 0 check (student_items_centavos >= 0),
  shared_head_centavos bigint not null default 0 check (shared_head_centavos >= 0),
  covered_student_shared_centavos bigint not null default 0 check (covered_student_shared_centavos >= 0),
  total_difference_centavos bigint not null default 0,
  total_centavos bigint not null default 0 check (total_centavos >= 0),
  created_at timestamptz not null default now(),
  unique (outing_id, adult_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_adult_id uuid not null references public.group_adults (id) on delete restrict,
  to_adult_id uuid not null references public.group_adults (id) on delete restrict,
  amount_centavos bigint not null check (amount_centavos > 0),
  date date not null default ((now() at time zone 'Asia/Manila')::date),
  note text check (note is null or char_length(note) <= 500),
  status public.settlement_status not null default 'pending',
  recorded_by uuid not null references public.profiles (id) on delete restrict,
  confirmed_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 500),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint settlements_distinct_adults check (from_adult_id <> to_adult_id),
  constraint settlements_decline_reason check (status <> 'declined' or decline_reason is not null)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null check (
    entity_type in ('group', 'adult', 'invitation', 'student', 'outing', 'item', 'settlement')
  ),
  entity_id uuid not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists students_group_id_idx on public.students (group_id);
create index if not exists outings_group_id_idx on public.outings (group_id);
create index if not exists outings_date_idx on public.outings (date desc);
create index if not exists items_outing_id_idx on public.items (outing_id);
create index if not exists shares_outing_id_idx on public.shares (outing_id);
create index if not exists settlements_group_id_idx on public.settlements (group_id);
create index if not exists activity_events_group_id_idx
  on public.activity_events (group_id, created_at desc);

drop trigger if exists outings_touch_updated_at on public.outings;
create trigger outings_touch_updated_at
  before update on public.outings
  for each row execute function public.touch_updated_at();

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

-- Attendance rows must belong to the outing's group.
create or replace function public.check_outing_adult_group()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.outings o
    join public.group_adults ga on ga.group_id = o.group_id
    where o.id = new.outing_id and ga.id = new.adult_id
  ) then
    raise exception 'Adult does not belong to the outing group';
  end if;
  return new;
end;
$$;

drop trigger if exists outing_adults_group_check on public.outing_adults;
create trigger outing_adults_group_check
  before insert or update on public.outing_adults
  for each row execute function public.check_outing_adult_group();

create or replace function public.check_outing_student_group()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.outings o
    join public.students s on s.group_id = o.group_id
    where o.id = new.outing_id and s.id = new.student_id
  ) then
    raise exception 'Student does not belong to the outing group';
  end if;
  return new;
end;
$$;

drop trigger if exists outing_students_group_check on public.outing_students;
create trigger outing_students_group_check
  before insert or update on public.outing_students
  for each row execute function public.check_outing_student_group();

create or replace function public.check_item_group()
returns trigger
language plpgsql
as $$
begin
  if new.assigned_adult_id is not null and not exists (
    select 1
    from public.outings o
    join public.group_adults ga on ga.group_id = o.group_id
    where o.id = new.outing_id and ga.id = new.assigned_adult_id
  ) then
    raise exception 'Assigned adult does not belong to the outing group';
  end if;

  if new.assigned_student_id is not null and not exists (
    select 1
    from public.outings o
    join public.students s on s.group_id = o.group_id
    where o.id = new.outing_id and s.id = new.assigned_student_id
  ) then
    raise exception 'Assigned student does not belong to the outing group';
  end if;

  return new;
end;
$$;

drop trigger if exists items_group_check on public.items;
create trigger items_group_check
  before insert or update on public.items
  for each row execute function public.check_item_group();

-- Visibility and edit helpers. Security definer avoids recursive policy evaluation.
create or replace function public.can_view_outing(target_outing uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.outings o
    where o.id = target_outing
      and public.is_group_member(o.group_id)
      and (
        o.status <> 'private_draft'
        or o.author_profile_id = auth.uid()
        or public.is_group_owner(o.group_id)
      )
  );
$$;

create or replace function public.can_edit_outing(target_outing uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.outings o
    where o.id = target_outing
      and public.is_group_member(o.group_id)
      and o.status in ('draft', 'private_draft', 'reopened')
      and (
        o.status <> 'private_draft'
        or o.author_profile_id = auth.uid()
        or public.is_group_owner(o.group_id)
      )
  );
$$;

alter table public.students enable row level security;
alter table public.outings enable row level security;
alter table public.outing_adults enable row level security;
alter table public.outing_students enable row level security;
alter table public.items enable row level security;
alter table public.shares enable row level security;
alter table public.settlements enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists students_select_member on public.students;
create policy students_select_member on public.students for select
  using (public.is_group_member(group_id));

drop policy if exists students_insert_owner on public.students;
create policy students_insert_owner on public.students for insert
  with check (public.is_group_owner(group_id));

drop policy if exists students_update_owner on public.students;
create policy students_update_owner on public.students for update
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

drop policy if exists outings_select_visible on public.outings;
create policy outings_select_visible on public.outings for select
  using (public.can_view_outing(id));

drop policy if exists outings_insert_member on public.outings;
create policy outings_insert_member on public.outings for insert
  with check (
    public.is_group_member(group_id)
    and author_profile_id = auth.uid()
    and status in ('draft', 'private_draft')
  );

drop policy if exists outings_update_editable on public.outings;
create policy outings_update_editable on public.outings for update
  using (public.can_edit_outing(id))
  with check (public.can_edit_outing(id));

drop policy if exists outings_delete_owner on public.outings;
create policy outings_delete_owner on public.outings for delete
  using (public.is_group_owner(group_id));

drop policy if exists outing_adults_select on public.outing_adults;
create policy outing_adults_select on public.outing_adults for select
  using (public.can_view_outing(outing_id));

drop policy if exists outing_adults_write on public.outing_adults;
create policy outing_adults_write on public.outing_adults for all
  using (public.can_edit_outing(outing_id))
  with check (public.can_edit_outing(outing_id));

drop policy if exists outing_students_select on public.outing_students;
create policy outing_students_select on public.outing_students for select
  using (public.can_view_outing(outing_id));

drop policy if exists outing_students_write on public.outing_students;
create policy outing_students_write on public.outing_students for all
  using (public.can_edit_outing(outing_id))
  with check (public.can_edit_outing(outing_id));

drop policy if exists items_select on public.items;
create policy items_select on public.items for select
  using (public.can_view_outing(outing_id));

drop policy if exists items_write on public.items;
create policy items_write on public.items for all
  using (public.can_edit_outing(outing_id))
  with check (public.can_edit_outing(outing_id));

drop policy if exists shares_select on public.shares;
create policy shares_select on public.shares for select
  using (public.can_view_outing(outing_id));

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements for select
  using (public.is_group_member(group_id));

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements for insert
  with check (
    public.is_group_member(group_id)
    and recorded_by = auth.uid()
    and exists (
      select 1 from public.group_adults ga
      where ga.id = from_adult_id and ga.group_id = group_id
    )
    and exists (
      select 1 from public.group_adults ga
      where ga.id = to_adult_id and ga.group_id = group_id
    )
    and (
      exists (
        select 1 from public.group_adults ga
        where ga.id = from_adult_id and ga.profile_id = auth.uid()
      )
      or public.is_group_owner(group_id)
    )
  );

drop policy if exists settlements_update_participant on public.settlements;
create policy settlements_update_participant on public.settlements for update
  using (
    public.is_group_member(group_id)
    and (
      exists (
        select 1 from public.group_adults ga
        where ga.id = to_adult_id and ga.profile_id = auth.uid()
      )
      or exists (
        select 1 from public.group_adults ga
        where ga.id = from_adult_id and ga.profile_id = auth.uid()
      )
      or public.is_group_owner(group_id)
    )
  )
  with check (public.is_group_member(group_id));

drop policy if exists activity_select_member on public.activity_events;
create policy activity_select_member on public.activity_events for select
  using (public.is_group_member(group_id));
