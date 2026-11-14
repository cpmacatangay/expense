-- Harden outing writes: members may edit only presentation fields; protected
-- columns stay behind owner-controlled RPCs. The client no longer sends version;
-- the database bumps it so concurrency checks stay authoritative.

revoke insert, update on public.outings from authenticated, anon;

grant select on public.outings to authenticated;
grant insert (group_id, author_profile_id, date, place, notes, status)
  on public.outings to authenticated;
grant update (date, place, notes, payer_adult_id)
  on public.outings to authenticated;

create or replace function public.enforce_outing_insert_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_mode := 'auto';
  new.total_centavos := 0;
  new.finalized_at := null;
  new.reopened_at := null;
  new.version := 1;

  if new.status not in ('draft', 'private_draft') then
    raise exception 'A new outing must start as a draft';
  end if;

  return new;
end;
$$;

drop trigger if exists outings_insert_defaults on public.outings;
create trigger outings_insert_defaults
  before insert on public.outings
  for each row execute function public.enforce_outing_insert_defaults();

create or replace function public.enforce_outing_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    if new.status is distinct from old.status
       or new.total_mode is distinct from old.total_mode
       or new.total_centavos is distinct from old.total_centavos
       or new.group_id is distinct from old.group_id
       or new.author_profile_id is distinct from old.author_profile_id
       or new.finalized_at is distinct from old.finalized_at
       or new.reopened_at is distinct from old.reopened_at
       or new.version is distinct from old.version then
      raise exception 'Only a server-controlled action may change this outing field';
    end if;
  end if;

  if new.version is not distinct from old.version
     and (
       new.date is distinct from old.date
       or new.place is distinct from old.place
       or new.notes is distinct from old.notes
       or new.payer_adult_id is distinct from old.payer_adult_id
       or new.total_mode is distinct from old.total_mode
       or new.total_centavos is distinct from old.total_centavos
       or new.status is distinct from old.status
     ) then
    new.version := old.version + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists outings_update_rules on public.outings;
create trigger outings_update_rules
  before update on public.outings
  for each row execute function public.enforce_outing_update_rules();

create or replace function public.set_outing_total_mode(
  p_outing_id uuid,
  p_expected_version integer,
  p_total_mode public.total_mode
)
returns public.outings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outing public.outings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_total_mode not in ('auto', 'manual', 'fixed') then
    raise exception 'Invalid total mode';
  end if;

  select * into v_outing
  from public.outings
  where id = p_outing_id
  for update;

  if v_outing.id is null then
    raise exception 'Outing not found';
  end if;

  if v_outing.version <> p_expected_version then
    raise exception 'This outing changed on another device. Reload before saving.';
  end if;

  if v_outing.status not in ('draft', 'reopened') then
    raise exception 'This outing is not editable';
  end if;

  if not public.is_group_owner(v_outing.group_id) then
    raise exception 'Only the group owner can change the total mode';
  end if;

  update public.outings
  set total_mode = p_total_mode,
      version = version + 1
  where id = p_outing_id
  returning * into v_outing;

  return v_outing;
end;
$$;

create or replace function public.set_outing_manual_total(
  p_outing_id uuid,
  p_expected_version integer,
  p_total_centavos bigint
)
returns public.outings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outing public.outings;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_total_centavos is null or p_total_centavos <= 0 then
    raise exception 'Enter a total greater than zero';
  end if;

  select * into v_outing
  from public.outings
  where id = p_outing_id
  for update;

  if v_outing.id is null then
    raise exception 'Outing not found';
  end if;

  if v_outing.version <> p_expected_version then
    raise exception 'This outing changed on another device. Reload before saving.';
  end if;

  if v_outing.status not in ('draft', 'reopened') then
    raise exception 'This outing is not editable';
  end if;

  if not public.is_group_owner(v_outing.group_id) then
    raise exception 'Only the group owner can set the total';
  end if;

  update public.outings
  set total_mode = 'manual',
      total_centavos = p_total_centavos,
      version = version + 1
  where id = p_outing_id
  returning * into v_outing;

  return v_outing;
end;
$$;

revoke all on function public.set_outing_total_mode(uuid, integer, public.total_mode) from public, anon;
revoke all on function public.set_outing_manual_total(uuid, integer, bigint) from public, anon;
grant execute on function public.set_outing_total_mode(uuid, integer, public.total_mode) to authenticated;
grant execute on function public.set_outing_manual_total(uuid, integer, bigint) to authenticated;

create or replace function public.bump_outing_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outing_id uuid;
begin
  if tg_op = 'DELETE' then
    v_outing_id := old.outing_id;
  else
    v_outing_id := new.outing_id;
  end if;

  update public.outings
  set version = version + 1
  where id = v_outing_id
    and status in ('draft', 'private_draft', 'reopened');

  if not found then
    raise exception 'This outing is no longer editable';
  end if;

  return null;
end;
$$;
