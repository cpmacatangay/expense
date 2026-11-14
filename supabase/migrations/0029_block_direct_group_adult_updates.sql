-- The owner may administer adults only through the audited RPCs. Direct
-- PostgREST updates to group_adults could rewrite profile_id, status, or the
-- payment-QR path without the invite, removal, restore, or QR validation paths.

create or replace function public.guard_group_adult_direct_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user = 'authenticated' then
    raise exception 'Use the group management actions to change an adult';
  end if;
  return new;
end;
$$;

drop trigger if exists group_adults_direct_update_guard on public.group_adults;
create trigger group_adults_direct_update_guard
  before update on public.group_adults
  for each row execute function public.guard_group_adult_direct_update();
