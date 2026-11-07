-- Keep existing demo installations aligned with the current adult roster.
-- The third adult was originally seeded as "Kent"; new installs seed "Llanmer".

update public.group_members
set
  display_name = 'Llanmer',
  email = 'llanmer@example.com'
where id = '33333333-3333-4333-8333-333333333333'
  and (display_name = 'Kent' or email = 'kent@example.com');
