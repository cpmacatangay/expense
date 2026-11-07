-- Salo private ledger backup.
-- Single-owner snapshot storage. No multi-user groups, no receipt images.

create table if not exists public.ledger_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null,
  payload jsonb not null,
  device_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists ledger_snapshots_owner_created_idx
  on public.ledger_snapshots (user_id, created_at desc);

alter table public.ledger_snapshots enable row level security;

drop policy if exists "owner can read own snapshots" on public.ledger_snapshots;
create policy "owner can read own snapshots"
  on public.ledger_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "owner can insert own snapshots" on public.ledger_snapshots;
create policy "owner can insert own snapshots"
  on public.ledger_snapshots for insert
  with check (auth.uid() = user_id);

drop policy if exists "owner can update own snapshots" on public.ledger_snapshots;
create policy "owner can update own snapshots"
  on public.ledger_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner can delete own snapshots" on public.ledger_snapshots;
create policy "owner can delete own snapshots"
  on public.ledger_snapshots for delete
  using (auth.uid() = user_id);

revoke all on public.ledger_snapshots from anon;
grant select, insert, update, delete on public.ledger_snapshots to authenticated;

-- Optional retention helper. The Android app also prunes older snapshots after
-- a successful upload; this function is available for manual maintenance.
create or replace function public.prune_ledger_snapshots(p_keep integer default 30)
returns integer
language plpgsql
security definer
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

revoke all on function public.prune_ledger_snapshots(integer) from public;
grant execute on function public.prune_ledger_snapshots(integer) to authenticated;
