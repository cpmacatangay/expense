-- Ensure every authenticated user has a profile, including users created before the trigger.
create or replace function public.ensure_profile(display_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, display_name)
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(
      nullif(btrim(display_name), ''),
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Member'
    )
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do update set email = excluded.email
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.ensure_profile(text) from public;
grant execute on function public.ensure_profile(text) to authenticated;
