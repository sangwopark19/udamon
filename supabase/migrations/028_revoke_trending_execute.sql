-- ┌──────────────────────────────────────────────────────────────┐
-- │ Migration 028: Revoke EXECUTE on public.update_trending_posts() │
-- └──────────────────────────────────────────────────────────────┘
--
-- Quick task: 260412-241 (PR #3 code review issue #4)
-- Threat ref: T-03-00-04 (documented in .planning/phases/03-community/03-00-PLAN.md)
--
-- Migration 024 created public.update_trending_posts() with the inline claim
-- that EXECUTE was "not granted to authenticated/anon". However, PostgreSQL
-- defaults `GRANT EXECUTE ... TO PUBLIC` on all newly created functions, and
-- PUBLIC includes both `authenticated` and `anon` roles. Without SECURITY
-- DEFINER, the function runs as the calling role — so an authenticated user
-- could invoke it via PostgREST `rpc('update_trending_posts')` and, bounded
-- by the `posts_update_own` RLS policy, self-promote their own posts to
-- `is_trending = TRUE` (and race the FALSE-reset step against legitimate
-- pg_cron runs).
--
-- This migration SQL-enforces the documented mitigation by revoking EXECUTE
-- from PUBLIC and the two PostgREST-callable roles. pg_cron runs under the
-- `postgres` superuser role which retains EXECUTE regardless.
--
-- Idempotent: REVOKE on an already-revoked grant is a no-op in PostgreSQL.

REVOKE EXECUTE ON FUNCTION public.update_trending_posts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_trending_posts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_trending_posts() FROM anon;

-- Reload PostgREST schema cache so the RPC endpoint reflects the revoked
-- permission immediately (prevents stale 200-OK responses until next reload).
NOTIFY pgrst, 'reload schema';
