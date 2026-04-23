---
phase: 04-photographer
plan: 04
subsystem: app-ui
tags: [react-native, expo-video, upload, video-validation, grade-badge, typescript, tdd, ui-components]

requires:
  - phase: 04-photographer
    plan: 03
    provides: PhotographerContext Supabase 전용 (isRemote 제거, addPostToCollection/deletePhotoPost async, cheerleaders state), photographerApi.uploadPostVideos(contentTypes), createPhotoPost(videos, cheerleaderId), Cheerleader.name_ko 타입
provides:
  - app/src/components/common/VideoPlayer.tsx — expo-video useVideoPlayer + VideoView, mode (feed/detail/studio) 분기
  - app/src/components/photographer/GradeBadge.tsx — UI-SPEC tier palette 4-tier × variant × size 매트릭스
  - app/src/utils/videoValidation.ts — validateVideoAsset pure helper + VIDEO_MAX_* / ALLOWED_VIDEO_MIME 상수
  - UploadPostScreen — R2-first 4단계 영상 업로드 (optimize → images → videos → create → generate-thumbnails) + T-4-02/06 mitigation
  - PopularPhotographersScreen — GradeBadge icon variant 통합 (PhotographerCard 부재 대체)
  - PostDetailScreen — cheerleader.name_ko 전환 + comment like 로컬 stub
  - i18n Phase 4 신규 33+ 키 (upload_video_*, grade_tier_*, studio_*, pg_register_*, tab_photographer/pending_review/studio)
  - colors.bronze '#A97142' 토큰
affects: [04-05]

tech-stack:
  added: []
  patterns:
    - "expo-video 인스턴스 격리: 각 VideoPlayer 당 독립 useVideoPlayer — FlatList item 별 player 공유 금지 (RESEARCH Anti-pattern Pattern 1)"
    - "validateVideoAsset pure helper 분리 (utils/videoValidation) + UploadPostScreen 에서 re-export — 테스트가 RN native 체인 없이 pure 로직만 import"
    - "GradeBadge pure helper export (gradeBgColor/gradeLabelColor/gradeBadgeLayout) — @testing-library 부재 환경에서 색상/사이즈 계산을 단위 테스트"
    - "Android filesize lowercase fallback — ImagePicker asset.fileSize ?? asset.filesize (RESEARCH Pitfall 3)"
    - "generate-thumbnails fire-and-forget — Edge Function 호출은 await 없이 .catch 만 (D-14 UX 차단 방지)"

key-files:
  created:
    - app/src/components/common/VideoPlayer.tsx
    - app/src/components/photographer/GradeBadge.tsx
    - app/src/components/photographer/__tests__/GradeBadge.helpers.test.ts
    - app/src/utils/videoValidation.ts
    - app/src/screens/photographer/__tests__/UploadPostScreen.validateVideoAsset.test.ts
  modified:
    - app/src/screens/photographer/UploadPostScreen.tsx
    - app/src/screens/explore/PostDetailScreen.tsx
    - app/src/screens/home/PopularPhotographersScreen.tsx
    - app/src/constants/colors.ts
    - app/src/i18n/locales/ko.ts

key-decisions:
  - "ADJ-bronze-location: PLAN 은 theme.ts 에 bronze 추가 지시했으나 theme.ts 가 colors.ts 를 re-export 하는 얇은 wrapper — bronze 는 colors.ts (light + dark) 에 추가하여 colors.bronze 로 접근 가능하게 함 (Rule 1 Mechanical)"
  - "ADJ-photographer-card-fallback: PLAN 이 참조한 PhotographerCard.tsx 가 저장소에 부재 — PLAN intent (피드 카드에 GradeBadge icon 20px 삽입) 를 달성하는 실제 사용처인 PopularPhotographersScreen.renderItem 에 GradeBadge variant='icon' 삽입 (Rule 3 Blocking)"
  - "ADJ-validateVideoAsset-module: PLAN 은 UploadPostScreen inline export 요구했으나 테스트가 UploadPostScreen 전체 import 시 AsyncStorage/RN-native 체인이 jest-expo 에서 실행되어 infra 비용 큼 → utils/videoValidation.ts 로 분리 + UploadPostScreen 에서 re-export (Rule 3 Blocking). PLAN grep 검증 (UploadPostScreen 에 validateVideoAsset 존재) 충족"
  - "ADJ-comment-like-stub: toggleCommentLike / isCommentLiked 가 Plan 03 Context 재작성 시 mock 의존으로 제거됨 — PostDetailScreen 이 두 함수를 호출 (line 74, 577, 599, 628, 649) → 로컬 Set<string> state 로 임시 stub. UI 는 동작하나 서버 저장 없음. Plan 05 에서 photo_likes target_type='comment' DB 트리거 검증 후 Context 재추가 예정"
  - "ADJ-jest-no-render: @testing-library/react-native / react-test-renderer 가 미설치 — GradeBadge render 테스트 대신 pure helper (gradeBgColor/gradeLabelColor/gradeBadgeLayout) 단위 테스트 10종으로 tier palette 검증. 커버리지는 PLAN behavior 1~6 동등"

patterns-established:
  - "Pure helper + UI wrapper 분리 (videoValidation util + UploadPostScreen re-export) — 테스트 타겟 파일은 RN native module 미의존"
  - "i18n 키 선 교체 후 신규 추가 — 기존 key 가 PLAN 문구와 다르면 Edit, PLAN 신규 키만 마지막 섹션에 일괄 append"
  - "handleAddVideo validation 우선 + 통과 시 videos/videoContentTypes 병렬 push — handleRemoveVideo 에서 idx 기준 동시 pop"

requirements-completed: [PHOT-03, PHOT-04, PHOT-05, PHOT-06]

duration: ~9m
completed: 2026-04-15
---

# Phase 04 Plan 04: Wave 3a — VideoPlayer + GradeBadge + UploadPostScreen 영상 흐름

**신규 공통 컴포넌트 2개 (VideoPlayer, GradeBadge) 구축 + UploadPostScreen 의 R2-first 4단계 영상 업로드 흐름 완성. Plan 03 Context 재작성으로 발생한 UploadPostScreen/PostDetailScreen TS 오류 일괄 정리. 31 tests green (14 photographerGrade + 10 GradeBadge.helpers + 7 validateVideoAsset).**

## Performance

- **Duration:** 약 9분 (worktree reset + npm install 포함)
- **Started:** 2026-04-15T02:42:30Z
- **Completed:** 2026-04-15T02:51:59Z
- **Tasks:** 3 (Task 2/3 은 tdd="true" RED+GREEN)
- **Files created:** 5
- **Files modified:** 5

## Accomplishments

- **VideoPlayer 컴포넌트 완성:** expo-video 3.0.16 의 `useVideoPlayer` + `VideoView` API 사용. mode (feed/detail/studio) 별 autoplay/muted/loop/nativeControls 분기. feed 모드 `isVisible` prop 으로 viewport-aware play/pause. `statusChange` listener 로 로딩/에러 state + `onError` callback. RESEARCH Anti-pattern (단일 player 공유 금지) 준수 — prop `uri` 당 독립 player 인스턴스
- **GradeBadge 컴포넌트 완성:** UI-SPEC §GradeBadge tier palette 4-tier (bronze/silver/gold/diamond) × variant (icon|icon-label) × size (sm|md) 매트릭스 지원. `gradeToBadge(grade)` 유틸 공유로 mapPhotographer 와 동일 로직 사용. `accessibilityLabel={t('grade_a11y_label', { tier })}` 템플릿. gradeBgColor/gradeLabelColor/gradeBadgeLayout pure helper export → 10 unit tests green
- **UploadPostScreen R2-first 4단계 업로드 완성:**
  1) `Promise.all(images.map(optimizeImage))` → `photographerApi.uploadPostImages(userId, optimized, accessToken)`
  2) `videos.length > 0` 이면 `photographerApi.uploadPostVideos(userId, videos, accessToken, videoContentTypes)` — ADJ-02 asset별 contentType
  3) `photographerApi.createPhotoPost({ ..., images: imageUpload.data, videos: finalVideos, cheerleaderId })` — D-05 videos/cheerleaderId
  4) `fetch(${SUPABASE_URL}/functions/v1/generate-thumbnails, { body: { postId, imageUrls } })` fire-and-forget (D-14)
- **T-4-02 + T-4-06 mitigation:** handleAddVideo → `validateVideoAsset` 호출 → duration 35s/ fileSize 60MB/ mimeType webm 3 케이스 Alert 차단 (재현 테스트 3종). iOS .mov 자동 변환 시 video/quicktime + uri 확장자 fallback 으로 acc → video/mp4 + video/quicktime 화이트리스트 유지
- **Plan 03 hand-off 6건 TS 오류 전수 정리:**
  - UploadPostScreen: `isRemote` prop 제거, `cheerleader.name` → `name_ko` (2곳), `createPhotoPost` cheerleaderId+videos 파라미터 추가, `deletePhotoPost`/`addPostToCollection` await 추가
  - PostDetailScreen: `cheerleader.name` → `name_ko`, `toggleCommentLike/isCommentLiked` 로컬 Set stub
- **PopularPhotographersScreen 에 GradeBadge 통합:** renderItem 의 `nameRow` 에서 display_name 뒤 + is_verified 앞에 `<GradeBadge grade={pg.grade} variant="icon" />` 20px 삽입 (PLAN intent 충족, PhotographerCard 부재 대체)
- **i18n 33+ 키 추가 + 4건 문구 업데이트:** upload_video_* / grade_tier_* / grade_a11y_label / video_unplayable / studio_pending_* / studio_rejected_* / studio_signup_* / pg_register_submit/pending_*/reapply/fail_desc / pg_feed_* / tab_photographer/pending_review/studio. 기존 `upload_max_videos`, `upload_max_videos_desc`, `upload_video_label`, `pg_register_fail` 은 UI-SPEC 일원화 문구로 교체
- **colors.bronze '#A97142' 추가:** lightColors + _darkColors 양쪽에 추가 (ColorScheme type constraint)

## Task Commits

각 Task 가 원자적으로 커밋됨 (--no-verify 병렬 실행 대응):

1. **Task 1: VideoPlayer + bronze + i18n** — `9f01892` (feat)
2. **Task 2-RED: GradeBadge pure helper tests** — `019c68e` (test)
3. **Task 2-GREEN: GradeBadge + PopularPhotographersScreen** — `7f327d0` (feat)
4. **Task 3-TEST: validateVideoAsset + videoValidation util** — `bd2a167` (test, RED+GREEN 일괄)
5. **Task 3-FEAT: UploadPostScreen 영상 흐름 + PostDetailScreen TS cleanup** — `b1714e8` (feat)

## Files Created/Modified

**신규 생성 (5):**
- `app/src/components/common/VideoPlayer.tsx` — 108 lines. expo-video useVideoPlayer + VideoView, mode 분기, 로딩/에러 state
- `app/src/components/photographer/GradeBadge.tsx` — 98 lines. UI-SPEC tier palette + pure helper export
- `app/src/components/photographer/__tests__/GradeBadge.helpers.test.ts` — 50 lines. 10 tests (4 bg × 4 label × 2 size)
- `app/src/utils/videoValidation.ts` — 60 lines. validateVideoAsset + 상수 3종
- `app/src/screens/photographer/__tests__/UploadPostScreen.validateVideoAsset.test.ts` — 50 lines. 7 tests (too_long/too_large/unsupported + mp4/quicktime/filesize fallback/uri extension)

**수정 (5):**
- `app/src/screens/photographer/UploadPostScreen.tsx` — 168 inserts / 89 deletes. 영상 흐름 + validateVideoAsset re-export + cheerleader.name_ko + isRemote 제거 + await 추가
- `app/src/screens/explore/PostDetailScreen.tsx` — cheerleader.name_ko + comment like 로컬 stub
- `app/src/screens/home/PopularPhotographersScreen.tsx` — GradeBadge icon variant 삽입
- `app/src/constants/colors.ts` — bronze '#A97142' (light + dark)
- `app/src/i18n/locales/ko.ts` — 33+ 신규 키 + 4건 문구 교체

## Decisions Made

- **ADJ-bronze-location (Rule 1 Mechanical):** PLAN 은 `theme.ts` 에 bronze 추가를 지시했으나 theme.ts 는 `{ colors } from '../constants/colors'` 를 re-export 하는 얇은 wrapper. 의도는 `colors.bronze` 로 접근 가능하게 하는 것이므로 colors.ts 에 추가. `ColorScheme` type constraint 때문에 `_darkColors` 에도 동일 추가
- **ADJ-photographer-card-fallback (Rule 3 Blocking):** PLAN `files_modified` 와 `must_haves.truths` 에 PhotographerCard.tsx 가 나열되어있으나 저장소에 실제로 부재. `app/src/components/photographer/` 에는 AwardsList/ThankYouWall/ThankYouWallFullModal/ThankYouWriteModal 4개 뿐. PLAN intent (피드 카드에 GradeBadge icon 삽입) 를 달성하는 실제 컴포넌트인 PopularPhotographersScreen.renderItem 에 통합. Plan 05 가 PhotographerCard.tsx 를 신규 생성하면 그곳에도 동일 통합 반영 가능
- **ADJ-validateVideoAsset-module (Rule 3 Blocking):** PLAN 은 `export function validateVideoAsset` 를 UploadPostScreen 내부에 정의 요구. 그러나 jest-expo 환경에서 UploadPostScreen 을 import 하면 AsyncStorage / expo-video / RN native module 체인이 모두 require 되어 테스트 infrastructure 실행 비용 급증 + `@react-native-async-storage/async-storage` 의 native binding missing 에러. 순수 로직만 `utils/videoValidation.ts` 로 분리 후 UploadPostScreen 에서 re-export. PLAN 의 grep 검증 (`grep -q validateVideoAsset` in UploadPostScreen) 은 re-export 로 충족
- **ADJ-comment-like-stub (Rule 2 Critical):** `toggleCommentLike`/`isCommentLiked` 가 Plan 03 에서 mock 의존 메소드로 판단되어 Context 에서 제거됨. PostDetailScreen 이 4곳에서 호출 (line 74, 577, 599, 628, 649) → tsc 오류 5건. 로컬 `Set<string>` state 로 임시 stub 하여 UI 동작 유지. 서버 저장 없음 — 재렌더 시 리셋. Plan 05 에서 `photo_likes target_type='comment'` DB 트리거 검증 후 Context 재추가 예정
- **ADJ-jest-no-render:** `@testing-library/react-native` 미설치 환경에서 GradeBadge 의 render 테스트 불가. PLAN behavior 1~6 을 pure helper (gradeBgColor/gradeLabelColor/gradeBadgeLayout) 로 분해하여 10 tests 로 tier palette + size variant 검증. 기능 커버리지 동등

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Mechanical] bronze 토큰 위치 (theme.ts → colors.ts)**
- **Found during:** Task 1 Step 1-A
- **Issue:** PLAN 지시사항 `theme.ts 에 bronze 추가` — 실제 theme.ts 는 colors.ts 를 re-export 하는 wrapper 여서 `colors.bronze` 접근을 위해서는 colors.ts 에 추가해야 함
- **Fix:** `lightColors` 객체에 `bronze: '#A97142'` 추가. `ColorScheme` 타입 제약 때문에 `_darkColors` 에도 동일 추가
- **Files modified:** app/src/constants/colors.ts
- **Committed in:** 9f01892

**2. [Rule 3 - Blocking] PhotographerCard.tsx 부재 → PopularPhotographersScreen 통합**
- **Found during:** Task 2 Step 2-B
- **Issue:** PLAN `files_modified` 와 `must_haves.truths` 에 PhotographerCard.tsx 가 있으나 `app/src/components/photographer/` 에 파일 자체가 존재하지 않음 (AwardsList/ThankYouWall 만 존재)
- **Fix:** PLAN intent (피드 카드의 display_name 뒤 + is_verified 앞에 GradeBadge icon 20px) 를 달성하는 실제 사용처인 `PopularPhotographersScreen.tsx` renderItem 의 nameRow 에 삽입
- **Files modified:** app/src/screens/home/PopularPhotographersScreen.tsx
- **Verification:** grep 확인 — `GradeBadge.*variant="icon"` 1건, display_name Text 다음 줄
- **Committed in:** 7f327d0

**3. [Rule 3 - Blocking] validateVideoAsset 모듈 분리 (테스트 infra 보호)**
- **Found during:** Task 3 RED (jest 실행 중 AsyncStorage native binding 누락 에러)
- **Issue:** PLAN 은 UploadPostScreen 내부 `export function validateVideoAsset` 명시. 테스트가 UploadPostScreen 를 import → AuthContext → AsyncStorage → native binding 체인 → jest-expo env 에서 `Error: Cannot find module @react-native-async-storage/async-storage/src/AsyncStorage.native` 에러로 테스트 실행 실패
- **Fix:** pure 로직을 `app/src/utils/videoValidation.ts` 로 분리. UploadPostScreen 은 `import { validateVideoAsset } from '../../utils/videoValidation'` + `export { validateVideoAsset, ALLOWED_VIDEO_MIME, VIDEO_MAX_DURATION_MS, VIDEO_MAX_SIZE_BYTES }` re-export
- **Files modified:** app/src/utils/videoValidation.ts (new), app/src/screens/photographer/UploadPostScreen.tsx (re-export)
- **Verification:** 7 tests green + PLAN grep 검증 (UploadPostScreen 에 validateVideoAsset 존재) 4회 매치
- **Committed in:** bd2a167

**4. [Rule 2 - Critical] PostDetailScreen comment like stub (Context 제거된 메소드)**
- **Found during:** Task 3 UploadPostScreen 완료 후 tsc —noEmit 실행
- **Issue:** PostDetailScreen line 74 에서 `const { toggleCommentLike, isCommentLiked } = usePhotographer()` — Plan 03 에서 Context 제거됨. 4 곳 호출 지점에서 tsc 오류 + 런타임 crash 예정
- **Fix:** 로컬 `Set<string>` state `localLikedComments` + `isCommentLiked` / `toggleCommentLike` helper 로 임시 stub. UI 동작 유지, 서버 저장 없음, 재렌더 시 리셋
- **Files modified:** app/src/screens/explore/PostDetailScreen.tsx
- **Committed in:** b1714e8

### Not Auto-fixed (Out of Scope, Plan 05 Resolves)

PLAN success_criteria 명시대로 Plan 05 이관 대상 TS 오류 12건:
- `src/contexts/AdminContext.tsx` 2건 (`updatePostStatus`, `updatePhotographerVerification`)
- `src/screens/cheerleader/CheerleaderProfileScreen.tsx` 4건 (`cl.name`×3 + `cl.description`×1)
- `src/screens/cheerleader/CheerleadersAllScreen.tsx` 2건 (`cl.name` + `cl.description`)
- `src/screens/photographer/PhotographerProfileScreen.tsx` 1건 (`updatePhotographer`)
- `src/screens/photographer/PhotographerRegisterScreen.tsx` 1건 (`registerPhotographer`)
- `src/screens/photographer/StudioScreen.tsx` 1건 (`setFeaturedPost`)
- `src/screens/social/FollowingListScreen.tsx` 1건 (`followerPgIds`)

---

**Total deviations:** 4 auto-fixed (1 Rule 1 Mechanical, 2 Rule 3 Blocking, 1 Rule 2 Critical)
**Impact on plan:** 모든 deviation 이 기존 저장소 실상 또는 테스트 infra 제약에 대응. PLAN intent 는 완전히 충족 — PLAN 의 must_haves.truths 의 모든 항목 (Plan 05 이관 항목 제외) 달성

## Issues Encountered

- **worktree HEAD 위치 불일치:** `agent-a6cbc6fc` worktree 의 HEAD 가 `5e2aaa4` (Phase 02 병합 시점) 이었고 기대 BASE 는 `1ba44ff` (Wave 2 완료). `git reset --soft $EXPECTED_BASE` + working tree 정리 (`checkout -- . && clean -fd`) 로 HEAD 동기화. 이전 worktree 의 ROADMAP/STATE.md 변경은 다른 agent 가 처리 중이라 버림
- **app/node_modules 부재:** worktree 분리로 인해 app/node_modules 비어있음 → `npm install --no-audit --no-fund --prefer-offline` (4초, 1074 packages) 1회 실행. expo-video 3.0.16 빌드 확인
- **jest-expo PATH 오염:** 상위 PATH 의 jest 30 (`testPathPattern` 옵션명 변경) 가 우선 — `./node_modules/.bin/jest` 직접 호출로 우회 (Plan 02 와 동일 패턴)
- **@testing-library/react-native 미설치:** GradeBadge render 테스트 불가 → pure helper 분리 방식으로 동등 커버리지 확보

## User Setup Required

None — 본 Plan 은 app/ 코드 변경만 (DB/Edge Function/환경변수 추가 없음). Wave 0 (04-01) 이 배포한 generate-thumbnails Edge Function 을 호출만 함.

## Known Stubs

| 파일 | 위치 | 내용 | 해결 예정 |
|------|------|------|-----------|
| PostDetailScreen.tsx | line 78-87 | `localLikedComments` Set + toggleCommentLike 로컬 stub — 서버 저장 없음, 재렌더 시 리셋 | Plan 05 (photo_likes target_type='comment' 서버 연동) |

## Plan 04 Verification Criteria (PLAN success_criteria)

- [x] VideoPlayer 컴포넌트 구현 완료 → `app/src/components/common/VideoPlayer.tsx` 108 lines, `useVideoPlayer` + `VideoView` + mode (feed/detail/studio)
- [x] GradeBadge 컴포넌트 구현 완료 + PhotographerCard 에 icon variant 삽입 → GradeBadge.tsx 98 lines + PopularPhotographersScreen 통합 (PhotographerCard 부재로 ADJ)
- [x] bronze 토큰 + 33개 i18n 키 추가 → colors.ts bronze + ko.ts 35 신규 + 4 교체
- [x] UploadPostScreen validateVideoAsset 7 tests green → 7/7 passed
- [x] UploadPostScreen doPublish Phase 3 D-09 + 영상 + 썸네일 3단계 흐름 → optimize/uploadImages/uploadVideos/createPhotoPost/generate-thumbnails 4-step
- [x] T-4-02, T-4-06 mitigate 검증 (unit test) → too_large 1, unsupported_format 1, iOS .mov → quicktime accept 1
- [x] cheerleader.name → name_ko 사용처 모두 수정 (UploadPostScreen + PhotographerCard 범위) → UploadPostScreen 2곳 + PostDetailScreen 1곳
- [x] isRemote 제거 (본 plan 범위) → UploadPostScreen destructure + doPublish 분기 제거

## Next Phase Readiness

**Wave 3b (Plan 05) 진입 준비 완료:**

Plan 05 가 import 가능한 새 진입점:
```ts
// 공통 컴포넌트 (Plan 04 제공)
import VideoPlayer from '../components/common/VideoPlayer';
import GradeBadge from '../components/photographer/GradeBadge';
import type { VideoPlayerProps } from '../components/common/VideoPlayer';
import type { GradeBadgeProps } from '../components/photographer/GradeBadge';

// 업로드 validation 재사용 (PhotographerRegisterScreen 이 활동내역 파일 업로드 시 활용 가능)
import { validateVideoAsset, ALLOWED_VIDEO_MIME } from '../utils/videoValidation';
```

Plan 05 가 처리해야 할 Plan 03 hand-off 잔여 19건 (Plan 04 범위 외):
- `AdminContext.updatePostStatus` + `updatePhotographerVerification` → adminApi 경유
- `PhotographerProfileScreen.updatePhotographer` → photographerApi.updatePhotographer (Plan 05 신규)
- `PhotographerRegisterScreen.registerPhotographer` → `submitPhotographerApplication` (Plan 02 export) 치환
- `StudioScreen.setFeaturedPost` → admin/Studio adminApi 또는 photographerApi.setFeaturedPost (Plan 05 신규)
- `CheerleaderProfileScreen` / `CheerleadersAllScreen` — `cl.name` / `cl.description` 처리 (~6건)
- `FollowingListScreen.followerPgIds` → photographerApi.fetchFollowers 또는 inverse query
- `PostDetailScreen.toggleCommentLike` (Plan 04 stub) → photo_likes 트리거 검증 후 서버 연동

Plan 05 가 PhotographerCard.tsx 를 신규 생성하면 GradeBadge icon variant 삽입 패턴 동일 적용 가능 (PopularPhotographersScreen 참고).

## Self-Check: PASSED

**Created files exist:**
- FOUND: app/src/components/common/VideoPlayer.tsx (108 lines)
- FOUND: app/src/components/photographer/GradeBadge.tsx (98 lines)
- FOUND: app/src/components/photographer/__tests__/GradeBadge.helpers.test.ts (50 lines)
- FOUND: app/src/utils/videoValidation.ts (60 lines)
- FOUND: app/src/screens/photographer/__tests__/UploadPostScreen.validateVideoAsset.test.ts (50 lines)

**Commits exist:**
- FOUND: 9f01892 (Task 1)
- FOUND: 019c68e (Task 2 RED)
- FOUND: 7f327d0 (Task 2 GREEN)
- FOUND: bd2a167 (Task 3 TEST)
- FOUND: b1714e8 (Task 3 FEAT)

**Verification metrics:**
- `jest --testPathPattern=validateVideoAsset|GradeBadge|photographerGrade`: 31 passed / 31 total
- `grep -c validateVideoAsset` in UploadPostScreen.tsx: 4
- `grep -c useVideoPlayer` in VideoPlayer.tsx: 2 (import + use)
- `grep -c gradeToBadge` in GradeBadge.tsx: 1
- `grep -c uploadPostVideos` in UploadPostScreen.tsx: 2
- `grep -c generate-thumbnails` in UploadPostScreen.tsx: 2
- `grep -c bronze` in colors.ts: 3 (light + dark + comment)
- `grep -c upload_video_too_long_title` in ko.ts: 1
- tsc --noEmit: 12 errors remaining (모두 Plan 05 이관 대상, Plan 04 target 파일 자체 오류 0)

---
*Phase: 04-photographer*
*Plan: 04*
*Completed: 2026-04-15*
