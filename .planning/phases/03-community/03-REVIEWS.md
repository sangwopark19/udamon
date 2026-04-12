---
phase: 3
reviewers: [codex]
reviewed_at: 2026-04-12T15:30:00+09:00
plans_reviewed: [03-00-PLAN.md, 03-01-PLAN.md, 03-02-PLAN.md, 03-03-PLAN.md, 03-04-PLAN.md]
pr: "#3 Phase 3: Community"
---

# Cross-AI PR Review — Phase 3: Community (PR #3)

## Codex Review

### Summary

검색 결과에서 상세 화면으로 들어갈 때 캐시에 없는 게시글을 로드하지 못하는 기능 오류가 있습니다. 또한 삭제 댓글 원문이 DB/API에 그대로 남아 직접 조회로 노출될 수 있어 수정이 필요합니다.

### Concerns

- **[P2/HIGH] 캐시 밖 게시글을 상세 화면에서 로드 불가** — `CommunityPostDetailScreen.tsx:81-117`
  검색 결과나 알림/딥링크처럼 현재 `posts`/`trendingPosts` 캐시에 없는 `postId`로 진입하면, 이 effect는 댓글과 투표만 조회하고 게시글 본문을 `fetchPostById` 등으로 채우지 않습니다. `getPost(postId)`는 캐시만 보므로 `initialLoadDone`이 true가 된 뒤 실제 존재하는 글도 `community_post_not_found`로 표시됩니다.

- **[P2/MEDIUM] 삭제 댓글의 원문이 DB에 그대로 노출** — `communityApi.ts:487-506`
  댓글 삭제 시 `is_deleted`만 true로 바꾸고 `content`는 그대로 남습니다. `community_comments` SELECT 정책은 일반 클라이언트가 `content` 컬럼을 읽을 수 있으므로, Supabase API를 직접 호출하면 삭제된 댓글 원문이 계속 노출됩니다.

---

## Consensus Summary (Codex + Claude 검증)

### Agreed Concerns

#### 1. [HIGH] 검색 결과 → 상세 화면 진입 시 게시글 로드 실패

**검증 결과:** 확인됨.

- `CommunitySearchScreen`의 `searchPosts()`는 결과를 로컬 `results` state에만 저장
- 검색 결과 탭 → `navigation.navigate('CommunityPostDetail', { postId })` 호출
- `CommunityPostDetailScreen`의 `getPost(postId)`는 context의 `posts` + `trendingPosts`만 탐색 (`CommunityContext.tsx:237-242`)
- 검색 결과가 첫 페이지 20개나 트렌딩 5개에 없으면 `getPost`이 `undefined` 반환
- `initialLoadDone = true` 후 → "게시글을 찾을 수 없습니다" 표시

**수정 방향:** `CommunityPostDetailScreen`의 useEffect에서 `getPost(postId)`가 없을 때 `fetchPostById(postId)`를 호출하여 개별 로드 + context posts에 추가하는 fallback 필요.

#### 2. [MEDIUM] 삭제된 댓글 원문 DB 노출

**검증 결과:** 확인됨 (의도된 트레이드오프이나 보안 위험 존재).

- `community_comments`에 `CHECK (char_length(content) >= 1)` 제약 존재
- 빈 문자열로 덮어쓰면 SQLSTATE 23514 에러 → 코드 주석에 명시적으로 기록됨
- 그러나 `comments_anon_read` RLS 정책이 `USING (TRUE)`로 설정 → 비인증 사용자도 직접 API 호출로 원문 접근 가능

**수정 방향:** 
  - 방법 A: `content`를 placeholder 문자열 `"[삭제됨]"`으로 대체 (CHECK 통과)
  - 방법 B: DB 트리거로 `is_deleted = true` 시 자동으로 content 치환
  - 방법 C: RLS에서 `is_deleted = true`인 댓글의 content 컬럼을 마스킹 (computed column 또는 view)

### Additional Concerns (Claude 분석)

#### 3. [MEDIUM] `getFilteredPosts`가 selector와 command를 혼합

- `CommunityContext.tsx:244-258` — `getFilteredPosts`는 `posts`를 반환하면서 동시에 `setCurrentTeam`/`setCurrentSort`로 state를 변경
- `CommunityMainScreen`의 useEffect에서 호출 시 의존성 체인: `getFilteredPosts` → `currentTeam` 변경 → `getFilteredPosts` re-create → useEffect 재실행 (2회 안정화)
- 기능적으로는 동작하지만 불필요한 렌더 사이클 1회 발생

#### 4. [LOW] 검색 쿼리 sanitization 범위

- `communityApi.ts:740` — `replace(/[%,()]/g, '')` 처리로 PostgREST `.or()` injection 방지
- 괄호 제거 후에도 `.` (마침표), `*` (별표), `!` 등은 통과 가능
- 현재 ILIKE 패턴에서는 실질적 위험은 없지만, 향후 필터 확장 시 주의 필요

#### 5. [LOW] `ensureSlugMaps` 중복 호출

- `communityApi.ts`와 `photographerApi.ts`가 각각 독립적으로 `ensureSlugMaps`를 구현
- 두 파일 모두 동일한 `teams` 테이블을 조회하므로 앱 초기화 시 2회 불필요한 쿼리 발생
- v1 영향은 미미하지만, 공유 모듈 추출이 자연스러운 시점

### Strengths

- **마이그레이션 안전성:** `024_community_phase3.sql`의 orphan pre-check가 FK repoint 실패를 방지하는 훌륭한 방어 장치
- **SECURITY DEFINER 사용 구분:** `increment_post_view`는 DEFINER + GRANT (anon 필요), `update_trending_posts`는 non-DEFINER + no GRANT (cron 전용) — 올바른 보안 판단
- **Optimistic likes 구현:** `pendingLikeOps` ref로 double-tap 방지 + 실패 시 정확한 rollback — race condition 없음
- **useEffect cleanup:** 모든 비동기 effect에서 `cancelled` 패턴 적용 — 메모리 누수 방지
- **검색 sanitization:** PostgREST `.or()` 비매개변수화 문제를 정확히 인지하고 방어
- **Smoke test:** FK 방향, pg_cron, CHECK 제약, RPC 등을 자동 검증하는 363줄의 포괄적 테스트
- **migration 028:** `update_trending_posts`에 대한 EXECUTE 권한 사후 REVOKE — 보안 후속 조치 완료

### Risk Assessment

**전체 위험도: MEDIUM**

검색 → 상세 진입 버그(#1)는 사용자 경험에 직접 영향을 주는 기능 결함이므로 머지 전 수정이 권장됩니다. 삭제 댓글 원문 노출(#2)은 보안 관점에서 중요하지만 v1 초기 사용자 규모에서는 리스크가 낮습니다.

DB 마이그레이션, RLS 정책, 서비스 레이어, Context 전환은 전반적으로 잘 구조화되어 있으며, 기존 패턴(`photographerApi`)을 일관되게 따르고 있습니다. pg_cron 트렌딩 계산과 보안 방어(SECURITY DEFINER 구분, search sanitization)가 적절합니다.
