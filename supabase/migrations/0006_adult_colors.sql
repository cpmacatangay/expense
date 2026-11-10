-- Use the light Salo palette for adult identities and assign colors on invite.
alter table public.group_adults alter column color set default '#d9efe2';

with numbered as (
  select id, row_number() over (partition by group_id order by created_at) - 1 as idx
  from public.group_adults
  where color = '#1F5C45'
)
update public.group_adults ga
set color = (array['#d9efe2', '#f0e4d0', '#dde7ef', '#f2ded6'])[(n.idx % 4) + 1]
from numbered n
where ga.id = n.id;

create or replace function public.create_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(group_name);
  v_group_id uuid;
  v_display_name text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Group name must be 2-60 characters';
  end if;
  if exists (select 1 from public.groups where owner_id = auth.uid() and status <> 'deleted') then
    raise exception 'You already own a group';
  end if;
  select display_name into v_display_name from public.profiles where id = auth.uid();
  if v_display_name is null then raise exception 'Profile not found'; end if;
  insert into public.groups (name, owner_id) values (v_name, auth.uid()) returning id into v_group_id;
  insert into public.group_adults (group_id, profile_id, display_name, status, color, joined_at)
  values (v_group_id, auth.uid(), v_display_name, 'active', '#d9efe2', now());
  return v_group_id;
end;
$$;

create or replace function public.create_invitation(adult_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := btrim(adult_display_name);
  v_group_id uuid;
  v_adult_id uuid;
  v_code text;
  v_token text;
  v_color text;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(v_name) < 1 or char_length(v_name) > 50 then
    raise exception 'Adult name must be 1-50 characters';
  end if;
  select id into v_group_id from public.groups
  where owner_id = auth.uid() and status = 'active' limit 1;
  if v_group_id is null then raise exception 'Only the group owner can invite adults'; end if;

  select (array['#d9efe2', '#f0e4d0', '#dde7ef', '#f2ded6'])[(count(*) % 4) + 1]
  into v_color
  from public.group_adults
  where group_id = v_group_id;

  insert into public.group_adults (group_id, display_name, status, color)
  values (v_group_id, v_name, 'pending', v_color)
  returning id into v_adult_id;

  v_code := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invitations (group_id, adult_id, token_hash, code_hash, created_by, expires_at)
  values (
    v_group_id, v_adult_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    encode(digest(v_code, 'sha256'), 'hex'),
    auth.uid(), v_expires_at
  );

  return jsonb_build_object('adult_id', v_adult_id, 'code', v_code, 'token', v_token, 'expires_at', v_expires_at);
end;
$$;
