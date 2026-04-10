---
phase: 3
slug: community
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (project has no Jest/Vitest) — TypeScript `strict: true` + Supabase SQL smoke tests + manual QA matrix |
| **Config file** | `app/tsconfig.json` (strict TypeScript); Wave 0 creates `supabase/tests/phase3-smoke.sql` |
| **Quick run command** | `cd app && npx tsc --noEmit` |
| **Full suite command** | `cd app && npx tsc --noEmit && psql -f supabase/tests/phase3-smoke.sql` (against local Supabase) |
| **Estimated runtime** | ~10 seconds (typecheck) + ~30 seconds (SQL smoke) + manual QA matrix |

**Rationale:** Phase 3 is a brownfield migration in a project without a JS test framework. Bootstrapping Jest/Vitest here adds scope without proportional value. Instead, strict TypeScript catches mapping/type contract errors, SQL smoke tests verify DB-level invariants (triggers, RLS, constraints), and a manual QA checklist covers E2E user flows. If a test framework lands in a later phase, these cases are portable.

---

## Sampling Rate

- **After every task commit:** Run `cd app && npx tsc --noEmit` — sub-10-second check
- **After every plan wave:** Run `cd app && npx tsc --noEmit && psql -f supabase/tests/phase3-smoke.sql`
- **Before `/gsd-verify-work`:** Full suite green + full manual QA matrix green
- **Max feedback latency:** 60 seconds (typecheck + SQL)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-00-01 | 00 | 0 | Wave 0 setup | — | N/A | infra | `test -f supabase/tests/phase3-smoke.sql && echo OK` | ❌ W0 | ⬜ pending |
| 3-00-02 | 00 | 0 | COMM-01 pre-req | — | FK repoint zero-orphan check | integration (SQL) | `psql -c "SELECT COUNT(*) FROM community_posts WHERE user_id NOT IN (SELECT id FROM public.users);"` expects 0 | ❌ W0 | ⬜ pending |
| 3-01-xx | 01 | 1 | COMM-01~12 infra | T-03-* | RLS + pg_cron + FK + anon policies + RPC | integration (SQL) | `psql -f supabase/tests/phase3-smoke.sql` | ❌ W0 | ⬜ pending |
| 3-02-xx | 02 | 2 | COMM-01 | T-03-01 | ApiResult<T> contract | unit (compile) | `cd app && npx tsc --noEmit` | ✅ | ⬜ pending |
| 3-03-xx | 03 | 3 | COMM-02, 03, 04, 05, 11 | T-03-02 | CommunityContext uses Supabase, no mocks | unit (compile + grep) | `cd app && npx tsc --noEmit && ! grep -r "mockCommunity\|MOCK_POSTS\|MOCK_COMMENTS" app/src/contexts/CommunityContext.tsx` | ✅ | ⬜ pending |
| 3-04-xx | 04 | 4 | COMM-08, 09, 10, 12 | T-03-03 | Screen integration + UI states | e2e (manual) | QA matrix checklist | ✅ | ⬜ pending |
| 3-05-xx | 05 | 5 | COMM-01~12 cleanup | — | Mock data removed | unit (compile + grep) | `! test -f app/src/data/mockCommunity.ts` OR `cd app && npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Note:** Detailed task IDs (e.g., `3-01-01`, `3-01-02`) will be finalized when PLAN.md files are generated. The mapping above uses placeholder `xx` to indicate all tasks within a plan share the verification pattern.

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated? | Validation Command / File |
|--------|----------|-----------|-----------|---------------------------|
| COMM-01 | communityApi.ts exists with all functions returning `ApiResult<T>` | unit (compile) | ✅ | `cd app && npx tsc --noEmit` — strict TS fails if shape is wrong |
| COMM-02 | CommunityContext uses real Supabase (no mock imports) | unit (compile + grep) | ✅ | `cd app && npx tsc --noEmit && ! grep -rE "mockCommunity\|MOCK_POSTS\|MOCK_COMMENTS" app/src/contexts/CommunityContext.tsx` |
| COMM-03 | Post CRUD — title/content length enforced by DB CHECK | integration (SQL) | ✅ | `supabase/tests/phase3-smoke.sql` — INSERT with title > 30 chars expects 23514 |
| COMM-04 | Comment tree + soft delete → "삭제된 댓글입니다" | e2e (manual) | ⚠️ manual | QA matrix: write parent → reply → delete parent → verify placeholder renders |
| COMM-05 | Like toggle + idempotency (unique constraint) | integration (SQL) | ✅ | SQL: double-INSERT expects 23505; verify `like_count` increments via trigger |
| COMM-06 | Poll single/multi + expiry block | e2e (manual) + SQL | ⚠️ mixed | SQL: vote twice (single mode) expects exception; QA: create 24h poll, wait, verify disabled UI |
| COMM-07 | Report self-block and dup-block (friendly toasts) | integration (SQL) | ✅ | SQL: INSERT community_reports where reporter = target author → expect P0001; duplicate → expect 23505 |
| COMM-08 | R2 upload + post saves public URLs (max 10) | e2e (manual) | ⚠️ manual | QA: write post with 3 images → verify images array has 3 URLs → verify display in detail |
| COMM-09 | Search finds posts by title/content/player name (ILIKE) | integration (SQL + compile) | ✅ | SQL: seed post, run .or('title.ilike,content.ilike'), expect returned; TS check on search fn signature |
| COMM-10 | Recent searches limited to 10 (trigger enforces) | integration (SQL) | ✅ | SQL: insert 11 rows, expect 10 remaining after `limit_recent_searches` trigger |
| COMM-11 | Trending updated by pg_cron on 10-min schedule | integration (SQL) | ✅ | SQL: `SELECT public.update_trending_posts(); SELECT is_trending FROM community_posts WHERE is_trending = true` — expect ≤ 5 rows |
| COMM-12 | Optimistic like rolls back on error + toast | e2e (manual) | ⚠️ manual | QA: simulate network error, tap like, verify count reverts + toast shown |

---

## Wave 0 Requirements

- [ ] `supabase/tests/phase3-smoke.sql` — consolidated SQL smoke test script covering constraint violations, trigger firings, RLS outcomes. Idempotent, commit-able.
- [ ] Seed data fixtures — 2-3 test users, 5-10 posts, some comments, one active poll. Embedded in the smoke script with cleanup at the end.
- [ ] **FK repoint dry-run** — pre-migration SELECT that confirms zero orphans between `community_posts.user_id` and `public.users.id` (also for community_comments, community_likes, community_reports, community_poll_votes).
- [ ] **pg_cron verification query** — `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-trending-posts') ORDER BY start_time DESC LIMIT 3;` used by validator after first 10-min window.
- [ ] Migration `024_community_phase3.sql` — FK repoint + pg_cron enable + RPC `increment_post_view` + RPC `update_trending_posts` + anon RLS (D-19) + helper indexes. Idempotent.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Comment tree + soft delete UI | COMM-04 | Requires rendering "삭제된 댓글입니다" placeholder — no React DOM snapshot infra | Write parent comment, reply, delete parent → verify CommentItem renders placeholder while children remain |
| Poll single/multi/expired UI | COMM-06 | State transitions across time + UI disable logic | Create 3 polls (single/multi/24h); vote; wait for expiry; verify disabled + results shown |
| R2 upload visual confirmation | COMM-08 | Image pipeline from picker → R2 → display | Pick 3 images → submit → open post detail → verify horizontal image scroll + actual images loaded |
| Optimistic like rollback | COMM-12 | Requires simulated network error | Enable airplane mode, tap heart, verify count reverts + toast "좋아요 실패" |
| Guest mode content visibility | D-19 interaction | Requires logged-out client + RLS verification on real device | Log out, open community list, verify posts show with empty/fallback author; tap write → login gate shown |
| Block user refresh flow | D-15 | Cross-context trigger (BlockContext → CommunityContext refresh) | Block user, return to community list, verify their posts disappear within 1 refresh |
| Trending tab freshness | COMM-11 | Requires 10-minute pg_cron window | After creating active posts, wait 10 min, open trending tab, verify top 5 reflect activity |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies documented
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (TypeScript gate on every task)
- [ ] Wave 0 covers all MISSING references (smoke SQL, FK dry-run, seed data)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter (after Wave 0 complete)

**Approval:** pending
