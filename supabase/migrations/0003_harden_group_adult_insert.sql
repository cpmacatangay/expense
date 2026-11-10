-- Owners may only add pending adult identities directly; claims go through the invitation function.
drop policy if exists group_adults_insert_owner on public.group_adults;

create policy group_adults_insert_owner
  on public.group_adults for insert
  with check (
    public.is_group_owner(group_id)
    and status = 'pending'
    and profile_id is null
  );
