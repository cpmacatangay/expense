begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

\set a '00000000-0000-0000-0000-0000000000a3'
\set b '00000000-0000-0000-0000-0000000000b3'
\set c '00000000-0000-0000-0000-0000000000c3'
\set d '00000000-0000-0000-0000-0000000000d3'

insert into auth.users (id, email) values
  (:'a', 'security-a@example.test'),
  (:'b', 'security-b@example.test'),
  (:'c', 'security-c@example.test')
on conflict (id) do nothing;

insert into public.people (id, email, display_name, profile_id, status) values
  (:'a', 'security-a@example.test', 'A', :'a', 'active'),
  (:'b', 'security-b@example.test', 'B', :'b', 'active'),
  (:'c', 'security-c@example.test', 'C', :'c', 'active')
on conflict (id) do nothing;

create temp table ctx (k text primary key, v text not null);
grant all on ctx to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'e1', public.save_expense(jsonb_build_object(
  'description', 'Private dinner',
  'expenseDate', current_date,
  'payerPersonId', :'a',
  'people', jsonb_build_array(:'a', :'b'),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Pasta', 'amountCentavos', 10000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Pizza', 'amountCentavos', 10000, 'assignedPersonId', :'b')
  ),
  'coverage', '[]'::jsonb
), null) ->> 'expenseId';

reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'c', 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.expense_detail(%L)', (select v from ctx where k = 'e1')),
  'P0001',
  'Not found',
  'a non-participant cannot open the expense'
);

select is(
  public.ledger_for_me() -> 'debts',
  '[]'::jsonb,
  'a non-participant sees no debt'
);

select throws_ok(
  format('select public.pair_history(%L)', :'a'),
  'P0001',
  'Not found',
  'a non-participant cannot read another pair'
);

select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'invite', public.add_person('new@example.test') ->> 'inviteToken';

select set_config('request.jwt.claims', json_build_object('sub', :'c', 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.claim_invite(%L)', (select v from ctx where k = 'invite')),
  'P0001',
  'Sign in with the Google account for the invited email',
  'the wrong Google account cannot claim the link'
);

reset role;

insert into auth.users (id, email) values (:'d', 'new@example.test')
on conflict (id) do nothing;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'d', 'role', 'authenticated')::text, true);

select lives_ok(
  format('select public.claim_invite(%L)', (select v from ctx where k = 'invite')),
  'the invited Google account claims the link'
);

reset role;

select is(
  (select status::text from public.people where email = 'new@example.test'),
  'active',
  'the claimed person becomes active'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'b', 'role', 'authenticated')::text, true);

select is(
  (public.can_delete_account() ->> 'canDelete')::boolean,
  false,
  'a person with a balance cannot delete their account'
);

select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);
select public.set_payment_qr(:'a' || '/qr.png', 'GCash');

select set_config('request.jwt.claims', json_build_object('sub', :'b', 'role', 'authenticated')::text, true);

select is(
  (select (item ->> 'hasQr')::boolean
   from jsonb_array_elements(public.ledger_for_me() -> 'debts') item
   where item ->> 'otherPersonId' = :'a'),
  true,
  'the pair can see the payment QR'
);

select * from finish();
rollback;
