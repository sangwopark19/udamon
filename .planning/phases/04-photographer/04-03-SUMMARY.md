---
phase: 04-photographer
plan: 03
subsystem: app-state
tags: [react, context, supabase, photographer, refactor, mock-removal, pagination, optimistic-ui]

requires:
  - phase: 04-photographer
    plan: 02
    provides: photographerApi 확장 (submitPhotographerApplication, fetchMyPhotographerApplication, fetchCheerleaders, fetchCollectionPosts, fetchPhotoPosts 페이지네이션, createPhotoPost videos), Cheerleader/PhotographerApplication 타입, photographerGrade util
provides:
  - PhotographerContext.tsx Supabase 전용 재작성 (mock 완전 제거, isRemote/merge 로직 삭제)
  - 초기 state empty + loading=true → useEffect refreshData 7개 병렬 fetch
  - 페이지네이션 — loadMorePhotoPosts(teamSlug?) + hasMorePhotoPosts + loadingMoreRef + filter switch reset + dedupe (D-23)
  - 좋아요/팔로우 optimistic + rollback + user.id 주입 + pending-op race guard (D-22 bug fix)
  - 컬렉션 await 전환 — createCollection / deleteCollection / addPostToCollection / removePostFromCollection (D-21)
  - getCollectionPosts(collectionId) 신규 메소드 (CollectionDetailScreen 진입점, PHOT-08)
  - fetchUserPhotoLikes / fetchUserFollows 로 로그인 사용자 likedIds/followedPgIds 복원
  - mock 데이터 파일 삭제 (mockPhotographers.ts 586 lines, mockCheerleaders.ts 233 lines)
affects: [04-04, 04-05]

tech-stack:
  added: []
  patterns:
    - "Phase 3 D-16 mirror — 초기 state empty + useEffect refreshData + Supabase 전용 (CommunityContext 패턴 그대로 적용)"
    - "Pending-op guard — pendingLikeOps/pendingFollowOps Set<string> ref 로 double-tap race 방지 (CommunityContext 동일 패턴)"
    - "Filter-switch reset on loadMore — currentTeamSlug 변경 감지 시 page=0 + posts=[] 리셋, 그 외에는 page+1 + dedupe append"
    - "Phase 5 관할 메소드 분리 — registerPhotographer/updatePostStatus/updatePhotographer/updatePhotographerVerification/setFeaturedPost 제거 (Plan 05 adminApi 경유 재구현 예정)"

key-files:
  modified:
    - app/src/contexts/PhotographerContext.tsx
    - app/src/screens/explore/ExploreScreen.tsx
  deleted:
    - app/src/data/mockPhotographers.ts
    - app/src/data/mockCheerleaders.ts

key-decisions:
  - "ADJ-rename-collection-local-only: photographerApi 에 updateCollection 미구현 (Plan 02 export 안 함) — renameCollection 은 local state 만 수정. 추후 plan 에서 RPC 추가 시점에 await 전환 필요. 본 Plan 에서는 함수 시그니처를 Promise<void> 로 통일하여 인터페이스 안정성 확보"
  - "ADJ-explore-cheerleader-migration (Rule 3 Blocking): mock 파일 삭제로 ExploreScreen.tsx (MOCK_CHEERLEADERS 사용처) 가 컴파일 깨짐 — Plan 04/05 이관이 PLAN 의도였으나 success_criteria '\\| MOCK_* 0건' 강제 충족을 위해 import + 사용처 (cl.name → cl.name_ko, cl.description 제거) 모두 본 plan 에서 자동 마이그레이션. 변경 범위는 cheerleader 섹션 한정 (~14 lines)"
  - "Phase 5 관할 메소드 5종 제거: registerPhotographer / updatePostStatus / updatePhotographer / updatePhotographerVerification / setFeaturedPost — admin 도메인이라 Plan 05 가 adminApi 경유 재구현. 호출지 typecheck 보류 5건은 Plan 04/05 가 일괄 처리"
  - "toggleCommentLike / isCommentLiked / followerPgIds 제거 — 모두 mock 데이터 의존 (followerPgIds 는 MOCK_PHOTOGRAPHERS.slice(0,5) 였음). PostDetailScreen 의 toggleCommentLike 호출 (line 74) 은 Plan 04 QA 에서 photo_likes target_type='comment' DB 트리거 검증 후 필요 시 재추가 검토 가능"

patterns-established:
  - "Context 재작성 시 mock 의존 메소드 (followerPgIds 등) 와 admin 권한 메소드 (registerPhotographer 등) 는 분리 — 호출지가 깨져도 명시적 plan 분할로 처리"
  - "loadMore 가드 두 단계: (1) loadingMoreRef 동시성 가드, (2) hasMorePhotoPosts && !filterChanged — filter 변경은 page=0 reset, 그 외 hasMore=false 면 no-op"
  - "deleteComment 의 comment_count 감소 — 삭제 전 comments state 에서 target.postId 조회하여 setPhotoPosts 동기 업데이트 (CommunityContext deleteComment 패턴 mirror)"

requirements-completed: [PHOT-01, PHOT-06, PHOT-07, PHOT-08]

duration: ~5min
completed: 2026-04-15
---

# Phase 04 Plan 03: Wave 2 — PhotographerContext Supabase 전용 재작성

**Phase 4 의 단일 가장 큰 리팩토링 — 800+ LOC PhotographerContext 를 mock 완전 제거 + 초기 state empty + useEffect refreshData + 좋아요/팔로우 optimistic + 컬렉션 await + 페이지네이션 loadMore 패턴으로 일괄 재작성. mock 파일 2개 삭제 (819 lines).**

## Performance

- **Duration:** 약 5분 (worktree reset + npm install 포함 ~9분)
- **Started:** 2026-04-15T02:30:43Z
- **Completed:** 2026-04-15T02:35:00Z
- **Tasks:** 2
- **Files modified:** 2 (PhotographerContext.tsx 658 inserts/489 deletes, ExploreScreen.tsx 3 inserts/16 deletes)
- **Files deleted:** 2 (mockPhotographers.ts 586 lines, mockCheerleaders.ts 233 lines = 819 lines)

## Accomplishments

- **PhotographerContext.tsx 전면 재작성 완료:** 781 lines 의 Supabase 전용 Context. mock import 0건, isRemote/isRemoteRef/merge 로직 0건, useLoginGate 가드 + user.id 주입 (D-22 bug fix), pending-op Set<string> ref 로 double-tap race 방지
- **D-23 페이지네이션:** loadMorePhotoPosts(teamSlug?) — currentTeamSlug 변경 감지하여 page=0 reset / 같은 filter 면 page+1 append, dedupe by id, hasMorePhotoPosts gate, loadingMoreRef 동시성 가드 (Phase 3 D-05 패턴)
- **D-21 컬렉션 await 전환:** createCollection / deleteCollection / addPostToCollection / removePostFromCollection 모두 await + .error 체크 후 state update. fire-and-forget 제거 (좋아요/팔로우만 optimistic 유지)
- **PHOT-08 getCollectionPosts:** Plan 02 의 fetchCollectionPosts 호출 래퍼 — CollectionDetailScreen 이 await 호출하여 PhotoPost[] 받음
- **mock 파일 819 lines 삭제:** mockPhotographers.ts (586) + mockCheerleaders.ts (233) git rm. app/src/data/ 디렉토리 자체가 비어 사라짐 (Phase 3 mockCommunity.ts 정리 방침 동일)
- **ExploreScreen 마이그레이션 (Rule 3):** MOCK_CHEERLEADERS import 제거 + cheerleaders state 로 전환 + cl.name_ko 적용

## Task Commits

각 Task 가 원자적으로 커밋됨:

1. **Task 1: PhotographerContext.tsx 전면 재작성** — `a2c151c` (refactor) — 658 lines added / 489 lines removed
2. **Task 2: mock 파일 삭제 + ExploreScreen 마이그레이션** — `9206337` (chore) — 3 lines added / 824 lines removed (mockPhotographers + mockCheerleaders + ExploreScreen 부분)

## Files Created/Modified

**수정 (2):**
- `app/src/contexts/PhotographerContext.tsx` — 전면 재작성 (489 → 781 lines), mock 0건, Supabase 전용
- `app/src/screens/explore/ExploreScreen.tsx` — MOCK_CHEERLEADERS import 제거 + usePhotographer().cheerleaders + cl.name_ko 적용 (Rule 3 Blocking auto-fix)

**삭제 (2):**
- `app/src/data/mockPhotographers.ts` (586 lines) — 모든 mock photographer/photo_post/player/event 데이터
- `app/src/data/mockCheerleaders.ts` (233 lines) — 모든 mock cheerleader 데이터

## Decisions Made

- **ADJ-rename-collection-local-only:** photographerApi 에 updateCollection 미구현 — renameCollection 은 local state 만 수정. 함수 시그니처는 Promise<void> 로 통일하여 인터페이스 안정성 확보. 추후 plan 에서 RPC 추가 시점에 await 전환
- **Phase 5 관할 메소드 5종 제거:** registerPhotographer / updatePostStatus / updatePhotographer / updatePhotographerVerification / setFeaturedPost — admin 도메인이라 Plan 05 가 adminApi 경유 재구현 예정
- **toggleCommentLike / followerPgIds 제거:** 모두 mock 데이터 의존 (followerPgIds 는 MOCK_PHOTOGRAPHERS.slice(0,5) 였음). 호출지는 Plan 04/05 처리
- **pending-op race guard 추가:** pendingLikeOps / pendingFollowOps Set<string> ref — 동일 target 에 대해 in-flight 요청이 있으면 무시. CommunityContext 의 pendingLikeOps 패턴 동일 적용

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ExploreScreen.tsx 컴파일 보존을 위한 cheerleader 마이그레이션**
- **Found during:** Task 2 (mock 파일 삭제 직후 typecheck)
- **Issue:** PLAN Task 2 Step 2-B 는 "import 통계 확인만" 으로 명시되어 호출지 변경을 Plan 04/05 로 미루도록 작성됨. 그러나 PLAN success_criteria 는 "MOCK_* identifier app/src/ 0건" 강제. ExploreScreen 의 `import { MOCK_CHEERLEADERS } from '../../data/mockCheerleaders'` 와 `MOCK_CHEERLEADERS.map((cl) => { ... cl.name ... cl.description ... })` 가 mock 파일 삭제 후 양쪽 모두 깨짐
- **Fix:** ExploreScreen 의 cheerleader 섹션을 최소 마이그레이션:
  - import 줄 삭제
  - `usePhotographer()` 구조분해에 cheerleaders 추가
  - `MOCK_CHEERLEADERS.map` → `cheerleaders.map`
  - `cl.name` → `cl.name_ko` (D-20 신규 Cheerleader 타입)
  - `cl.description` 제거 (Cheerleader 타입에 없음)
- **Files modified:** app/src/screens/explore/ExploreScreen.tsx (3 lines added / 16 lines removed)
- **Verification:** `git grep "MOCK_CHEERLEADERS" app/src/` 0 매치, ExploreScreen tsc 추가 오류 0
- **Committed in:** 9206337 (Task 2 commit)
- **Scope rationale:** 변경 범위는 cheerleader 섹션 한정 (~14 lines). Plan 04/05 의 부담을 가중시키지 않고도 본 plan 의 success_criteria 충족

---

**Total deviations:** 1 auto-fixed (1 Rule 3 Blocking)
**Impact on plan:** Rule 3 자동 수정 1건 (mock 파일 삭제 → 호출지 깨짐 방지). 스코프 추가 없음 — Plan 04/05 가 어차피 동일 cheerleader.name → name_ko 마이그레이션을 진행할 예정이었음

## Issues Encountered

- **worktree base mismatch:** worktree HEAD 가 5e2aaa4 (Phase 02 종료 시점) 였으나 expected base 는 a6c0e5e (Plan 02 SUMMARY 직후). `git reset --hard a6c0e5e3388a08929216a4c03ef8fec97f422954` 로 정확한 base 정렬 (Plan 02 의 worktree 초기화 패턴 동일)
- **app/node_modules 부재:** worktree 분리로 인해 비어 있어 tsc 실행 불가 → `npm install --no-audit --no-fund --prefer-offline` (4초, 1074 packages) 1회 실행

## User Setup Required

None - 본 Plan 은 코드 변경만 (DB / Edge Function / 환경변수 추가 없음).

## Plan 04 / 05 Hand-off — Typecheck 보류 25건

본 Plan 의 verify 기준 ("PhotographerContext.tsx 자체 + photographerApi.ts + photographerGrade.ts + types/ 4개 파일에 한정 하여 오류 없음") 을 충족하지만, Context 재작성으로 인해 외부 사용처에서 다음 25건의 typecheck 오류가 발생. 원래 PLAN 이 Plan 04/05 이관으로 명시한 항목임:

### Plan 04 (UI/screens 변경) 처리 대상 — 6건

1. **app/src/screens/photographer/UploadPostScreen.tsx**
   - Line 50: `isRemote` prop 사용 — 제거 (Context 에서 isRemote 삭제됨)
   - Line 163: `cheerleader` 객체 literal 의 `{ name }` → `{ name_ko }` (PhotoPost.cheerleader 타입 변경)
   - Line 163, 504: `cl.name` → `cl.name_ko` (Cheerleader 신규 타입)
   - Line 191: `createPhotoPost(...)` 호출에 `cheerleaderId: string | null` 과 `videos: string[]` 파라미터 추가 (Plan 02 시그니처 변경)
   - Line 242: `cheerleader` 객체 literal `{ name }` → `{ name_ko }`
2. **app/src/screens/explore/PostDetailScreen.tsx**
   - Line 470: `cheerleader.name` → `cheerleader.name_ko` (PhotoPost.cheerleader.name_ko)
   - Line 74: `toggleCommentLike` / `isCommentLiked` 호출 — Plan 04 QA 에서 사용 여부 확인 후 처리 (Context 에서 제거됨)

### Plan 05 (Studio/Register/Profile/Admin 도메인) 처리 대상 — 19건

3. **app/src/contexts/AdminContext.tsx**
   - Line 56: `updatePostStatus` / `updatePhotographerVerification` 호출 — Plan 05 가 adminApi 경유 호출로 교체
4. **app/src/screens/photographer/PhotographerProfileScreen.tsx**
   - Line 56: `updatePhotographer` 호출 — Plan 05 가 photographerApi.updatePhotographer 호출로 교체 (Plan 02 미구현, Plan 05 에서 추가)
5. **app/src/screens/photographer/PhotographerRegisterScreen.tsx**
   - Line 37: `registerPhotographer` 호출 — Plan 05 가 submitPhotographerApplication (Plan 02 export) 호출로 교체
6. **app/src/screens/photographer/StudioScreen.tsx**
   - Line 41: `setFeaturedPost` 호출 — Plan 05 가 admin/Studio 가 adminApi 또는 photographerApi.setFeaturedPost (미구현) 로 교체
7. **app/src/screens/cheerleader/CheerleaderProfileScreen.tsx** (4건)
   - Line 89, 149, 210: `cl.name` → `cl.name_ko` (Cheerleader 타입 변경)
   - Line 151: `cl.description` 제거 (필드 삭제됨)
8. **app/src/screens/cheerleader/CheerleadersAllScreen.tsx** (2건)
   - Line 76: `cl.name` → `cl.name_ko`
   - Line 77: `cl.description` 제거
9. **app/src/screens/social/FollowingListScreen.tsx**
   - Line 31: `followerPgIds` — Context 에서 제거됨 (mock 의존). Plan 05 가 photographerApi.fetchFollowers (미구현) 또는 inverse query 로 대체

### 검증 명령

```bash
cd app && ./node_modules/.bin/tsc --noEmit 2>&1 | tee /tmp/phase4-plan03-typecheck.log
wc -l /tmp/phase4-plan03-typecheck.log   # 25 lines (Plan 03 종료 시점)
grep "src/contexts/PhotographerContext.tsx" /tmp/phase4-plan03-typecheck.log   # 0 lines (Context 자체 0 오류)
```

## Next Phase Readiness

**Wave 3 (Plan 04 — UI 컴포넌트 + UploadPostScreen 영상) 진입 준비 완료:**

- usePhotographer() 가 contract 그대로 제공:
  - `photographers / photoPosts / cheerleaders / events / collections / comments / players` (Supabase fetch 결과)
  - `loadMorePhotoPosts(teamSlug?)` (페이지네이션 진입점)
  - `getCollectionPosts(collectionId)` (CollectionDetailScreen)
  - `togglePhotoLike(postId)` / `toggleFollow(pgId)` (자동 useLoginGate + user.id 주입)
  - `addPhotoPost(post)` (UploadPostScreen 의 createPhotoPost 응답 prepend 용)

**Wave 3 (Plan 05 — Studio/Register/CollectionDetail) 영향:**

- `submitPhotographerApplication` (Plan 02) + Studio pending UI (UI-SPEC) 활용
- `getCollectionPosts` 비동기 호출 패턴 (CollectionDetail 진입 시 await 후 setPosts)
- `loadMorePhotoPosts(teamSlug)` FlatList onEndReached 진입점

## Self-Check: PASSED

**Modified files exist + content verified:**
- FOUND: app/src/contexts/PhotographerContext.tsx (781 lines, mock import 0건, isRemote 0건)
- FOUND: app/src/screens/explore/ExploreScreen.tsx (cheerleaders.map + cl.name_ko 적용)

**Deleted files confirmed gone:**
- ABSENT: app/src/data/mockPhotographers.ts (git rm)
- ABSENT: app/src/data/mockCheerleaders.ts (git rm)
- ABSENT: app/src/data/ (디렉토리 비어 사라짐)

**Commits exist:**
- FOUND: a2c151c (Task 1 — PhotographerContext refactor)
- FOUND: 9206337 (Task 2 — mock 삭제 + ExploreScreen 마이그레이션)

**Verification metrics:**
- `git grep "MOCK_PHOTOGRAPHERS\|MOCK_CHEERLEADERS\|MOCK_PHOTO_POSTS\|MOCK_PLAYERS\|MOCK_EVENTS" app/src/`: 0 매치
- `git grep "from.*mockPhotographers\|from.*mockCheerleaders" app/src/`: 0 매치
- `grep -c "isRemote" app/src/contexts/PhotographerContext.tsx`: 0
- `grep -c "MOCK_" app/src/contexts/PhotographerContext.tsx`: 0
- `grep -c "useLoginGate" app/src/contexts/PhotographerContext.tsx`: 1
- `grep -c "loadMorePhotoPosts" app/src/contexts/PhotographerContext.tsx`: 4 (선언/메모/value/key_link)
- `grep -c "getCollectionPosts" app/src/contexts/PhotographerContext.tsx`: 3
- `tsc --noEmit src/contexts/PhotographerContext.tsx 매치`: 0 오류
- App.tsx PhotographerProvider mount 확인: line 21 import + line 291/309 mount

---
*Phase: 04-photographer*
*Plan: 03*
*Completed: 2026-04-15*
