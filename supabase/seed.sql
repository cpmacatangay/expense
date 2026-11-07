-- Local development seed for Salo.
-- These fixed ids match the local demo so the same records are easy to reason about.

insert into public.groups (id, name, currency)
values ('00000000-0000-4000-8000-000000000001', 'Salo', 'PHP')
on conflict (id) do nothing;

insert into public.group_members (id, group_id, display_name, email)
values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-000000000001', 'CP', 'cp@example.com'),
  ('22222222-2222-4222-8222-222222222222', '00000000-0000-4000-8000-000000000001', 'Mai', 'mai@example.com'),
  ('33333333-3333-4333-8333-333333333333', '00000000-0000-4000-8000-000000000001', 'Kent', 'kent@example.com'),
  ('44444444-4444-4444-8444-444444444444', '00000000-0000-4000-8000-000000000001', 'Llanmer', 'llanmer@example.com')
on conflict (id) do nothing;

insert into public.students (id, group_id, name, notes)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000000001', 'Ana', 'Sample student'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-4000-8000-000000000001', 'Ben', 'Sample student'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '00000000-0000-4000-8000-000000000001', 'Cara', 'Sample student')
on conflict (id) do nothing;
