-- Before 0018, members could write total_mode/total_centavos. A non-auto total
-- on a draft/private draft has no legitimate owner path, so reset it to the item
-- sum before the hardened finalize path can trust it. Reopened outings retain
-- their owner-managed fixed total.

update public.outings
set total_mode = 'auto',
    total_centavos = 0,
    version = version + 1
where (
  status in ('draft', 'private_draft')
  and total_mode <> 'auto'
)
or (
  status = 'reopened'
  and total_mode = 'manual'
);
