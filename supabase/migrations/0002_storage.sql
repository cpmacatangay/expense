-- Private receipt photo storage for Salo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;

drop policy if exists receipts_storage_select on storage.objects;
create policy receipts_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'receipts'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists receipts_storage_insert on storage.objects;
create policy receipts_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'receipts'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists receipts_storage_update on storage.objects;
create policy receipts_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'receipts'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'receipts'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists receipts_storage_delete on storage.objects;
create policy receipts_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'receipts'
  and public.is_group_member(((storage.foldername(name))[1])::uuid)
);
