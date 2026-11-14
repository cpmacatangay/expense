-- Lifecycle guards for status transitions and QR metadata. These run on the
-- table so a SECURITY DEFINER RPC cannot bypass the revocation checks.

create or replace function public.guard_settlement_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_group_member(new.group_id) then
      raise exception 'You are not an active member of this group';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not exists (
      select 1 from public.groups g
      where g.id = new.group_id and g.status = 'active'
    ) then
      raise exception 'This group is not active';
    end if;

    if not public.is_group_member(new.group_id) then
      raise exception 'You are not an active member of this group';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists settlements_lifecycle_guard on public.settlements;
create trigger settlements_lifecycle_guard
  before insert or update on public.settlements
  for each row execute function public.guard_settlement_lifecycle();

create or replace function public.guard_outing_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if not exists (
      select 1 from public.groups g
      where g.id = new.group_id and g.status = 'active'
    ) then
      raise exception 'This group is not active';
    end if;

    if new.status = 'draft'
       and old.status = 'private_draft'
       and not public.is_group_member(new.group_id) then
      raise exception 'Only an active member can publish this draft';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists outings_status_guard on public.outings;
create trigger outings_status_guard
  before update of status on public.outings
  for each row execute function public.guard_outing_status();

create or replace function public.can_manage_payment_qr(
  target_group uuid,
  target_adult uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_adults ga
    join public.groups g on g.id = ga.group_id
    where ga.id = target_adult
      and ga.group_id = target_group
      and ga.status = 'active'
      and g.status = 'active'
      and (
        ga.profile_id = auth.uid()
        or public.is_group_owner(target_group)
      )
  );
$$;
