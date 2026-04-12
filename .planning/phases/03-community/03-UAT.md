---
status: testing
phase: 03-community
source: [03-00-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md]
started: 2026-04-12T10:00:00Z
updated: 2026-04-12T10:15:00Z
---

## Current Test

number: 13
name: Guest Mode Browsing
expected: |
  로그아웃하거나 로그인하지 않은 상태로 앱을 사용하세요. 커뮤니티 피드가 로드됩니다 (anon RLS로 읽기 허용). 글쓰기 FAB이나 좋아요 버튼을 탭하면 로그인 게이트 프롬프트가 표시되어야 합니다.
awaiting: blocked - logout button not responding

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running Expo dev server. Run `npx expo start --clear` from the app/ directory. Metro bundler boots without errors, the app loads on the simulator/device, and the community tab shows live posts from Supabase (not mock data).
result: pass

### 2. Community Feed Loading & Pagination
expected: Open the community tab. Posts load from Supabase (real data, not mocks). Scroll to the bottom of the list — additional posts load automatically (infinite scroll). A loading spinner appears at the bottom while loading more.
result: pass

### 3. Team Filtering & Sort Order
expected: Tap a team filter chip at the top of the community feed. The post list updates to show only that team's posts. Switch sort order (latest/popular) — the list re-sorts accordingly.
result: pass

### 4. Trending Posts Section
expected: The community main screen shows a trending section with posts marked as trending by the server (is_trending flag, updated every 10 minutes by pg_cron).
result: pass

### 5. Post Detail & View Count
expected: Tap a post to open the detail screen. The post content, author info, and comments load. The view_count increments on the server (fire-and-forget RPC call).
result: pass

### 6. Like a Post (Optimistic UI)
expected: Tap the like button on a post. The like count updates immediately (optimistic). Navigate away and back — the like persists. Double-tap rapidly — no duplicate likes or errors.
result: pass

### 7. Create a Comment
expected: On the post detail screen, type a comment and submit. The comment appears in the list with your author info. The post's comment_count increments.
result: pass

### 8. Delete Own Comment (Soft Delete)
expected: On a comment you authored, tap delete. The comment text is replaced with a placeholder like "deleted comment" message. If the comment has replies, they remain visible under it.
result: pass

### 9. Community Search
expected: Open the search screen. Type a keyword and search. Matching posts appear in the results. The search query is saved to recent searches. Tap the X on a recent search to remove it. Tap "clear all" to remove all recent searches.
result: pass

### 10. Create a Post with Images (R2 Upload)
expected: Tap the write FAB. Fill in title, content, and attach 1+ images. Submit. An uploading overlay shows progress (1/N, 2/N...). After upload completes, the new post appears in the community feed with the images visible.
result: pass

### 11. Poll Vote
expected: Open a post that has a poll. Tap an option to vote. The results update showing vote counts/percentages. You cannot vote again on the same poll.
result: pass

### 12. Report a Post/Comment
expected: On someone else's post or comment, open the action menu and tap Report. Select a reason and submit. A success toast appears ("신고가 접수되었습니다" or similar). Reporting your own content shows a self-report blocked message.
result: pass

### 13. Guest Mode Browsing
expected: Log out or use the app without signing in. The community feed loads (anon RLS allows reading). Tapping the write FAB or like button triggers a login gate prompt instead of performing the action.
result: blocked
blocked_by: other
reason: "로그아웃 버튼을 눌러도 아무 반응이 없어서 게스트 모드 테스트 불가"

## Summary

total: 13
passed: 12
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

[none yet]
