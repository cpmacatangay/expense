-- Release-time wipe of the legacy group/table ledger.
-- Keeps auth.users, profiles, the new participant tables, and the private bucket.
-- Run only after a verified production backup and explicit sign-off.

-- Old payment QR functions have the same names as the new ones; drop only the
-- legacy signatures.
drop function if exists public.set_payment_qr(uuid, text, text) cascade;
drop function if exists public.clear_payment_qr(uuid) cascade;
drop function if exists public.prune_ledger_snapshots(integer) cascade;

-- This retained-table policy depends on a legacy helper.
drop policy if exists profiles_select_self_or_co_member on public.profiles;

do $$
declare
  r record;
  old_names text[] := array[
    'is_group_member',
    'is_group_owner',
    'is_co_member',
    'enforce_group_adult_capacity',
    'ensure_group_owner_adult',
    'guard_group_adult_direct_update',
    'create_group',
    'create_invitation',
    'join_group_with_code',
    'can_view_outing',
    'can_edit_outing',
    'apply_finalization',
    'bump_outing_version',
    'reopen_outing',
    'record_settlement',
    'decide_settlement',
    'void_settlement',
    'can_manage_payment_qr',
    'invite_pending_adult',
    'revoke_pending_adult_invite',
    'publish_local_draft',
    'publish_private_draft',
    'enforce_outing_insert_defaults',
    'enforce_outing_update_rules',
    'set_outing_total_mode',
    'set_outing_manual_total',
    'log_activity_event',
    'guard_settlement_lifecycle',
    'guard_outing_status',
    'guard_outings_total_mode',
    'check_outing_adult_group',
    'check_outing_student_group',
    'check_item_group',
    'check_outing_payer_group',
    'check_share_adult_active',
    'lookup_homepage_nickname',
    'sync_active_adult_display_name',
    'before_user_created_hook'
  ];
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (old_names)
  loop
    execute format('drop function if exists %s cascade', r.signature);
  end loop;
end;
$$;

-- Legacy tables. Dependants first.
drop table if exists public.ledger_snapshots cascade;
drop table if exists public.settlements cascade;
drop table if exists public.activity_events cascade;
drop table if exists public.shares cascade;
drop table if exists public.items cascade;
drop table if exists public.outing_students cascade;
drop table if exists public.outing_adults cascade;
drop table if exists public.outings cascade;
drop table if exists public.students cascade;
drop table if exists public.invitations cascade;
drop table if exists public.invite_attempts cascade;
drop table if exists public.homepage_nickname_emails cascade;
drop table if exists public.homepage_nicknames cascade;
drop table if exists public.group_adults cascade;
drop table if exists public.groups cascade;

-- Legacy enums.
drop type if exists public.settlement_status cascade;
drop type if exists public.assignment_type cascade;
drop type if exists public.total_mode cascade;
drop type if exists public.outing_status cascade;
drop type if exists public.student_status cascade;
drop type if exists public.adult_status cascade;
drop type if exists public.group_status cascade;

-- Restore a self-only profile read policy after removing the co-member policy.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid());
