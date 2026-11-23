-- Share expenses by link, and add people by name instead of email.
--
-- A share link belongs to one expense. Anyone signed in with the link can
-- claim one of the unjoined names already recorded on that expense. Claiming
-- merges the placeholder person into the claimer's account person.

-- ---------------------------------------------------------------------------
-- People: email becomes optional identity data, not an invitation address.
-- ---------------------------------------------------------------------------

alter table public.people alter column email drop not null;

-- ---------------------------------------------------------------------------
-- Expense share links.
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column if not exists share_token text,
  add column if not exists share_expires_at timestamptz;

create unique index if not exists expenses_share_token_key
  on public.expenses (share_token)
  where share_token is not null;

-- ---------------------------------------------------------------------------
-- Remove the email invitation model.
-- ---------------------------------------------------------------------------

drop function if exists public.claim_invite(text) cascade;
drop function if exists public.create_invite_link(uuid) cascade;
drop function if exists public.correct_pending_email(uuid, text) cascade;
drop function if exists public.add_person(text) cascade;

drop table if exists public.person_invitations cascade;

-- ---------------------------------------------------------------------------
-- Identity helpers without invitations.
-- ---------------------------------------------------------------------------

create or replace function public.claim_people_for_me()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_ids uuid[] := '{}';
  v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null then
    return jsonb_build_object('claimedPersonIds', '[]'::jsonb);
  end if;

  for v_id in
    select id from public.people
    where lower(email) = lower(v_profile.email)
      and status in ('pending', 'former')
    for update
  loop
    update public.people
    set profile_id = v_uid,
        status = 'active',
        display_name = v_profile.display_name,
        updated_at = now()
    where id = v_id;

    v_ids := array_append(v_ids, v_id);
  end loop;

  return jsonb_build_object('claimedPersonIds', to_jsonb(v_ids));
end;
$$;

-- ---------------------------------------------------------------------------
-- People by name.
-- ---------------------------------------------------------------------------

create or replace function public.people_for_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (select public.current_person_id() as id),
  shared as (
    select distinct theirs.person_id
    from public.expense_people mine
    join public.expense_people theirs on theirs.expense_id = mine.expense_id
    join public.expenses e on e.id = mine.expense_id
    where mine.person_id = (select id from me)
      and theirs.person_id <> (select id from me)
      and e.deleted_at is null
    union
    select case when p.from_person_id = (select id from me) then p.to_person_id else p.from_person_id end
    from public.payments p
    where p.from_person_id = (select id from me)
       or p.to_person_id = (select id from me)
    union
    select id from public.people
    where created_by_person_id = (select id from me) and status = 'pending'
  ),
  ids as (
    select id from me
    union
    select person_id from shared
  )
  select jsonb_build_object(
    'people',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'displayName', p.display_name,
        'status', p.status,
        'isSelf', p.id = (select id from me),
        'hasQr', p.payment_qr_path is not null,
        'createdByMe', p.created_by_person_id = (select id from me)
      ) order by
        (p.id = (select id from me)) desc,
        case p.status when 'active' then 0 when 'pending' then 1 else 2 end,
        p.display_name)
      from public.people p
      where p.id in (select id from ids)
    ), '[]'::jsonb)
  );
$$;

create or replace function public.add_person(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_name text := btrim(coalesce(p_name, ''));
  v_person public.people;
  v_count integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 50 then
    raise exception 'Name must be 1-50 characters';
  end if;

  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select count(*) into v_count
  from public.people
  where created_by_person_id = v_me.id and status = 'pending';
  if v_count >= 100 then raise exception 'Too many people. Try again later.'; end if;

  -- Reuse a pending placeholder with the same name instead of duplicating it.
  select * into v_person
  from public.people
  where created_by_person_id = v_me.id
    and status = 'pending'
    and lower(display_name) = lower(v_name)
  order by created_at
  limit 1;

  if v_person.id is null then
    insert into public.people (display_name, status, created_by_person_id)
    values (v_name, 'pending', v_me.id)
    returning * into v_person;
  end if;

  return jsonb_build_object(
    'personId', v_person.id,
    'displayName', v_person.display_name,
    'status', v_person.status
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Expense share links.
-- ---------------------------------------------------------------------------

create or replace function public.create_expense_share(
  p_expense_id uuid,
  p_refresh boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_expense public.expenses;
  v_token text;
  v_expires timestamptz;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_expense
  from public.expenses
  where id = p_expense_id and deleted_at is null
  for update;

  if v_expense.id is null then raise exception 'Not found'; end if;
  if v_expense.created_by_person_id <> v_me.id
     and v_expense.payer_person_id <> v_me.id then
    raise exception 'Only the creator or payer can share this expense';
  end if;

  if not coalesce(p_refresh, false)
     and v_expense.share_token is not null
     and v_expense.share_expires_at > now() then
    return jsonb_build_object(
      'token', v_expense.share_token,
      'expiresAt', v_expense.share_expires_at
    );
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');
  v_expires := now() + interval '7 days';

  update public.expenses
  set share_token = v_token,
      share_expires_at = v_expires
  where id = v_expense.id;

  return jsonb_build_object('token', v_token, 'expiresAt', v_expires);
end;
$$;

create or replace function public.expense_share_preview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_expense public.expenses;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'This link is no longer available';
  end if;

  select * into v_expense
  from public.expenses
  where share_token = p_token and deleted_at is null
  limit 1;

  if v_expense.id is null or v_expense.share_expires_at <= now() then
    raise exception 'This link is no longer available';
  end if;

  select * into v_me from public.people where profile_id = v_uid limit 1;

  return jsonb_build_object(
    'expenseId', v_expense.id,
    'description', v_expense.description,
    'expenseDate', v_expense.expense_date,
    'payerName', (
      select display_name from public.people where id = v_expense.payer_person_id
    ),
    'totalCentavos', v_expense.total_centavos,
    'expiresAt', v_expense.share_expires_at,
    'alreadyParticipant', (
      v_me.id is not null and exists (
        select 1 from public.expense_people
        where expense_id = v_expense.id and person_id = v_me.id
      )
    ),
    'peopleCount', (
      select count(*) from public.expense_people where expense_id = v_expense.id
    ),
    'unclaimed', coalesce((
      select jsonb_agg(jsonb_build_object(
        'personId', p.id,
        'displayName', p.display_name
      ) order by p.display_name)
      from public.expense_people ep
      join public.people p on p.id = ep.person_id
      where ep.expense_id = v_expense.id
        and p.status = 'pending'
        and p.profile_id is null
    ), '[]'::jsonb)
  );
end;
$$;

-- Merge the claimed placeholder into the signed-in account's person row.
create or replace function public.claim_expense_share(
  p_token text,
  p_person_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me public.people;
  v_expense public.expenses;
  v_placeholder public.people;
  v_before_map jsonb;
  v_e uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_token is null or char_length(p_token) < 16 then
    raise exception 'This link is no longer available';
  end if;
  if p_person_id is null then raise exception 'Choose your name'; end if;

  select * into v_me from public.people where profile_id = v_uid limit 1;
  if v_me.id is null then raise exception 'Person not found'; end if;

  select * into v_expense
  from public.expenses
  where share_token = p_token and deleted_at is null
  for update;

  if v_expense.id is null or v_expense.share_expires_at <= now() then
    raise exception 'This link is no longer available';
  end if;

  if exists (
    select 1 from public.expense_people
    where expense_id = v_expense.id and person_id = v_me.id
  ) then
    return jsonb_build_object(
      'expenseId', v_expense.id,
      'personId', v_me.id,
      'alreadyClaimed', true
    );
  end if;

  select p.* into v_placeholder
  from public.expense_people ep
  join public.people p on p.id = ep.person_id
  where ep.expense_id = v_expense.id
    and p.id = p_person_id
    and p.status = 'pending'
    and p.profile_id is null
  for update of p;

  if v_placeholder.id is null then
    raise exception 'That name is already taken. Reload and choose another.';
  end if;

  -- A pending name cannot be in a payment with the account that claims it.
  if exists (
    select 1 from public.payments
    where (from_person_id = v_placeholder.id and to_person_id = v_me.id)
       or (from_person_id = v_me.id and to_person_id = v_placeholder.id)
  ) then
    raise exception 'This name already has payments with your account. Ask the payer to use a new name.';
  end if;

  -- If the account already shares an expense with the placeholder, merging
  -- would duplicate a participant. Refuse instead of corrupting either ledger.
  if exists (
    select 1
    from public.expense_people p
    join public.expense_people m on m.expense_id = p.expense_id
    where p.person_id = v_placeholder.id
      and m.person_id = v_me.id
  ) then
    raise exception 'This name shares an expense with your account already. Ask the payer to remove the duplicate.';
  end if;

  -- Serialize against edits of every expense the placeholder appears on.
  perform 1
  from public.expenses e
  where e.id in (
    select expense_id from public.expense_people where person_id = v_placeholder.id
  )
  order by e.id
  for update;

  perform 1
  from public.payments p
  where p.from_person_id = v_placeholder.id
     or p.to_person_id = v_placeholder.id
  for update;

  -- Snapshot every expense that will change, so each keeps an update event.
  select coalesce(
    jsonb_object_agg(
      ep.expense_id::text,
      public.expense_snapshot(ep.expense_id)
    ),
    '{}'::jsonb
  )
  into v_before_map
  from (
    select distinct expense_id
    from public.expense_people
    where person_id = v_placeholder.id
  ) ep;

  -- The claimer keeps their account person; the placeholder is absorbed on
  -- every expense it appears on.
  insert into public.expense_people (expense_id, person_id, added_by_person_id)
  select ep.expense_id, v_me.id, ep.added_by_person_id
  from public.expense_people ep
  where ep.person_id = v_placeholder.id
  on conflict do nothing;

  update public.expense_items
  set assigned_person_id = v_me.id
  where assigned_person_id = v_placeholder.id;

  update public.expenses
  set payer_person_id = v_me.id
  where payer_person_id = v_placeholder.id;

  update public.expenses
  set created_by_person_id = v_me.id
  where created_by_person_id = v_placeholder.id;

  update public.expense_coverage
  set covered_person_id = v_me.id
  where covered_person_id = v_placeholder.id;

  update public.expense_coverage
  set coverer_person_id = v_me.id
  where coverer_person_id = v_placeholder.id;

  update public.expense_shares
  set person_id = v_me.id
  where person_id = v_placeholder.id;

  update public.expense_shares
  set covered_by_person_id = v_me.id
  where covered_by_person_id = v_placeholder.id;

  update public.payments
  set from_person_id = v_me.id
  where from_person_id = v_placeholder.id;

  update public.payments
  set to_person_id = v_me.id
  where to_person_id = v_placeholder.id;

  update public.payments
  set marked_by_person_id = v_me.id
  where marked_by_person_id = v_placeholder.id;

  update public.payments
  set undone_by_person_id = v_me.id
  where undone_by_person_id = v_placeholder.id;

  update public.expense_events
  set actor_person_id = v_me.id
  where actor_person_id = v_placeholder.id;

  update public.expense_people
  set added_by_person_id = v_me.id
  where added_by_person_id = v_placeholder.id;

  delete from public.expense_people
  where person_id = v_placeholder.id;

  update public.people
  set created_by_person_id = v_me.id
  where created_by_person_id = v_placeholder.id;

  update public.people
  set display_name = (
        select coalesce(nullif(btrim(display_name), ''), v_me.display_name)
        from public.profiles where id = v_uid
      ),
      status = 'active',
      updated_at = now()
  where id = v_me.id;

  delete from public.people where id = v_placeholder.id;

  for v_e in
    select key::uuid from jsonb_object_keys(v_before_map) as key
  loop
    insert into public.expense_events (
      expense_id, actor_person_id, action, before_json, after_json
    ) values (
      v_e,
      v_me.id,
      'updated',
      v_before_map -> v_e::text,
      public.expense_snapshot(v_e)
    );
  end loop;

  return jsonb_build_object(
    'expenseId', v_expense.id,
    'personId', v_me.id,
    'alreadyClaimed', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.claim_people_for_me() from public, anon;
grant execute on function public.claim_people_for_me() to authenticated;

revoke all on function public.people_for_me() from public, anon;
grant execute on function public.people_for_me() to authenticated;

revoke all on function public.add_person(text) from public, anon;
grant execute on function public.add_person(text) to authenticated;

revoke all on function public.create_expense_share(uuid, boolean) from public, anon;
grant execute on function public.create_expense_share(uuid, boolean) to authenticated;

revoke all on function public.expense_share_preview(text) from public, anon;
grant execute on function public.expense_share_preview(text) to authenticated;

revoke all on function public.claim_expense_share(text, uuid) from public, anon;
grant execute on function public.claim_expense_share(text, uuid) to authenticated;
