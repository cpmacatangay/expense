-- Total mode is an owner-managed choice only after an outing is reopened.
-- Drafts stay on the item sum; this prevents the owner-only RPC from becoming
-- a second way to plant a draft total.

create or replace function public.guard_outings_total_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('draft', 'private_draft')
     and new.total_mode is distinct from old.total_mode then
    raise exception 'Total mode can only be changed after reopening';
  end if;

  return new;
end;
$$;

drop trigger if exists outings_total_mode_guard on public.outings;
create trigger outings_total_mode_guard
  before update of total_mode on public.outings
  for each row execute function public.guard_outings_total_mode();
