begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

\set a '00000000-0000-0000-0000-0000000000a2'
\set b '00000000-0000-0000-0000-0000000000b2'
\set c '00000000-0000-0000-0000-0000000000c2'

insert into auth.users (id, email) values
  (:'a', 'ledger-a@example.test'),
  (:'b', 'ledger-b@example.test'),
  (:'c', 'ledger-c@example.test')
on conflict (id) do nothing;

insert into public.people (id, email, display_name, profile_id, status) values
  (:'a', 'ledger-a@example.test', 'A', :'a', 'active'),
  (:'b', 'ledger-b@example.test', 'B', :'b', 'active'),
  (:'c', 'ledger-c@example.test', 'C', :'c', 'active')
on conflict (id) do nothing;

create temp table ctx (k text primary key, v text not null);
grant all on ctx to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'e1', public.save_expense(jsonb_build_object(
  'description', 'First dinner',
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

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'b', 'role', 'authenticated')::text, true);
select is(
  (public.ledger_for_me() ->> 'youOweCentavos')::bigint,
  20000::bigint,
  'B sees the share owed to A'
);

insert into ctx (k, v) select 'p1', public.mark_paid(:'a') ->> 'id';

select is(
  (public.ledger_for_me() ->> 'youOweCentavos')::bigint,
  0::bigint,
  'mark paid clears the pair'
);

select public.undo_payment((select v::uuid from ctx where k = 'p1'));

select is(
  (public.ledger_for_me() ->> 'youOweCentavos')::bigint,
  20000::bigint,
  'undo restores the pair'
);

select set_config('request.jwt.claims', json_build_object('sub', :'b', 'role', 'authenticated')::text, true);

insert into ctx (k, v)
select 'e2', public.save_expense(jsonb_build_object(
  'description', 'Second dinner',
  'expenseDate', current_date,
  'payerPersonId', :'b',
  'people', jsonb_build_array(:'a', :'b', :'c'),
  'items', jsonb_build_array(
    jsonb_build_object('name', 'Pasta', 'amountCentavos', 10000, 'assignedPersonId', :'a'),
    jsonb_build_object('name', 'Pizza', 'amountCentavos', 10000, 'assignedPersonId', :'b'),
    jsonb_build_object('name', 'Salad', 'amountCentavos', 10000, 'assignedPersonId', :'c')
  ),
  'coverage', '[]'::jsonb
), null) ->> 'expenseId';

select is(
  (public.ledger_for_me() ->> 'youOweCentavos')::bigint,
  10000::bigint,
  'B nets the two expenses per pair'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'a', 'role', 'authenticated')::text, true);
select public.delete_expense((select v::uuid from ctx where k = 'e1'));

select set_config('request.jwt.claims', json_build_object('sub', :'b', 'role', 'authenticated')::text, true);

select is(
  (select count(*)::bigint
   from jsonb_array_elements(public.expenses_for_me() -> 'expenses') item
   where item ->> 'id' = (select v from ctx where k = 'e1')),
  0::bigint,
  'a deleted expense leaves the list'
);

select * from finish();
rollback;
