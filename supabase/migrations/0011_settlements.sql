-- Settlements move through RPCs so status transitions, permissions, and activity stay atomic.
-- Only confirmed settlements affect ledger balances.

create index if not exists settlements_group_created_idx
  on public.settlements (group_id, created_at desc);

-- Direct writes are no longer allowed. The cached balance must never drift from the RPC path.
drop policy if exists settlements_insert on public.settlements;
drop policy if exists settlements_update_participant on public.settlements;
revoke insert, update, delete on public.settlements from authenticated, anon;

create or replace function public.record_settlement(
  p_group_id uuid,
  p_from_adult_id uuid,
  p_to_adult_id uuid,
  p_amount_centavos bigint,
  p_date date default null,
  p_note text default null
)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from public.group_adults%rowtype;
  v_to public.group_adults%rowtype;
  v_row public.settlements;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_group_member(p_group_id) then
    raise exception 'You are not a member of this group';
  end if;

  if p_amount_centavos is null or p_amount_centavos <= 0 then
    raise exception 'Enter an amount greater than zero';
  end if;

  if p_from_adult_id = p_to_adult_id then
    raise exception 'Choose two different adults';
  end if;

  select * into v_from
  from public.group_adults
  where id = p_from_adult_id and group_id = p_group_id;

  if v_from.id is null or v_from.status <> 'active' then
    raise exception 'Choose an active payer';
  end if;

  select * into v_to
  from public.group_adults
  where id = p_to_adult_id and group_id = p_group_id;

  if v_to.id is null or v_to.status <> 'active' then
    raise exception 'Choose an active recipient';
  end if;

  if v_from.profile_id is distinct from auth.uid()
     and not public.is_group_owner(p_group_id) then
    raise exception 'Only the payer or the group owner can record this settlement';
  end if;

  insert into public.settlements (
    group_id,
    from_adult_id,
    to_adult_id,
    amount_centavos,
    date,
    note,
    status,
    recorded_by
  ) values (
    p_group_id,
    p_from_adult_id,
    p_to_adult_id,
    p_amount_centavos,
    coalesce(p_date, (now() at time zone 'Asia/Manila')::date),
    nullif(btrim(p_note), ''),
    'pending',
    auth.uid()
  )
  returning * into v_row;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    after_json
  ) values (
    p_group_id,
    auth.uid(),
    'settlement.recorded',
    'settlement',
    v_row.id,
    jsonb_build_object(
      'fromAdultId', v_row.from_adult_id,
      'toAdultId', v_row.to_adult_id,
      'amountCentavos', v_row.amount_centavos,
      'status', v_row.status
    )
  );

  return v_row;
end;
$$;

create or replace function public.decide_settlement(
  p_settlement_id uuid,
  p_decision text,
  p_note text default null
)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
  v_before public.settlements;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_decision not in ('confirmed', 'declined') then
    raise exception 'Choose confirm or decline';
  end if;

  select * into v_row
  from public.settlements
  where id = p_settlement_id
  for update;

  if v_row.id is null then
    raise exception 'Settlement not found';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'This settlement was already decided';
  end if;

  if not exists (
    select 1
    from public.group_adults ga
    where ga.id = v_row.to_adult_id
      and ga.profile_id = auth.uid()
  ) then
    raise exception 'Only the recipient can confirm or decline this settlement';
  end if;

  if p_decision = 'declined' and nullif(btrim(p_note), '') is null then
    raise exception 'Add a note when declining';
  end if;

  v_before := v_row;

  update public.settlements
  set status = p_decision::public.settlement_status,
      confirmed_by = case when p_decision = 'confirmed' then auth.uid() end,
      decided_at = now(),
      decline_reason = case when p_decision = 'declined' then btrim(p_note) end
  where id = p_settlement_id
  returning * into v_row;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    v_row.group_id,
    auth.uid(),
    case
      when p_decision = 'confirmed' then 'settlement.confirmed'
      else 'settlement.declined'
    end,
    'settlement',
    v_row.id,
    jsonb_build_object('status', v_before.status),
    jsonb_build_object(
      'status', v_row.status,
      'amountCentavos', v_row.amount_centavos,
      'note', v_row.decline_reason
    )
  );

  return v_row;
end;
$$;

create or replace function public.void_settlement(
  p_settlement_id uuid,
  p_note text default null
)
returns public.settlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlements;
  v_before public.settlements;
  v_is_payer boolean;
  v_is_owner boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.settlements
  where id = p_settlement_id
  for update;

  if v_row.id is null then
    raise exception 'Settlement not found';
  end if;

  if v_row.status not in ('pending', 'confirmed') then
    raise exception 'This settlement can no longer be voided';
  end if;

  select exists (
    select 1
    from public.group_adults ga
    where ga.id = v_row.from_adult_id
      and ga.profile_id = auth.uid()
  ) into v_is_payer;

  v_is_owner := public.is_group_owner(v_row.group_id);

  if v_row.status = 'confirmed' and not v_is_owner then
    raise exception 'Only the group owner can void a confirmed settlement';
  end if;

  if v_row.status = 'pending' and not (v_is_payer or v_is_owner) then
    raise exception 'Only the payer or the group owner can void this settlement';
  end if;

  v_before := v_row;

  update public.settlements
  set status = 'void',
      voided_at = now(),
      voided_by = auth.uid()
  where id = p_settlement_id
  returning * into v_row;

  insert into public.activity_events (
    group_id,
    actor_profile_id,
    action,
    entity_type,
    entity_id,
    before_json,
    after_json
  ) values (
    v_row.group_id,
    auth.uid(),
    'settlement.voided',
    'settlement',
    v_row.id,
    jsonb_build_object('status', v_before.status),
    jsonb_build_object(
      'status', 'void',
      'amountCentavos', v_row.amount_centavos,
      'note', nullif(btrim(p_note), '')
    )
  );

  return v_row;
end;
$$;

revoke all on function public.record_settlement(uuid, uuid, uuid, bigint, date, text)
  from public, anon;
revoke all on function public.decide_settlement(uuid, text, text)
  from public, anon;
revoke all on function public.void_settlement(uuid, text)
  from public, anon;

grant execute on function public.record_settlement(uuid, uuid, uuid, bigint, date, text)
  to authenticated;
grant execute on function public.decide_settlement(uuid, text, text)
  to authenticated;
grant execute on function public.void_settlement(uuid, text)
  to authenticated;
