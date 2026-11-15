-- A user may own more than one group. The running ledger stays group-scoped;
-- the client selects one group at a time. Cap owned groups so group creation
-- stays a bounded write path.

create or replace function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(group_name);
  v_group_id uuid;
  v_display_name text;
  v_owned integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Group name must be 2-60 characters';
  end if;

  select count(*) into v_owned
  from public.groups
  where owner_id = auth.uid() and status <> 'deleted';

  if v_owned >= 5 then
    raise exception 'You can own at most 5 groups';
  end if;

  select display_name into v_display_name from public.profiles where id = auth.uid();
  if v_display_name is null then raise exception 'Profile not found'; end if;

  insert into public.groups (name, owner_id)
  values (v_name, auth.uid())
  returning id into v_group_id;

  insert into public.group_adults (group_id, profile_id, display_name, status, color, joined_at)
  values (v_group_id, auth.uid(), v_display_name, 'active', '#d9efe2', now());

  return v_group_id;
end;
$$;

revoke all on function public.create_group(text) from public, anon;
grant execute on function public.create_group(text) to authenticated;

create index if not exists group_adults_profile_active_idx
  on public.group_adults (profile_id)
  where status = 'active';
