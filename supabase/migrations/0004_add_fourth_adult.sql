-- Salo now has four adults: CP, Mai, Kent, and Llanmer.
-- 0003 renamed Kent to Llanmer for the earlier three-adult seed; this migration
-- restores Kent and adds Llanmer as a separate fourth member.

update public.group_members
set
  display_name = 'Kent',
  email = 'kent@example.com'
where id = '33333333-3333-4333-8333-333333333333';

insert into public.group_members (id, group_id, display_name, email)
values (
  '44444444-4444-4444-8444-444444444444',
  '00000000-0000-4000-8000-000000000001',
  'Llanmer',
  'llanmer@example.com'
)
on conflict (id) do nothing;

create or replace function public.create_group_with_members(
  p_name text,
  p_member_names text[],
  p_member_emails text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  caller_email text;
begin
  if auth.uid() is null then
    raise exception 'Sign-in required';
  end if;
  if array_length(p_member_names, 1) <> 4 or array_length(p_member_emails, 1) <> 4 then
    raise exception 'Exactly four adults are required';
  end if;

  insert into public.groups (name, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Salo'), auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, display_name, email)
  select new_group_id, p_member_names[i], p_member_emails[i]::citext
  from generate_subscripts(p_member_names, 1) as i;

  caller_email := auth.jwt() ->> 'email';
  update public.group_members
  set user_id = auth.uid()
  where group_id = new_group_id
    and email = caller_email::citext;

  return new_group_id;
end;
$$;

grant execute on function public.create_group_with_members(text, text[], text[]) to authenticated;
