-- Owner-only reopen. Clears the share snapshot, keeps the saved total in Fixed mode, and records
-- the change. Settlements are group-level, so they stay exactly as recorded.
create or replace function public.reopen_outing(
  p_outing_id uuid,
  p_expected_version integer
)
returns public.outings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outing public.outings;
  v_owner uuid;
  v_share_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_outing
  from public.outings
  where id = p_outing_id
  for update;

  if v_outing.id is null then
    raise exception 'Outing not found';
  end if;

  if v_outing.status <> 'finalized' then
    raise exception 'Only a finalized outing can be reopened';
  end if;

  if v_outing.version <> p_expected_version then
    raise exception 'This outing changed on another device. Reload before reopening.';
  end if;

  select owner_id into v_owner
  from public.groups
  where id = v_outing.group_id;

  if v_owner is distinct from auth.uid() then
    raise exception 'Only the group owner can reopen';
  end if;

  select count(*) into v_share_count
  from public.shares
  where outing_id = p_outing_id;

  delete from public.shares where outing_id = p_outing_id;

  update public.outings
  set status = 'reopened',
      total_mode = 'fixed',
      reopened_at = now(),
      version = version + 1
  where id = p_outing_id
  returning * into v_outing;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    v_outing.group_id,
    auth.uid(),
    'outing.reopened',
    'outing',
    p_outing_id,
    jsonb_build_object(
      'status', 'finalized',
      'date', v_outing.date,
      'place', v_outing.place,
      'totalCentavos', v_outing.total_centavos,
      'shareCount', v_share_count
    ),
    jsonb_build_object(
      'status', 'reopened',
      'date', v_outing.date,
      'place', v_outing.place,
      'totalCentavos', v_outing.total_centavos,
      'totalMode', 'fixed',
      'shareCount', 0
    )
  );

  return v_outing;
end;
$$;

revoke all on function public.reopen_outing(uuid, integer) from public, anon;
grant execute on function public.reopen_outing(uuid, integer) to authenticated;
