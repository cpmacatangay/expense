-- Before 0018, members could write total_mode/total_centavos on draft, private,
-- and reopened outings. Reset every non-auto total before finalization; an owner
-- can re-establish an exceptional total after reopen through the owner-only RPC.

update public.outings
set total_mode = 'auto',
    total_centavos = 0,
    version = version + 1
where status in ('draft', 'private_draft', 'reopened')
  and total_mode <> 'auto';
