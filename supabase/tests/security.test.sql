begin;

select plan(14);

-- Deterministic dummy principals.
\set owner '00000000-0000-0000-0000-000000000001'
\set author '00000000-0000-0000-0000-000000000002'
\set member '00000000-0000-0000-0000-000000000003'
\set recipient '00000000-0000-0000-0000-000000000004'

insert into auth.users (id, email) values
  (:'owner', 'owner@example.test'),
  (:'author', 'author@example.test'),
  (:'member', 'member@example.test'),
  (:'recipient', 'recipient@example.test')
on conflict (id) do nothing;

update public.profiles set display_name = 'Owner' where id = :'owner';
update public.profiles set display_name = 'Author' where id = :'author';
update public.profiles set display_name = 'Member' where id = :'member';
update public.profiles set display_name = 'Recipient' where id = :'recipient';

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner', 'role', 'authenticated')::text, true);
select public.create_group('Security Test') as group_id \gset
reset role;

insert into public.group_adults (group_id, profile_id, display_name, status, joined_at)
values
  (:'group_id', :'author', 'Author', 'active', now()),
  (:'group_id', :'member', 'Member', 'active', now()),
  (:'group_id', :'recipient', 'Recipient', 'active', now());

select id as author_adult_id
from public.group_adults
where group_id = :'group_id' and profile_id = :'author' \gset
select id as member_adult_id
from public.group_adults
where group_id = :'group_id' and profile_id = :'member' \gset
select id as recipient_adult_id
from public.group_adults
where group_id = :'group_id' and profile_id = :'recipient' \gset

select ok(
  not has_column_privilege('authenticated', 'public.outings', 'total_centavos', 'UPDATE'),
  'members cannot update total_centavos'
);
select ok(
  has_column_privilege('authenticated', 'public.outings', 'date', 'UPDATE'),
  'members can update presentation columns'
);
select is(
  (select count(*)::int from public.homepage_nickname_emails),
  0,
  'seeded personal emails are removed'
);

-- Author creates a private draft and one item.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'author', 'role', 'authenticated')::text, true);

insert into public.outings (group_id, author_profile_id, date, place, notes, status)
values (:'group_id', :'author', current_date, 'Private place', 'Private notes', 'private_draft')
returning id as private_outing_id \gset

insert into public.items (outing_id, name, quantity, unit_amount_centavos, assignment_type)
values (:'private_outing_id', 'Secret item', 1, 500, 'shared');

select version as private_version from public.outings where id = :'private_outing_id' \gset

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'member', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from public.activity_events where entity_id = :'private_outing_id'),
  0,
  'private draft activity is not exposed to members'
);

-- Member creates a shared draft; total_centavos is column-protected.
insert into public.outings (group_id, author_profile_id, date, status)
values (:'group_id', :'member', current_date, 'draft')
returning id as draft_id \gset

select throws_ok(
  format('update public.outings set total_centavos = 999 where id = %L', :'draft_id'),
  '42501',
  'permission denied for table outings',
  'members cannot write the finalized total'
);

update public.outings set date = current_date + 1 where id = :'draft_id';
select is(
  (select version from public.outings where id = :'draft_id'),
  2,
  'presentation update bumps the outing version'
);

select is(
  public.join_group_with_code('000000'),
  null,
  'a wrong invite code returns a null claim'
);
reset role;
select is(
  (select count(*)::int from public.invite_attempts where profile_id = :'member'),
  1,
  'a failed claim is recorded for throttling'
);

-- Owner removes the author, then the author must lose authored read access.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner', 'role', 'authenticated')::text, true);
select public.remove_group_adult(:'author_adult_id');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'author', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from public.outings where id = :'private_outing_id'),
  0,
  'removed author cannot read authored outing rows'
);
select throws_ok(
  format('select public.publish_private_draft(%L, %s)', :'private_outing_id', :'private_version'),
  'P0001',
  'Only an active member can publish this draft',
  'removed author cannot publish a private draft'
);

-- Removed adult QR write access must be denied.
select is(
  public.can_manage_payment_qr(:'group_id', :'author_adult_id'),
  false,
  'removed adult cannot manage QR metadata'
);

-- Removed recipient cannot decide a settlement.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner', 'role', 'authenticated')::text, true);
select (public.record_settlement(
  :'group_id',
  (select id from public.group_adults where group_id = :'group_id' and profile_id = :'owner'),
  :'recipient_adult_id',
  1000
)).id as settlement_id \gset
select public.remove_group_adult(:'recipient_adult_id');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'recipient', 'role', 'authenticated')::text, true);
select throws_ok(
  format('select public.decide_settlement(%L, %L)', :'settlement_id', 'confirmed'),
  'P0001',
  'You are not an active member of this group',
  'removed recipient cannot decide a settlement'
);
select throws_ok(
  format('insert into public.outing_adults (outing_id, adult_id, present) values (%L, %L, true)', :'draft_id', :'recipient_adult_id'),
  'P0001',
  'Adult is not an active member of the outing group',
  'removed adult cannot be added to attendance'
);

-- A child write after finalization must fail closed rather than silently
-- skipping the version bump.
reset role;
update public.outings set status = 'finalized' where id = :'draft_id';
select throws_ok(
  format('insert into public.items (outing_id, name, quantity, unit_amount_centavos, assignment_type) values (%L, %L, 1, 100, %L)', :'draft_id', 'Late item', 'shared'),
  'P0001',
  'This outing is no longer editable',
  'child writes fail closed after finalization'
);

select * from finish();
rollback;
