---
phase: 03-community
plan: 03
subsystem: ui

tags: [react-native, expo, i18n, accessibility, rls, android]

requires:
  - phase: 03-community
    provides: Plan 03-00 (DB foundation), Plan 03-01 (communityApi service), Plan 03-02 (CommunityContext Supabase rewrite)

provides:
  - CommunityPostCard deleted-author fallback + a11y_post_card label
  - CommunityMainScreen wired to async context (loadMorePosts, refreshPosts, Skeleton, EmptyState retry, footer spinner)
  - CommunitySearchScreen wired to async searchPosts with isSearching state + a11y dismiss labels
  - CommunityPostDetailScreen wired to incrementPostView RPC, loadCommentsForPost, loadPollForPost, expired poll UI (D-13), retry block (D-17), soft-delete author fallback (D-03)
  - 24 new ko.ts i18n keys for Phase 3 states + error toasts + a11y labels
  - 3 additional i18n keys from deviation fixes (community_post_action_title/_message/_comment_delete_failed)

affects: [03-04 (Write screen — will share Toast/Alert patterns)]

tech-stack:
  added: []
  patterns:
    - "Inline loading/empty/error branches in renderEmpty via renderItem"
    - "useEffect keyed on postId with cancelled flag guard for stale state updates after unmount"
    - "Optimistic counter update pattern: context applies UI change immediately, DB trigger persists, rollback on error"

key-files:
  created: []
  modified:
    - app/src/i18n/locales/ko.ts
    - app/src/components/community/CommunityPostCard.tsx
    - app/src/screens/community/CommunityMainScreen.tsx
    - app/src/screens/community/CommunitySearchScreen.tsx
    - app/src/screens/community/CommunityPostDetailScreen.tsx

key-decisions:
  - "Delta Summary from 03-UI-SPEC.md locked the scope — zero visual redesigns beyond the listed deltas"
  - "incrementPostView called fire-and-forget with console.warn on failure (view_count is best-effort, not critical)"
  - "Expired poll: disable options via TouchableOpacity disabled + accessibilityState, highlight winning option, show 마감 badge"
  - "Post action sheet must have a title and message — empty Alert.alert('', '', buttons) renders as button-only dialog on Android"
  - "Comment soft-delete: flip is_deleted only, never blank content (CHECK constraint forbids empty content)"

patterns-established:
  - "Always provide title + message to Alert.alert — never use empty strings. Empty title + empty message breaks the Android Alert layout and creates confusing button-only UI."
  - "Soft delete on tables with length CHECK constraints: flip the status flag only, leave content untouched. The UI renders placeholder text based on the flag, not the absence of content."
  - "Trigger-dependent counters (like_count, comment_count) require SECURITY DEFINER on the trigger function when RLS restricts UPDATE by owner. The RLS blocks cross-user INSERTs from firing UPDATEs on the target table."

requirements-completed:
  - COMM-02
  - COMM-04
  - COMM-05
  - COMM-09
  - COMM-10
  - COMM-11
  - COMM-12

duration: ~30min (execution) + ~60min (QA + cross-wave bug fixes)
completed: 2026-04-10
---

# Phase 03 Plan 03: Read-Side Screens Wiring

**5 files modified to connect community list/search/detail screens to Plan 02's async CommunityContext — 24 i18n keys, D-03 deleted-author fallback, D-11 RPC view increment, D-13 expired poll UI, D-17 Skeleton/EmptyState/retry, D-20 guest mode verified end-to-end.**

## Performance

- **Tasks:** 4/4 (3 auto + 1 human-verify checkpoint)
- **Files modified:** 5 (plus 3 cross-wave bug-fix files added during QA)

## Accomplishments

### Task 1 — i18n + CommunityPostCard (commit `71221a5`)

- Added 24 new keys to `ko.ts`: `deleted_user`, 9 error/state strings (load, pagination, upload, self-report, vote, etc.), 6 a11y labels.
- `CommunityPostCard.tsx`: renders `t('deleted_user')` when `post.user.is_deleted === true || !post.user.nickname` (D-03 + D-19 anon fallback). Added `accessibilityLabel={t('a11y_post_card', { title, author, likes, comments })}`.

### Task 2 — CommunityMainScreen + CommunitySearchScreen (commit `5325ed7`)

- **CommunityMainScreen**: removed local `page`/`ready` state (context owns pagination). Filter-sync useEffect drives `getFilteredPosts(teamId, sort, 0)`. `FlatList.onEndReached` guards `hasMore && !isLoadingMore` before calling `loadMorePosts()`. `ListFooterComponent` renders `ActivityIndicator` with `t('community_pagination_loading')`. `renderEmpty` has three branches: Skeleton during `isLoading`, `EmptyState` with retry when `error && posts.length === 0`, default empty text otherwise.
- **CommunitySearchScreen**: new `isSearching` + `searchError` local state. `handleSearch`/`handleRecentSearch` wrap awaits in try/catch, toggle `isSearching`. `X` dismiss button on recent-search row has `accessibilityLabel={t('a11y_dismiss_recent_search')}`. `ActivityIndicator` shown centered while searching. `EmptyState` retry on search error.

### Task 3 — CommunityPostDetailScreen (commit `03c6682`)

- `useEffect` keyed on `postId` fires:
  - `incrementPostView(postId)` (D-11, fire-and-forget with `console.warn` on RPC failure)
  - `loadCommentsForPost(postId)` (D-04)
  - `loadPollForPost(postId)` when `post.has_poll` (D-12)
- `cancelled` flag guards against stale state updates after unmount.
- Loading states: `!post && !initialLoadDone` → `ActivityIndicator`; `!post && initialLoadDone` → retry block with `community_post_load_error` + `a11y_retry_load` button.
- **Expired poll (D-13)**: `pollExpired = !isPollActive(poll)`, `winningOptionId` via reduce, options get `disabled={pollExpired || showResults}`, `accessibilityState={{ disabled: pollExpired }}`, `a11y_poll_option_disabled` label, winner highlighted with `pollOptionVoted` style.
- **Soft-delete author fallback (D-03)**: `displayAuthor = t('deleted_user')` when `is_deleted || !nickname`. Block-user tap disabled for deleted ghosts. CommentItem renders `commentDisplayAuthor` fallback (but soft-deleted comment content placeholder wins over author-deleted).
- Async handlers with proper error toasts: `handleSubmitComment`, `handleDeletePost`, `handleDeleteComment`, `handleReportPost`, `handleLikePost`/`handleLikeComment`/`handleVote` (void-prefixed for fire-and-forget).
- `handleVote` adds `requireLogin()` gate (D-20).

### Task 4 — Human verification QA (approved 2026-04-10)

Executed 6-part QA matrix (A: main list, B: post detail, C: search, D: guest mode, E: deleted user UI, F: accessibility) against live Android simulator. Initial run revealed 6 bugs, all fixed via cross-wave hotfixes (see Deviations). After fixes, all A-E tests pass. F (screen reader) deferred per user decision.

**Final QA matrix result:**

| Test | Result |
|------|--------|
| A.1-A.6 (list, sort, filter, pagination, error, retry) | ✓ |
| B.3c (active poll vote) | ✓ |
| B.4a (like persistence) | ✓ (after migration 026) |
| B.4b (optimistic rollback on airplane mode) | ✓ |
| B.5 (comment create + comment_count) | ✓ (after migration 026) |
| B.6 (comment soft-delete) | ✓ (after commit 38b75c9 + migration 027) |
| B.7 (post delete UI) | ✓ (after commit 7124a3b) |
| B.8 (report menu visibility) | ✓ (after commit 7124a3b) |
| B.9 (duplicate report UI) | ✓ (after commit 7124a3b) |
| C.3-C.5 (recent searches: load, tap, remove, clear) | ✓ |
| D.1-D.4 (guest browse, write FAB gate, poll vote gate) | ✓ |
| E.1 (탈퇴한 사용자 post render) | ✓ |
| E.2 (탈퇴한 사용자 comment render) | ✓ |
| F (screen reader) | deferred (user will test later) |

## Task Commits

1. **Task 1: i18n + CommunityPostCard** — `71221a5` (feat)
2. **Task 2: Main + Search screens** — `5325ed7` (feat)
3. **Task 3: Detail screen** — `03c6682` (feat)
4. **Task 4: QA checkpoint** — approved inline (no commit; cross-wave bug-fix commits below)

**Worktree merge:** `74754da` (chore)

**QA deviation fixes (cross-wave):**
- `f1d1f0a` (fix/03-00): migration 026 — SECURITY DEFINER on update_like_count + update_post_comment_count, comment_count dispatch fix, backfill
- `7124a3b` (fix/03-03): handlePostAction empty Alert, comment delete error toast, migration 027 (comment soft-delete trigger)
- `38b75c9` (fix/03-01): remove content='' from deleteCommunityComment (CHECK constraint violation)

## Files Modified

- `app/src/i18n/locales/ko.ts` — 27 new keys (24 from plan + 3 from QA deviations)
- `app/src/components/community/CommunityPostCard.tsx` — deleted-user fallback + a11y label
- `app/src/screens/community/CommunityMainScreen.tsx` — async loadMorePosts, Skeleton, EmptyState retry, footer spinner
- `app/src/screens/community/CommunitySearchScreen.tsx` — async searchPosts, isSearching, dismiss a11y
- `app/src/screens/community/CommunityPostDetailScreen.tsx` — view RPC, comment loader, poll loader, expired poll UI, retry block, soft-delete fallback, error toasts

## Deviations from Plan

### QA hotfixes (3 cross-wave bugs discovered during human verification)

The QA matrix uncovered 3 bugs that did not originate in this plan but blocked multiple test cases. All fixed with root-cause patches rather than workarounds.

**1. [Rule 3 — Blocking] SECURITY DEFINER missing on count triggers (migration 026)**
- **Found during:** Task 4 B.4a and B.5 QA
- **Issue:** `update_like_count()` and `update_post_comment_count()` were clobbered by `007_photographer.sql` to update only photo_posts/photo_comments (missing TG_TABLE_NAME dispatch), AND were missing `SECURITY DEFINER`. The latter caused the trigger's internal `UPDATE community_posts SET like_count = ...` to run under the caller's role, where `posts_update_own` RLS (`auth.uid() = user_id`) blocked updates to other users' posts. INSERT succeeded, trigger fired, counter UPDATE silently failed.
- **Fix:** Add `SECURITY DEFINER + SET search_path = ''` + `TG_TABLE_NAME` dispatch. Backfill existing orphan rows by recounting from child tables.
- **Files:** `supabase/migrations/026_fix_count_triggers_security.sql`
- **Committed in:** `f1d1f0a`

**2. [Rule 3 — Blocking] Comment soft-delete violates content CHECK constraint (commit 38b75c9)**
- **Found during:** Task 4 B.6 QA (after adding error toast)
- **Issue:** `deleteCommunityComment` performed soft delete with `.update({ is_deleted: true, content: '' })`. `community_comments.content` has `CHECK (char_length(content) >= 1)` from 002_community.sql, so the UPDATE failed with SQLSTATE 23514. Without the error toast added in commit 7124a3b this was a silent failure (user saw no UI change).
- **Fix:** Remove `content: ''` from the update — flip `is_deleted` only. UI renders `'삭제된 댓글입니다'` placeholder based on `is_deleted` flag alone, so clearing content was never necessary.
- **Files:** `app/src/services/communityApi.ts`
- **Committed in:** `38b75c9`

**3. [Rule 2 — Missing Critical] Post action sheet empty Alert (commit 7124a3b)**
- **Found during:** Task 4 B.7/B.8/B.9 QA
- **Issue:** `handlePostAction` called `Alert.alert('', '', buttons)`. On Android this renders a compact button-only dialog with no title or body text, which users couldn't interpret (reported as "text not visible" and "report menu not visible").
- **Fix:** Pass proper title `community_post_action_title` ("게시글") and message `community_post_action_message` ("이 게시글에 대한 작업을 선택하세요") to Alert.alert. Also added error toast to `handleDeleteComment` to surface silent failures.
- **Files:** `app/src/screens/community/CommunityPostDetailScreen.tsx`, `app/src/i18n/locales/ko.ts`, `supabase/migrations/027_comment_soft_delete_trigger.sql` (added while fixing — soft delete UPDATE trigger for comment_count decrement)
- **Committed in:** `7124a3b`

---

**Total deviations:** 3 auto-fixed (1 blocking RLS+dispatch, 1 blocking CHECK violation, 1 missing critical UX)
**Impact on plan:** Net positive. All 3 fixes are root-cause corrections, not workarounds. Post-fix, the read-side community flow is fully functional end-to-end on a live Android simulator with a real Supabase backend.

## Issues Encountered

1. **Migration history drift (013-023)** — resolved during 03-00 Task 3 via `supabase migration repair`. Documented in 03-00-SUMMARY.
2. **update_like_count trigger bug** — root cause analysis during Plan 03-00 smoke test revealed 007_photographer.sql clobbered the 002_community.sql version. Fixed via migrations 025 + 026.
3. **Next.js validation hook false positives** — the project's posttooluse-validate hook flagged React Native screen files with Next.js App Router recommendations ("use client" directive, async params). These were ignored — this is an Expo project, not Next.js.

## User Setup Required

None.

## Next Phase Readiness

**Wave 3 complete.** All read-side community screens are wired to the async Supabase-backed context. The trigger + RLS stack is proven correct under live traffic (one authenticated user creating likes/comments on another user's post).

**Wave 4 (Plan 03-04 — Write screen) can proceed immediately.** It will:
- Implement D-09 R2-first upload flow in CommunityWriteScreen
- Implement D-18 Alert-retain-form error behavior
- Delete `app/src/data/mockCommunity.ts` after confirming no imports remain

Because the soft-delete content fix (38b75c9) was applied to communityApi.ts, Plan 04 should NOT reference `content: ''` anywhere in its write flow either.

---
*Phase: 03-community*
*Completed: 2026-04-10*
