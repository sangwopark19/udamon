---
phase: 04-photographer
plan: 05
subsystem: app-ui
tags: [react-native, studio, state-machine, register, grade-badge, collection, navigation, tab, typecheck, tdd]

requires:
  - phase: 04-photographer
    plan: 04
    provides: VideoPlayer / GradeBadge / UploadPostScreen 영상 흐름 / i18n Phase 4 키 / colors.bronze

provides:
  - app/src/screens/photographer/studioState.ts — determineStudioState pure helper (5 kinds × 4 분기)
  - StudioScreen.tsx — state machine 4 branches (no_application / pending / approved / rejected) + loading
  - PhotographerRegisterScreen Step 4 재설계 — 심사 대기 hero + submitPhotographerApplication 연동
  - PhotographerProfileScreen header — GradeBadge icon-label md
  - CollectionDetailScreen — getCollectionPosts async fetch + loading/error/empty 3-state
  - MainTabNavigator — Studio 탭 추가 + application status 기반 label/icon 분기
  - BottomTabBar — descriptors[route.key].options 표준 패턴 소비 (tabBarLabel/tabBarIcon override)
  - navigation types — MainTabParamList 에 Studio, RootStackParamList Studio params optional
  - Plan 03 hand-off TS 오류 10건 cleanup (Phase 5 adminApi/photographerApi 재구현 대기)

affects: []

tech-stack:
  added: []
  patterns:
    - "Pure helper 분리 (studioState.ts) — TDD RED → GREEN 로 state machine 검증 (ADJ-jest-no-render 계승)"
    - "React Navigation descriptors[route.key].options 표준 패턴 — BottomTabBar 에서 tabBarLabel/tabBarIcon override 지원으로 탭 상태 동적 분기"
    - "Studio tab + route.params.photographerId optional — 본인 (user.id) 기반 로드 / 다른 사람 조회는 RootStack navigate 로 분기"
    - "Phase 5 hand-off stub 패턴: Plan 03 제거된 Context 메소드 (updatePostStatus 등) 를 호출부에 inline no-op + console.warn 으로 stub — runtime crash 방지 + TODO 마커 유지"

key-files:
  created:
    - app/src/screens/photographer/studioState.ts
    - app/src/screens/photographer/__tests__/StudioScreen.state.test.tsx
    - .planning/phases/04-photographer/04-05-SUMMARY.md
  modified:
    - app/src/screens/photographer/StudioScreen.tsx
    - app/src/screens/photographer/PhotographerRegisterScreen.tsx
    - app/src/screens/photographer/PhotographerProfileScreen.tsx
    - app/src/screens/photographer/CollectionDetailScreen.tsx
    - app/src/navigation/MainTabNavigator.tsx
    - app/src/components/shared/BottomTabBar.tsx
    - app/src/types/navigation.ts
    - app/src/contexts/AdminContext.tsx
    - app/src/screens/cheerleader/CheerleaderProfileScreen.tsx
    - app/src/screens/cheerleader/CheerleadersAllScreen.tsx
    - app/src/screens/social/FollowingListScreen.tsx
    - .planning/phases/04-photographer/deferred-items.md

key-decisions:
  - "ADJ-studio-tab-route-optional: Studio 라우트 params.photographerId 를 optional 로 변경 — 본인 스튜디오 진입(탭)과 타인 스튜디오 조회(네비) 동일 화면에서 분기. route.params 가 있으면 해당 포토그래퍼 조회, 없으면 fetchMyPhotographerApplication 시퀀스"
  - "ADJ-bottomtabbar-descriptors: 기존 BottomTabBar 가 tabs 배열 hardcoded 로 렌더 → state.routes + descriptors 기반으로 리팩토링. tabBarLabel/tabBarIcon options override 우선. 5개 → 6개 탭 (Studio 추가) 대응 + Studio 탭 동적 label/icon 분기 지원"
  - "ADJ-phase5-hand-off-stub: Plan 03 Context 에서 제거된 5개 메소드 (updatePostStatus/updatePhotographerVerification/updatePhotographer/setFeaturedPost/followerPgIds) 중 Plan 05 범위 밖 (AdminContext, PhotographerProfileScreen, FollowingListScreen) 은 호출부에 local no-op + console.warn stub 으로 대체. runtime crash 방지 + Phase 5 이관 TODO 마커 유지. setFeaturedPost 는 StudioScreen 재작성하면서 호출 자체 제거"
  - "ADJ-cheerleader-position-fallback: cheerleader.name → name_ko (D-20 타입 변경) + description 필드 삭제로 CheerleaderProfileScreen/CheerleadersAllScreen 의 description 표시 영역을 position 필드로 대체 (빈 경우 null 렌더). Plan 03 ExploreScreen 과 동일 패턴"

requirements-completed: [PHOT-01, PHOT-02, PHOT-06, PHOT-07, PHOT-08]

duration: ~10min
completed: 2026-04-15
---

# Phase 04 Plan 05: Wave 3b — Studio/Register/Profile/CollectionDetail + Navigation + Typecheck

**Phase 4 의 마지막 관문 — Wave 0~3a 기반 위에서 사용자 경험 완성. StudioScreen state machine 4분기, PhotographerRegisterScreen Step 4 재설계 + API 연동, MainTabNavigator Studio 탭 + 동적 label/icon, PhotographerProfileScreen GradeBadge, CollectionDetailScreen async fetch, Plan 03 hand-off 10건 TS 오류 전수 정리. 37 tests green, typecheck 0 errors.**

## Performance

- **Duration:** 약 10분 (worktree reset + npm install 포함)
- **Started:** 2026-04-15T02:59:10Z
- **Completed (code):** 2026-04-15T03:09:12Z
- **Tasks:** 4 (Task 4 는 실기기 QA checkpoint — 사용자 검증 대기)
- **Files created:** 3
- **Files modified:** 11

## Accomplishments

- **StudioScreen state machine 4분기 완성 (D-09, PHOT-02):**
  - `determineStudioState` pure helper (studioState.ts) — no_application / pending / approved / rejected + loading
  - fetchMyPhotographerApplication → approved 인 경우 fetchPhotographerByUserId 추가 조회 → determineStudioState reduce
  - Race edge case: approved status 이나 photographer row 부재 → pending 폴백 (사용자 혼란 방지)
  - error fallback: appResult.error 존재 시 no_application 으로 폴백 (재신청 가능)
  - route.params.photographerId optional — 본인 (탭) vs 타인 (네비) 분기
  - approved state 는 기존 Studio UI 보존 + 상단 GradeBadge icon-label sm + is_verified
  - video 포함 post 는 32×32 play overlay 표시
  - thumbnail_urls[0] ?? images[0] fallback (D-15)
  - setFeaturedPost 호출 제거 (Plan 03 Context 제거 반영) — Phase 5 adminApi 이관
- **PhotographerRegisterScreen Step 4 재설계 (D-08, T-4-08):**
  - handleNext Step 3 → `photographerApi.submitPhotographerApplication` 호출 (team_slug/activity_links/activity_plan/portfolio_url=null/bio='')
  - 성공 시 setStep(4) / 실패 시 Alert + error state 유지 (폼 보존, Phase 3 D-18 패턴)
  - activatePhotographerMode / registerPhotographer 호출 제거 (Plan 03 Context 제거 반영)
  - Step 4 UI: time-outline 64 warning + pg_register_pending_title + pg_register_pending_desc + pg_register_pending_go_home primary CTA 48h (UI-SPEC §State B spacing.xxl/lg/md)
  - Step 1 handleNext 에 activity_links http(s) prefix 재검증 추가 (T-4-08 제출 시점 방어)
  - Submit 버튼 라벨: pg_register_confirm_submit → pg_register_submit
- **PhotographerProfileScreen header GradeBadge 통합 (PHOT-06):**
  - display_name 바로 뒤 marginLeft 8 `GradeBadge variant="icon-label" size="md"` 삽입
  - is_verified 는 GradeBadge 뒤 spacing.sm(8px) 간격 (UI-SPEC §PhotographerProfileScreen header)
  - RankBadge 는 기존 위치 유지 (nameRow 마지막)
- **CollectionDetailScreen async fetch 전환 (D-21, PHOT-08):**
  - `getCollectionPosts(collectionId)` Context 메소드 사용 (Plan 03 도입)
  - loading (ActivityIndicator) / error (EmptyState + retry) / empty (Ionicons + 문구) 3-state UI
  - error 시 EmptyState description 에 실제 error.message 전달
  - thumbnail_urls[0] ?? images[0] fallback (D-15) + hasVideo 시 24×24 play overlay
- **MainTabNavigator Studio 탭 추가 + 동적 분기:**
  - `<Tab.Screen name="Studio" component={StudioScreen} />` 6번째 탭으로 추가 (Explore 뒤, Archive 앞)
  - useEffect + fetchMyPhotographerApplication 호출 → studioState (no_app / pending / approved / rejected) 결정
  - tabBarLabel: tab_pending_review / tab_studio / tab_photographer (UI-SPEC §MainTabNavigator 매트릭스)
  - tabBarIcon: aperture(-outline) / time(-outline) / camera(-outline) focused 상태별
  - cleanup cancelled flag 로 unmount race 방지
- **BottomTabBar 표준 패턴 리팩토링:**
  - 기존 `state.routes` index 기반 순회 → `state.routes.map((route, index))` + tabs 배열 lookup by `route.name`
  - `descriptors[route.key].options` 의 tabBarLabel/tabBarIcon 을 우선 소비 — React Navigation 표준
  - 없으면 tabs 배열 default (i18nKey + icon/iconFocused) fallback
  - Studio 탭 default 항목 추가 (camera-outline/camera)
  - 기존 5개 탭 동작 보존 (Home/Explore/Archive/Community/MyPage)
- **Plan 03 hand-off TS 10건 정리 (Phase 5 이관):**
  - AdminContext: updatePostStatus + updatePhotographerVerification → inline no-op stub + console.warn (Phase 5 adminApi 이관 TODO)
  - PhotographerProfileScreen: updatePhotographer → local stub
  - FollowingListScreen: followerPgIds → empty Set<string> (Phase 5 photographerApi.fetchFollowers 이관)
  - CheerleaderProfileScreen: cheerleader.name → name_ko (3곳) + description → position
  - CheerleadersAllScreen: cl.name → name_ko + cl.description → cl.position
- **navigation types:**
  - MainTabParamList 에 `Studio: { photographerId?: string } | undefined` 추가
  - RootStackParamList Studio params `{ photographerId?: string } | undefined` optional 로 변경 (기존 `{ photographerId: string }` 호출지 무영향)

## Task Commits

각 Task 가 원자적으로 커밋됨 (`--no-verify` 유지 — worktree 병렬 실행 대응):

1. **Task 1 RED: StudioScreen state machine 테스트** — `f7058c7` (test) — 6 cases RED
2. **Task 1 GREEN: StudioScreen + MainTabNavigator + Profile GradeBadge** — `c226f8d` (feat) — 7 files, 650+ / 97-
3. **Task 2: PhotographerRegisterScreen Step 4 재설계 + submitPhotographerApplication** — `c829cb1` (feat) — 1 file, 69+ / 41-
4. **Task 3: CollectionDetailScreen async + TS hand-off 10건 cleanup** — `c7159d2` (feat) — 7 files, 116+ / 29-

## Files Created/Modified

**신규 생성 (3):**
- `app/src/screens/photographer/studioState.ts` — determineStudioState pure helper + StudioState union type (68 lines)
- `app/src/screens/photographer/__tests__/StudioScreen.state.test.tsx` — 6 Jest cases (124 lines)
- `.planning/phases/04-photographer/04-05-SUMMARY.md` — 본 문서

**수정 (11):**
- `app/src/screens/photographer/StudioScreen.tsx` — state machine 재구성 (433 → 715 lines, +282)
- `app/src/screens/photographer/PhotographerRegisterScreen.tsx` — Step 4 재설계 + submit API 연동
- `app/src/screens/photographer/PhotographerProfileScreen.tsx` — GradeBadge header + updatePhotographer stub
- `app/src/screens/photographer/CollectionDetailScreen.tsx` — async fetch + 3-state UI
- `app/src/navigation/MainTabNavigator.tsx` — Studio 탭 추가 + 동적 label/icon
- `app/src/components/shared/BottomTabBar.tsx` — descriptors 표준 패턴 + Studio 탭 default
- `app/src/types/navigation.ts` — MainTabParamList Studio 추가 + RootStackParamList Studio params optional
- `app/src/contexts/AdminContext.tsx` — updatePostStatus/updatePhotographerVerification stub
- `app/src/screens/cheerleader/CheerleaderProfileScreen.tsx` — name_ko + position
- `app/src/screens/cheerleader/CheerleadersAllScreen.tsx` — name_ko + position
- `app/src/screens/social/FollowingListScreen.tsx` — followerPgIds stub
- `.planning/phases/04-photographer/deferred-items.md` — Phase 2 auth test 실패 기록 (Plan 05 범위 밖)

## Decisions Made

- **ADJ-studio-tab-route-optional (설계):** StudioScreen 이 Tab 진입 (본인) 과 RootStack navigate 진입 (타인) 두 경로를 단일 화면으로 처리하기 위해 route.params.photographerId 를 optional 로 변경. overridePhotographerId 가 있으면 해당 포토그래퍼를 Context 에서 조회 + approved state 로 고정, 없으면 state machine 시퀀스 진행. 외부 호출지는 기존 `navigate('Studio', { photographerId })` 호환 유지
- **ADJ-bottomtabbar-descriptors (Rule 3 Blocking):** 기존 BottomTabBar 는 hardcoded `tabs` 배열 index 로 순회하여 `state.index === index` 를 focused 로 사용. Studio 탭 추가 시 tabs 배열과 state.routes 길이 불일치 방지 + tabBarLabel/tabBarIcon override 소비를 위해 React Navigation 표준 (`state.routes.map + descriptors[route.key].options`) 로 리팩토링. 5개 기존 탭 디자인/동작 100% 보존
- **ADJ-phase5-hand-off-stub (Rule 2 Critical):** Plan 03 SUMMARY 에 명시된 Phase 5 이관 대상 5개 메소드 중, Plan 05 범위 밖 화면/Context 에서의 호출지를 제거하는 대신 로컬 no-op stub + console.warn 으로 대체. 이유: (1) 일괄 제거 시 UI 기능 손실 범위가 Plan 05 를 초과 (AdminContext 의 approve/reject flows 전체), (2) TODO 마커로 Phase 5 가 정확히 이관해야 할 지점 명시, (3) runtime crash 방지. Phase 5 는 adminApi/photographerApi 경유 호출로 교체
- **ADJ-cheerleader-position-fallback:** Cheerleader 타입 재정의 (D-20) 로 description 필드 삭제. CheerleaderProfileScreen/CheerleadersAllScreen 의 description Text 영역을 position 필드로 대체 (빈 경우 null 렌더). 기존 UI 레이아웃 보존

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] BottomTabBar 표준 패턴 리팩토링**
- **Found during:** Task 1 MainTabNavigator 구현 중
- **Issue:** 기존 BottomTabBar 가 hardcoded 5개 탭 배열 기반 → Studio 탭 추가 시 state.routes(6) 과 tabs(5) 길이 불일치 + tabBarLabel override 미지원 → `must_haves.truths` 의 "Studio 탭 레이블/아이콘이 application status 에 따라 분기" 달성 불가
- **Fix:** state.routes 를 순회 + tabs 배열 lookup by route.name + descriptors options 우선 소비로 리팩토링. Studio 탭 default 정의 추가
- **Files modified:** app/src/components/shared/BottomTabBar.tsx, app/src/navigation/MainTabNavigator.tsx
- **Verification:** 기존 5개 탭 동작 유지 + tab_pending_review grep 매치

**2. [Rule 3 - Blocking] worktree base mismatch + stray mock files**
- **Found during:** 초기 worktree base 검증
- **Issue:** HEAD 가 5e2aaa4 (Phase 02 종료) — expected 262995f (Plan 04 완료) 보다 이전. `git reset --hard <expected_base>` 후에도 Phase 3/4 에서 삭제된 mockCheerleaders.ts / mockCommunity.ts / mockPhotographers.ts 파일이 다른 브랜치 병합으로 working tree 에 잔존 → tsc 실행 시 66 errors 폭발
- **Fix:** working tree 에 잔존한 mock 3 파일 제거 (기대 base 에서는 이미 삭제됨) → typecheck 정상 범위 (12 pre-existing errors) 복귀
- **Verification:** `ls app/src/data/` → directory not found (정상)

**3. [Rule 2 - Critical] Phase 5 이관 메소드 stub 패턴**
- **Found during:** Task 3 typecheck 정리 중
- **Issue:** PLAN Step 3-B 는 "주석 TODO 표시 + 호출이 제거되면 해당 지점의 화면 기능도 비활성화" 명시. 그러나 AdminContext 의 updatePostStatus 는 approvePost/rejectPost callback 2곳에서 호출 + 해당 callback 이 pendingPosts/resolveReport 전체 flow 의 핵심 → 제거 시 admin 기능 대규모 손실
- **Fix:** 호출부에 local no-op stub + console.warn 으로 대체 (Plan 05 범위 안 최소 변경) — Phase 5 가 adminApi 경유 호출로 교체할 때 stub 제거
- **Files modified:** app/src/contexts/AdminContext.tsx (inline stub), app/src/screens/photographer/PhotographerProfileScreen.tsx (inline stub), app/src/screens/social/FollowingListScreen.tsx (empty Set)
- **Verification:** tsc --noEmit 0 errors + 기존 UI 렌더 경로 보존

---

**Total deviations:** 3 auto-fixed (2 Rule 3 Blocking, 1 Rule 2 Critical)
**Impact on plan:** 모든 deviation 이 plan 의 intent 달성에 필수. 스코프 추가 없음 — PLAN success_criteria 8개 중 자동화 가능한 7개 완료 + Manual QA checkpoint 대기

## Issues Encountered

- **worktree HEAD 역행 + stray files:** 자세한 내용은 Deviation #2
- **app/node_modules 부재:** worktree 분리로 비어 있어 `npm install --no-audit --no-fund --prefer-offline` (4초, 1074 packages) 1회 실행
- **Phase 2 auth test 실패 3 파일:** `src/__tests__/auth/nickname.test.ts`, `authContext.test.ts`, `block.test.ts` 17 failed tests — Plan 05 가 수정하지 않은 Phase 2/3 legacy tests. `deferred-items.md` 에 기록 후 Phase 4 범위 밖으로 분류

## User Setup Required

**실기기 QA 검증 필요 (Task 4 checkpoint):**
- EAS development 빌드 iOS + Android (expo-video native module 포함 → Plan 01 Task 6 에서 설치 후 native rebuild 필요)
- 실기기에 설치 후 `docs/phase4-qa-matrix.md` A~I 섹션 (총 ~50 체크박스) 전수 수동 검증
- 결과를 QA matrix 하단에 "Wave 3 QA 실기기 세션 일자 / 통과율 / 담당자" 기입

## Phase 5 Admin 인계사항

본 Plan 에서 stub 처리된 항목들 — Phase 5 가 정식 구현:

### 1. AdminContext (adminApi 경유 교체 필요)
- `updatePostStatus(postId, status, reason?)` → `adminApi.updatePostStatus(...)` RPC or direct UPDATE + addNotification trigger 의존
- `updatePhotographerVerification(photographerId, verified)` → `adminApi.approvePhotographer(...)` — 실제로는 Phase 4 에서 도입한 `handle_photographer_application_decision` 트리거가 auto-handle. Phase 5 는 그냥 `UPDATE photographer_applications SET status='approved'` 로 트리거 호출하면 됨 (ADJ-01)

### 2. PhotographerProfileScreen
- `updatePhotographer(photographerId, { display_name, bio })` → `photographerApi.updatePhotographer` 신규 RPC 추가 후 await 전환

### 3. FollowingListScreen
- `followerPgIds` Set 을 static empty 에서 → `photographerApi.fetchFollowers(userId)` 신규 함수 또는 `photographer_follows` 테이블 inverse query 로 구현

### 4. AuthContext
- `activatePhotographerMode(teamId)` export 제거 (사용처 0 유지 중) — Phase 5 D-08 명시

### 5. 어드민 심사 화면
- `photographer_applications UPDATE` 하는 순간 030 트리거 (`handle_photographer_application_decision`) 가 자동으로: (a) photographers INSERT (approved) or SKIP (rejected), (b) users.is_photographer=TRUE (approved), (c) notifications INSERT — 관할 admin UI 는 단순 UPDATE 만 하면 됨

### 6. PostDetailScreen comment like stub (Plan 04 ADJ 계승)
- `localLikedComments` Set state stub → `photo_likes target_type='comment'` DB 트리거 검증 후 Context 재추가

## Plan Verification Criteria (PLAN success_criteria)

- [x] StudioScreen 4 branches 렌더 (snapshot green) — 6/6 tests green (determineStudioState)
- [x] PhotographerRegisterScreen Step 4 재설계 + submit API 연동 — submitPhotographerApplication 호출 + time-outline hero
- [x] PhotographerProfileScreen header GradeBadge — icon-label md + is_verified spacing.sm
- [x] CollectionDetailScreen async fetch — getCollectionPosts + loading/error/empty 3-state
- [x] MainTabNavigator Studio 탭 분기 — tab_pending_review/tab_studio/tab_photographer + aperture/time/camera icons
- [x] typecheck 전체 0 — `tsc --noEmit` 0 errors (전 프로젝트)
- [ ] Manual QA matrix 통과 — **사용자 실기기 검증 대기 (Task 4 checkpoint)**
- [x] T-4-04/07/08 mitigate — RLS existing (04) + pending state upload CTA 미노출 (07) + activity_links prefix 검증 (08)

## Self-Check: PASSED

**Created files exist:**
- FOUND: app/src/screens/photographer/studioState.ts (68 lines, determineStudioState + StudioState)
- FOUND: app/src/screens/photographer/__tests__/StudioScreen.state.test.tsx (124 lines, 6 cases)
- FOUND: .planning/phases/04-photographer/04-05-SUMMARY.md (본 문서)

**Modified files verified (grep -c):**
- fetchMyPhotographerApplication in StudioScreen.tsx → 2 matches (import + call)
- GradeBadge in PhotographerProfileScreen.tsx → 2 matches (import + render)
- submitPhotographerApplication in PhotographerRegisterScreen.tsx → 1 match
- getCollectionPosts in CollectionDetailScreen.tsx → 3 matches (destructure + load + dep)
- tab_pending_review in MainTabNavigator.tsx → 1 match
- descriptors in BottomTabBar.tsx → 3 matches (param destructure + lookup + warn)
- `tsc --noEmit` → 0 errors (전체 프로젝트)
- Phase 4 tests: 37 passed (6 state machine + 10 GradeBadge + 14 photographerGrade + 7 validateVideoAsset)
- Phase 2 auth tests: 17 failed in 3 files — pre-existing, deferred-items.md 에 기록

**Commits exist:**
- FOUND: f7058c7 (Task 1 RED)
- FOUND: c226f8d (Task 1 GREEN)
- FOUND: c829cb1 (Task 2)
- FOUND: c7159d2 (Task 3)

---
*Phase: 04-photographer*
*Plan: 05*
*Completed (code): 2026-04-15*
*Manual QA checkpoint: awaiting user signal*
