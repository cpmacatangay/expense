begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\set a '00000000-0000-0000-0000-0000000000a1'
\set b '00000000-0000-0000-0000-0000000000b1'
\set c '00000000-0000-0000-0000-0000000000c1'
\set d '00000000-0000-0000-0000-0000000000d1'

insert into auth.users (id, email) values
  (:'a', 'a@example.test'),
  (:'b', 'b@example.test'),
  (:'c', 'c@example.test'),
  (:'d', 'd@example.test')
on conflict (id) do nothing;

insert into public.people (id, email, display_name, profile_id, status) values
  (:'a', 'a@example.test', 'A', :'a', 'active'),
  (:'b', 'b@example.test', 'B', :'b', 'active'),
  (:'c', 'c@example.test', 'C', :'c', 'active'),
  (:'d', 'd@example.test', 'D', :'d', 'active')
on conflict (id) do nothing;

create temp table ctx (k text primary key, v text not null);
grant all on ctx to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'e1', public.save_expense(jsonb_build_object(
  'description', 'Assigned dinner',
  'expenseDate', current_date,
  'payerPersonId', :'a',
  'people', jsonb_build_array(:'a', :'b', :'c'),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Pasta', 'amountCentavos', 30000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Pizza', 'amountCentavos', 20000, 'assignedPersonId', :'b'),
    jsonb_build_object('name', 'Salad', 'amountCentavos', 10000, 'assignedPersonId', :'c')
  ),
  'coverage', '[]'::jsonb
), null) ->> 'expenseId';

reset role;

select is(
  (select sum(owed_centavos)::bigint from public.expense_shares
    where expense_id = (select v::uuid from ctx where k = 'e1')),
  60000::bigint,
  'shares sum to the item total'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'e2', public.save_expense(jsonb_build_object(
  'description', 'Covered dinner',
  'expenseDate', current_date,
  'payerPersonId', :'a',
  'people', jsonb_build_array(:'a', :'b', :'c'),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Pasta', 'amountCentavos', 30000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Pizza', 'amountCentavos', 20000, 'assignedPersonId', :'b'),
    jsonb_build_object('name', 'Salad', 'amountCentavos', 10000, 'assignedPersonId', :'c')
  ),
  'coverage', jsonb_build_array(jsonb_build_object('coveredPersonId', :'c', 'covererPersonId', :'b'))
), null) ->> 'expenseId';

reset role;

select is(
  (select owed_centavos from public.expense_shares
    where expense_id = (select v::uuid from ctx where k = 'e2') and person_id = :'c'),
  0::bigint,
  'the covered person owes zero'
);

select is(
  (select owed_centavos from public.expense_shares
    where expense_id = (select v::uuid from ctx where k = 'e2') and person_id = :'b'),
  30000::bigint,
  'the coverer owes both shares'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'e3', public.save_expense(jsonb_build_object(
  'description', 'Payer coverage',
  'expenseDate', current_date,
  'payerPersonId', :'a',
  'people', jsonb_build_array(:'a', :'b', :'c'),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Pasta', 'amountCentavos', 30000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Pizza', 'amountCentavos', 20000, 'assignedPersonId', :'b'),
    jsonb_build_object('name', 'Salad', 'amountCentavos', 10000, 'assignedPersonId', :'c')
  ),
  'coverage', jsonb_build_array(jsonb_build_object('coveredPersonId', :'c', 'covererPersonId', :'a'))
), null) ->> 'expenseId';

reset role;

select is(
  (select owed_centavos from public.expense_shares
    where expense_id = (select v::uuid from ctx where k = 'e3') and person_id = :'a'),
  40000::bigint,
  'the payer absorbs a covered share'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

select throws_ok(
  format(
    'select public.save_expense(%L::jsonb, null)',
    jsonb_build_object(
      'description', 'Chain',
      'expenseDate', current_date,
      'payerPersonId', :'a',
      'people', jsonb_build_array(:'a', :'b', :'c', :'d'),
      'items', jsonb_build_array(
        jsonb_build_object('name', 'Pasta', 'amountCentavos', 10000, 'assignedPersonId', :'a'),
        jsonb_build_object('name', 'Pizza', 'amountCentavos', 20000, 'assignedPersonId', :'b'),
        jsonb_build_object('name', 'Salad', 'amountCentavos', 30000, 'assignedPersonId', :'c'),
        jsonb_build_object('name', 'Soup', 'amountCentavos', 40000, 'assignedPersonId', :'d')
      ),
      'coverage', jsonb_build_array(
        jsonb_build_object('coveredPersonId', :'c', 'covererPersonId', :'b'),
        jsonb_build_object('coveredPersonId', :'b', 'covererPersonId', :'d')
      )
    )::text
  ),
  'P0001',
  'A covered person cannot cover someone',
  'coverage chains are rejected'
);

select * from finish();
rollback;
