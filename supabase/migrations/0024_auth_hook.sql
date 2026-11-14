-- Account creation is invite-gated. The owner-only invite-adult Edge Function
-- provisions auth users with the service role; client sign-up is disabled in
-- supabase/config.toml. Remove the earlier pre-created-user hook.

drop function if exists public.before_user_created_hook(jsonb);
