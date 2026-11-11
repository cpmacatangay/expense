-- Group lifecycle: member removal/restore, ownership transfer, archive, soft delete, restore.
alter table public.groups add column if not exists archived_at timestamptz;
alter table public.groups add column if not exists deleted_at timestamptz;

-- Archived and deleted groups must stop granting member access.
create or replace function public.is_group_member(target_group uuid)
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
    where ga.group_id = target_group
      and ga.profile_id = auth.uid()
      and ga.status = 'active'
      and g.status = 'active'
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
    join public.groups g on g.id = mine.group_id
    join public.group_adults theirs on theirs.group_id = mine.group_id
    where mine.profile_id = auth.uid()
      and mine.status = 'active'
      and g.status = 'active'
      and theirs.profile_id = target_profile
      and theirs.status = 'active'
  );
$$;

create or replace function public.remove_group_adult(p_adult_id uuid)
returns public.group_adults
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult public.group_adults;
  v_group public.groups;
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

  if v_group.status <> 'active' then
    raise exception 'This group is not active';
  end if;

  if v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can remove adults';
  end if;

  if v_adult.profile_id = v_group.owner_id then
    raise exception 'The owner cannot be removed';
  end if;

  if v_adult.status = 'removed' then
    raise exception 'This adult was already removed';
  end if;

  update public.group_adults
  set status = 'removed'
  where id = p_adult_id
  returning * into v_adult;

  update public.invitations
  set revoked_at = now()
  where adult_id = p_adult_id
    and accepted_at is null
    and revoked_at is null;

  return v_adult;
end;
$$;

create or replace function public.restore_group_adult(p_adult_id uuid)
returns public.group_adults
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult public.group_adults;
  v_group public.groups;
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

  if v_group.status <> 'active' then
    raise exception 'This group is not active';
  end if;

  if v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can restore adults';
  end if;

  if v_adult.status <> 'removed' then
    raise exception 'This adult is not removed';
  end if;

  update public.group_adults
  set status = (case when profile_id is null then 'pending' else 'active' end)::public.adult_status
  where id = p_adult_id
  returning * into v_adult;

  return v_adult;
end;
$$;

create or replace function public.transfer_group_ownership(
  p_group_id uuid,
  p_adult_id uuid
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
  v_adult public.group_adults;
  v_old_owner_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if v_group.id is null then
    raise exception 'Group not found';
  end if;

  if v_group.status <> 'active' then
    raise exception 'This group is not active';
  end if;

  if v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can transfer ownership';
  end if;

  select * into v_adult
  from public.group_adults
  where id = p_adult_id and group_id = p_group_id;

  if v_adult.id is null or v_adult.status <> 'active' or v_adult.profile_id is null then
    raise exception 'Choose an active adult with an account';
  end if;

  if v_adult.profile_id = v_group.owner_id then
    raise exception 'You already own this group';
  end if;

  select ga.display_name into v_old_owner_name
  from public.group_adults ga
  where ga.group_id = p_group_id
    and ga.profile_id = auth.uid();

  update public.groups
  set owner_id = v_adult.profile_id
  where id = p_group_id
  returning * into v_group;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    p_group_id,
    auth.uid(),
    'group.ownership_transferred',
    'group',
    p_group_id,
    jsonb_build_object('ownerName', v_old_owner_name),
    jsonb_build_object('ownerName', v_adult.display_name, 'ownerProfileId', v_adult.profile_id)
  );

  return v_group;
end;
$$;

create or replace function public.archive_group(p_group_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if v_group.id is null then
    raise exception 'Group not found';
  end if;

  if v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can archive the group';
  end if;

  if v_group.status <> 'active' then
    raise exception 'This group is not active';
  end if;

  update public.groups
  set status = 'archived',
      archived_at = now()
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

create or replace function public.soft_delete_group(p_group_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if v_group.id is null then
    raise exception 'Group not found';
  end if;

  if v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can delete the group';
  end if;

  if v_group.status not in ('active', 'archived') then
    raise exception 'This group is already deleted';
  end if;

  update public.groups
  set status = 'deleted',
      deleted_at = now()
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

create or replace function public.restore_group(p_group_id uuid)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_group
  from public.groups
  where id = p_group_id
  for update;

  if v_group.id is null then
    raise exception 'Group not found';
  end if;

  if v_group.owner_id <> auth.uid() then
    raise exception 'Only the group owner can restore the group';
  end if;

  if v_group.status not in ('archived', 'deleted') then
    raise exception 'This group is already active';
  end if;

  if v_group.status = 'deleted'
     and v_group.deleted_at is not null
     and v_group.deleted_at < now() - interval '30 days' then
    raise exception 'This group can no longer be restored';
  end if;

  update public.groups
  set status = 'active',
      archived_at = null,
      deleted_at = null
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

revoke all on function public.remove_group_adult(uuid) from public, anon;
revoke all on function public.restore_group_adult(uuid) from public, anon;
revoke all on function public.transfer_group_ownership(uuid, uuid) from public, anon;
revoke all on function public.archive_group(uuid) from public, anon;
revoke all on function public.soft_delete_group(uuid) from public, anon;
revoke all on function public.restore_group(uuid) from public, anon;

grant execute on function public.remove_group_adult(uuid) to authenticated;
grant execute on function public.restore_group_adult(uuid) to authenticated;
grant execute on function public.transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function public.archive_group(uuid) to authenticated;
grant execute on function public.soft_delete_group(uuid) to authenticated;
grant execute on function public.restore_group(uuid) to authenticated;

-- Live updates for the group screens.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'groups',
    'group_adults',
    'invitations',
    'students',
    'outings',
    'outing_adults',
    'outing_students',
    'items',
    'shares',
    'settlements',
    'activity_events'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;
