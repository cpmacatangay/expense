-- Harden the retention helper: run it as the caller (RLS still applies) and
-- keep it unreachable for signed-out clients. Applied after the initial
-- ledger_snapshots table was created by hand in the dashboard SQL editor.

create or replace function public.prune_ledger_snapshots(p_keep integer default 30)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  removed integer;
begin
  if auth.uid() is null then
    raise exception 'Sign-in required';
  end if;

  with ranked as (
    select id,
           row_number() over (partition by user_id order by created_at desc) as rn
    from public.ledger_snapshots
    where user_id = auth.uid()
  )
  delete from public.ledger_snapshots
  where id in (select id from ranked where rn > greatest(p_keep, 1));

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_ledger_snapshots(integer) from public, anon;
grant execute on function public.prune_ledger_snapshots(integer) to authenticated;
