-- Nickname matching by email, then by a tolerant name match.
-- Email is authoritative; names match when the seeded first name and surname both appear
-- anywhere in the candidate name (handles "[redacted-name]hannah", "[redacted-name], Hannah Mae",
-- "Kent M. [redacted-name]", and similar).
alter table public.homepage_nicknames drop column if exists match_email;

create table if not exists public.homepage_nickname_emails (
  match_email text primary key check (char_length(match_email) between 3 and 254),
  nickname text not null check (char_length(nickname) between 1 and 50)
);

alter table public.homepage_nickname_emails enable row level security;

insert into public.homepage_nickname_emails (match_email, nickname) values
  ('[redacted-email]', 'boi ldr'),
  ('[redacted-email]', 'the little prince'),
  ('[redacted-email]', 'tender juicy hotdog'),
  ('[redacted-email]', 'backburner'),
  ('[redacted-email]', 'backburner')
on conflict (match_email) do update
  set nickname = excluded.nickname;

create or replace function public.lookup_homepage_nickname(p_name text, p_email text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_norm text;
  v_nickname text;
begin
  if v_email <> '' then
    select e.nickname
    into v_nickname
    from public.homepage_nickname_emails e
    where e.match_email = v_email;

    if v_nickname is not null then
      return v_nickname;
    end if;
  end if;

  v_norm := regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]', '', 'g');
  if v_norm = '' then
    return null;
  end if;

  select s.nickname
  into v_nickname
  from (
    select
      nickname,
      regexp_replace(
        lower(split_part(btrim(match_name), ' ', 1)),
        '[^a-z0-9]',
        '',
        'g'
      ) as first_token,
      regexp_replace(lower(btrim(match_name)), '[^a-z0-9 ]', '', 'g') as clean_name
    from public.homepage_nicknames
  ) s
  where s.first_token <> ''
    and position(s.first_token in v_norm) > 0
    and position(regexp_replace(s.clean_name, '^.* ', '') in v_norm) > 0
  limit 1;

  return v_nickname;
end;
$$;

revoke all on function public.lookup_homepage_nickname(text, text)
  from public, anon, authenticated;

-- Re-resolve every profile so existing accounts pick up the new rules.
update public.profiles p
set nickname = public.lookup_homepage_nickname(p.display_name, p.email);
