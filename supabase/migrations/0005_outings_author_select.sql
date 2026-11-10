-- Authors can always see their own outings, including private drafts and INSERT ... RETURNING.
drop policy if exists outings_select_author on public.outings;

create policy outings_select_author
  on public.outings for select
  using (author_profile_id = auth.uid());
