-- Remove seeded personal identifiers. The nickname lookup remains available for
-- explicitly managed data, but no real addresses or names are shipped.

delete from public.homepage_nickname_emails;
delete from public.homepage_nicknames;
