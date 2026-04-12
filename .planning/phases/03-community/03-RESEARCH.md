# Phase 3: Community - Research

**Researched:** 2026-04-10
**Domain:** Supabase (Postgres + RLS + pg_cron + RPC + PostgREST embedded select) + React Native context migration
**Confidence:** HIGH (stack/patterns/pitfalls verified); MEDIUM (pg_cron Supabase-specific behavior cross-checked)

## Summary

Phase 3는 `CommunityContext`를 100% mock 데이터에서 Supabase 완전 연동으로 전환하는 브라운필드 마이그레이션이다. 설계 축은 이미 Phase 2에서 완성된 `photographerApi.ts` 패턴(`ApiResult<T>`, `ensureSlugMaps`, `mapRow*`, `try/catch` + error narrowing)을 거울처럼 따르는 것이다. 연구의 초점은 이미 확정된 20개의 locked decision이 요구하는 **새로운 영역** — 특히 (1) pg_cron 스케줄러 도입, (2) PostgREST embedded select 명시적 FK 해석, (3) RLS anon 부분 복원, (4) atomic RPC, (5) optimistic like rollback — 에 대한 정확한 Supabase 최신 문법과 알려진 함정을 확정하는 것이다.

연구 결과 2가지 중요한 **사전 블로커**가 발견되었다:

1. **`community_posts.user_id`, `community_comments.user_id`, `community_reports.reporter_id`, `community_likes.user_id`, `community_poll_votes.user_id` 가 모두 `auth.users(id)` 를 참조한다.** D-02의 `author:users!user_id(...)` embedded select가 동작하려면 `public.users(id)` 쪽으로 FK가 연결되어야 한다. Planner는 새 마이그레이션에서 이 FK를 **재연결**하는 작업이 필요하다. (참고: `public.users.id` 자체가 `auth.users(id)` 를 참조하고 있으므로 데이터 무결성은 체인으로 유지된다.)
2. **pg_cron extension이 이 프로젝트 마이그레이션에 아직 enable되어 있지 않다.** 전체 migrations 디렉토리에 `pg_cron` 문자열이 존재하지 않는다. 새 마이그레이션이 `create extension if not exists pg_cron with schema extensions;` 를 먼저 실행해야 `cron.schedule()` 호출이 가능하다.

**Primary recommendation:** photographerApi.ts 패턴을 1:1 미러링하여 communityApi.ts를 작성하고, 단 하나의 새 마이그레이션 파일(`024_community_phase3.sql`)에 (a) FK 재연결, (b) 익명 SELECT 정책 복원, (c) pg_cron 활성화 + `update_trending_posts()` 스케줄링, (d) `increment_post_view()` RPC를 모두 담아라. 분리하면 롤백 리스크가 증가한다.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 서비스 레이어 & 조인 전략
- **D-01:** `app/src/services/communityApi.ts` 신규 생성. `photographerApi.ts`와 동일한 패턴 유지 — `ApiResult<T>` 반환, `ensureSlugMaps()` 재사용 (현재 photographerApi 내부 정의 그대로 사용하거나 `services/_shared/` 로 추출 선택은 planner 재량), `mapRow*` 함수로 DB row → app type 변환, `try/catch` + `e instanceof Error` 에러 내로잉.
- **D-02:** **Author 조인은 명시적 FK + PostgREST embedded select.** `community_posts.user_id` 에 `public.users` FK를 명시하는 마이그레이션 추가 후 `supabase.from('community_posts').select('*, author:users!user_id(nickname, avatar_url, is_deleted)')` 패턴. 1 query로 posts + author + team 동시 조회. `community_comments.user_id` 도 동일 처리.
- **D-03:** **탈퇴한 사용자(`author.is_deleted = true`) 표시는 클라이언트 렌더링 레이어에서만 처리.** `mapCommunityPost` / `mapCommunityComment` 는 원본 author 그대로 반환, `CommunityPostCard` / `CommentItem` 에서 `is_deleted` 체크 후 nickname을 `t('deleted_user')` 로, avatar는 기본 아바타로 교체. DB 데이터는 변형하지 않음.
- **D-04:** **댓글 트리는 게시글 상세 진입 시 전체 fetch.** `fetchCommentsByPostId(postId)` 가 모든 댓글 + 대댓글 한 번에 로드 (1-depth 대댓글 전제이고 게시글당 댓글 수가 적어 페이지네이션 불필요), 클라이언트에서 `parent_comment_id` 로 tree 빌드.

#### 페이지네이션 · 트렌딩 · 검색
- **D-05:** **Pagination은 Supabase `.range(from, to)` 기반.** 20개씩 로드 (`PAGE_SIZE = 20`, 기존 CommunityContext 상수 유지). FlatList `onEndReached` 에서 다음 range 호출. `getFilteredPosts(teamId, sort, page)` 는 서버 fetch 결과를 누적(concat) 하여 state에 유지.
- **D-06:** **트렌딩은 DB Scheduled Function(pg_cron) 으로 계산.** `update_trending_posts()` Postgres 함수 + `pg_cron` 10분 주기 job: 24시간 윈도우 내 `like_count * 2 + comment_count * 3` 스코어 상위 5개만 `is_trending = TRUE` 설정, 나머지 FALSE. 클라이언트는 `.eq('is_trending', true)` 로만 조회. 기존 CommunityContext 클라이언트 스코어링(`getTrendingScore`, `TRENDING_WINDOW_MS` 등)은 제거.
- **D-07:** **검색은 ILIKE 기반 단순 검색.** `searchCommunityPosts(query)` 는 두 쿼리 실행 후 클라이언트에서 병합: ① `community_posts.select().or('title.ilike.%q%,content.ilike.%q%')` ② `players.select('team_id').ilike('name_ko', '%q%')` → 해당 팀 posts fetch. v1 초기 사용자 수로는 full-text 없이 충분. Postgres `tsvector` / `pg_trgm` 은 v2.
- **D-08:** **최근 검색어는 DB `recent_searches` 테이블 사용.** Phase 1에서 이미 생성된 테이블 + RLS + 10개 제한 트리거(`limit_recent_searches`) 그대로 활용. `search_type = 'community'` 로 구분. `addRecentSearch`, `removeRecentSearch`, `clearRecentSearches` 가 DB CRUD 호출. 클라이언트 메모리 상태는 DB 응답의 캐시.

#### Mutations & 이미지 업로드 & Optimistic Update
- **D-09:** **게시글 작성 시 이미지 업로드 순서는 R2 먼저 → posts INSERT.** `CommunityWriteScreen.handleSubmit` 흐름: ① `uploadCommunityImages(userId, localUris, accessToken)` 호출해서 public URL 배열 확보 ② 성공 시 `createPost({ ..., images: publicUrls })` 호출 ③ R2 업로드 또는 INSERT 실패 시 Alert로 재시도 유도. v1에서는 R2 성공 + INSERT 실패 시 고아 파일을 그대로 방치 (v2에서 cleanup cron 고려).
- **D-10:** **Optimistic Update는 좋아요에만 적용, 댓글은 await.** `toggleLike` → 클라이언트에서 `likedIds` Set + `like_count` 즉시 +1/-1 예측 갱신 → DB `community_likes` INSERT/DELETE → 실패 시 이전 상태 롤백 + error toast. DB 트리거(`trg_like_count_insert`, `trg_like_count_delete`)가 실제 count 자동 증감하므로 클라이언트 예측값과 서버값이 최종적으로 일치. 댓글 작성은 DB INSERT 완료 후 목록 refresh (유저 입력 중도는 신중함).
- **D-11:** **view_count 증가는 `increment_post_view(post_id)` RPC 함수.** `CommunityPostDetailScreen` mount 시 1회 호출. Postgres 함수는 atomic `UPDATE community_posts SET view_count = view_count + 1 WHERE id = post_id`. Race condition 없음.

#### Poll (투표)
- **D-12:** **Poll 상태는 post fetch 시 embedded select로 한 번에 조회.** `select('*, poll:community_polls(*, options:community_poll_options(*), my_votes:community_poll_votes!left(option_id))')` 로 post + poll + options + 내가 투표한 option_id 배열을 1 query에 포함. `votePoll(pollId, optionId)` 는 `community_poll_votes` INSERT (DB `check_poll_vote` 트리거가 단일/복수, 만료, 중복 검증).
- **D-13:** **만료된 투표는 결과만 표시 + 투표 불가.** `expires_at < now()` 또는 `is_closed = true` 면 선택지 버튼 비활성화 + "마감된 투표입니다" 안내, 각 옵션별 % + 가장 많이 투표된 항목 강조. DB `check_poll_vote` 트리거가 expired 저항 대응.

#### 신고 · 차단
- **D-14:** **신고 중복/self-report 방지는 DB 트리거에 전적 의존.** `community_reports` INSERT → DB `check_self_report` + UNIQUE(reporter_id, target_type, target_id) 트리거/제약이 거부 → 클라이언트는 `error.message` 파싱해서 'cannot report your own content' vs 'already reported' toast 분기. 세션 메모리에 `reportedIds` Set으로 UI 중복 호출 방지는 선택적(낙관 캐시).
- **D-15:** **차단 사용자 필터링은 RLS가 전담, 클라이언트는 차단 후 refresh.** `BlockContext.blockUser()` → `user_blocks` INSERT → 즉시 `CommunityContext.refreshPosts()` 호출하여 다음 fetch부터 필터링 반영. 클라이언트 posts state에 대한 추가 invalidation 로직 없음 (기존 `CommunityPostDetailScreen` 의 `useBlock()` 연계 유지).

#### Context 리팩토링 & UX
- **D-16:** **`CommunityContext.tsx` 는 일괄 Supabase 전환.** mock import (`MOCK_POSTS`, `MOCK_COMMENTS`, `MOCK_POLLS`, `CURRENT_USER_ID`) 제거, state는 서버에서 fetch한 데이터만 유지. 기존 클라이언트 트렌딩 스코어 로직 제거. `mockCommunity.ts` 는 Phase 3 완료 후 삭제(또는 `_legacy/` 이동).
- **D-17:** **로딩/에러 UI 는 Skeleton + Toast + Pull-to-refresh.** 초기 로드: 기존 `CommunitySkeleton` 재사용. 에러: `showToast(message, 'error')` + EmptyState에 "다시 시도" 버튼. `RefreshControl` 로 pull-to-refresh 유지. 페이지네이션 로드는 하단 spinner. Error Boundary는 `App.tsx` 루트 ErrorBoundary 로 충분 (Context 수준 boundary 추가 안 함).
- **D-18:** **작성 실패 시 Alert + 폼 데이터 유지.** 게시글/댓글 작성 실패: Alert로 "게시글 작성에 실패했습니다. 다시 시도하시겠습니까?" 노출, `CommunityWriteScreen` 폼 state는 그대로 유지 (사용자가 다시 submit 가능). 자동 재시도 없음. 목록 조회 실패: EmptyState의 재시도 버튼 + pull-to-refresh.

#### 게스트 모드 & Phase 1 D-11 보완
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

### Deferred Ideas (OUT OF SCOPE)

- **Orphan R2 파일 cleanup cron** — v2 (D-09)
- **Full-text search (tsvector) / pg_trgm 검색** — v2 (D-07)
- **Poll 투표 이력 실시간 업데이트** — v1 Realtime 미사용 확정
- **댓글 페이지네이션** — v2 (D-04)
- **댓글 optimistic update** — v2
- **신고 이력 클라이언트 전체 로드** — `reportedIds` Set은 세션 단위, 로그인 시 전체 로드는 v2
- **게시글 수정 시 이미지 부분 교체** — v1은 images 배열 전체 교체
- **Materialized view 기반 트렌딩** — pg_cron 방식이 부하 되면 v2 (D-06)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMM-01 | communityApi.ts 서비스 레이어 생성 | §Standard Stack + §Code Examples §1 (photographerApi 미러링), §Architecture Patterns §1 |
| COMM-02 | CommunityContext → Supabase 전환 | §Architecture Patterns §2 (Context migration), §Common Pitfalls §5 (Context provider init) |
| COMM-03 | 게시글 CRUD 연동 (제목 1~30자, 본문 1~1000자) | §Code Examples §2 (insert + embedded select), §Common Pitfalls §3 (DB constraint에 의존) |
| COMM-04 | 댓글/대댓글 연동 (1-depth, 300자, soft delete) | §Code Examples §3 (tree build), §Architecture Patterns §3 (soft delete) |
| COMM-05 | 좋아요 연동 (게시글/댓글, 중복 방지) | §Code Examples §4 (optimistic rollback), §Architecture Patterns §4 (toggle) |
| COMM-06 | 투표 연동 (단일/복수, 2~6개, 만료) | §Code Examples §5 (poll embedded select with !left), §Common Pitfalls §6 |
| COMM-07 | 신고 연동 (관리자 수동 처리) | §Code Examples §6 (DB 트리거 에러 내로잉), §Common Pitfalls §7 (23505 vs 23514) |
| COMM-08 | 이미지 업로드 (R2 community-posts prefix, 최대 10장) | §Code Examples §7 (uploadCommunityImages → insert), §Common Pitfalls §4 (고아 파일) |
| COMM-09 | 검색 기능 (DB 기반 — 선수명, 게시글 제목/내용) | §Code Examples §8 (.or('title.ilike,content.ilike')), §Common Pitfalls §8 (SQL injection) |
| COMM-10 | 최근 검색어 저장 (사용자당 최대 10개) | §Code Examples §9 (recent_searches CRUD), §Architecture Patterns §5 |
| COMM-11 | 트렌딩 계산 (24시간 윈도우, 좋아요 + 댓글) | §Code Examples §10 (pg_cron + update_trending_posts), §Common Pitfalls §1 (pg_cron enable) |
| COMM-12 | Optimistic Update + 실패 핸들링 | §Code Examples §4 (rollback), §Architecture Patterns §4 (optimistic 범위) |

## Project Constraints (from CLAUDE.md)

**Required conventions — any plan must honor these:**

- **TypeScript strict mode**, `"strict": true` in `app/tsconfig.json` — no `any`, unknown errors narrowed via `e instanceof Error`.
- **ES modules only** (import/export), single quotes for imports, 2-space indent, trailing commas in multiline arrays/objects.
- **No Prettier/ESLint config** — but existing code style must be followed verbatim (check surrounding files).
- **Service layer return shape:** `{ data: T | null; error: string | null }` — mirror photographerApi.ts.
- **Naming:** Screen files `PascalCase + Screen`, context files `PascalCase + Context`, hooks `camelCase + use` prefix, type files `camelCase` domain, DB row interfaces `PascalCase domain`.
- **No barrel index.ts**, relative imports only.
- **Import order:** `import type` for all type-only imports; named imports for hooks/utilities/types; default imports for components/screens.
- **Error handling:** Service — `try/catch` + narrowing; UI — `Alert.alert` for destructive, `showToast(msg, 'error')` for lightweight feedback. Top-level `ErrorBoundary` already wraps the app; no per-context boundary.
- **Logging prefixes:** `[OAuth]`, `[Deep Link]`, `[ErrorBoundary]`. New code needing logs: `[Community]` or similar — but `console.log` should NOT be scattered in business logic (only `console.warn` for non-critical fallbacks, `console.error` for real failures).
- **i18n:** All user-facing strings via `useTranslation() / t()`, keys in `app/src/i18n/locales/ko.ts`, `snake_case`.
- **Theme tokens:** Import from `../../styles/theme`, never raw hex.
- **Component design:** `useCallback` for event handlers, `useMemo` for derived lists, small helper components can live in the same file below the main export.
- **Never skip pre-commit hooks** (`--no-verify` forbidden).
- **Conventional commits:** `feat:`, `fix:`, `test:`, `refactor:`, `docs:` — **no Co-Authored-By trailers** (user is sole author).
- **Communication:** Respond in Korean unless asked otherwise.
- **GSD workflow gate:** All edits must come through a GSD command (`/gsd-execute-phase`, `/gsd-quick`, `/gsd-debug`).

## Standard Stack

### Core (already installed — verified from `app/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.100.0 (latest 2.103.0) `[VERIFIED: npm view]` | Backend client (auth + database + RPC + storage) | Canonical Supabase SDK. Used throughout project already. |
| React | 19.1.0 `[VERIFIED: app/package.json]` | UI rendering — React 19 feature `useOptimistic` is **available** on RN 0.78+ | `useOptimistic` hook option exists but not required — existing code uses functional setState rollback `[CITED: react.dev, reactnative.dev]` |
| React Native | 0.81.5 via Expo 54 `[VERIFIED: app/package.json]` | Runtime | — |
| `expo-image-picker` | ~17.0.10 | Image selection for post upload | Already used elsewhere |

**No new npm packages required.** All Phase 3 work uses already-installed libraries + Postgres extensions (pg_cron enabled via migration).

### Postgres Extensions (to be enabled via migration)

| Extension | Purpose | Install | Status |
|-----------|---------|---------|--------|
| `pg_cron` | Scheduled job execution for `update_trending_posts()` (D-06) | `create extension if not exists pg_cron with schema extensions;` | **NOT ENABLED YET** — must be added in 024 migration `[VERIFIED: grep migrations]` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron scheduled function (D-06) | Materialized view refreshed on demand | More complex invalidation; deferred to v2 |
| ILIKE search (D-07) | `pg_trgm` + GIN index, or `tsvector` full-text | Better relevance, but requires extension + index tuning. Deferred to v2 per CONTEXT. |
| RPC for view_count (D-11) | Client UPDATE | Race condition risk → chosen RPC is atomic. |
| `useOptimistic` (React 19) | Functional `setState(prev => ...)` rollback | Both work on RN 0.81/React 19.1. Existing code uses functional setState — staying consistent reduces review cost and team learning curve. |

**Installation:** No npm install required. Only SQL migration.

**Version verification (performed 2026-04-10):**
```bash
$ npm view @supabase/supabase-js version
2.103.0
```
Installed pin `^2.100.0` accepts ≥2.100.0 <3.0.0, so this resolves to the current 2.103.0 `[VERIFIED: npm view @supabase/supabase-js version]`.

## Architecture Patterns

### Recommended File Layout (new + modified)

```
app/src/services/
└── communityApi.ts            # NEW — mirror of photographerApi.ts

app/src/contexts/
└── CommunityContext.tsx       # MODIFIED — rewrite internals, keep public API

app/src/screens/community/
├── CommunityMainScreen.tsx       # MODIFIED — loading/error/retry UX (D-17)
├── CommunityPostDetailScreen.tsx # MODIFIED — RPC call on mount (D-11), poll !left hint
├── CommunityWriteScreen.tsx      # MODIFIED — R2 upload before createPost (D-09), D-18 error handling
└── CommunitySearchScreen.tsx     # MODIFIED — DB recent_searches (D-08)

app/src/components/community/
├── CommunityPostCard.tsx      # MODIFIED — render "탈퇴한 사용자" when author.is_deleted (D-03)
└── (others unchanged)

app/src/data/
└── mockCommunity.ts           # REMOVED (or moved to _legacy/)

supabase/migrations/
└── 024_community_phase3.sql   # NEW — single consolidated migration (see below)
```

### Pattern 1: Service Layer (mirror of photographerApi.ts)

**What:** `communityApi.ts` exports async functions returning `ApiResult<T>`; maps DB rows to app types via `mapRow*` helpers; uses `ensureSlugMaps()` for team slug↔uuid translation.

**Why standard:** Already the project's blessed pattern. Phase 2 review established it; diverging would cost review cycles.

**When to use:** All mutations (create/update/delete) and all fetches that touch community tables.

**Example:** See `§Code Examples §1`.

### Pattern 2: Context Migration (brownfield)

**What:** Keep `CommunityContext` public API **identical** (`getFilteredPosts`, `createPost`, `toggleLike`, etc. — same signatures). Replace only internals. Screens should need **minimal** changes.

**Why:** Reduces surface area of change, limits blast radius, lets plans be verified in smaller waves.

**Strategy:** 
- State shape change: `posts: CommunityPostWithAuthor[]` now represents *accumulated* server pages (not a full in-memory set filtered client-side).
- `getFilteredPosts(teamId, sort, page)` becomes **async** internally via a `useEffect` trigger — but the returned array from context is synchronous (what was fetched so far).
- Alternative: split `getFilteredPosts` into `filteredPosts` state + `loadPage(teamId, sort, page)` action. **Planner decision.** Either approach preserves screen compatibility.

### Pattern 3: Soft Delete Rendering (reused from Phase 2 AUTH-09)

**What:** DB returns the original row; client renders `t('deleted_user')` or `t('community_comment_deleted')` when the flag is set.

**Where in Phase 3:**
- `CommunityPostCard` — check `post.author.is_deleted`, replace `post.user.nickname` display with `t('deleted_user')`, avatar with default icon.
- `CommentItem` — already handles `comment.is_deleted` (line 446 of CommunityPostDetailScreen). Extend to also check `comment.author?.is_deleted`.
- `mapCommunityPost` / `mapCommunityComment` — **do NOT mutate** the author data. Pass through verbatim.

### Pattern 4: Optimistic Like Toggle with Rollback

**What:** `toggleLike('post', id)`:
1. Capture previous state (`wasLiked`, `previousCount`).
2. Update `likedIds` Set + `like_count` atomically with `setState(prev => ...)`.
3. Fire-and-await DB INSERT/DELETE.
4. On error: revert by re-applying captured state, show error toast.

**Why NOT `useOptimistic`:** The existing CommunityContext already follows a functional setState pattern (line 300-321). `useOptimistic` would require wrapping each consumer in a transition, which is more invasive for a migration phase. Staying with setState is consistent with the rest of the codebase `[CITED: existing CommunityContext.tsx:300]`.

**See:** `§Code Examples §4`.

### Pattern 5: DB-Backed Recent Searches (D-08)

**What:** Phase 1 already created `recent_searches` table + RLS + 10-item limit trigger. Phase 3 adds only the CRUD layer:

```ts
// add
supabase.from('recent_searches').insert({ user_id, query, search_type: 'community' })
// list
supabase.from('recent_searches').select('*').eq('search_type', 'community').order('created_at', { ascending: false })
// remove one
supabase.from('recent_searches').delete().eq('user_id', user_id).eq('query', q).eq('search_type', 'community')
// clear all
supabase.from('recent_searches').delete().eq('user_id', user_id).eq('search_type', 'community')
```

The limit trigger `trg_limit_recent_searches` auto-deletes the 11th+ entry on insert — no client-side trimming needed `[VERIFIED: migrations/004_spam_filter.sql:61-78]`.

### Anti-Patterns to Avoid

- **Client-side trending score calculation**: The existing `getTrendingScore()` useEffect (CommunityContext:91-121) has a known bug guard (`trendingUpdated.current` ref) because mutating posts inside a posts-dependent useEffect creates a loop. **Delete the entire block** when D-06 migration is in place.
- **Fetching comments in N+1 pattern**: Never call `supabase.from('community_comments').select('*').eq('post_id', id)` then per-comment author lookups. Use embedded select (D-02).
- **Trusting client `reportedIds` as source of truth**: D-14 says the DB trigger is authoritative. Client-side Set is a UX optimization only, not a validation gate.
- **Storing FK constraint name in client code**: Use `!column_name` form in `.select()` hints — it's less brittle than constraint names that may differ across dev/prod `[VERIFIED: Supabase joins-and-nesting docs]`. However, if ambiguity persists, `!constraint_name` is the documented fallback `[CITED: PostgREST discussion #22870]`.
- **Running INSERT before R2 upload**: Per D-09, R2 first. If posts INSERT succeeds but images are missing, the row is permanently broken.
- **Refreshing trending posts on every fetch**: Client should query `.eq('is_trending', true)` without forcing a recalculation — the 10-min cron is the only place that computes.
- **Mixing `anon` and `authenticated` reads in one policy**: Separate policies give clearer intent and allow different filter expressions. See `§Code Examples §11`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic counter increment | Client-side read + write UPDATE | `supabase.rpc('increment_post_view', { post_id: x })` Postgres function (D-11) | Race conditions under concurrent viewers; RPC is atomic in one statement `[CITED: Supabase reference/javascript/rpc]` |
| Like count maintenance | Manual UPDATE in client | DB triggers `trg_like_count_insert/delete` (already defined in 002_community.sql) | Already implemented and working `[VERIFIED: migrations/002_community.sql:94-122]` |
| Comment count maintenance | Manual UPDATE in client | DB triggers `trg_comment_count_insert/delete` (already defined) | `[VERIFIED: migrations/002_community.sql:55-79]` |
| Poll vote validation (duplicate, expired) | Client-side check | DB trigger `check_poll_vote` (already defined) | Trigger handles allow_multiple, is_closed, expires_at in one place `[VERIFIED: migrations/003_polls.sql:47-81]` |
| Self-report prevention | Client-side check | DB trigger `check_self_report` (already defined) + UNIQUE constraint | `[VERIFIED: migrations/002_community.sql:143-170]` |
| Recent search list size limit | Client slice `.slice(0, 10)` | DB trigger `limit_recent_searches` (already defined) | Keeps DB and UI in sync; trigger runs atomically `[VERIFIED: migrations/004_spam_filter.sql:61-78]` |
| Trending score periodic recalc | Polling or client cron | pg_cron scheduled function | Runs independent of clients, no thundering-herd; scheduled jobs run as postgres (bypasses RLS) `[CITED: citusdata/pg_cron README, Supabase pg_cron docs]` |
| Full-text search | ILIKE hand-coded with indexes | (deferred to v2) `pg_trgm` GIN or `tsvector` | D-07 locks v1 to ILIKE. Do not build hybrid. |
| Author join with multiple queries | N+1 fetch | PostgREST embedded select with `!column_name` hint | 1 round trip, DB-planner optimized `[CITED: supabase docs/joins-and-nesting]` |
| Block filter | Client-side `posts.filter(...)` | RLS policy (already uses `user_id NOT IN (select blocked_id ...)` — see 005_rls_policies.sql:37-43) | RLS is authoritative, client-side filtering can race with blocks `[VERIFIED: migrations/005_rls_policies.sql:37-43]` |

**Key insight:** Phase 1/2 already built extensive DB-side automation (triggers, constraints, helpers). Phase 3 is mostly a *plumbing* job — wiring the UI to existing server-side logic. The temptation to re-implement validation in TypeScript should be resisted; trust the DB.

## Runtime State Inventory

This phase involves mixed data migration + schema changes. Runtime state audit:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `community_posts`, `community_comments`, `community_polls`, `community_poll_options`, `community_poll_votes`, `community_likes`, `community_reports`, `recent_searches` tables all exist (Phase 1), but are **currently empty** (prototype-stage project). No data migration needed. | **Code edit only** — no existing rows to migrate. |
| Live service config | **None.** No external services (n8n, Datadog, Tailscale, Cloudflare) store community state by key. Supabase is the sole backend. | None |
| OS-registered state | **None.** No Task Scheduler / launchd / pm2 entries reference community tables or mock data. | None |
| Secrets/env vars | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` — already set in `app/.env` (SEC-02 completed Phase 1). No new secrets for Phase 3. R2 credentials live in Supabase Edge Function secrets, not client. | None |
| Build artifacts | **None.** No compiled binaries or cached bundles reference community data. Expo bundler rebuilds from source every dev run. | None |
| **FK constraints** (project-specific) | `community_posts.user_id`, `community_comments.user_id`, `community_reports.reporter_id`, `community_likes.user_id`, `community_poll_votes.user_id`, `community_polls.*` (via posts), `community_poll_options.*` (via polls) — all reference `auth.users(id)`, not `public.users(id)`. D-02 requires PostgREST to resolve `author:users!user_id(...)` → this means there must be an FK from `community_posts.user_id` to `public.users(id)` visible to PostgREST. `[VERIFIED: grep REFERENCES auth.users migrations/]` | **Schema migration required** — drop existing FK, recreate pointing at `public.users(id) ON DELETE CASCADE`. Since `public.users.id` itself references `auth.users.id`, the row still exists when auth exists, preserving integrity. |
| **pg_cron extension** | Not enabled. `grep -r "pg_cron\|cron.schedule\|CREATE EXTENSION" supabase/migrations/` returns **0 matches**. `[VERIFIED: grep]` | **Migration must enable extension first** — `create extension if not exists pg_cron with schema extensions;` |
| **RLS anon policies dropped** | `posts_anon_read` and `comments_anon_read` were dropped in `021_drop_spam_and_cleanup.sql`. Re-creating with slightly different shape is trivial but requires careful policy naming to avoid conflicts. `[VERIFIED: migrations/021_drop_spam_and_cleanup.sql:35-36]` | **Migration must DROP POLICY IF EXISTS then CREATE POLICY** for each restored policy. |

**Nothing found in categories:** Live service config, OS-registered state, Secrets/env vars, Build artifacts — verified by grep/inspection.

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?*
- **Answer:** None. This phase does not rename anything; it adds new code and a new migration. Mock data removal is a client-side cleanup only. No deployed systems currently reference mock IDs.

## Common Pitfalls

### Pitfall 1: pg_cron not enabled (Supabase-specific)
**What goes wrong:** `cron.schedule('update-trending', '*/10 * * * *', $$ SELECT update_trending_posts(); $$)` fails with `ERROR: schema "cron" does not exist`.
**Why it happens:** On Supabase Cloud, pg_cron is **not** enabled by default in most projects. Extensions must be explicitly created. `[CITED: Supabase GitHub issue #28966]`
**How to avoid:** In migration `024_community_phase3.sql`, the **very first statement** must be:
```sql
create extension if not exists pg_cron with schema extensions;
grant usage on schema cron to postgres;
```
Then verify after migration runs by selecting from `cron.job`.
**Warning signs:** Migration fails with a schema-doesn't-exist error; `cron.schedule()` returns an error instead of a jobid.

### Pitfall 2: PostgREST embedded select fails with PGRST201 "could not embed"
**What goes wrong:** `.select('*, author:users!user_id(nickname, ...)')` returns `PGRST201: Could not embed because more than one relationship was found for 'community_posts' and 'users'`.
**Why it happens:** After re-pointing the FK from `auth.users` to `public.users`, if the old FK wasn't dropped, PostgREST sees two paths and refuses to guess. Alternatively, if the `public.users` FK name differs from what PostgREST expects, the `!column_name` hint may fail. `[CITED: Supabase discussion #22870]`
**How to avoid:**
1. **Explicitly drop** the old FK constraint before creating the new one:
   ```sql
   ALTER TABLE community_posts DROP CONSTRAINT community_posts_user_id_fkey;
   ALTER TABLE community_posts ADD CONSTRAINT community_posts_user_id_fkey
     FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
   ```
2. **Notify PostgREST** to reload its schema cache after the migration:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. Test the select in the SQL editor before deploying client changes.
**Warning signs:** HTTP 400 with `code: "PGRST201"` in the supabase-js error object.

### Pitfall 3: RLS anon policy conflict (restoration order)
**What goes wrong:** Creating a new `posts_anon_read` policy errors with `policy "posts_anon_read" for table "community_posts" already exists`.
**Why it happens:** If the 021 migration's DROP was scoped incorrectly or somehow partially applied, the policy may linger.
**How to avoid:** Always use `DROP POLICY IF EXISTS` before `CREATE POLICY` in migrations that restore dropped entities:
```sql
DROP POLICY IF EXISTS "posts_anon_read" ON community_posts;
CREATE POLICY "posts_anon_read" ON community_posts
  FOR SELECT TO anon USING (is_blinded = FALSE);
```
**Warning signs:** `42710 duplicate_object` Postgres error during migration.

### Pitfall 4: R2 orphaned uploads on failed insert (D-09)
**What goes wrong:** R2 upload succeeds (R2 now holds the image), then `insert community_posts` fails (e.g., content validation trips a CHECK, or network drops). The user retries and uploads a fresh copy, leaving the first image permanently orphaned in R2.
**Why it happens:** The current flow has no cleanup on failure. D-09 explicitly defers cleanup to v2.
**How to avoid (v1 acceptable):**
1. Validate the post payload **before** calling R2 (title length, content length, team presence).
2. On post-insert failure, keep the form state populated so the user can retry without re-uploading.
3. Log orphans (`console.warn('[Community] R2 upload succeeded but DB insert failed — orphan:', publicUrls)`) so they're discoverable later.
**Warning signs:** Users report "I posted but my image didn't show up" — check R2 for orphan keys.

### Pitfall 5: CommunityContext initialization order on auth change
**What goes wrong:** Logged-out user → logs in → CommunityContext was initialized with anon Supabase client, so subsequent queries still use anon role even after auth completes. Or vice versa: `recent_searches` query runs before user is available, returns empty.
**Why it happens:** React Context provider runs its `useEffect` on mount, but the `user.id` from `AuthContext` may not be ready yet. `BlockContext.tsx` already handles this correctly (line 23-41) — use the same pattern.
**How to avoid:**
```ts
useEffect(() => {
  if (!user?.id) return;
  const loadRecents = async () => { /* ... */ };
  loadRecents();
}, [user?.id]);
```
The Supabase client uses JWT from storage automatically, so queries auto-scope once the session is active. No need to "reinitialize the client" — only guard on `user?.id`.
**Warning signs:** Recent searches empty despite DB rows; or anon-read policies activating when an authenticated user is present.

### Pitfall 6: Poll embedded select with `!left` join ambiguity (D-12)
**What goes wrong:** `.select('*, poll:community_polls(*, my_votes:community_poll_votes!left(option_id))')` returns empty `my_votes` even when the user has voted.
**Why it happens:** PostgREST's `!left` indicates a left join, but without a filter to `user_id = auth.uid()`, it returns **all** votes for all users. The embedded select for `my_votes` must also filter by the current user, but PostgREST doesn't allow runtime filters in embedded selects that depend on `auth.uid()` — **RLS does that work**.

The `community_poll_votes` RLS policy `poll_votes_public_read ... USING (TRUE)` means all votes are readable by anyone — so the embedded select returns all votes, not just mine. `[VERIFIED: migrations/005_rls_policies.sql:137-138]`
**How to avoid:** Either
- **Option A:** Fetch poll + options in the embedded select, then fetch my votes separately:
  ```ts
  const { data: votes } = await supabase
    .from('community_poll_votes')
    .select('option_id, poll_id')
    .eq('user_id', userId)
    .in('poll_id', pollIds);
  ```
- **Option B:** Add a **restrictive** RLS policy that only shows the user their own votes — but this breaks the poll_votes_public_read contract which is needed for other features.
- **Option C (recommended):** Change the CONTEXT D-12 pattern. Fetch posts+poll+options in one query; fetch votes in a second query; merge client-side. **This is more honest** and avoids RLS tangles.

**Warning signs:** UI shows "You voted for Option A" for every user; or the "my votes" array contains votes from other users.

**Action item for planner:** Consider proposing an adjustment to D-12 in the plan-check step — the "1 query" ideal has real RLS friction, so a 2-query fetch (posts-with-poll + votes-by-user) is likely cleaner.

### Pitfall 7: Conflating error codes 23505 and 23514 in D-14 report errors
**What goes wrong:** The client shows "already reported" when the user tries to report their own post (a 23514 check constraint violation, not a 23505 unique violation).
**Why it happens:** 
- **23505** = unique_violation → duplicate report (UNIQUE(reporter_id, target_type, target_id)) `[CITED: PostgreSQL error codes]`
- **23514** = check_violation → DB-side check constraint, e.g., the `check_self_report` trigger raising an exception
- Actually, `check_self_report` is a **trigger** raising `RAISE EXCEPTION 'Cannot report your own content'`, which surfaces as a **P0001 (raise_exception)** in PostgreSQL, *not* 23514. `[VERIFIED: migrations/002_community.sql:143-170]`

**How to avoid:** 
```ts
if (error.code === '23505') {
  showToast(t('community_already_reported'), 'error');
} else if (error.code === 'P0001' || error.message.includes('Cannot report your own content')) {
  showToast(t('community_cannot_self_report'), 'error');
} else {
  showToast(t('community_report_failed'), 'error');
}
```

**Warning signs:** User reports say "wrong error message" — check Postgres logs for actual error code.

### Pitfall 8: ILIKE SQL injection via user-supplied search query
**What goes wrong:** User searches for `%'; DROP TABLE...` and the `.or('title.ilike.%q%')` string is interpolated naively.
**Why it happens:** `.or()` takes a literal PostgREST filter string — it's **not** parameterized. `[CITED: Supabase docs — .or() is used as-is]`
**How to avoid:** 
1. **Escape percent and comma** from user input before building the filter:
   ```ts
   const safeQ = query.replace(/[%,]/g, '').trim();
   if (!safeQ) return [];
   ```
2. Use the `textSearch` method for safer search if you move to tsvector in v2.
3. **Length-limit** the query to ~50 chars.

**Warning signs:** Strange filter results when search contains special chars; or PostgREST errors like "malformed filter".

### Pitfall 9: Abandoning in-flight optimistic updates during fast toggles
**What goes wrong:** User double-taps like button. First request sends INSERT, second request sends DELETE before the first returns. DB ends up in an inconsistent state or unique constraint fires.
**Why it happens:** The `community_likes` UNIQUE(user_id, target_type, target_id) constraint means the second INSERT would fail if the first hasn't returned yet. Or worse: first DELETE completes, state rolls back, but user's second click already registered a new INSERT.
**How to avoid:** 
- Use a `Set<string>` ref of "pending like toggles" to debounce: if the same target id is already pending, ignore subsequent clicks until the in-flight one settles.
- Or: use the `pendingRequests` pattern — store the latest requested state, only commit the last one.

**Warning signs:** Users report "like count is wrong"; logs show 23505 unique_violation on community_likes.

### Pitfall 10: Trending scheduled job running but not affecting UI
**What goes wrong:** `SELECT * FROM cron.job_run_details` shows successful runs, but `is_trending` column never changes.
**Why it happens:**
- Function signature doesn't match (scheduler calls the wrong function name).
- Function logic depends on `auth.uid()` which is NULL when run by the scheduler — `auth.uid()` only returns a value inside a request context.
- `SECURITY INVOKER` (default) + scheduled as `postgres` means the function runs as `postgres` user which has BYPASSRLS — so the UPDATE should work. But if the function is `SECURITY DEFINER` + defined by a less-privileged user, RLS on `community_posts` (UPDATE policy) may block the update. `[CITED: citusdata/pg_cron docs]`

**How to avoid:**
- Define `update_trending_posts()` as plain `LANGUAGE plpgsql` (no SECURITY DEFINER needed since pg_cron runs as postgres on Supabase).
- Do **not** reference `auth.uid()` inside the function.
- Verify with:
  ```sql
  SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'update-trending';
  SELECT * FROM cron.job_run_details WHERE jobid = <id> ORDER BY start_time DESC LIMIT 5;
  ```

**Warning signs:** `cron.job_run_details.status = 'failed'` with a descriptive error in `return_message`.

## Code Examples

Verified patterns from official sources and existing code.

### Example 1: Service layer structure (mirror of photographerApi.ts)
```typescript
// Source: app/src/services/photographerApi.ts (existing project pattern)
// app/src/services/communityApi.ts

import { supabase } from './supabase';
import type {
  CommunityPostWithAuthor,
  CommunityCommentWithAuthor,
  CreatePostInput,
  UpdatePostInput,
  PostSortOrder,
  ReportReason,
} from '../types/community';
import type { PollWithOptions, CreatePollInput } from '../types/poll';

// ─── Types ────────────────────────────────────────────────
interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ─── Team Slug ↔ UUID mapping ─────────────────────────────
// (planner choice: reuse photographerApi's helpers or lift to _shared)
let _slugMap: Map<string, string> | null = null;
let _uuidToSlugMap: Map<string, string> | null = null;

async function ensureSlugMaps(): Promise<void> {
  if (_slugMap && _uuidToSlugMap) return;
  const { data } = await supabase.from('teams').select('id, slug');
  if (data) {
    _slugMap = new Map(data.map((t: { id: string; slug: string }) => [t.slug, t.id]));
    _uuidToSlugMap = new Map(data.map((t: { id: string; slug: string }) => [t.id, t.slug]));
  } else {
    _slugMap = new Map();
    _uuidToSlugMap = new Map();
  }
}

function teamUuidToSlug(uuid: string | null): string | null {
  if (!uuid || !_uuidToSlugMap) return null;
  return _uuidToSlugMap.get(uuid) ?? null;
}

function teamSlugToUuid(slug: string | null): string | null {
  if (!slug || !_slugMap) return null;
  return _slugMap.get(slug) ?? null;
}

// ─── Row → App type mappers ───────────────────────────────
function mapCommunityPost(row: any): CommunityPostWithAuthor {
  return {
    id: row.id,
    user_id: row.user_id,
    team_id: teamUuidToSlug(row.team_id),
    title: row.title,
    content: row.content,
    images: row.images ?? [],
    has_poll: row.has_poll ?? false,
    like_count: row.like_count ?? 0,
    comment_count: row.comment_count ?? 0,
    view_count: row.view_count ?? 0,
    is_edited: row.is_edited ?? false,
    is_trending: row.is_trending ?? false,
    is_blinded: row.is_blinded ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Client renders "탈퇴한 사용자" when is_deleted; mapper does NOT mutate (D-03).
    user: row.author
      ? { nickname: row.author.nickname, avatar_url: row.author.avatar_url }
      : { nickname: '', avatar_url: null },
    team: row.team ? { name_ko: row.team.name_ko } : null,
  };
}
```

### Example 2: Post list fetch with embedded author + team + pagination
```typescript
// Source: Supabase docs joins-and-nesting + existing photographerApi pattern
// After the FK repoint migration, this works.

export async function fetchCommunityPosts(params: {
  teamSlug?: string;
  sort: PostSortOrder;
  page: number;
  pageSize: number;
}): Promise<ApiResult<CommunityPostWithAuthor[]>> {
  try {
    await ensureSlugMaps();
    const from = params.page * params.pageSize;
    const to = from + params.pageSize - 1;

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .range(from, to);

    // Team filter
    if (params.teamSlug && params.teamSlug !== 'all') {
      const teamUuid = teamSlugToUuid(params.teamSlug);
      if (teamUuid) query = query.eq('team_id', teamUuid);
    }

    // Sort
    switch (params.sort) {
      case 'latest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'likes':
        query = query.order('like_count', { ascending: false });
        break;
      case 'comments':
        query = query.order('comment_count', { ascending: false });
        break;
      case 'popular':
        // Server-side: sort by (like_count + comment_count) via computed column
        // is unavailable; fall back to like_count desc + secondary comment_count desc
        query = query
          .order('like_count', { ascending: false })
          .order('comment_count', { ascending: false });
        break;
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(mapCommunityPost), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}
```

### Example 3: Comment fetch + tree build
```typescript
// Source: D-04 + existing CommunityPostDetailScreen tree build pattern

export async function fetchCommentsByPostId(
  postId: string,
): Promise<ApiResult<CommunityCommentWithAuthor[]>> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(mapCommunityComment), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// In CommunityContext, tree build stays client-side (already implemented, line 75-83
// of CommunityPostDetailScreen). No change needed there.
```

### Example 4: Optimistic like toggle with rollback
```typescript
// Source: React docs on functional setState + existing CommunityContext pattern
// Replaces lines 300-321 of current CommunityContext.tsx

import { useRef } from 'react';

const pendingLikeOps = useRef<Set<string>>(new Set());

const toggleLike = useCallback(async (
  targetType: LikeTargetType,
  targetId: string,
) => {
  if (!user?.id) return;

  // Debounce: ignore if an op for this target is already in flight
  if (pendingLikeOps.current.has(targetId)) return;
  pendingLikeOps.current.add(targetId);

  // Capture previous state for rollback
  const wasLiked = likedIds.has(targetId);

  // 1) Optimistic update
  setLikedIds((prev) => {
    const next = new Set(prev);
    if (wasLiked) next.delete(targetId);
    else next.add(targetId);
    return next;
  });

  const delta = wasLiked ? -1 : 1;
  if (targetType === 'post') {
    setPosts((pp) =>
      pp.map((p) => (p.id === targetId ? { ...p, like_count: Math.max(p.like_count + delta, 0) } : p)),
    );
  }
  // (similar for comments)

  // 2) Persist
  const { error } = wasLiked
    ? await supabase.from('community_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
    : await supabase.from('community_likes')
        .insert({ user_id: user.id, target_type: targetType, target_id: targetId });

  pendingLikeOps.current.delete(targetId);

  // 3) Rollback on error
  if (error) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.add(targetId);
      else next.delete(targetId);
      return next;
    });
    if (targetType === 'post') {
      setPosts((pp) =>
        pp.map((p) => (p.id === targetId ? { ...p, like_count: Math.max(p.like_count - delta, 0) } : p)),
      );
    }
    showToast(t('community_like_failed'), 'error');
  }
}, [user?.id, likedIds, showToast, t]);
```

### Example 5: Poll fetch (2-query approach per Pitfall 6)
```typescript
// Revised from D-12 embedded select — avoids RLS-ambiguity
// Fetch poll + options embedded, fetch user's votes separately.

export async function fetchPostWithPoll(
  postId: string,
  currentUserId: string | null,
): Promise<ApiResult<{ post: CommunityPostWithAuthor; poll: PollWithOptions | null; myVotes: string[] }>> {
  try {
    await ensureSlugMaps();

    // Query 1: post + poll + options
    const { data: postRow, error: postErr } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko),
        poll:community_polls (
          *,
          options:community_poll_options (*)
        )
      `)
      .eq('id', postId)
      .maybeSingle();

    if (postErr) return { data: null, error: postErr.message };
    if (!postRow) return { data: null, error: 'Post not found' };

    // Query 2: user's votes for this poll (only if logged in & has poll)
    let myVotes: string[] = [];
    if (currentUserId && postRow.poll) {
      const { data: votes } = await supabase
        .from('community_poll_votes')
        .select('option_id')
        .eq('poll_id', postRow.poll.id)
        .eq('user_id', currentUserId);
      myVotes = (votes ?? []).map((v: any) => v.option_id);
    }

    return {
      data: {
        post: mapCommunityPost(postRow),
        poll: postRow.poll ? mapPoll(postRow.poll) : null,
        myVotes,
      },
      error: null,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}
```

### Example 6: Report with specific error narrowing
```typescript
// Per Pitfall 7 — distinguish 23505 (duplicate) from P0001 (trigger raise)

export async function reportCommunityTarget(params: {
  reporterId: string;
  targetType: 'post' | 'comment';
  targetId: string;
  reason: ReportReason;
  detail?: string;
}): Promise<ApiResult<void>> {
  try {
    const { error } = await supabase.from('community_reports').insert({
      reporter_id: params.reporterId,
      target_type: params.targetType,
      target_id: params.targetId,
      reason: params.reason,
      detail: params.detail ?? null,
    });

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'ALREADY_REPORTED' };
      }
      if (error.code === 'P0001' || /self|own content/i.test(error.message)) {
        return { data: null, error: 'CANNOT_SELF_REPORT' };
      }
      return { data: null, error: error.message };
    }
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

// In CommunityContext.reportTarget:
// const { error } = await reportCommunityTarget(...)
// if (error === 'ALREADY_REPORTED') showToast(t('community_already_reported'), 'error');
// else if (error === 'CANNOT_SELF_REPORT') showToast(t('community_cannot_self_report'), 'error');
// else if (error) showToast(t('community_report_failed'), 'error');
```

### Example 7: Create post with R2 upload (D-09)
```typescript
// Source: D-09 + existing uploadCommunityImages pattern
// In CommunityWriteScreen.handleSubmit

const handleSubmit = useCallback(async () => {
  if (!canSubmit || !user?.id) return;
  setSubmitting(true);

  try {
    // 1) Upload images to R2 first
    let publicUrls: string[] = [];
    if (images.length > 0) {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No access token');

      const { data: urls, error: uploadErr } = await uploadCommunityImages(
        user.id,
        images,
        token,
      );
      if (uploadErr || !urls) {
        Alert.alert(t('write_upload_failed'), t('write_upload_failed_desc'));
        setSubmitting(false);
        return; // Keep form state for retry (D-18)
      }
      publicUrls = urls;
    }

    // 2) Create post (may include poll)
    const pollInput = showPoll ? { /* ... */ } : undefined;
    const { data: post, error: insertErr } = await createPost(
      {
        team_id: selectedTeamId ?? undefined,
        title: title.trim(),
        content: content.trim(),
        images: publicUrls,
      },
      pollInput,
    );

    if (insertErr || !post) {
      // Orphan R2 files — log for v2 cleanup
      if (publicUrls.length > 0) {
        console.warn('[Community] R2 upload succeeded but DB insert failed — orphan:', publicUrls);
      }
      Alert.alert(t('write_post_failed'), t('write_post_failed_desc'));
      setSubmitting(false);
      return; // Keep form state for retry
    }

    showToast(t('write_post_success'), 'success');
    navigation.goBack();
  } catch (e) {
    // Unexpected
    Alert.alert(t('write_post_failed'), e instanceof Error ? e.message : '');
    setSubmitting(false);
  }
}, [/* deps */]);
```

### Example 8: Search with ILIKE + player name join
```typescript
// Per D-07: two queries, merged client-side
// Source: Supabase docs .or() ilike multi-column + discussion #6778

export async function searchCommunityPosts(
  query: string,
): Promise<ApiResult<CommunityPostWithAuthor[]>> {
  try {
    const safeQ = query.replace(/[%,]/g, '').trim().slice(0, 50);
    if (!safeQ) return { data: [], error: null };

    await ensureSlugMaps();

    // Query 1: posts matching title OR content
    const { data: postsByText, error: err1 } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:users!user_id (nickname, avatar_url, is_deleted),
        team:teams (name_ko)
      `)
      .or(`title.ilike.%${safeQ}%,content.ilike.%${safeQ}%`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (err1) return { data: null, error: err1.message };

    // Query 2: find teams whose players match the query, then posts in those teams
    const { data: matchedPlayers } = await supabase
      .from('players')
      .select('team_id')
      .ilike('name_ko', `%${safeQ}%`);

    let postsByPlayerTeam: any[] = [];
    if (matchedPlayers && matchedPlayers.length > 0) {
      const teamIds = [...new Set(matchedPlayers.map((p: any) => p.team_id).filter(Boolean))];
      const { data: postsFromTeams } = await supabase
        .from('community_posts')
        .select(`
          *,
          author:users!user_id (nickname, avatar_url, is_deleted),
          team:teams (name_ko)
        `)
        .in('team_id', teamIds)
        .order('created_at', { ascending: false })
        .limit(20);
      postsByPlayerTeam = postsFromTeams ?? [];
    }

    // Merge + dedupe by id, keep latest first
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const p of [...(postsByText ?? []), ...postsByPlayerTeam]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { data: merged.map(mapCommunityPost), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}
```

### Example 9: Recent searches CRUD
```typescript
// Phase 1 Table + trigger already exists. Phase 3 wires it up.

export async function fetchRecentSearches(userId: string): Promise<ApiResult<string[]>> {
  try {
    const { data, error } = await supabase
      .from('recent_searches')
      .select('query')
      .eq('user_id', userId)
      .eq('search_type', 'community')
      .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map((r: any) => r.query), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}

export async function addRecentSearch(userId: string, query: string): Promise<ApiResult<void>> {
  try {
    // Delete any existing duplicate, then insert (to bump it to top)
    await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', userId)
      .eq('search_type', 'community')
      .eq('query', query);

    const { error } = await supabase
      .from('recent_searches')
      .insert({ user_id: userId, query, search_type: 'community' });
    if (error) return { data: null, error: error.message };
    // The trg_limit_recent_searches trigger keeps only the last 10 automatically.
    return { data: undefined, error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { data: null, error: msg };
  }
}
```

### Example 10: pg_cron scheduled trending update (D-06, D-11)
```sql
-- Source: citusdata/pg_cron README + Supabase docs + existing migrations
-- Part of 024_community_phase3.sql

-- ─── Part 1: Enable pg_cron ──────────────────────────────
create extension if not exists pg_cron with schema extensions;
grant usage on schema cron to postgres;

-- ─── Part 2: update_trending_posts() ─────────────────────
-- Runs as postgres (scheduler user), so bypasses RLS automatically.
-- NO SECURITY DEFINER needed since scheduler already has BYPASSRLS.
-- NO auth.uid() references — undefined in scheduler context.

CREATE OR REPLACE FUNCTION public.update_trending_posts()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '24 hours';
BEGIN
  -- Step 1: Clear old trending flags
  UPDATE community_posts
    SET is_trending = FALSE
    WHERE is_trending = TRUE;

  -- Step 2: Compute top 5 trending posts in 24h window
  WITH scored AS (
    SELECT
      id,
      (like_count * 2 + comment_count * 3 + view_count * 0.1) *
        -- freshness boost: newer posts get higher multiplier (1.0 to 2.0)
        (1 + GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)) AS score
    FROM community_posts
    WHERE created_at >= v_cutoff
      AND is_blinded = FALSE
    ORDER BY score DESC
    LIMIT 5
  )
  UPDATE community_posts
    SET is_trending = TRUE
    WHERE id IN (SELECT id FROM scored);
END;
$$;

-- ─── Part 3: atomic view_count RPC (D-11) ────────────────
CREATE OR REPLACE FUNCTION public.increment_post_view(post_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.community_posts
    SET view_count = view_count + 1
    WHERE id = post_id;
$$;

-- Allow authenticated + anon to call this RPC (reading guests count views too)
GRANT EXECUTE ON FUNCTION public.increment_post_view(UUID) TO authenticated, anon;

-- ─── Part 4: Schedule the trending job ──────────────────
-- Remove existing job if re-running migration
SELECT cron.unschedule('update-trending-posts')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-trending-posts');

SELECT cron.schedule(
  'update-trending-posts',
  '*/10 * * * *',                          -- every 10 minutes
  $cron$ SELECT public.update_trending_posts(); $cron$
);

-- Verify: SELECT * FROM cron.job WHERE jobname = 'update-trending-posts';
-- History: SELECT * FROM cron.job_run_details WHERE jobid = <id> ORDER BY start_time DESC LIMIT 5;
```

**Client-side usage:**
```typescript
// On CommunityPostDetailScreen mount:
useEffect(() => {
  if (!postId) return;
  supabase.rpc('increment_post_view', { post_id: postId }).then(({ error }) => {
    if (error) console.warn('[Community] view_count RPC failed:', error.message);
  });
}, [postId]);

// Trending list fetch:
const { data } = await supabase
  .from('community_posts')
  .select('*, author:users!user_id(...)')
  .eq('is_trending', true)
  .order('created_at', { ascending: false });
```

### Example 11: RLS policy restoration (D-19)
```sql
-- Source: Supabase docs RLS + migrations/005_rls_policies.sql pattern
-- Part of 024_community_phase3.sql

-- ─── Part 5: Restore anon SELECT on community tables ─────
-- D-19: Community tables allow anon read; user/notifications/etc stay locked

DROP POLICY IF EXISTS "posts_anon_read" ON community_posts;
CREATE POLICY "posts_anon_read" ON community_posts
  FOR SELECT TO anon
  USING (is_blinded = FALSE);

DROP POLICY IF EXISTS "comments_anon_read" ON community_comments;
CREATE POLICY "comments_anon_read" ON community_comments
  FOR SELECT TO anon
  USING (TRUE);

-- Polls, options, votes: allow anon read so guests can see poll state
DROP POLICY IF EXISTS "polls_anon_read" ON community_polls;
CREATE POLICY "polls_anon_read" ON community_polls
  FOR SELECT TO anon
  USING (TRUE);

DROP POLICY IF EXISTS "poll_options_anon_read" ON community_poll_options;
CREATE POLICY "poll_options_anon_read" ON community_poll_options
  FOR SELECT TO anon
  USING (TRUE);

DROP POLICY IF EXISTS "poll_votes_anon_read" ON community_poll_votes;
CREATE POLICY "poll_votes_anon_read" ON community_poll_votes
  FOR SELECT TO anon
  USING (TRUE);

-- Players: already has teams_public_read / players_public_read using `USING (TRUE)`
-- without role restriction. In migrations/005_rls_policies.sql these are USING (TRUE)
-- without TO — they apply to all roles. Verify after 024 migration runs whether
-- anon queries against players succeed; if not, add explicit TO anon.

DROP POLICY IF EXISTS "players_anon_read" ON players;
CREATE POLICY "players_anon_read" ON players
  FOR SELECT TO anon
  USING (TRUE);

-- IMPORTANT: leave public.users anon access locked. Only authenticated users
-- can read author info. Guests will see posts but author field will be NULL
-- (PostgREST returns empty object when the join target is blocked by RLS).
-- Client rendering must handle the null/missing author case gracefully.
```

**Critical clarification on D-19 + D-02 interaction:** If public.users stays behind authenticated-only RLS, then the anon-initiated `.select('*, author:users!user_id(...)')` will succeed for the `community_posts` rows but the `author` field will be empty (`{}` or `null`) for each post — because RLS blocks public.users reads for anon. The client must render a fallback ("익명" or the user icon) in that case. **This is acceptable and expected** per D-20 (guest limited access).

**Alternative if this is UX-unacceptable:** Create a **view** `public.community_author_safe` that exposes only `id`, `nickname`, `avatar_url`, `is_deleted` and grant anon SELECT on the view. Adjust the embedded select to use the view. But this complicates PostgREST's FK resolution — not recommended for v1.

### Example 12: FK repoint migration snippet
```sql
-- Part of 024_community_phase3.sql (Part 0: must run BEFORE RLS policies and pg_cron)
-- D-02: Repoint user FK to public.users for PostgREST embedded select

-- community_posts.user_id → public.users(id)
ALTER TABLE community_posts
  DROP CONSTRAINT IF EXISTS community_posts_user_id_fkey;
ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- community_comments.user_id → public.users(id)
ALTER TABLE community_comments
  DROP CONSTRAINT IF EXISTS community_comments_user_id_fkey;
ALTER TABLE community_comments
  ADD CONSTRAINT community_comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Reload PostgREST schema cache so new FKs are recognized
NOTIFY pgrst, 'reload schema';
```

**Note:** This migration causes existing community_posts/comments rows to become orphaned if the user is auth-only (no public.users row). Since the Phase 1 trigger `handle_new_user` always creates a public.users row on auth.users INSERT, and Phase 2 has been deployed, **every existing auth.users has a corresponding public.users row**. This migration is safe.

If there's any chance of data inconsistency, add a pre-check:
```sql
-- Safety check: verify no orphans before repointing
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM community_posts cp
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cp.user_id);
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Cannot repoint FK: % community_posts rows reference non-existent public.users', orphan_count;
  END IF;
END $$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side trending calculation in React useEffect | pg_cron scheduled DB function (D-06) | Phase 3 | Reduces client CPU, consistent across devices, eliminates useEffect loop bug |
| Anon SELECT all tables (005_rls_policies.sql) | Anon read fully dropped (021_drop_spam_and_cleanup.sql) → partial restoration for community only (Phase 3 024) | Phase 1 then Phase 3 | Tighter default security, explicit decision on which tables expose guest data |
| `user_id REFERENCES auth.users(id)` on content tables | Re-point to `public.users(id)` for PostgREST embedded select (D-02) | Phase 3 | Enables 1-query author fetch; pattern now consistent across Phase 1+ tables (which already use public.users) |
| Mutable `view_count` via client UPDATE | Atomic RPC `increment_post_view()` (D-11) | Phase 3 | Race-free; no lost increments |
| Mock data in CommunityContext (100%) | Full Supabase integration | Phase 3 | End of prototype phase for community domain |

**Deprecated/outdated:**
- **Client trending score logic** (`getTrendingScore`, `TRENDING_WINDOW_MS`, `TRENDING_THRESHOLD`, `MAX_TRENDING`, `trendingUpdated` ref in CommunityContext.tsx): **DELETE** in Phase 3. Moving to DB.
- **`mockCommunity.ts`**: Remove imports, delete file (or move to `_legacy/`).
- **Client-side `searchPosts(query)`**: Replace with `searchCommunityPosts(query)` DB query.

## Assumptions Log

All claims in this research are marked with `[VERIFIED:]` (direct verification via tool or file read), `[CITED:]` (confirmed by official documentation URL), or `[ASSUMED]` (training knowledge, needs user confirmation).

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | pg_cron runs scheduled jobs with BYPASSRLS on Supabase because the scheduler runs as `postgres` (which has BYPASSRLS by default) | §Common Pitfalls §10, §Code Examples §10 | Trending update function may silently fail to UPDATE rows if RLS blocks it. Mitigation: run verification SQL in SQL editor after deploying migration to confirm `is_trending` flips correctly. |
| A2 | The embedded select syntax `!column_name` (e.g., `users!user_id`) is equivalent to `!constraint_name` (e.g., `users!community_posts_user_id_fkey`) — both work in Supabase per the docs | §Architecture §1, §Pitfall 2 | If `!column_name` fails PGRST201, fall back to the constraint name. The research shows both forms are documented (Supabase uses column name in examples, PostgREST GitHub discussion uses constraint name). Tested in SQL editor during Wave 0 will disambiguate. |
| A3 | `public.users` RLS policies allow embedded SELECT join from community_posts for **authenticated** users, because `users_read_authenticated` policy `USING (is_deleted = FALSE)` returns true for non-deleted users | §Code Examples §2 | If the join row-filter interaction drops users incorrectly, author fields will be null. Verify in SQL editor. |
| A4 | For **anon** users, the embedded join `author:users!user_id(...)` will return null/empty author (not a query failure) because `public.users` has no anon policy | §Code Examples §11 | If PostgREST returns an error instead of null, anon reads break. Must verify with actual anon-role test (curl against /rest/v1 with anon key). |
| A5 | The `handle_new_user()` trigger (Phase 1) guarantees every auth.users has a matching public.users row, so the FK repoint migration has no orphans to worry about | §Code Examples §12 | If there are legacy auth.users without public.users (e.g., from prototype testing), the FK repoint would fail. Safety-check SQL included in example. |
| A6 | `useOptimistic` (React 19) is supported in React Native 0.81 via React 19.1 | §Standard Stack §Alternatives | Minor — we're not using it, but mentioned as alternative. Verified via reactnative.dev 0.78 blog. |
| A7 | Supabase Cloud free tier supports pg_cron creation via SQL migration | §Common Pitfalls §1 | If not, the migration fails — but the research shows Supabase Cron (built on pg_cron) is a standard feature and CREATE EXTENSION is documented. Mitigation: run the migration manually via dashboard SQL editor first to verify, before committing. |
| A8 | Search query length limiting to 50 chars is reasonable UX for Korean ILIKE search | §Code Examples §8, §Pitfall 8 | If too short, multi-word Korean queries fail. Adjust as needed — not a hard constraint. |

**Action item for planner:** Decide whether to add a "Wave 0 verification" task that runs small SQL snippets (or a Postgres dry-run) to verify A1-A5 before downstream waves depend on them. This is low cost (15 min) and eliminates the biggest risks.

## Open Questions (RESOLVED)

1. **D-12 embedded select vs 2-query tradeoff (Pitfall 6)**
   - What we know: The `my_votes:community_poll_votes!left(option_id)` pattern specified in D-12 will return votes from ALL users, not just the current user, because the `poll_votes_public_read` RLS policy allows public read.
   - What's unclear: Whether CONTEXT D-12 intended this, or whether the planner should propose a 2-query revision.
   - Recommendation: **Propose to user during plan-check phase** — use a 2-query approach (Example 5) and flag the divergence from D-12 explicitly. Alternative: add a SELECT policy on `community_poll_votes` that returns only `auth.uid() = user_id` OR all-row permissive policy (current) + a more restrictive `USING (auth.uid() = user_id)` permissive policy would combine with OR — so the restrictive version alone is blocked.
   - **RESOLVED:** Plan 03-01 Task 2 implements `fetchPostWithPoll(postId, currentUserId)` using a 2-query pattern (Query 1: post + poll + options via embedded select; Query 2: `community_poll_votes WHERE user_id = currentUserId AND poll_id = ?`). Acceptance criteria forbid any `my_votes:community_poll_votes!left(...)` embed. Documented as deliberate deviation from CONTEXT D-12 in 03-01 `must_haves.truths` and threat model T-03-01-05.

2. **`popular` sort on server side**
   - What we know: Client currently sorts by `(like_count + comment_count) DESC`. There's no computed column in community_posts.
   - What's unclear: Whether to compute this sort server-side in SQL (`ORDER BY like_count + comment_count DESC`), via a view, or leave it client-side after paginated fetch.
   - Recommendation: Sort server-side as `ORDER BY (like_count + comment_count) DESC, created_at DESC` — Postgres handles expression-based ordering natively. Alternatively, create a generated column. Client-side sort after pagination would break the page boundaries.
   - **RESOLVED:** Plan 03-01 Task 1 `fetchCommunityPostsByTeam` chains `.order('like_count', { ascending: false })`, `.order('comment_count', { ascending: false })`, `.order('created_at', { ascending: false })` for the `popular` sort. Server-side pagination preserved via `.range(from, to)` consistently applied.

3. **Anon read for post authors (A4)**
   - What we know: D-19 keeps `public.users` authenticated-only. D-02 embedded select assumes joined author data.
   - What's unclear: How PostgREST handles embedded select when the joined table has no applicable anon policy — does it return null author, empty object, or error?
   - Recommendation: Run a small test during Wave 0 implementation to verify behavior. The `CommunityPostCard` must degrade gracefully either way.
   - **RESOLVED:** Plan 03-01 `mapCommunityPost` returns empty-string `nickname` and safe default avatar when `row.author` is `null` or `undefined` (anon PostgREST behavior per Supabase docs: joined row missing → field is `null`, not an error). Plan 03-03 Task 1 `CommunityPostCard` and Task 3 `CommentItem` render `t('deleted_user')` when `post.user.is_deleted === true` OR `!post.user.nickname` — the empty-nickname branch catches the D-19 anon-read case. Wave 0 smoke test confirms the contract before Wave 1 starts.

4. **Context block-user refresh pattern (D-15)**
   - What we know: `BlockContext.blockUser()` must trigger `CommunityContext.refreshPosts()`. But Context providers can't directly call methods on other contexts (no shared parent to pass refs).
   - What's unclear: How to wire this cleanly. Options:
     - (a) Move both into a single parent context
     - (b) Use a pub/sub pattern via a shared event emitter
     - (c) Add a `blockedUsersVersion` counter in BlockContext that CommunityContext subscribes to via `useEffect([version])`
     - (d) Explicitly call `refreshPosts()` from the screen that initiates the block (CommunityPostDetailScreen)
   - Recommendation: **(c) `blockedUsersVersion` counter** — simplest, no cross-context calls, no parent changes. BlockContext exposes `version` number that increments on each blockUser/unblockUser. CommunityContext's fetch effect depends on `version`.
   - **RESOLVED:** Plan 03-02 Task 1 extends `BlockContext.tsx` with `blockedUsersVersion: number` state that increments in `blockUser` and `unblockUser`. `CommunityContext` initial-load effect depends on `[userId, blockedUsersVersion, currentTeam, currentSort]` so any block/unblock triggers a posts refresh transparently. Option (c) selected — no pub/sub, no parent provider changes.

5. **Trending score formula precision**
   - What we know: Current client formula is `like_count * 2 + comment_count * 3 + view_count * 0.1` + freshness boost (CONTEXT "Claude's Discretion").
   - What's unclear: Whether the freshness boost should be applied per-post in SQL (as shown in Example 10) or at ORDER BY time.
   - Recommendation: Apply per-post in the WITH clause as shown. Planner has discretion per CONTEXT.
   - **RESOLVED:** Plan 03-00 Task 2 Part 4 `update_trending_posts()` implements the Example 10 formula verbatim inside a CTE: `WITH scored AS (SELECT id, (like_count * 2 + comment_count * 3 + view_count * 0.1) * (1 + GREATEST(0, 1 - EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)) AS score FROM community_posts WHERE created_at >= NOW() - INTERVAL '24 hours')`, then UPDATEs `is_trending = TRUE` for the top 5 rows and `is_trending = FALSE` for the rest. Per-post freshness applied in the CTE, not at ORDER BY time.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase project | All Phase 3 work | ✓ | Project-level (single prod project) | — |
| Node.js + npm | Local Expo dev + admin build | ✓ (Phase 1/2 verified) | — | — |
| Expo CLI + dev device/sim | Mobile app testing | ✓ (Phase 2 validated end-to-end with OAuth) | ~54 | — |
| `@supabase/supabase-js` | Service layer | ✓ Installed | ^2.100.0 → 2.103.0 | — |
| R2 `get-upload-url` Edge Function | Image upload (D-09) | ✓ Deployed (Phase 2 used for avatar + photo-posts) | — | — |
| pg_cron extension on Supabase project | Trending DB cron (D-06) | ✗ Not yet enabled | — | **No fallback** — blocker, must be enabled in 024 migration. See Pitfall 1. |
| PostgreSQL 15+ | Required for `security_invoker` views, etc. | ✓ Supabase default | — | — |
| `public.users` table + trigger | Phase 1 delivered | ✓ | — | — |
| `user_blocks` table + RLS | Phase 1/2 delivered | ✓ | — | — |
| `recent_searches` table + trigger | Phase 1 delivered | ✓ | — | — |

**Missing dependencies with no fallback:**
- **pg_cron extension enablement** — must be addressed in the 024 migration. Without this, D-06 trending cannot be implemented. Mitigation: migration does `create extension if not exists`.

**Missing dependencies with fallback:**
- None.

**Verification steps for Wave 0:**
```bash
# 1. Confirm supabase-js version at runtime
node -e "console.log(require('./app/node_modules/@supabase/supabase-js/package.json').version)"

# 2. After 024 migration applied, verify pg_cron:
# (Run in Supabase SQL editor)
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
SELECT * FROM cron.job WHERE jobname = 'update-trending-posts';
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | **None currently** — no Jest, Vitest, or equivalent in `app/` or `admin/`. Phase 1 notes mention "테스트 환경 설정 및 테스트 가이드 작성" (260406-f50) but no tests are checked in. `[VERIFIED: grep testing in app/package.json → none]` |
| Config file | None — see Wave 0 |
| Quick run command | `cd app && npx tsc --noEmit` (TypeScript check only) |
| Full suite command | `cd app && npx tsc --noEmit && <manual QA plan>` |
| Phase gate | Full typecheck green + manual smoke test matrix green before `/gsd-verify-work` |

**Recommendation:** Phase 3 is too late in the project to bootstrap a full Jest/Vitest suite. Instead, use a **3-layer validation strategy**:

1. **Compile-time checks:** TypeScript `strict: true` is the cheapest correctness net. The `mapRow*` → app type contract catches many mapping bugs at compile time.
2. **SQL-level validation:** Manual SQL scripts run in the Supabase SQL editor during Wave 0 to verify RLS, triggers, and the new function. These are commit-able as `supabase/tests/phase3-smoke.sql` (a plain SQL file that can be diff-reviewed).
3. **Manual E2E matrix:** A checklist of user flows the validator agent walks through on a dev build. Recorded in `.planning/phases/03-community/03-VALIDATION.md` when downstream generator runs.

If a test framework is introduced in a later phase, these SQL and manual cases should be portable.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated? | Validation Command / File |
|--------|----------|-----------|-----------|---------------------------|
| COMM-01 | communityApi.ts exists with all functions returning `ApiResult<T>` | unit (compile) | ✅ | `cd app && npx tsc --noEmit` — strict TS fails if shape is wrong |
| COMM-02 | CommunityContext uses real Supabase (no mock imports) | unit (compile + grep) | ✅ | `cd app && npx tsc --noEmit && grep -r "mockCommunity\|MOCK_POSTS\|MOCK_COMMENTS" app/src/contexts/CommunityContext.tsx && exit 1` (expect grep to fail = 0 matches) |
| COMM-03 | Post CRUD — title/content length enforced by DB CHECK | integration (SQL) | ✅ | `supabase/tests/phase3-smoke.sql` — INSERT with title > 30 chars expects constraint error |
| COMM-04 | Comment tree + soft delete | e2e (manual) | ⚠️ manual | QA matrix: write parent → reply → delete parent → verify "삭제된 댓글입니다" renders |
| COMM-05 | Like toggle + idempotency | integration (SQL) | ✅ | SQL: double-INSERT expects 23505; verify `like_count` increments via trigger |
| COMM-06 | Poll single/multi + expiry block | e2e (manual) + SQL | ⚠️ mixed | SQL: vote twice expects check_poll_vote exception; QA: create 24h poll, wait, verify disabled |
| COMM-07 | Report self-block and dup-block | integration (SQL) | ✅ | SQL: `INSERT` into community_reports where reporter = target author → expect P0001; duplicate → expect 23505 |
| COMM-08 | R2 upload + post includes URLs | e2e (manual) | ⚠️ manual | QA: write post with 3 images → verify images array contains 3 public URLs → verify display in detail |
| COMM-09 | Search finds posts by title/content/player | integration (SQL + client) | ✅ | SQL: seed post, run .or(), expect returned; client TS check on search fn signature |
| COMM-10 | Recent searches limited to 10 | integration (SQL) | ✅ | SQL: insert 11 rows, expect 10 remaining after trigger |
| COMM-11 | Trending is updated by pg_cron | integration (SQL) | ✅ | SQL: `SELECT public.update_trending_posts(); SELECT is_trending FROM community_posts WHERE is_trending = true` — expect ≤ 5 rows |
| COMM-12 | Optimistic like rolls back on error | e2e (manual) | ⚠️ manual | QA: simulate network error, tap like, verify count reverts + toast shown |

### Sampling Rate

- **Per task commit:** `cd app && npx tsc --noEmit` — sub-10-second check. Catches mapping errors, missing imports, type mismatches.
- **Per wave merge:** `cd app && npx tsc --noEmit` + `supabase/tests/phase3-smoke.sql` run against local Supabase (or staged project). Sub-1-minute.
- **Phase gate:** Full typecheck + full SQL smoke + manual QA matrix green before `/gsd-verify-work`.

### Wave 0 Gaps (things to create BEFORE implementation waves start)

- [ ] `supabase/tests/phase3-smoke.sql` — consolidated SQL smoke test script covering constraint violations, trigger firings, RLS outcomes. One file, idempotent, commit-able.
- [ ] `.planning/phases/03-community/03-VALIDATION.md` — the manual QA matrix (generated by validation generator from this research's Req → Test map).
- [ ] Seed data for smoke tests — 2-3 users, 5-10 posts, some comments, one active poll. Either a separate SQL file or embedded in the smoke script with cleanup at the end.
- [ ] **pg_cron verification query** — `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'update-trending-posts') ORDER BY start_time DESC LIMIT 3;` — used by validator after first 10-minute window elapses.
- [ ] **FK repoint dry-run** — a pre-migration SELECT that confirms zero orphans between community_posts.user_id and public.users.id.

### Unit-Level Invariants (compile + mapping layer)

- `mapCommunityPost(row)` and `mapCommunityComment(row)` are **pure functions** — given the same DB row, return the same output. Verify by TypeScript strict typing.
- `mapCommunityPost` handles `row.author === null` gracefully (anon-read fallback).
- `mapCommunityPost` never throws on missing optional fields (`row.images ?? []`, `row.author?.nickname ?? ''`).
- `teamSlugToUuid(null)` and `teamUuidToSlug(null)` return `null` not throw.
- All `fetchXxx` functions return `{ data: null, error: string }` on failure, never throw to caller.
- All `createXxx` functions await before returning (no fire-and-forget).

### Integration-Level Invariants (Supabase round-trip)

- **RLS auth**: Query from logged-in user returns their own posts (public read) + others' non-blinded posts minus blocked.
- **RLS anon (D-19)**: Query from anon client returns non-blinded community_posts + author field as NULL (public.users stays locked).
- **FK integrity**: DELETE from auth.users cascades to public.users, which cascades to community_posts (via repointed FK). Verify with test user.
- **Trigger firings**: INSERT into community_likes → `community_posts.like_count` increments by 1. DELETE → decrements.
- **Unique constraint**: Duplicate community_likes INSERT returns 23505.
- **Self-report trigger**: INSERT community_reports where reporter = author returns P0001 with "Cannot report your own content".
- **Poll vote trigger**: INSERT community_poll_votes after `expires_at` returns exception "Poll is closed or expired".
- **recent_searches limit**: After 11th insert, row count = 10 (oldest deleted).
- **pg_cron execution**: After 10-minute interval, `cron.job_run_details.status = 'succeeded'` for the update-trending-posts jobid.
- **is_trending flip**: Before run: no rows have is_trending=TRUE. After run: top 5 by score have is_trending=TRUE, rest FALSE.

### E2E Invariants (user flows on a real device/simulator)

| Flow | Trigger | Expected Observable |
|------|---------|---------------------|
| Create post → list → detail | Tap FAB → fill form → Submit | New post appears at top of list within 1 refresh; detail screen shows post |
| Create post with 3 images | Add 3 images → submit | R2 URLs saved in post; detail shows horizontal image scroll |
| Write comment → displayed | Type + send | Comment appears immediately after await |
| Delete own comment | Long-press + delete | Comment shows "삭제된 댓글입니다" |
| Like toggle (optimistic) | Tap heart | Count updates instantly; stays updated on refresh; no error toast |
| Like toggle with network error | Tap heart (airplane mode) | Count reverts; error toast shown |
| Poll vote (single) | Tap option | Bar + % shown; buttons disable |
| Poll vote (multiple) | Tap 2 options | Both show selected |
| Poll expired | Load old post | Options disabled; "마감된 투표" shown |
| Report own post | Tap ... → Report | Toast "본인 글은 신고할 수 없습니다" |
| Report twice | Tap ... → Report, then Report again | Toast "이미 신고한 콘텐츠입니다" |
| Block user → refresh | Tap ... → Block | List no longer shows blocked user's posts |
| Search by player name | Search "김도영" | Kia posts return |
| Save recent search | Search query, back, reopen | Recent search shown |
| Clear recent searches | Tap Clear | List empty |
| Trending tab | Wait 10 minutes after activity | Trending posts reflect recent activity |
| Guest mode list | Log out, open community | List shows posts; author fields may be blank |
| Guest mode write → login gate | Tap FAB | Login prompt |
| Post view count | Open post detail | view_count increments by 1 |

### Observable Signals (what logs/errors/DB state to inspect at each layer)

| Layer | Signal | How to Check |
|-------|--------|--------------|
| **UI (mobile)** | Rendered values match expected | Visual inspection on dev build; React Native Debugger |
| **Context state** | `useCommunity().posts.length` grows with pagination | Add temporary `console.log('[Community] posts:', posts.length)` during dev |
| **Network layer** | HTTP responses from Supabase | Flipper network inspector; or enable Supabase debug logs |
| **supabase-js errors** | PostgrestError `.code`, `.message`, `.details` | `console.warn('[Community] error:', error.code, error.message)` in service layer |
| **Postgres** | Row counts, trigger firings, constraint violations | Supabase SQL editor: `SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 5;` etc. |
| **RLS enforcement** | Query returns fewer rows than expected | Run same query with `SELECT auth.uid();` to confirm role; use Supabase dashboard's "RLS toggle" |
| **pg_cron** | Job status | `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;` |
| **is_trending update** | Top 5 flagged | `SELECT id, title, like_count, comment_count, is_trending, created_at FROM community_posts WHERE is_trending = TRUE;` |
| **R2 uploads** | Object count in bucket | Cloudflare R2 dashboard, prefix `community-posts/` |
| **Auth session** | User ID matches expected | `await supabase.auth.getUser()` in dev console |

## Security Domain

Phase 3 manipulates user-generated content (posts, comments), user-owned metadata (reports, likes, poll votes), and requires partial restoration of anon-read RLS. Security is central.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | YES | Supabase Auth (delivered Phase 2). All write operations gated on `useLoginGate()`; D-20. |
| V3 Session Management | YES | Supabase Auth session with AsyncStorage persistence (delivered Phase 2). No Phase 3 changes. |
| V4 Access Control | YES | RLS policies on all community_* tables; D-14 (self-report), D-15 (block), D-19 (anon partial), D-20 (login gate) |
| V5 Input Validation | YES | DB CHECK constraints (title 1-30, content 1-1000, comment 1-300); client UI validation; search query sanitization (Pitfall 8) |
| V6 Cryptography | NO | No new cryptographic primitives. JWT handled by Supabase. R2 presigned URLs signed by Edge Function. |
| V7 Error Handling | YES | Typed error codes (23505, P0001); no stack traces leaked to UI; `console.error` and `console.warn` only in dev |
| V8 Data Protection | YES | Soft delete preserves author references (D-03); RLS blocks cross-user data leakage |
| V12 Files & Resources | YES | Image uploads via Edge Function presigned URLs (Phase 1/2 control); `community-posts` prefix isolation; ≤10 images DB CHECK constraint |
| V13 API & Web Service | YES | Supabase Auth JWT on all non-anon requests; anon role scope limited (D-19) |

### Known Threat Patterns for React Native + Supabase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via `.or()` search interpolation | Tampering | Sanitize `%,` from search query (§Pitfall 8) |
| Cross-user post modification | Tampering/Elevation | RLS `posts_update_own USING (auth.uid() = user_id)` (verified migration 005) |
| Self-report exploit | Repudiation | `check_self_report` trigger (verified migration 002) |
| Duplicate report spam | Repudiation | UNIQUE(reporter_id, target_type, target_id) |
| Poll ballot stuffing (single mode) | Tampering | `check_poll_vote` trigger (verified migration 003) |
| Like count forge | Tampering | `like_count` is NEVER set by client; only triggers mutate it |
| Orphan R2 images (denial of service via storage) | DoS | Upload count gated by presigned URL count; v1 accepts orphans, v2 cleanup (D-09) |
| RLS bypass via SECURITY DEFINER function | Elevation | `increment_post_view` is limited-scope (single UPDATE); `update_trending_posts` is plain `LANGUAGE plpgsql` running as postgres under scheduler (§Example 10) |
| Author data leak to anon (D-19 interaction) | Information disclosure | Intentional: anon sees content, not author private data. `public.users` anon-read stays locked (D-19 clarification in Example 11) |
| Blocked user content still visible | Information disclosure | RLS `posts_public_read` excludes blocked via subquery (verified migration 005) |
| Trending cron infinite loop / long run | DoS | 10-minute interval, small 5-row UPDATE; `SELECT COUNT(*) FROM community_posts WHERE created_at >= NOW() - INTERVAL '24 hours'` expected small. If scale grows, add LIMIT. |
| View count RPC abuse (mass increments) | Tampering/DoS | Low severity — view_count is informational; rate limit at Edge if abused. Not in scope for v1. |

**Key security notes:**
- **D-19 + public.users tradeoff:** Guests CAN see post content but CANNOT see author info. This is deliberate. Do not "fix" this by adding public.users anon policies — it breaks the privacy model.
- **`increment_post_view()` must be SECURITY DEFINER** to allow anon callers to UPDATE community_posts.view_count (which has RLS on UPDATE limited to owners). The function is bounded (single UPDATE by id) so abuse is limited.
- **`update_trending_posts()` should NOT be SECURITY DEFINER** — pg_cron on Supabase runs as postgres which has BYPASSRLS. Adding SECURITY DEFINER is unnecessary and creates a risk if the function is ever exposed via RPC (it should NOT be — only scheduled).

## Sources

### Primary (HIGH confidence)

**Verified files in this repo:**
- `app/src/services/photographerApi.ts` — Phase 2 delivered pattern, 518 lines, mirrored for communityApi
- `app/src/services/r2Upload.ts` — uploadCommunityImages already exists
- `app/src/services/supabase.ts` — Client singleton, strict env enforcement
- `app/src/contexts/CommunityContext.tsx` — Current mock implementation, 451 lines, migration target
- `app/src/contexts/BlockContext.tsx` — Reference pattern for auth-dependent context init
- `app/src/types/community.ts` — Type contracts
- `app/src/types/poll.ts` — Poll type contracts + helpers
- `app/src/screens/community/CommunityMainScreen.tsx` — Integration point
- `app/src/screens/community/CommunityPostDetailScreen.tsx` — Integration point, tree build pattern
- `app/src/screens/community/CommunityWriteScreen.tsx` — Integration point for D-09
- `app/src/screens/community/CommunitySearchScreen.tsx` — Integration point for D-08
- `supabase/migrations/002_community.sql` — Tables + triggers (like, comment count, self-report, auto-blind)
- `supabase/migrations/003_polls.sql` — Tables + check_poll_vote trigger
- `supabase/migrations/004_spam_filter.sql` — recent_searches + limit_recent_searches trigger
- `supabase/migrations/005_rls_policies.sql` — Current RLS (baseline)
- `supabase/migrations/011_users.sql` — public.users + handle_new_user trigger
- `supabase/migrations/012_rls_helpers.sql` — is_admin, is_owner helpers
- `supabase/migrations/021_drop_spam_and_cleanup.sql` — anon policy removal context
- `supabase/migrations/023_rls_policies_remaining.sql` — Pattern for new RLS

**Verified via npm:**
- `npm view @supabase/supabase-js version` → `2.103.0` (current stable, installed pin ^2.100.0 resolves)

**Official Supabase docs:**
- [Querying Joins and Nested tables](https://supabase.com/docs/guides/database/joins-and-nesting) — PostgREST embedded select with `!column_name` hints
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — `TO anon` policies, multiple policies combine with OR
- [pg_cron: Schedule Recurring Jobs with Cron Syntax in Postgres](https://supabase.com/docs/guides/database/extensions/pg_cron) — Supabase pg_cron overview
- [Supabase Cron | Schedule Recurring Jobs in Postgres](https://supabase.com/modules/cron)
- [JavaScript API Reference - select](https://supabase.com/docs/reference/javascript/select) — `.range()`, count options
- [JavaScript API Reference - ilike](https://supabase.com/docs/reference/javascript/ilike) — ILIKE filter syntax
- [JavaScript API Reference - rpc](https://supabase.com/docs/reference/javascript/rpc) — supabase.rpc() signature

**Official PostgreSQL docs:**
- [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) — RLS policy syntax
- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — Policy combination rules (OR for permissive)

**Official PostgREST docs:**
- [Resource Embedding](https://docs.postgrest.org/en/v12/references/api/resource_embedding.html) — Hint disambiguation (fetch blocked by 403 but referenced in Supabase docs)

**Official React / React Native docs:**
- [React v19](https://react.dev/blog/2024/12/05/react-19) — useOptimistic
- [React Native 0.78 - React 19 and more](https://reactnative.dev/blog/2025/02/19/react-native-0.78) — Confirms React 19 support in RN
- [useOptimistic – React](https://react.dev/reference/react/useOptimistic)

**Official pg_cron:**
- [citusdata/pg_cron README](https://github.com/citusdata/pg_cron) — cron.schedule() signatures, per-user permissions, job execution model

### Secondary (MEDIUM confidence — verified against primary)

- [PostgreSQL Error code 23505 - How to fix](https://bobcares.com/blog/postgresql-error-code-23505/) — Unique violation interpretation (cross-referenced with Supabase error code docs)
- [Resource Embedding — PostgREST 11.2 documentation](https://postgrest.org/en/v11/references/api/resource_embedding.html) — Verified PostgREST hint syntax
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — anon/authenticated policy split
- [Search on multiple column with ilike · supabase discussion #6778](https://github.com/orgs/supabase/discussions/6778) — `.or()` ILIKE pattern
- [Receiving strange error code: PGRST201 · supabase discussion #22870](https://github.com/orgs/supabase/discussions/22870) — FK ambiguity resolution with `!constraint_name`
- [cron schema not available in seed.sql · supabase issue #28966](https://github.com/supabase/supabase/issues/28966) — `create extension pg_cron with schema extensions;` pattern
- [Learn Supabase Database Functions with Cron & Triggers · Medium](https://medium.com/@jigsz6391/learn-supabase-database-functions-with-cron-triggers-4769239b3a56) — Real-world pg_cron pattern

### Tertiary (LOW confidence — flagged as ASSUMED)

- General web search results about `pg_cron` execution model on Supabase Cloud — cross-referenced but not directly confirmed by Supabase staff. Flagged in Assumptions Log A1/A7.
- React 19 `useOptimistic` on React Native 0.81 (vs. 0.78) — extrapolated from RN 0.78 confirming React 19 support, then assumed forward compat. Flagged A6.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries already installed and verified, no new dependencies.
- Architecture patterns: **HIGH** — photographerApi.ts exists in repo, pattern is literal. Context migration is a structural refactor, not novel.
- Pitfalls: **HIGH** (project-specific) + **MEDIUM** (Supabase cloud behavior) — repo grep confirmed the FK and pg_cron gaps; Supabase-cloud-specific pg_cron scheduler role verified by multiple sources, not by direct testing.
- RLS policy restoration (D-19): **HIGH** — exact SQL patterns verified against existing migrations.
- Trending DB function: **MEDIUM** — syntax verified, behavior on Supabase scheduler role assumed based on pg_cron docs + Supabase RLS + BYPASSRLS documentation. Wave 0 SQL verification eliminates this risk.
- PostgREST embedded select + FK hint: **MEDIUM-HIGH** — both `!column_name` (Supabase docs) and `!constraint_name` (PostgREST GitHub) are documented; the exact behavior after FK repoint is the biggest open risk and is explicitly in Assumptions Log.
- Validation architecture: **MEDIUM** — project has no test framework, recommendation is pragmatic (SQL + manual matrix).

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — Supabase pg_cron / RLS / PostgREST are stable APIs; unlikely to change meaningfully during the 6-week sprint)
