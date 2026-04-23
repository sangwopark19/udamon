---
phase: 04-photographer
plan: 10
subsystem: ui
tags: [video, expo-video, upload, feed, autoplay, viewport, flatlist, uat-gap-closure, wave-7]

# Dependency graph
requires:
  - phase: 04-photographer (04-04)
    provides: VideoPlayer 3-mode API (feed / detail / studio) + isVisible prop
  - phase: 04-photographer (04-09)
    provides: HomeScreen trending 그리드 viewport-aware autoplay 레퍼런스 패턴 + PostDetailScreen detail mode
provides:
  - "UAT Test 12 재개 — 영상-only submit + 5 피드 surface viewport autoplay + studio/collection fallback"
  - "UploadPostScreen canPublish OR 조건 (영상-only 포스트 생성 허용)"
  - "5 피드 surface 동일 viewport-aware VideoPlayer(mode='feed') 패턴 확산"
  - "Studio/CollectionDetail 영상-only expo-video poster fallback"
affects: [Phase 5 Admin (post review 영상 카드), 향후 community 영상 확장 시 패턴 참조]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "viewport-aware autoplay: FlatList + onViewableItemsChanged + viewabilityConfig(itemVisiblePercentThreshold=60) + VideoPlayer(mode='feed', isVisible) — 5 피드 surface 전역 확산"
    - "video-first 피드 분기: hasVideo && videoUri ? VideoPlayer : previewUri ? Image : grey placeholder — 혼합 포스트는 영상 우선, 영상-only 는 정지 poster, 이미지-only 는 기존 Image 경로 보전"
    - "영상-only 포스트 생성 허용: canPublish OR 조건 + doPublish finalImages 변수로 Step 1 조건부 skip"

key-files:
  created: []
  modified:
    - "app/src/screens/photographer/UploadPostScreen.tsx — canPublish OR 조건, finalImages 변수, handleClose videos dirty-check"
    - "app/src/screens/home/HomeScreen.tsx — featured 섹션 ScrollView → horizontal FlatList + featuredVisibleIds(id 기반) + VideoPlayer(mode='feed')"
    - "app/src/screens/home/AllPostsScreen.tsx — FlatList onViewableItemsChanged + renderPost 내 VideoPlayer 분기"
    - "app/src/screens/home/FeaturedAllScreen.tsx — ScrollView → FlatList numColumns=2 + VideoPlayer 분기"
    - "app/src/screens/photographer/PhotographerProfileScreen.tsx — postGrid map → FlatList scrollEnabled=false numColumns=3"
    - "app/src/screens/archive/ArchiveScreen.tsx — renderPhotoGrid inline View → FlatList scrollEnabled=false numColumns=3"
    - "app/src/screens/photographer/StudioScreen.tsx — postImageWrap 내 previewUrl/hasVideo/grey 3-way 분기, VideoPlayer(mode='studio') fallback poster"
    - "app/src/screens/photographer/CollectionDetailScreen.tsx — renderItem 3-way 분기, VideoPlayer(mode='studio') fallback poster"

key-decisions:
  - "영상-only 포스트 submit 허용은 클라이언트 UI gating 완화만으로 충분 — 서버/DB (photo_posts CHECK + createPhotoPost) 는 이미 images=[] 수용"
  - "혼합 포스트 (images+videos 둘 다) 는 모든 5 피드 surface 에서 video-first 통일 — trending 그리드와 일관성"
  - "영상-only 정지 fallback 은 expo-video native poster (mode='studio') 만 사용 — generate-thumbnails 확장은 v1 scope 제외"
  - "5 피드 surface 전부 viewport autoplay 도입 — trending 과 동일 itemVisiblePercentThreshold=60, 배터리/데이터 비용 수용 가능"
  - "HomeScreen featured 전용 state 분리 — trending 의 visibleIndices(index 기반) 와 featuredVisibleIds(id 기반) 공존 — horizontal 캐러셀은 id 기반이 안전"

patterns-established:
  - "video-first 3-way 분기: (hasVideo && videoUri) ? VideoPlayer : previewUri ? Image : grey placeholder. 모든 피드 진입점 표준."
  - "viewport-aware autoplay 통일 recipe: useRef 로 감싼 onViewableItemsChanged + viewabilityConfig(60%) + visibleIndices.has(index). FlatList 가 index 를 전달하므로 renderItem 시그니처 {item, index} 일관."
  - "영상-only fallback poster: VideoPlayer(mode='studio') + autoplay 없음 + muted 유지 + videoPlayOverlay 는 보존 (UI-SPEC 정적 썸네일 의도)"

requirements-completed: [PHOT-03, PHOT-04]

# Metrics
duration: ~55min
completed: 2026-04-21
---

# Phase 4 Plan 10: UAT Test 12 재개 차단 요인 해소 (영상-only submit + 5 피드 surface viewport autoplay + studio/collection fallback)

**UAT Test 12 의 두 선행 결함 — (A) 영상-only 포스트 작성 CTA disabled + (B) 5 피드 surface 에 Plan 04-09 패턴 미확산 — 을 8 개 파일, 3 개 atomic commit 으로 전수 복구**

## Performance

- **Duration:** ~55 min (task 1 편집 + 자동검증 / task 2 5 스크린 복제 / task 3 2 스크린 fallback / task 4 UAT checkpoint + finalize)
- **Started:** 2026-04-21T00:00:00Z
- **Completed:** 2026-04-21T00:00:00Z
- **Tasks:** 4 (3 code + 1 checkpoint)
- **Files modified:** 8

## Accomplishments

- 영상-only 포스트 작성 가능 — UploadPostScreen `canPublish` 에 `videos.length > 0` OR 분기 + `doPublish` Step 1 uploadPostImages 를 `if (images.length > 0)` 로 skip + `finalImages` 변수로 createPhotoPost/generate-thumbnails 일관 경로 + handleClose dirty-check 에 videos 포함
- 5 피드 surface 에 trending 그리드 패턴 전수 복제 — HomeScreen featured / AllPostsScreen / FeaturedAllScreen / PhotographerProfileScreen / ArchiveScreen 모두 `FlatList + onViewableItemsChanged + viewabilityConfig(itemVisiblePercentThreshold=60) + VideoPlayer(mode='feed', isVisible)` 도입. 혼합 포스트 video-first 통일.
- StudioScreen / CollectionDetailScreen 영상-only fallback poster — `mode='studio'` VideoPlayer 가 정지 첫 프레임만 표시 (autoplay 없음, nativeControls 없음). 기존 `videoPlayOverlay` 는 보존 (UI-SPEC 정적 썸네일 의도 유지).
- VideoPlayer.tsx / PostDetailScreen.tsx 수정 0 line — 04-04 / 04-09 결과 전수 보전.

## Task Commits

각 태스크는 atomic conventional commit 으로 반영됨:

1. **Task 1: UploadPostScreen — 영상-only 포스트 작성 허용** — `4926fc5` (feat)
2. **Task 2: 5 개 피드 surface viewport-aware VideoPlayer autoplay** — `2b68f04` (feat)
3. **Task 3: StudioScreen + CollectionDetailScreen 영상-only fallback poster** — `164e964` (feat)

**Plan metadata:** (이 SUMMARY 포함 최종 docs commit)

## Files Created/Modified

- `app/src/screens/photographer/UploadPostScreen.tsx` — canPublish OR 조건 (lines 93-98) + doPublish `let finalImages` + `if (images.length > 0)` 가드 (lines 222-240) + createPhotoPost `images: finalImages` + generate-thumbnails 가드 `finalImages.length > 0` + handleClose dirty-check 에 `videos.length > 0`
- `app/src/screens/home/HomeScreen.tsx` — featured 섹션 전용 `featuredVisibleIds` state + `onFeaturedViewableItemsChanged` + `featuredViewabilityConfig` + ScrollView → horizontal FlatList + VideoPlayer(mode='feed') (trending 그리드 `visibleIndices` 는 절대 건드리지 않음)
- `app/src/screens/home/AllPostsScreen.tsx` — import ViewToken / VideoPlayer + state recipe + renderPost 시그니처에 index 추가 + VideoPlayer 분기 (CARD_WIDTH × CARD_WIDTH×5/4) + videoPlayOverlay 제거 + FlatList onViewableItemsChanged/viewabilityConfig props
- `app/src/screens/home/FeaturedAllScreen.tsx` — ScrollView + map → FlatList numColumns=2 + columnWrapperStyle + ListEmptyComponent 이관 + VideoPlayer 분기 (3/4 aspect)
- `app/src/screens/photographer/PhotographerProfileScreen.tsx` — FlatList 추가 import + state recipe + postGrid `<View>{visiblePosts.map}</View>` → FlatList scrollEnabled=false numColumns=3 + VideoPlayer(mode='feed') + 부모 Animated.ScrollView 에 위임
- `app/src/screens/archive/ArchiveScreen.tsx` — FlatList import + state recipe + `renderPhotoGrid` inline View map → FlatList scrollEnabled=false numColumns=3 + valid.filter 로 null 제거 + VideoPlayer 분기 + all/folder 탭 공유 visibleIndices
- `app/src/screens/photographer/StudioScreen.tsx` — VideoPlayer import + postImageWrap 내 `previewUrl ? Image : hasVideo && post.videos[0] ? VideoPlayer(mode='studio') : grey` 3-way 분기 + videoPlayOverlay 유지
- `app/src/screens/photographer/CollectionDetailScreen.tsx` — VideoPlayer import + renderItem 내 동일 3-way 분기 + videoPlayOverlay 유지

## Decisions Made

Plan 기획 단계에서 이미 확정된 v1 결정:

- **혼합 포스트 feed 우선순위**: 모든 5 피드 surface 에서 video-first (trending 과 일관). 이미지 우선 노출 없음.
- **영상-only 정적 fallback**: 클라이언트 expo-video `mode='studio'` poster 만 사용 — generate-thumbnails 확장/클라이언트 first-frame 추출은 v1 scope 제외.
- **5 피드 surface viewport autoplay**: v1 도입. `itemVisiblePercentThreshold=60`, trending 과 동일.
- **Studio/CollectionDetail**: 정적 썸네일 UI-SPEC 유지, 영상-only 회색 placeholder 만 수정.

실행 단계에서 추가로 내린 판단:

- **HomeScreen featured 전용 state 분리**: trending 은 `visibleIndices` (index 기반, vertical 2-col) 이미 사용 중. featured 는 horizontal 캐러셀이라 id 기반 (`featuredVisibleIds`) 이 더 안전 — 충돌 회피를 위해 변수명 분리.
- **Edit flow 수정 범위 최소화**: `isEditing && existingPost` 경로는 canPublish 완화만으로 기존 영상-only 포스트 편집이 활성화 — spread (`...existingPost`) 로 videos 가 자동 보존되므로 추가 수정 불필요.

## Deviations from Plan

None — plan 의 truths/artifacts/interfaces 대로 8 개 파일 모두 구현. 수정 금지 파일 (`VideoPlayer.tsx`, `PostDetailScreen.tsx`) 은 diff 0 line 유지.

Plan Task 1 verify 의 `! grep imageUpload.data` 체크는 실제 의도 (if-block 밖 잔여 참조 0 건) 가 만족됨 — `imageUpload.data` 참조 2 건은 Edit 2 action 이 명시한 새 if-block 내부 (`imageUpload.error || !imageUpload.data` 체크 + `finalImages = imageUpload.data`) 에만 존재. Plan action 자체가 해당 참조를 유지하도록 기술되어 있어 verify 문구와 action 본문 간 사소한 불일치지만, 기능적 의도 ("block 밖 레퍼런스 없음") 는 충족.

## Issues Encountered

None. TypeScript strict check 는 3 task 모두 0 errors 로 즉시 통과. UAT Test 12 의 8 step 검증은 checkpoint 에서 사용자가 다음 조건으로 PASS 판정:
- Steps 1, 2, 5, 6, 7, 8: 실기기에서 즉시 PASS
- Steps 3, 4: 승격 DB 설정 (영상 포스트 2 개 → `is_featured=true, featured_week='2026-W17'`) + AllPostsScreen (이미 PASS) 와의 **구조적 동등성** 으로 PASS (동일 FlatList + onViewableItemsChanged + VideoPlayer(mode='feed', isVisible) 패턴)

## Verification

### Automated gates

- `cd app && ./node_modules/.bin/tsc --noEmit` → 0 errors (3 task 각각)
- 5 피드 스크린에 `import VideoPlayer` / `onViewableItemsChanged` / `mode="feed"` / `isVisible={` 전부 존재 (grep 확인)
- StudioScreen / CollectionDetailScreen 에 `import VideoPlayer` + `mode="studio"` + `videoPlayOverlay` 유지
- `app/src/components/common/VideoPlayer.tsx` diff 0 line (컴포넌트 수정 금지 준수)
- `app/src/screens/explore/PostDetailScreen.tsx` diff 0 line (Plan 04-09 결과 보전)
- HomeScreen 에 trending `visibleIndices` + featured `featuredVisibleIds` 두 state 공존
- UploadPostScreen: `images.length > 0 || videos.length > 0` 2 회 (canPublish + handleClose), `let finalImages: string[]`, `if (images.length > 0)`, `imageUrls: finalImages`

### Manual UAT (Test 12, 8 steps)

사용자가 실기기 + DB 승격 + 구조 동등성 조합으로 전체 PASS:
- Step 1 (영상-only submit): PASS — UploadPostScreen 에서 이미지 없이 영상 1 개만 추가한 상태로 '게시하기' CTA 활성화, submit 성공, photo_posts row 에 `images: {}` + `videos: {https://....mp4}` 기록 확인
- Step 2 (handleClose dirty-check): PASS — 영상 1 개만 있는 상태에서 X 탭 → 취소 확인 Alert 표시
- Step 3 (HomeScreen featured autoplay): PASS (구조 동등성) — DB 승격 2 포스트 featured 노출 + AllPostsScreen PASS 와 동일 pattern 확인
- Step 4 (AllPosts/FeaturedAll autoplay): PASS — viewport 진입 시 autoplay (muted+loop), 이탈 시 pause
- Step 5 (PhotographerProfileScreen autoplay): PASS
- Step 6 (ArchiveScreen autoplay): PASS
- Step 7 (Studio / CollectionDetail fallback poster): PASS — 영상-only 포스트가 회색 placeholder 대신 정지 첫 프레임 + play overlay 로 표시
- Step 8 (회귀): PASS — 이미지 전용 포스트 / PostDetailScreen (Test 13) / HomeScreen trending (Plan 04-09) 전부 보전

## User Setup Required

None — 모든 수정은 클라이언트 코드. DB 승격 (featured flag UPDATE) 은 UAT 검증 보조 목적의 일회성 DB op 이며, 실제 featured 선정 로직 / 어드민 UI 는 Phase 5 범위.

## Known Stubs

없음 — v1 scope 내 완결.

## Threat Flags

없음 — 신규 네트워크 endpoint / RLS / auth 변경 없음. VideoPlayer 재사용만, R2 URL 노출 경계 동일 (public r2.dev URL). T-04-10-01~04 에 대한 mitigation 은 plan threat_model 대로 유지.

## Next Phase Readiness

- **Phase 4 완료**: UAT 의 마지막 issue (Test 12) 해소, `passed: 11 / issues: 0` 전환. Test 4 는 user-skipped, Test 10/15~22 는 user-skipped (Wave 6 완료 후 추가 검증 범위 밖), Test 14 는 blocked (다른 이유).
- **Phase 5 Admin 진입 준비**: photo_posts 에 `status` (pending/approved/rejected) 컬럼 이미 존재, 어드민 심사 UI 는 Phase 5 범위. 본 plan 이 추가한 영상-only 포스트 생성 경로는 Phase 5 Admin 의 post review UI 가 동일하게 소비 가능 (videos 컬럼만 렌더 분기).
- **Blockers / Concerns**: 변경 없음 — Apple DUNS / Firebase / 도메인 미설정은 기존 블로커 유지 (본 plan 무관).

## Success Criteria Status

1. UAT Test 12 `result: pass` 전환 가능 — ✅
2. UploadPostScreen canPublish OR 조건 — ✅
3. doPublish `finalImages` 경유 + `images.length === 0` 시 uploadPostImages/generate-thumbnails skip — ✅
4. 5 피드 surface viewport autoplay 패턴 적용 — ✅
5. StudioScreen / CollectionDetailScreen 영상-only fallback poster — ✅
6. trending / PostDetail / 이미지 전용 포스트 보전 — ✅
7. TypeScript strict 0 errors, VideoPlayer.tsx diff 0 line — ✅
8. 혼합 포스트 video-first 통일 — ✅

## Self-Check: PASSED

- SUMMARY 파일 존재: `.planning/phases/04-photographer/04-10-SUMMARY.md` — FOUND
- Task 1 commit: `4926fc5` — FOUND (`git log --oneline | grep 4926fc5`)
- Task 2 commit: `2b68f04` — FOUND
- Task 3 commit: `164e964` — FOUND
- `app/src/components/common/VideoPlayer.tsx` diff 0 line — VERIFIED
- `app/src/screens/explore/PostDetailScreen.tsx` diff 0 line — VERIFIED
- tsc --noEmit 0 errors — VERIFIED
- 8 파일 전부 수정됨 — VERIFIED

---
*Phase: 04-photographer*
*Plan: 10 (Wave 7 gap closure)*
*Completed: 2026-04-21*
