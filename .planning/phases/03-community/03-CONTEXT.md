# Phase 3: Community - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

사용자가 구단별 게시판에서 게시글 작성, 댓글, 좋아요, 투표, 검색을 실제 DB 데이터로 이용할 수 있는 상태. Phase 2에서 구축한 `public.users` 프로필 + `AuthContext` + `BlockContext` + R2 presigned 업로드 인프라를 기반으로, `CommunityContext`를 mock 데이터에서 Supabase로 완전 전환하는 브라운필드 마이그레이션.

**포함:** `communityApi.ts` 서비스 레이어 생성, CommunityContext 전환 (posts/comments/likes/polls/reports/search/recent searches), 이미지 업로드 (R2 `community-posts` prefix), ILIKE 기반 검색, DB 기반 트렌딩 (pg_cron), optimistic 좋아요, 탈퇴/차단 사용자 UX.

**미포함:** 어드민 수동 신고 처리 워크플로우(Phase 5), 푸시 알림(Phase 6), 어드민 블라인드 UI(Phase 5), Supabase Realtime(v1 Out of Scope).

</domain>

<decisions>
## Implementation Decisions

### 서비스 레이어 & 조인 전략

- **D-01:** `app/src/services/communityApi.ts` 신규 생성. `photographerApi.ts`와 동일한 패턴 유지 — `ApiResult<T>` 반환, `ensureSlugMaps()` 재사용 (현재 photographerApi 내부 정의 그대로 사용하거나 `services/_shared/` 로 추출 선택은 planner 재량), `mapRow*` 함수로 DB row → app type 변환, `try/catch` + `e instanceof Error` 에러 내로잉.
- **D-02:** **Author 조인은 명시적 FK + PostgREST embedded select.** `community_posts.user_id` 에 `public.users` FK를 명시하는 마이그레이션 추가 후 `supabase.from('community_posts').select('*, author:users!user_id(nickname, avatar_url, is_deleted)')` 패턴. 1 query로 posts + author + team 동시 조회. `community_comments.user_id` 도 동일 처리.
- **D-03:** **탈퇴한 사용자(`author.is_deleted = true`) 표시는 클라이언트 렌더링 레이어에서만 처리.** `mapCommunityPost` / `mapCommunityComment` 는 원본 author 그대로 반환, `CommunityPostCard` / `CommentItem` 에서 `is_deleted` 체크 후 nickname을 `t('deleted_user')` 로, avatar는 기본 아바타로 교체. DB 데이터는 변형하지 않음.
- **D-04:** **댓글 트리는 게시글 상세 진입 시 전체 fetch.** `fetchCommentsByPostId(postId)` 가 모든 댓글 + 대댓글 한 번에 로드 (1-depth 대댓글 전제이고 게시글당 댓글 수가 적어 페이지네이션 불필요), 클라이언트에서 `parent_comment_id` 로 tree 빌드.

### 페이지네이션 · 트렌딩 · 검색

- **D-05:** **Pagination은 Supabase `.range(from, to)` 기반.** 20개씩 로드 (`PAGE_SIZE = 20`, 기존 CommunityContext 상수 유지). FlatList `onEndReached` 에서 다음 range 호출. `getFilteredPosts(teamId, sort, page)` 는 서버 fetch 결과를 누적(concat) 하여 state에 유지.
- **D-06:** **트렌딩은 DB Scheduled Function(pg_cron) 으로 계산.** `update_trending_posts()` Postgres 함수 + `pg_cron` 10분 주기 job: 24시간 윈도우 내 `like_count * 2 + comment_count * 3` 스코어 상위 5개만 `is_trending = TRUE` 설정, 나머지 FALSE. 클라이언트는 `.eq('is_trending', true)` 로만 조회. 기존 CommunityContext 클라이언트 스코어링(`getTrendingScore`, `TRENDING_WINDOW_MS` 등)은 제거.
- **D-07:** **검색은 ILIKE 기반 단순 검색.** `searchCommunityPosts(query)` 는 두 쿼리 실행 후 클라이언트에서 병합: ① `community_posts.select().or('title.ilike.%q%,content.ilike.%q%')` ② `players.select('team_id').ilike('name_ko', '%q%')` → 해당 팀 posts fetch. v1 초기 사용자 수로는 full-text 없이 충분. Postgres `tsvector` / `pg_trgm` 은 v2.
- **D-08:** **최근 검색어는 DB `recent_searches` 테이블 사용.** Phase 1에서 이미 생성된 테이블 + RLS + 10개 제한 트리거(`limit_recent_searches`) 그대로 활용. `search_type = 'community'` 로 구분. `addRecentSearch`, `removeRecentSearch`, `clearRecentSearches` 가 DB CRUD 호출. 클라이언트 메모리 상태는 DB 응답의 캐시.

### Mutations & 이미지 업로드 & Optimistic Update

- **D-09:** **게시글 작성 시 이미지 업로드 순서는 R2 먼저 → posts INSERT.** `CommunityWriteScreen.handleSubmit` 흐름: ① `uploadCommunityImages(userId, localUris, accessToken)` 호출해서 public URL 배열 확보 ② 성공 시 `createPost({ ..., images: publicUrls })` 호출 ③ R2 업로드 또는 INSERT 실패 시 Alert로 재시도 유도. v1에서는 R2 성공 + INSERT 실패 시 고아 파일을 그대로 방치 (v2에서 cleanup cron 고려).
- **D-10:** **Optimistic Update는 좋아요에만 적용, 댓글은 await.** `toggleLike` → 클라이언트에서 `likedIds` Set + `like_count` 즉시 +1/-1 예측 갱신 → DB `community_likes` INSERT/DELETE → 실패 시 이전 상태 롤백 + error toast. DB 트리거(`trg_like_count_insert`, `trg_like_count_delete`)가 실제 count 자동 증감하므로 클라이언트 예측값과 서버값이 최종적으로 일치. 댓글 작성은 DB INSERT 완료 후 목록 refresh (유저 입력 중도는 신중함).
- **D-11:** **view_count 증가는 `increment_post_view(post_id)` RPC 함수.** `CommunityPostDetailScreen` mount 시 1회 호출. Postgres 함수는 atomic `UPDATE community_posts SET view_count = view_count + 1 WHERE id = post_id`. Race condition 없음.

### Poll (투표)

- **D-12:** **Poll 상태는 post fetch 시 embedded select로 한 번에 조회.** `select('*, poll:community_polls(*, options:community_poll_options(*), my_votes:community_poll_votes!left(option_id))')` 로 post + poll + options + 내가 투표한 option_id 배열을 1 query에 포함. `votePoll(pollId, optionId)` 는 `community_poll_votes` INSERT (DB `check_poll_vote` 트리거가 단일/복수, 만료, 중복 검증).
- **D-13:** **만료된 투표는 결과만 표시 + 투표 불가.** `expires_at < now()` 또는 `is_closed = true` 면 선택지 버튼 비활성화 + "마감된 투표입니다" 안내, 각 옵션별 % + 가장 많이 투표된 항목 강조. DB `check_poll_vote` 트리거가 expired 저항 대응.

### 신고 · 차단

- **D-14:** **신고 중복/self-report 방지는 DB 트리거에 전적 의존.** `community_reports` INSERT → DB `check_self_report` + UNIQUE(reporter_id, target_type, target_id) 트리거/제약이 거부 → 클라이언트는 `error.message` 파싱해서 'cannot report your own content' vs 'already reported' toast 분기. 세션 메모리에 `reportedIds` Set으로 UI 중복 호출 방지는 선택적(낙관 캐시).
- **D-15:** **차단 사용자 필터링은 RLS가 전담, 클라이언트는 차단 후 refresh.** `BlockContext.blockUser()` → `user_blocks` INSERT → 즉시 `CommunityContext.refreshPosts()` 호출하여 다음 fetch부터 필터링 반영. 클라이언트 posts state에 대한 추가 invalidation 로직 없음 (기존 `CommunityPostDetailScreen` 의 `useBlock()` 연계 유지).

### Context 리팩토링 & UX

- **D-16:** **`CommunityContext.tsx` 는 일괄 Supabase 전환.** mock import (`MOCK_POSTS`, `MOCK_COMMENTS`, `MOCK_POLLS`, `CURRENT_USER_ID`) 제거, state는 서버에서 fetch한 데이터만 유지. 기존 클라이언트 트렌딩 스코어 로직 제거. `mockCommunity.ts` 는 Phase 3 완료 후 삭제(또는 `_legacy/` 이동).
- **D-17:** **로딩/에러 UI 는 Skeleton + Toast + Pull-to-refresh.** 초기 로드: 기존 `CommunitySkeleton` 재사용. 에러: `showToast(message, 'error')` + EmptyState에 "다시 시도" 버튼. `RefreshControl` 로 pull-to-refresh 유지. 페이지네이션 로드는 하단 spinner. Error Boundary는 `App.tsx` 루트 ErrorBoundary 로 충분 (Context 수준 boundary 추가 안 함).
- **D-18:** **작성 실패 시 Alert + 폼 데이터 유지.** 게시글/댓글 작성 실패: Alert로 "게시글 작성에 실패했습니다. 다시 시도하시겠습니까?" 노출, `CommunityWriteScreen` 폼 state는 그대로 유지 (사용자가 다시 submit 가능). 자동 재시도 없음. 목록 조회 실패: EmptyState의 재시도 버튼 + pull-to-refresh.

### 게스트 모드 & Phase 1 D-11 보완 (중요)

- **D-19:** **Phase 1 D-11(비인증 완전 차단)을 community 테이블에 한해 부분 완화.** 신규 마이그레이션 `024_community_anon_read.sql` (또는 유사 번호) 추가: `community_posts`, `community_comments`, `community_polls`, `community_poll_options`, `players` 테이블에 `FOR SELECT TO anon USING (...)` 정책 복원. `community_posts` anon 정책은 `is_blinded = FALSE` + blocked_users 제외 없이 (anon은 차단 관계 없음). 민감 테이블 (`public.users`, `notifications`, `inquiries`, `user_restrictions`, `user_blocks`, `recent_searches`, `photographer_applications`, `site_settings`, `audit_logs`) 은 D-11 그대로 유지 — 인증 필수. **근거:** 공개 게시판은 UX상 로그인 전 탐색 필요, 민감 데이터는 노출 금지.
- **D-20:** **게스트(비로그인) 접근 제한:** 목록·상세·검색·댓글 조회·투표 현황 조회는 자유. 작성·수정·삭제·좋아요·댓글 작성·투표·신고에서 `useLoginGate()` 호출 (기존 훅 재사용). 최근 검색어는 로그인 시에만 저장/조회 (`recent_searches` 는 D-19에서 anon 허용 안 함).

### Claude's Discretion

- `communityApi.ts` 함수 시그니처 세부 (정확한 param 이름, 옵셔널 파라미터)
- `ensureSlugMaps()` 를 photographerApi에서 공유 helper로 추출할지 여부 (planner 판단)
- pg_cron 스케줄 주기 정확한 값 (10분이 기본, 부하 보고 조정)
- `update_trending_posts()` 함수의 트렌딩 스코어 공식 세부 (현재 클라이언트 로직: `like_count * 2 + comment_count * 3 + view_count * 0.1` + freshness boost — DB로 옮길 때 freshness 수식 최적화는 Claude 재량)
- ILIKE 검색 결과 정렬 기준 (최신순 기본, 추후 relevance 고려)
- `mapCommunityPost` / `mapCommunityComment` 의 정확한 DB row 형태 처리
- `CommunityContext` state shape 상세 (posts 누적 방식, page tracking)
- 에러 메시지 i18n 키 정의
- R2 업로드 병렬/순차 처리 (현재 r2Upload.ts는 순차 — 그대로 유지 가능)

### Folded Todos

None — `gsd-tools todo match-phase 3` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap

- `.planning/REQUIREMENTS.md` §Community — COMM-01~COMM-12 요구사항 상세 (게시글 길이 제약, 댓글 depth, 이미지 최대 10장, 투표 옵션 2~6개, 검색 대상, 트렌딩 24시간 윈도우)
- `.planning/ROADMAP.md` §Phase 3 — Goal, Success Criteria, Dependencies
- `docs/PRD_v1.md` §3.1.2 커뮤니티, §Phase 2 — 게시판 구성, 이미지/영상 정책, 트렌딩/검색 정책
- `.planning/phases/01-database-foundation-security/01-CONTEXT.md` — D-10, D-11, D-12 (본 Phase의 D-19가 D-11 부분 수정)
- `.planning/phases/02-authentication/02-CONTEXT.md` — D-08~D-10 (탈퇴 soft delete, 차단 UX) — Phase 3 D-03, D-15 와 연계

### Database Schema (커뮤니티 핵심)

- `supabase/migrations/002_community.sql` — community_posts, community_comments, community_likes, community_reports 테이블 + 트리거 (`update_post_comment_count`, `update_like_count`, `check_self_report`)
- `supabase/migrations/003_polls.sql` — community_polls, community_poll_options, community_poll_votes + `check_poll_vote`, `update_poll_vote_count` 트리거
- `supabase/migrations/004_spam_filter.sql` — `recent_searches` 테이블 정의 + `limit_recent_searches` 트리거 (10개 제한)
- `supabase/migrations/011_users.sql` — public.users 스키마 (D-02 embedded select 조인 대상)
- `supabase/migrations/021_drop_spam_and_cleanup.sql` — 자동 블라인드 트리거 제거, anon 정책 제거 (D-19가 community에 한해 부분 복원)

### RLS 정책

- `supabase/migrations/005_rls_policies.sql` — community_posts/comments/likes/reports/polls/poll_options/poll_votes/recent_searches 현재 RLS 정책 (기본 패턴)
- `supabase/migrations/012_rls_helpers.sql` — `is_admin()`, `is_owner()` 헬퍼 함수 (D-14, D-19 마이그레이션에서 참조)
- `supabase/migrations/023_rls_policies_remaining.sql` — 신규 테이블 RLS (직접 의존 없음, 패턴 참조)

### Application Code (전환 대상 & 참조)

- `app/src/contexts/CommunityContext.tsx` — **전환 대상.** 현재 100% mock, createPost/updatePost/deletePost/getComments/createComment/toggleLike/votePoll/reportTarget/addRecentSearch 등 전체 메서드가 있음. 전환 후 Supabase 호출로 재작성.
- `app/src/services/photographerApi.ts` — **Reference 패턴.** `ApiResult<T>`, `ensureSlugMaps`, `mapRow*`, try/catch 에러 처리, embedded select 패턴. communityApi.ts 가 동일 구조를 따른다 (D-01).
- `app/src/services/r2Upload.ts` — `uploadCommunityImages(userId, localUris, accessToken)` 함수 이미 존재 (`community-posts` prefix). D-09 흐름에서 그대로 사용.
- `app/src/services/supabase.ts` — Supabase 클라이언트 싱글톤, Phase 1 SEC-02 로 환경변수 강제화 완료
- `app/src/contexts/AuthContext.tsx` — `user.id`, `user.nickname`, `session.access_token` 사용 위치 (R2 업로드 및 insert user_id)
- `app/src/contexts/BlockContext.tsx` — `blockUser`, `isBlocked` 호출 패턴 (D-15)
- `app/src/types/community.ts` — `CommunityPost`, `CommunityPostWithAuthor`, `CommunityComment`, `CreatePostInput`, `UpdatePostInput`, `PostSortOrder`, `ReportReason` 등. DB row → 앱 타입 매핑 기준.
- `app/src/types/poll.ts` — `Poll`, `PollOption`, `PollWithOptions`, `PollDuration`, `getPollExpiresAt` 헬퍼
- `app/src/constants/teams.ts` — `KBO_TEAMS` 클라이언트 slug 상수 (team slug ↔ uuid 매핑 기준)
- `app/src/data/mockCommunity.ts` — **제거 대상.** `MOCK_POSTS`, `MOCK_COMMENTS`, `MOCK_POLLS`, `CURRENT_USER_ID` 전체 제거.

### Community 화면 (연동 대상)

- `app/src/screens/community/CommunityMainScreen.tsx` — 목록, 팀 필터, 정렬, pull-to-refresh, 페이지네이션 진입점. D-05/D-17 반영 필요.
- `app/src/screens/community/CommunityPostDetailScreen.tsx` — 상세, 댓글/대댓글, 좋아요, 투표, 신고, 차단 UI. D-04/D-10/D-11/D-12/D-13/D-14 반영.
- `app/src/screens/community/CommunityWriteScreen.tsx` — 게시글 작성, 이미지 추가 (최대 10장), 투표 생성. D-09 흐름 반영 (`handleSubmit` 수정).
- `app/src/screens/community/CommunitySearchScreen.tsx` — 검색, 최근 검색어. D-07/D-08 반영.
- `app/src/components/community/CommunityPostCard.tsx` — 카드 컴포넌트, `is_deleted` 렌더링 처리 (D-03) 반영
- `app/src/components/common/Skeleton.tsx` — `CommunitySkeleton` 재사용 (D-17)

### Edge Functions

- `supabase/functions/get-upload-url/index.ts` — R2 presigned URL 생성 함수. 이미 `community-posts` prefix 지원 중, 변경 불필요.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`photographerApi.ts` 패턴 (D-01 기준)**: `ApiResult<T>`, `ensureSlugMaps()`, `teamUuidToSlug`/`teamSlugToUuid`, `mapPhotoPost`/`mapPlayer` 등 helper 함수들 — communityApi에도 동일 구조/네이밍 사용. 슬러그 매핑은 photographerApi 내부 정의이므로, 공유 helper로 추출할지 planner 재량 (D-01 세부).
- **`uploadCommunityImages` (r2Upload.ts)**: 이미 `community-posts` R2 prefix 지원, JPEG 고정, 순차 업로드. 재작성 불필요, CommunityWriteScreen에서 호출만 추가 (D-09).
- **`recent_searches` 테이블 + RLS + 트리거**: Phase 1에서 완비됨. Phase 3는 CRUD API만 추가 (D-08).
- **DB 트리거 자동화**: `trg_like_count_insert/delete`, `trg_comment_count_insert/delete`, `trg_poll_vote_count_*`, `check_self_report`, `check_poll_vote` — 클라이언트는 INSERT/DELETE만, count 증감/검증은 DB가 자동. 단순화에 유리.
- **`CommunitySkeleton`, `EmptyState`, `TeamFilterBar`, `TeamTabBar`, `CommunityPostCard`, `PressableScale`, `ReportSheet`**: 모두 기존 UI 재사용 가능. D-17 로딩/에러 UI에 활용.
- **`useLoginGate` 훅**: 게스트 액션 시 로그인 유도 (D-20)
- **`BlockContext`**: `blockUser`, `isBlocked` 메서드 (D-15)
- **`ToastContext` + `showToast`**: 에러/성공 피드백 통일 패턴

### Established Patterns

- **Service layer 반환 타입**: `{ data: T | null; error: string | null }` — photographerApi, r2Upload 전체에서 사용
- **Error 내로잉**: `catch (e: unknown)` → `e instanceof Error ? e.message : '...'`
- **Context-as-store**: 전역 상태는 Context Provider 내부 useState, useMemo로 value 캐싱. Redux/Zustand 미사용.
- **Team slug**: 클라이언트는 `'lg', 'ssg', 'kia'` 슬러그 사용, DB는 uuid. 매핑은 ensureSlugMaps 패턴.
- **Soft delete UX**: `"삭제된 댓글입니다"` / `"탈퇴한 사용자"` 렌더링 시 치환 (Phase 1 D-03 연장선)
- **Migration 번호**: 현재 023까지. Phase 3 새 마이그레이션은 024부터 (011+ 규칙 유지)
- **RLS 정책 네이밍**: `{table}_{action}_{qualifier}` — 예: `posts_public_read`, `comments_update_own`
- **게시글/댓글 길이 제약**: DB CHECK 제약으로 이미 강제 (title 1~30, content 1~1000, comment 1~300) — 클라이언트는 UI validation만

### Integration Points

- **`App.tsx`**: `CommunityProvider` 위치 확인됨 (line 290~310). Auth, Block, Toast, Community 순서.
- **`CommunityMainScreen` → `CommunityContext`**: `getFilteredPosts(teamId, sort, page)` 시그니처 유지 (화면 코드 최소 수정), 내부만 Supabase fetch로 재작성.
- **`CommunityWriteScreen.handleSubmit`**: R2 업로드 추가 위치 명확 (line 94~117). 업로드 await → createPost 호출 순서 변경 필요.
- **`CommunityPostDetailScreen.useEffect` mount**: `increment_post_view(post_id)` RPC 호출 추가 (D-11).
- **`CommunitySearchScreen.handleSearch`**: `searchPosts(q)` 호출을 서버 API로 전환, `addRecentSearch` 도 DB 호출로 변경 (D-07, D-08).
- **`BlockContext.blockUser` → `CommunityContext.refreshPosts`**: 차단 즉시 목록 refresh 트리거 (D-15) — Provider 간 직접 호출 불가하면 `useBlock()` 의 event/callback 패턴 고려.

</code_context>

<specifics>
## Specific Ideas

- `photographerApi.ts` 패턴을 거울처럼 따를 것 — 리뷰 일관성 + 학습 비용 최소화
- 트렌딩은 서버 계산으로 옮기되 공식은 기존 클라이언트 로직을 그대로 포팅 (`like_count * 2 + comment_count * 3 + view_count * 0.1` + freshness multiplier) — 의미 변경 없이 위치만 이동
- D-19의 community anon read 부활은 공개 게시판의 UX 요구 (둘러보고 가입 결정) — 민감 테이블은 절대 풀지 않음
- 좋아요만 optimistic: "즉각적 반응이 중요한 인터랙션" vs "사용자 입력이 있는 인터랙션 (댓글)" 의 구분

</specifics>

<deferred>
## Deferred Ideas

- **Orphan R2 파일 cleanup cron** — v2로 연기 (D-09). 현재는 방치.
- **Full-text search (tsvector) / pg_trgm 검색** — 사용자 증가 시 v2 (D-07). 현재는 ILIKE.
- **Poll 투표 이력 실시간 업데이트** — v1 Realtime 미사용 확정. 투표 시 다른 사용자에게 즉시 반영되려면 폴링 또는 v2 Realtime 필요.
- **댓글 페이지네이션** — 1-depth 대댓글 + 게시글당 댓글 수 적은 상황에서는 불필요. 사용자 활성화 시 v2 (D-04).
- **댓글 optimistic update** — v1은 await 후 refresh, v2에서 복원.
- **신고 이력 클라이언트 전체 로드** — `reportedIds` Set은 세션 단위, 로그인 시 전체 로드는 v2 (D-14).
- **게시글 수정 시 이미지 부분 교체** — v1은 images 배열 전체 교체. 부분 업데이트 (keep/remove/add) UX는 v2.
- **Materialized view 기반 트렌딩** — pg_cron 방식이 부하 되면 v2에서 검토 (D-06).

### Reviewed Todos (not folded)

None — `gsd-tools todo match-phase 3` 매치 없음, 리뷰 대상 없음.

</deferred>

---

*Phase: 03-community*
*Context gathered: 2026-04-10*
