-- Participant lifecycle: historical rows stay readable, but new or changed
-- attendance, assignments, payer links, and finalized shares must use active
-- adults and students in an active group.

create or replace function public.check_outing_adult_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.outings o
    join public.group_adults ga on ga.group_id = o.group_id
    join public.groups g on g.id = o.group_id
    where o.id = new.outing_id
      and ga.id = new.adult_id
      and ga.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Adult is not an active member of the outing group';
  end if;
  return new;
end;
$$;

create or replace function public.check_outing_student_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.outings o
    join public.students s on s.group_id = o.group_id
    join public.groups g on g.id = o.group_id
    where o.id = new.outing_id
      and s.id = new.student_id
      and s.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Student is not active in the outing group';
  end if;

  if new.covering_adult_id is not null and not exists (
    select 1
    from public.outings o
    join public.group_adults ga on ga.group_id = o.group_id
    join public.groups g on g.id = o.group_id
    where o.id = new.outing_id
      and ga.id = new.covering_adult_id
      and ga.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Covering adult is not active in the outing group';
  end if;

  return new;
end;
$$;

create or replace function public.check_item_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_adult_id is not null and not exists (
    select 1
    from public.outings o
    join public.group_adults ga on ga.group_id = o.group_id
    join public.groups g on g.id = o.group_id
    where o.id = new.outing_id
      and ga.id = new.assigned_adult_id
      and ga.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Assigned adult is not active in the outing group';
  end if;

  if new.assigned_student_id is not null and not exists (
    select 1
    from public.outings o
    join public.students s on s.group_id = o.group_id
    join public.groups g on g.id = o.group_id
    where o.id = new.outing_id
      and s.id = new.assigned_student_id
      and s.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Assigned student is not active in the outing group';
  end if;

  return new;
end;
$$;

create or replace function public.check_outing_payer_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.payer_adult_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.payer_adult_id is not distinct from old.payer_adult_id then
    return new;
  end if;

  if not exists (
    select 1
    from public.group_adults ga
    join public.groups g on g.id = ga.group_id
    where ga.group_id = new.group_id
      and ga.id = new.payer_adult_id
      and ga.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Payer is not an active member of the outing group';
  end if;

  return new;
end;
$$;

drop trigger if exists outings_payer_group on public.outings;
create trigger outings_payer_group
  before insert or update of payer_adult_id on public.outings
  for each row execute function public.check_outing_payer_group();

create or replace function public.check_share_adult_active()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.group_adults ga
    join public.groups g on g.id = ga.group_id
    where ga.id = new.adult_id
      and ga.status = 'active'
      and g.status = 'active'
  ) then
    raise exception 'Cannot finalize a share for an inactive adult';
  end if;
  return new;
end;
$$;

drop trigger if exists shares_adult_active on public.shares;
create trigger shares_adult_active
  before insert on public.shares
  for each row execute function public.check_share_adult_active();
