begin;

select plan(5);

\set owner '00000000-0000-0000-0000-000000000005'
\set outsider '00000000-0000-0000-0000-000000000006'

insert into auth.users (id, email) values
  (:'owner', 'multi-owner@example.test'),
  (:'outsider', 'multi-outsider@example.test')
on conflict (id) do nothing;

update public.profiles set display_name = 'Owner' where id = :'owner';
update public.profiles set display_name = 'Outsider' where id = :'outsider';

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'owner', 'role', 'authenticated')::text, true);

select public.create_group('Alpha') as first_group \gset
select public.create_group('Beta') as second_group \gset
select public.create_group('Gamma') as third_group \gset
select public.create_group('Delta') as fourth_group \gset
select public.create_group('Epsilon') as fifth_group \gset

select throws_ok(
  $$select public.create_group('Zeta')$$,
  'P0001',
  'You can own at most 5 groups',
  'owned group cap is enforced'
);

reset role;

select ok(
  :'first_group' <> :'second_group',
  'a user can own more than one group'
);

select is(
  (select count(*)::int from public.group_adults where profile_id = :'owner' and status = 'active'),
  5,
  'the owner is an active adult in every group'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'outsider', 'role', 'authenticated')::text, true);
select is(
  (select count(*)::int from public.groups where id in (:'first_group', :'second_group')),
  0,
  'a non-member cannot read another group'
);
reset role;

select is(
  (select count(*)::int from public.groups where owner_id = :'owner' and status <> 'deleted'),
  5,
  'five owned groups persist'
);

select * from finish();
rollback;
