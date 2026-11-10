-- Atomic share application for the finalize-outing Edge Function. Service role only.
create or replace function public.apply_finalization(
  p_outing_id uuid,
  p_actor_profile_id uuid,
  p_expected_version integer,
  p_total_centavos bigint,
  p_shares jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outing public.outings%rowtype;
  v_group_owner uuid;
  v_present_adults integer;
  v_share_sum bigint;
begin
  if p_shares is null or jsonb_typeof(p_shares) <> 'array' then
    raise exception 'Shares must be an array';
  end if;

  select * into v_outing
  from public.outings
  where id = p_outing_id
  for update;

  if v_outing.id is null then
    raise exception 'Outing not found';
  end if;

  if v_outing.status not in ('draft', 'reopened') then
    raise exception 'This outing is not editable';
  end if;

  if v_outing.version <> p_expected_version then
    raise exception 'This outing changed on another device';
  end if;

  select owner_id into v_group_owner
  from public.groups
  where id = v_outing.group_id;

  if v_group_owner is distinct from p_actor_profile_id then
    raise exception 'Only the group owner can finalize';
  end if;

  select count(*) into v_present_adults
  from public.outing_adults
  where outing_id = p_outing_id and present = true;

  if v_present_adults < 2 then
    raise exception 'At least two adults must be present';
  end if;

  if v_outing.payer_adult_id is null then
    raise exception 'Choose a payer';
  end if;

  if not exists (
    select 1 from public.outing_adults
    where outing_id = p_outing_id
      and adult_id = v_outing.payer_adult_id
      and present = true
  ) then
    raise exception 'The payer must be present';
  end if;

  if p_total_centavos is null or p_total_centavos <= 0 then
    raise exception 'The total must be greater than zero';
  end if;

  select coalesce(sum((share ->> 'totalCentavos')::bigint), 0)
  into v_share_sum
  from jsonb_array_elements(p_shares) as share;

  if v_share_sum <> p_total_centavos then
    raise exception 'Shares do not sum to the outing total';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_shares) as share
    where not exists (
      select 1 from public.outing_adults oa
      where oa.outing_id = p_outing_id
        and oa.adult_id = (share ->> 'adultId')::uuid
        and oa.present = true
    )
  ) then
    raise exception 'Every share must belong to a present adult';
  end if;

  delete from public.shares where outing_id = p_outing_id;

  insert into public.shares (
    outing_id,
    adult_id,
    own_items_centavos,
    student_items_centavos,
    shared_head_centavos,
    covered_student_shared_centavos,
    total_difference_centavos,
    total_centavos
  )
  select
    p_outing_id,
    (share ->> 'adultId')::uuid,
    coalesce((share ->> 'ownItemsCentavos')::bigint, 0),
    coalesce((share ->> 'studentItemsCentavos')::bigint, 0),
    coalesce((share ->> 'sharedHeadCentavos')::bigint, 0),
    coalesce((share ->> 'coveredStudentSharedCentavos')::bigint, 0),
    coalesce((share ->> 'totalDifferenceCentavos')::bigint, 0),
    (share ->> 'totalCentavos')::bigint
  from jsonb_array_elements(p_shares) as share;

  update public.outings
  set status = 'finalized',
      total_centavos = p_total_centavos,
      finalized_at = now(),
      version = version + 1
  where id = p_outing_id;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_json
  ) values (
    v_outing.group_id,
    p_actor_profile_id,
    'outing.finalized',
    'outing',
    p_outing_id,
    jsonb_build_object(
      'totalCentavos', p_total_centavos,
      'version', p_expected_version + 1
    )
  );
end;
$$;

revoke all on function public.apply_finalization(uuid, uuid, integer, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_finalization(uuid, uuid, integer, bigint, jsonb)
  to service_role;
