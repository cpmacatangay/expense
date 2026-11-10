-- Private payment QR metadata. Images live in the private payment-qr bucket and are never exported.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qr', 'payment-qr', false, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_manage_payment_qr(
  target_group uuid,
  target_adult uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_adults ga
    where ga.id = target_adult
      and ga.group_id = target_group
      and (
        ga.profile_id = auth.uid()
        or public.is_group_owner(target_group)
      )
  );
$$;

create or replace function public.set_payment_qr(
  p_adult_id uuid,
  p_path text,
  p_label text default null
)
returns public.group_adults
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult public.group_adults;
  v_label text := nullif(btrim(p_label), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_adult
  from public.group_adults
  where id = p_adult_id;

  if v_adult.id is null then
    raise exception 'Adult not found';
  end if;

  if v_adult.status = 'removed' then
    raise exception 'This adult was removed';
  end if;

  if not public.can_manage_payment_qr(v_adult.group_id, p_adult_id) then
    raise exception 'Only the adult or the group owner can set this payment QR';
  end if;

  if p_path is null
     or p_path not like v_adult.group_id::text || '/' || p_adult_id::text || '/%' then
    raise exception 'Invalid payment QR path';
  end if;

  if char_length(p_path) > 400 then
    raise exception 'Payment QR path is too long';
  end if;

  if v_label is not null and char_length(v_label) > 40 then
    raise exception 'QR label must be 40 characters or fewer';
  end if;

  update public.group_adults
  set payment_qr_path = p_path,
      payment_qr_label = v_label,
      payment_qr_updated_at = now()
  where id = p_adult_id
  returning * into v_adult;

  return v_adult;
end;
$$;

create or replace function public.clear_payment_qr(p_adult_id uuid)
returns public.group_adults
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult public.group_adults;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_adult
  from public.group_adults
  where id = p_adult_id;

  if v_adult.id is null then
    raise exception 'Adult not found';
  end if;

  if not public.can_manage_payment_qr(v_adult.group_id, p_adult_id) then
    raise exception 'Only the adult or the group owner can clear this payment QR';
  end if;

  update public.group_adults
  set payment_qr_path = null,
      payment_qr_label = null,
      payment_qr_updated_at = now()
  where id = p_adult_id
  returning * into v_adult;

  return v_adult;
end;
$$;

revoke all on function public.can_manage_payment_qr(uuid, uuid) from public, anon;
revoke all on function public.set_payment_qr(uuid, text, text) from public, anon;
revoke all on function public.clear_payment_qr(uuid) from public, anon;

grant execute on function public.can_manage_payment_qr(uuid, uuid) to authenticated;
grant execute on function public.set_payment_qr(uuid, text, text) to authenticated;
grant execute on function public.clear_payment_qr(uuid) to authenticated;

-- Storage policies: paths are {group_id}/{adult_id}/{timestamp}.{ext}.
drop policy if exists payment_qr_read on storage.objects;
create policy payment_qr_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'payment-qr'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists payment_qr_insert on storage.objects;
create policy payment_qr_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'payment-qr'
    and public.can_manage_payment_qr(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists payment_qr_update on storage.objects;
create policy payment_qr_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'payment-qr'
    and public.can_manage_payment_qr(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  )
  with check (
    bucket_id = 'payment-qr'
    and public.can_manage_payment_qr(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists payment_qr_delete on storage.objects;
create policy payment_qr_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'payment-qr'
    and public.can_manage_payment_qr(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );
