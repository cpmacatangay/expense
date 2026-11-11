-- Private/local draft publishing, with an idempotency key so retries cannot duplicate an outing.
alter table public.outings add column if not exists client_draft_id uuid;

create unique index if not exists outings_client_draft_id_key
  on public.outings (client_draft_id)
  where client_draft_id is not null;

create or replace function public.publish_local_draft(
  p_client_id uuid,
  p_group_id uuid,
  p_author_profile_id uuid,
  p_date date,
  p_place text,
  p_notes text,
  p_payer_adult_id uuid,
  p_adults jsonb,
  p_students jsonb,
  p_items jsonb,
  p_status text default 'draft'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_outing uuid;
  v_adult uuid;
  v_student record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_author_profile_id then
    raise exception 'Only the author can publish this draft';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group';
  end if;

  if p_status not in ('draft', 'private_draft') then
    raise exception 'Invalid draft status';
  end if;

  select id into v_existing
  from public.outings
  where client_draft_id = p_client_id;

  if v_existing is not null then
    return v_existing;
  end if;

  if p_adults is null or jsonb_typeof(p_adults) <> 'array' then
    raise exception 'Adults must be an array';
  end if;
  if p_students is not null and jsonb_typeof(p_students) <> 'array' then
    raise exception 'Students must be an array';
  end if;
  if p_items is not null and jsonb_typeof(p_items) <> 'array' then
    raise exception 'Items must be an array';
  end if;

  for v_adult in select (value #>> '{}')::uuid from jsonb_array_elements(p_adults)
  loop
    if not exists (
      select 1 from public.group_adults where id = v_adult and group_id = p_group_id
    ) then
      raise exception 'An adult does not belong to this group';
    end if;
  end loop;

  if p_payer_adult_id is not null then
    if not exists (
      select 1 from public.group_adults where id = p_payer_adult_id and group_id = p_group_id
    ) then
      raise exception 'The payer does not belong to this group';
    end if;

    if not exists (
      select 1
      from jsonb_array_elements_text(p_adults) as adult
      where adult = p_payer_adult_id::text
    ) then
      raise exception 'The payer must be present';
    end if;
  end if;

  for v_student in
    select *
    from jsonb_to_recordset(coalesce(p_students, '[]'::jsonb))
      as x("studentId" uuid, "coveringAdultId" uuid)
  loop
    if not exists (
      select 1 from public.students where id = v_student."studentId" and group_id = p_group_id
    ) then
      raise exception 'A student does not belong to this group';
    end if;

    if v_student."coveringAdultId" is not null and not exists (
      select 1 from public.group_adults
      where id = v_student."coveringAdultId" and group_id = p_group_id
    ) then
      raise exception 'A student cover does not belong to this group';
    end if;
  end loop;

  insert into public.outings (
    group_id,
    author_profile_id,
    date,
    place,
    notes,
    payer_adult_id,
    status,
    total_mode,
    total_centavos,
    client_draft_id
  ) values (
    p_group_id,
    p_author_profile_id,
    p_date,
    nullif(btrim(p_place), ''),
    nullif(btrim(p_notes), ''),
    p_payer_adult_id,
    p_status::public.outing_status,
    'auto',
    0,
    p_client_id
  )
  returning id into v_outing;

  insert into public.outing_adults (outing_id, adult_id, present)
  select v_outing, (value #>> '{}')::uuid, true
  from jsonb_array_elements(p_adults);

  insert into public.outing_students (outing_id, student_id, present, covering_adult_id)
  select v_outing, x."studentId", true, x."coveringAdultId"
  from jsonb_to_recordset(coalesce(p_students, '[]'::jsonb))
    as x("studentId" uuid, "coveringAdultId" uuid);

  insert into public.items (
    outing_id,
    name,
    quantity,
    unit_amount_centavos,
    assignment_type,
    assigned_adult_id,
    assigned_student_id,
    sort_order
  )
  select
    v_outing,
    coalesce(nullif(btrim(item ->> 'name'), ''), 'Item'),
    greatest(1, coalesce((item ->> 'quantity')::int, 1)),
    greatest(0, coalesce((item ->> 'unitAmountCentavos')::bigint, 0)),
    (item ->> 'assignmentType')::public.assignment_type,
    nullif(item ->> 'assignedAdultId', '')::uuid,
    nullif(item ->> 'assignedStudentId', '')::uuid,
    coalesce((item ->> 'sortOrder')::int, ordinality::int - 1)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
    with ordinality as t(item, ordinality);

  return v_outing;
end;
$$;

create or replace function public.publish_private_draft(
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

  if v_outing.status <> 'private_draft' then
    raise exception 'This is not a private draft';
  end if;

  if v_outing.version <> p_expected_version then
    raise exception 'This draft changed on another device. Reload before publishing.';
  end if;

  if v_outing.author_profile_id <> auth.uid()
     and not public.is_group_owner(v_outing.group_id) then
    raise exception 'Only the author or group owner can publish this draft';
  end if;

  update public.outings
  set status = 'draft',
      version = version + 1
  where id = p_outing_id
  returning * into v_outing;

  return v_outing;
end;
$$;

revoke all on function public.publish_local_draft(
  uuid, uuid, uuid, date, text, text, uuid, jsonb, jsonb, jsonb, text
) from public, anon;
revoke all on function public.publish_private_draft(uuid, integer) from public, anon;

grant execute on function public.publish_local_draft(
  uuid, uuid, uuid, date, text, text, uuid, jsonb, jsonb, jsonb, text
) to authenticated;
grant execute on function public.publish_private_draft(uuid, integer) to authenticated;
