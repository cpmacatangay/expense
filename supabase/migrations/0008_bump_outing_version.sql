-- Every shared child write bumps the outing version so finalization can reject a stale view.
create or replace function public.bump_outing_version()
returns trigger
language plpgsql
as $$
declare
  v_outing_id uuid;
begin
  if tg_op = 'DELETE' then
    v_outing_id := old.outing_id;
  else
    v_outing_id := new.outing_id;
  end if;

  update public.outings
  set version = version + 1
  where id = v_outing_id;

  return null;
end;
$$;

drop trigger if exists outing_adults_bump_version on public.outing_adults;
create trigger outing_adults_bump_version
  after insert or update or delete on public.outing_adults
  for each row execute function public.bump_outing_version();

drop trigger if exists outing_students_bump_version on public.outing_students;
create trigger outing_students_bump_version
  after insert or update or delete on public.outing_students
  for each row execute function public.bump_outing_version();

drop trigger if exists items_bump_version on public.items;
create trigger items_bump_version
  after insert or update or delete on public.items
  for each row execute function public.bump_outing_version();
