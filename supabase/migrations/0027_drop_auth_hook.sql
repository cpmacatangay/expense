-- The client-marker auth hook was replaced by invite-only provisioning and
-- client sign-up disabled in supabase/config.toml. Drop the hook function so a
-- hosted configuration that still references it fails closed rather than
-- trusting client metadata.

drop function if exists public.before_user_created_hook(jsonb);
