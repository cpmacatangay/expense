begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

\set a '00000000-0000-0000-0000-0000000000a3'
\set b '00000000-0000-0000-0000-0000000000b3'
\set c '00000000-0000-0000-0000-0000000000c3'

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
select 'person', public.add_person('Mai') ->> 'personId';

insert into ctx (k, v)
select 'e1', public.save_expense(jsonb_build_object(
  'description', 'Private dinner',
  'expenseDate', current_date,
  'payerPersonId', :'a',
  'people', jsonb_build_array(:'a', (select v from ctx where k = 'person')),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Pasta', 'amountCentavos', 10000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Pizza', 'amountCentavos', 10000, 'assignedPersonId', (select v from ctx where k = 'person'))
  ),
  'coverage', '[]'::jsonb
), null) ->> 'expenseId';

insert into ctx (k, v)
select 'e2', public.save_expense(jsonb_build_object(
  'description', 'Second dinner',
  'expenseDate', current_date,
  'payerPersonId', :'a',
  'people', jsonb_build_array(:'a', (select v from ctx where k = 'person')),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Coffee', 'amountCentavos', 5000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Cake', 'amountCentavos', 5000, 'assignedPersonId', (select v from ctx where k = 'person'))
  ),
  'coverage', '[]'::jsonb
), null) ->> 'expenseId';

insert into ctx (k, v)
select 'share', public.create_expense_share((select v::uuid from ctx where k = 'e1')) ->> 'token';

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

select set_config('request.jwt.claims', json_build_object('sub', :'b', 'role', 'authenticated')::text, true);

select throws_ok(
  format('select public.create_expense_share(%L)', (select v::uuid from ctx where k = 'e1')),
  'P0001',
  'Only the creator or payer can share this expense',
  'only the creator or payer can create a share link'
);

select set_config('request.jwt.claims', json_build_object('sub', :'c', 'role', 'authenticated')::text, true);

select is(
  jsonb_array_length(
    public.expense_share_preview((select v from ctx where k = 'share')) -> 'unclaimed'
  ),
  1,
  'the link preview lists the unclaimed name'
);

select is(
  (public.expense_share_preview((select v from ctx where k = 'share')) ->> 'alreadyParticipant')::boolean,
  false,
  'the link preview is shown before joining'
);

select throws_ok(
  format(
    'select public.claim_expense_share(%L, %L)',
    (select v from ctx where k = 'share'),
    '00000000-0000-0000-0000-00000000eeee'
  ),
  'P0001',
  'That name is already taken. Reload and choose another.',
  'a name outside the expense cannot be claimed'
);

select lives_ok(
  format(
    'select public.claim_expense_share(%L, %L)',
    (select v from ctx where k = 'share'),
    (select v from ctx where k = 'person')
  ),
  'the signed-in person claims the open name'
);

reset role;

select is(
  (
    select count(*)::bigint from public.people
    where id = (select v::uuid from ctx where k = 'person')
  ),
  0::bigint,
  'the placeholder person is merged away'
);

select is(
  (
    select count(*)::bigint from public.people
    where profile_id = :'c' and status = 'active'
  ),
  1::bigint,
  'the claimer keeps a single account person'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'c', 'role', 'authenticated')::text, true);

select is(
  (public.ledger_for_me() ->> 'youOweCentavos')::bigint,
  15000::bigint,
  'the claimed person sees both recorded shares'
);

select is(
  jsonb_array_length(public.expenses_for_me() -> 'expenses'),
  2,
  'the claimed person sees every expense that used the name'
);

select lives_ok(
  format('select public.expense_detail(%L)', (select v from ctx where k = 'e1')),
  'the claimed person can open the expense'
);

select is(
  (public.expense_share_preview((select v from ctx where k = 'share')) ->> 'alreadyParticipant')::boolean,
  true,
  'the link preview recognizes an existing participant'
);

select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'share2', public.create_expense_share(
  (select v::uuid from ctx where k = 'e1'),
  true
) ->> 'token';

select throws_ok(
  format('select public.expense_share_preview(%L)', (select v from ctx where k = 'share')),
  'P0001',
  'This link is no longer available',
  'refreshing invalidates the previous link'
);

select set_config('request.jwt.claims', json_build_object('sub', :'c', 'role', 'authenticated')::text, true);

select is(
  (public.can_delete_account() ->> 'canDelete')::boolean,
  false,
  'a person with a balance cannot delete their account'
);

select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);
select public.set_payment_qr(:'a' || '/qr.png', 'GCash');

select set_config('request.jwt.claims', json_build_object('sub', :'c', 'role', 'authenticated')::text, true);

select is(
  (select (item ->> 'hasQr')::boolean
   from jsonb_array_elements(public.ledger_for_me() -> 'debts') item
   where item ->> 'otherPersonId' = :'a'),
  true,
  'the pair can see the payment QR'
);

select * from finish();
rollback;
