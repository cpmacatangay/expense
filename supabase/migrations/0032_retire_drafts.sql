-- Retire the offline/private draft flow. If any private drafts still exist,
-- abort so they can be reviewed instead of being published silently.

do $$
begin
  if exists (select 1 from public.outings where status = 'private_draft') then
    raise exception 'Private drafts still exist. Review them before retiring the draft flow.';
  end if;
end;
$$;

drop function if exists public.publish_local_draft(
  uuid, uuid, uuid, date, text, text, uuid, jsonb, jsonb, jsonb, text
);
drop function if exists public.publish_private_draft(uuid, integer);

alter table public.outings drop column if exists client_draft_id;

create or replace function public.enforce_outing_insert_defaults()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_mode := 'auto';
  new.total_centavos := 0;
  new.finalized_at := null;
  new.reopened_at := null;
  new.version := 1;

  if new.status <> 'draft' then
    raise exception 'A new outing must start as a draft';
  end if;

  return new;
end;
$$;
