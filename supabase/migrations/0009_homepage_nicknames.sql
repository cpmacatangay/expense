-- Homepage-only nicknames. Money, rosters, shares, and exports keep the exact display name.
alter table public.profiles add column if not exists nickname text;

do $$ begin
  alter table public.profiles
    add constraint profiles_nickname_length
    check (nickname is null or char_length(nickname) between 1 and 50);
exception when duplicate_object then null; end $$;

create table if not exists public.homepage_nicknames (
  match_name text primary key,
  match_email text unique,
  nickname text not null check (char_length(nickname) between 1 and 50)
);

alter table public.homepage_nicknames enable row level security;

insert into public.homepage_nicknames (match_name, match_email, nickname) values
  ('[redacted-name]', '[redacted-email]', 'boi ldr'),
  ('[redacted-name]', null, 'the little prince'),
  ('[redacted-name]', null, 'tender juicy hotdog'),
  ('[redacted-name]', null, 'backburner')
on conflict (match_name) do update
  set match_email = excluded.match_email,
      nickname = excluded.nickname;

create or replace function public.lookup_homepage_nickname(p_name text, p_email text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nickname
  from public.homepage_nicknames
  where (p_name is not null and lower(match_name) = lower(btrim(p_name)))
     or (
       p_email is not null
       and match_email is not null
       and lower(match_email) = lower(btrim(p_email))
     )
  limit 1;
$$;

revoke all on function public.lookup_homepage_nickname(text, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display text;
  v_nickname text;
begin
  v_display := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Member'
  );
  v_nickname := public.lookup_homepage_nickname(v_display, new.email);

  insert into public.profiles (id, email, display_name, nickname)
  values (new.id, coalesce(new.email, ''), v_display, v_nickname)
  on conflict (id) do update
    set email = excluded.email,
        nickname = coalesce(excluded.nickname, public.profiles.nickname);

  return new;
end;
$$;

create or replace function public.ensure_profile(display_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_email text;
  v_display text;
  v_nickname text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select u.email,
         coalesce(
           nullif(btrim(display_name), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
           nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
           nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
           'Member'
         )
  into v_email, v_display
  from auth.users u
  where u.id = auth.uid();

  v_nickname := public.lookup_homepage_nickname(v_display, v_email);

  insert into public.profiles (id, email, display_name, nickname)
  values (auth.uid(), coalesce(v_email, ''), v_display, v_nickname)
  on conflict (id) do update
    set email = excluded.email,
        nickname = coalesce(excluded.nickname, public.profiles.nickname),
        display_name = case
          when public.profiles.display_name = split_part(public.profiles.email, '@', 1)
            or public.profiles.display_name = 'Member'
          then excluded.display_name
          else public.profiles.display_name
        end
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.ensure_profile(text) from public;
grant execute on function public.ensure_profile(text) to authenticated;

create or replace function public.sync_active_adult_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.display_name is distinct from old.display_name then
    update public.group_adults
    set display_name = new.display_name
    where profile_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_adult_name on public.profiles;
create trigger profiles_sync_adult_name
  after update of display_name on public.profiles
  for each row execute function public.sync_active_adult_display_name();

-- Backfill exact names from Google metadata where the profile still holds an email local part.
update public.profiles p
set display_name = coalesce(
  nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
  p.display_name
)
from auth.users u
where p.id = u.id
  and (
    p.display_name = split_part(p.email, '@', 1)
    or p.display_name = 'Member'
  )
  and coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), '')
  ) is not null;

update public.profiles p
set nickname = public.lookup_homepage_nickname(p.display_name, p.email)
where p.nickname is null;
