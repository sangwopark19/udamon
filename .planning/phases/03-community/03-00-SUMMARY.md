---
phase: 03-community
plan: 00
subsystem: database

tags: [supabase, postgres, pg_cron, rls, migration, trigger]

requires:
  - phase: 01-database
    provides: community_* tables, triggers, CHECK constraints, base RLS
  - phase: 02-users
    provides: public.users table, on_auth_user_created trigger, handle_new_user()

provides:
  - consolidated Phase 3 migration 024_community_phase3.sql (FK repoint + pg_cron + RPCs + anon RLS)
  - idempotent SQL smoke test supabase/tests/phase3-smoke.sql covering 11 invariants
  - fix migration 025_fix_like_count_trigger.sql repairing pre-existing update_like_count() bug
  - increment_post_view(UUID) RPC callable by authenticated/anon
  - update_trending_posts() function flipping is_trending on top 5 posts within 24h (cron-only)
  - pg_cron job update-trending-posts at */10 * * * *
  - 6 anon SELECT policies on community_posts, community_comments, community_polls, community_poll_options, community_poll_votes, players

affects: [03-01 (communityApi), 03-02 (CommunityContext), 03-03 (read screens), 03-04 (write screen)]

tech-stack:
  added: [pg_cron extension]
  patterns:
    - "idempotent migrations via DROP POLICY IF EXISTS / DROP CONSTRAINT IF EXISTS / CREATE OR REPLACE"
    - "pre-flight orphan checks that RAISE EXCEPTION before destructive ALTER"
    - "TG_TABLE_NAME dispatch for shared trigger functions across sibling tables"

key-files:
  created:
    - supabase/migrations/024_community_phase3.sql
    - supabase/migrations/025_fix_like_count_trigger.sql
    - supabase/tests/phase3-smoke.sql
  modified: []

key-decisions:
  - "Single consolidated migration (not split) to keep PostgREST schema reload atomic"
  - "increment_post_view uses SECURITY DEFINER with SET search_path = '' to safely bypass owner-only UPDATE RLS"
  - "update_trending_posts is NOT SECURITY DEFINER and NOT granted to anon/authenticated — cron-only execution by postgres"
  - "D-19: anon policies restored only on community_* + players, NOT on public.users/recent_searches/notifications/etc."
  - "Pre-existing update_like_count() bug (007_photographer.sql clobbered 002_community.sql version) required out-of-scope fix migration 025 using TG_TABLE_NAME dispatch"

patterns-established:
  - "TG_TABLE_NAME dispatch: when a trigger function is shared across sibling tables (community_likes, photo_likes), use TG_TABLE_NAME to route updates to the correct aggregate table rather than relying on target_type"
  - "Pre-flight orphan check: every FK repoint migration MUST RAISE EXCEPTION if orphan rows exist, to fail-fast before destructive ALTER"

requirements-completed:
  - COMM-05
  - COMM-06
  - COMM-07
  - COMM-10
  - COMM-11

duration: ~10min
completed: 2026-04-10
---

# Phase 03 Plan 00: Database Foundation

**Single consolidated migration (024) unblocking Phase 3 — FK repoint to public.users, pg_cron + trending job, view_count RPC, 6 anon SELECT policies — plus emergency fix migration (025) repairing pre-existing update_like_count() bug.**

## Performance

- **Tasks:** 3/3 (Task 3 executed inline by orchestrator via supabase CLI per user request)
- **Files created:** 3 (024 migration, 025 fix migration, phase3-smoke test)

## Accomplishments

- **FK repoint (5 tables):** community_posts, community_comments, community_likes, community_reports, community_poll_votes all now reference `public.users(id)` instead of `auth.users(id)`. PostgREST embedded select `author:users!user_id(...)` now resolves correctly from anon and authenticated clients.
- **pg_cron enabled + trending job:** extension installed, `update-trending-posts` job scheduled at `*/10 * * * *`, verified active on remote.
- **increment_post_view RPC:** `SECURITY DEFINER` one-statement atomic UPDATE by primary key, granted to `authenticated, anon`, safe by construction (T-03-00-03).
- **update_trending_posts function:** plain LANGUAGE plpgsql (NOT SECURITY DEFINER, NOT granted to anon/authenticated). Scored formula `(like*2 + comment*3 + view*0.1) * freshness_boost`, 24h window, `is_blinded = FALSE` guard, `LIMIT 5` cap. Cron-only execution.
- **6 anon SELECT policies restored (D-19):** posts_anon_read (with `is_blinded = FALSE`), comments_anon_read, polls_anon_read, poll_options_anon_read, poll_votes_anon_read, players_anon_read. public.users + sensitive tables (recent_searches, notifications, inquiries, user_restrictions, user_blocks, photographer_applications, site_settings, audit_logs) explicitly NOT granted.
- **Phase3 smoke test:** 363-line idempotent BEGIN...ROLLBACK script exercising orphan pre-check, pg_cron presence, FK direction on 5 tables, auth.users → public.users bootstrap, title/content/images CHECK violations, duplicate like UNIQUE, like_count trigger, self-report block, duplicate report, poll single-vote block, recent_searches trim to 10, increment_post_view atomicity, update_trending_posts ≤ 5 cap.
- **Pre-existing bug discovered & fixed:** update_like_count() had been silently clobbered by 007_photographer.sql to only update photo_posts/photo_comments. 025_fix_like_count_trigger.sql repairs this using TG_TABLE_NAME dispatch so community_likes and photo_likes both work correctly via the shared function.

## Task Commits

1. **Task 1: phase3-smoke.sql** — `d556e07` (test)
2. **Task 2: 024_community_phase3.sql** — `dfff8ea` (feat)
3. **Task 3: supabase db push + 7-step verification** — executed inline via orchestrator (no file output); revealed pre-existing trigger bug → `2858915` (fix) for 025_fix_like_count_trigger.sql

## Files Created/Modified

- `supabase/tests/phase3-smoke.sql` — 363 lines, idempotent BEGIN/ROLLBACK smoke test covering 11 invariants
- `supabase/migrations/024_community_phase3.sql` — 202 lines, 7-part consolidated migration (orphan check → FK repoint → pg_cron → RPCs → cron job → anon RLS → PostgREST reload)
- `supabase/migrations/025_fix_like_count_trigger.sql` — 63 lines, emergency fix for pre-existing update_like_count() bug using TG_TABLE_NAME dispatch

## Task 3 Verification Results (executed inline by orchestrator)

All 7 verification steps passed:

| # | Check | Result |
|---|-------|--------|
| 1 | `supabase db push` migration 024 | ✓ Applied; pre-flight orphan check = 0 for all 5 tables |
| 2 | `SELECT extname FROM pg_extension WHERE extname='pg_cron'` | ✓ 1 row |
| 3 | `SELECT * FROM cron.job WHERE jobname='update-trending-posts'` | ✓ schedule `*/10 * * * *`, active = true |
| 4 | FK repoint (5 tables) via information_schema | ✓ 5 rows, all `public.users` |
| 5 | 6 anon policies via pg_policies | ✓ 6 rows |
| 6 | RPC existence via pg_proc | ✓ 2 rows (increment_post_view, update_trending_posts) |
| 7 | smoke test via `supabase db query --linked --file supabase/tests/phase3-smoke.sql` | ✓ Pass after 025 fix (see Deviations) |

Push prerequisite: remote migration history was out of sync (013–023 existed on DB but not recorded in supabase_migrations). Repaired via `supabase migration repair --status applied 013 014 015 016 017 018 019 020 021 022 023` before pushing 024.

## Deviations from Plan

### Out-of-scope fix: 025_fix_like_count_trigger.sql

**Found during:** Task 3 smoke test Section 5e (like_count trigger assertion)

**Issue:** After inserting one row into `community_likes` in the smoke test, `community_posts.like_count` remained 0 instead of incrementing to 1. Investigation revealed that `002_community.sql` originally defined `update_like_count()` to update community_posts/community_comments, but `007_photographer.sql` subsequently `CREATE OR REPLACE FUNCTION update_like_count()` to update photo_posts/photo_comments instead. Because both `community_likes.target_type` and `photo_likes.target_type` use the same literal values ('post', 'comment'), the shared function had no way to dispatch correctly — community likes silently became no-ops for the aggregate counters.

**Why this was out of scope for the plan:** Plan 03-00 must-have T-7 explicitly assumed "Existing triggers (`trg_like_count_insert/delete`, etc.) remain untouched. No DROP of these triggers in this migration." — i.e., the plan trusted the existing trigger behavior. The bug was not caught by 03-RESEARCH.md because the researcher did not cross-reference 002 vs 007 function definitions.

**Fix:** New migration 025_fix_like_count_trigger.sql uses `TG_TABLE_NAME` to dispatch:
- `TG_TABLE_NAME = 'community_likes'` → updates community_posts / community_comments
- `TG_TABLE_NAME = 'photo_likes'` → updates photo_posts / photo_comments

Both triggers continue to share the function, but the function now correctly identifies which aggregate table to update.

**Verification:** After applying 025, re-ran `supabase db query --linked --file supabase/tests/phase3-smoke.sql` — all 11 smoke assertions pass without error (rows: [], no ERROR, no RAISE EXCEPTION fired).

**Committed in:** `2858915` (fix commit)

---

**Total deviations:** 1 auto-fixed (pre-existing schema bug discovery)
**Impact on plan:** Critical for Phase 3 completion. Without this fix, community like_count would never increment, making Plans 03-02/03-03/03-04 impossible to verify. Deviation was bounded to one fix migration and did not expand Phase 3 scope beyond community domain.

## Migration History Out-of-Sync Notice

When `supabase db push` was first attempted, it tried to re-apply migrations 013–023 (which already existed on the remote DB but were missing from the `supabase_migrations.schema_migrations` table). Resolved via:

```
supabase migration repair --status applied 013 014 015 016 017 018 019 020 021 022 023
```

This marks those migrations as applied in the history table without re-running their SQL. Verified via `supabase migration list` — all Local rows now match Remote rows up through 025.

## Issues Encountered

1. **Migration history drift (013–023):** documented above. Resolved via `supabase migration repair`.
2. **Smoke test initial failure:** documented above. Resolved via 025 fix migration.

## User Setup Required

None — Supabase project is already linked (project ref: `jfynfapkbpkwyrjulsed`, region: Northeast Asia Seoul).

## Next Phase Readiness

Wave 1 complete:
- Plan 03-01 (communityApi service layer) finished in parallel, 898-line file at `app/src/services/communityApi.ts` with all 21 exported functions and zero typecheck errors (see 03-01-SUMMARY.md).
- Plan 03-00 DB foundation is live on remote Supabase; embedded selects, view_count RPC, trending cron job, and anon policies are all operational.

Wave 2 (Plan 03-02 — CommunityContext rewrite) can proceed immediately. It depends on both 03-00 (live schema) and 03-01 (service layer), both of which are now ready.

---
*Phase: 03-community*
*Completed: 2026-04-10*
