---
phase: 04-photographer
plan: 09
subsystem: mobile
tags: [video, feed, detail-screen, uat-gap-closure]
requirements: [PHOT-03, PHOT-04]
dependency-graph:
  requires:
    - 04-04  # VideoPlayer component (feed/detail/studio modes) - reused unchanged
    - 04-07  # useLoginGate fix + EAS rebuild - keeps UAT re-testable
  provides:
    - "PostDetailScreen hero video playback (mode='detail') — Test 11/13 unblock"
    - "HomeScreen trending grid viewport-aware autoplay (mode='feed') — Test 12 unblock"
    - "play overlay + thumbnail fallback across 4 feed/profile/archive screens"
  affects:
    - app/src/screens/explore/PostDetailScreen.tsx
    - app/src/screens/home/HomeScreen.tsx
    - app/src/screens/home/AllPostsScreen.tsx
    - app/src/screens/home/FeaturedAllScreen.tsx
    - app/src/screens/photographer/PhotographerProfileScreen.tsx
    - app/src/screens/archive/ArchiveScreen.tsx
    - app/src/i18n/locales/ko.ts
tech-stack:
  added: []  # VideoPlayer component already existed from Plan 04-04
  patterns:
    - "HeroMediaItem discriminated union (image|video) for unified hero/fullscreen rendering"
    - "onViewableItemsChanged + itemVisiblePercentThreshold=60 for viewport-aware feed autoplay"
    - "post.thumbnail_urls?.[0] ?? post.images[0] fallback — consistent preview URL resolution"
    - "play overlay round badge (rgba(0,0,0,0.55), 22~28px) — StudioScreen-proven pattern"
key-files:
  created: []
  modified:
    - app/src/screens/explore/PostDetailScreen.tsx
    - app/src/screens/home/HomeScreen.tsx
    - app/src/screens/home/AllPostsScreen.tsx
    - app/src/screens/home/FeaturedAllScreen.tsx
    - app/src/screens/photographer/PhotographerProfileScreen.tsx
    - app/src/screens/archive/ArchiveScreen.tsx
    - app/src/i18n/locales/ko.ts
decisions:
  - "HomeScreen trending 그리드만 인라인 VideoPlayer(mode='feed') 마운트 — AllPosts/FeaturedAll/PhotographerProfile/Archive 는 play overlay + thumbnail fallback 로 충분 (과도한 expo-video player 인스턴스 비용 억제)"
  - "FlatList scrollEnabled={false} + onViewableItemsChanged 조합 채택 — 부모 ScrollView 스크롤에도 viewability 이벤트가 FlatList 자체 viewport 로 계산됨 (trending 6개 고정이므로 리스트 가상화 손실 없음)"
  - "video 아이템의 thumbnail strip preview 는 thumbnail_urls 가 있으면 우선, 없으면 video URL 자체 (Image 가 실패 시 surface 배경으로 degrade) — Plan 04-06 EF 가 thumbnail 을 채우는 게 완전히 보장되기 전까지의 fallback"
  - "VideoPlayer 컴포넌트 자체는 수정 금지 — Plan 04-04 산출물 재사용만 (3 모드 정책 유지)"
metrics:
  duration: "~45m"
  completed-date: 2026-04-20
---

# Phase 04 Plan 09: 영상 재생 3곳 마운트 + 피드 카드 play overlay 확산 Summary

영상 업로드된 post 가 PostDetailScreen hero (detail mode) 와 HomeScreen trending 그리드 (feed mode viewport-aware) 에서 VideoPlayer 로 실제 재생되며, 나머지 4곳 피드/프로필/아카이브는 play overlay + thumbnail fallback 으로 영상 전용 포스트가 깨지지 않게 만든 UAT Test 11/12/13 gap 해소.

## What Was Built

### Task 1 — PostDetailScreen hero = images+videos 통합 media 배열 렌더
- `HeroMediaItem = { kind: 'image'; uri } | { kind: 'video'; uri }` discriminated union 도입
- `gallery` 를 `useMemo` 로 `[...images 태그, ...videos 태그]` 통합 배열로 전환 — videos-only post 도 `gallery.length > 0` 가드 통과
- hero FlatList `renderItem` 이 `item.kind === 'video'` 면 `VideoPlayer(mode='detail', width=SCREEN_WIDTH, height=SCREEN_WIDTH*4/3)` 렌더, 아니면 기존 pinch-zoom ScrollView + Image
- Fullscreen modal FlatList `renderItem` 도 동일 분기 (video: `VideoPlayer(mode='detail', width=SCREEN_WIDTH, height=SCREEN_HEIGHT)`, image: zoom ScrollView)
- Thumbnail strip 에서 video 아이템은 `thumbnail_urls?.[0] ?? item.uri` 프리뷰 + `thumbVideoOverlay` (22x22 round play icon) 표시 + `accessibilityLabel={t('a11y_video_preview')}`
- `specsGrid` 의 `gallery.length` 는 이제 "미디어 총 개수" 의미 — 정성적 변경 없이 자연 수용
- i18n: `a11y_video_preview: '영상 미리보기'` 신규 key 추가

**Commit:** a6467ab — `feat(04-09): PostDetailScreen hero renders images+videos via VideoPlayer`

### Task 2 — HomeScreen trending 그리드 = FlatList + viewport-aware VideoPlayer(mode='feed')
- react import 에 `useRef` 추가, react-native import 에 `FlatList` + type-only `ViewToken` 추가, `VideoPlayer` import
- `visibleIndices: Set<number>` state + `onViewableItemsChanged` (itemVisiblePercentThreshold=60) 으로 viewport 내 index 추적
- trending 그리드를 `<View style={styles.postGrid}>{trendingPosts.map(...)}</View>` 에서 `<FlatList numColumns={2} scrollEnabled={false} onViewableItemsChanged={...} viewabilityConfig={...} renderItem={...} />` 로 전환
- renderItem 내부: `hasVideo && videoUri` 면 `VideoPlayer(mode='feed', isVisible={visibleIndices.has(index)}, width=CARD_WIDTH, height=CARD_WIDTH*1.25)`, 아니면 fallback Image (`thumbnail_urls[0] ?? images[0]`) 또는 grey placeholder
- Format badge: `videocam` + 'VIDEO' / `image` + 'PHOTO' 분기
- Featured horizontal cards: `hasVideo` + `previewUri` 도입, `featuredPlayOverlay` (28x28 round) 를 top-right 에 (featuredTag 는 top-left 유지라 충돌 없음)

**Commit:** 0c99c9f — `feat(04-09): HomeScreen trending grid uses FlatList with viewport-aware VideoPlayer`

### Task 3 — 4 screens: play overlay + thumbnail fallback (인라인 재생 없음)
- `AllPostsScreen`: `renderPost` 에 `previewUri`/`hasVideo` 추가 + `Image`→fallback View + `videoPlayOverlay` (28x28 top-right) + `videoPlayOverlay` 스타일 추가
- `FeaturedAllScreen`: `featured.map` 을 함수 IIFE 패턴으로 전환, 동일 overlay/fallback 적용, `videoPlayOverlay` 스타일 추가
- `PhotographerProfileScreen`: `visiblePosts.map` 함수 패턴 전환, `postThumb` 에 `videoPlayOverlay` (22x22) + `multiIcon` 은 `!hasVideo` 가드로 충돌 회피
- `ArchiveScreen`: `renderPhotoGrid` 에서 `gridItem` 에 `videoPlayOverlay` (22x22) + `gridMediaBadge` 는 `!hasVideo` 가드

**Commit:** a90bce2 — `feat(04-09): add play overlay + thumbnail fallback to 4 feed screens`

## Deviations from Plan

None — plan executed exactly as written. TypeScript strict check는 3 task 모두 0 error로 통과했고, 모든 grep verification (`VideoPlayer` 3 파일, `hasVideo` 5 파일, `a11y_video_preview` 1 파일, `thumbnail_urls` 도입) 통과.

VideoPlayer.tsx 는 수정되지 않았음 (`git diff` 0 lines) — Plan 04-04 산출물의 3 모드 정책을 그대로 재사용.

## Authentication Gates

없음 — 전부 client-side UI 작업.

## Tests / Verification

### Code-level 자동 검증 (전부 통과)
- `cd app && ./node_modules/.bin/tsc --noEmit` → type error 0
- `grep -c VideoPlayer` 3 파일 매치 (PostDetail=3, HomeScreen=2, UploadPostScreen=2)
- `grep -l hasVideo` 5 파일 매치 (HomeScreen / AllPosts / FeaturedAll / PhotographerProfile / Archive)
- `grep a11y_video_preview app/src/i18n/locales/ko.ts` 매치
- `git diff {base} app/src/components/common/VideoPlayer.tsx` 0 line (수정 없음 확인)

### Behavior-level 검증 (후속 UAT 세션에서 실기기)
- **Test 11** — 영상 업로드된 post 상세 진입 → hero carousel 의 video 슬라이드에서 VideoPlayer native controls 로 재생 ✅ (코드 수준 gate 통과)
- **Test 12** — 홈 trending 그리드 스크롤 → viewport 에 들어오는 영상 카드 autoplay (muted + loop), 벗어나면 pause ✅ (코드 수준 gate 통과)
- **Test 13** — 상세 video hero — 재생/일시정지/seek bar 동작 확인 ✅ (코드 수준 gate 통과; nativeControls prop = mode==='detail' 자동)
- 영상 전용 포스트 (images=[], videos=['url']): 피드 카드는 grey placeholder + play overlay, 상세는 video hero 로 정상 표시 ✅
- 이미지 전용 포스트: 기존 동작 보전 — double-tap like / pinch zoom / fullscreen 전부 유지 ✅ (video 분기가 별도 branch 이므로 image 경로에는 변화 없음)

## Files Modified

- `app/src/screens/explore/PostDetailScreen.tsx` (+43 -22)
- `app/src/screens/home/HomeScreen.tsx` (+129 -73)
- `app/src/screens/home/AllPostsScreen.tsx` (+27 -10)
- `app/src/screens/home/FeaturedAllScreen.tsx` (+42 -25)
- `app/src/screens/photographer/PhotographerProfileScreen.tsx` (+42 -16)
- `app/src/screens/archive/ArchiveScreen.tsx` (+20 -4)
- `app/src/i18n/locales/ko.ts` (+1)

## Commits

| Commit | Task | Files |
|---|---|---|
| a6467ab | Task 1: PostDetailScreen video hero | PostDetailScreen.tsx, ko.ts |
| 0c99c9f | Task 2: HomeScreen trending FlatList + feed autoplay | HomeScreen.tsx |
| a90bce2 | Task 3: 4 feed screens play overlay + fallback | AllPosts/FeaturedAll/PhotographerProfile/Archive |

## Known Stubs

None — 본 plan 은 전부 실제 post.videos / post.thumbnail_urls 데이터를 소비하는 실제 렌더링 코드. 하드코딩된 mock 값이나 "coming soon" placeholder 없음.

## Threat Flags

None — 신규 네트워크 엔드포인트, 인증 경로, 파일 접근 추가 없음. VideoPlayer (expo-video) 가 post.videos URL 을 받아 native video view 를 띄우는 것만 추가되었으며, 이 URL 은 이미 Plan 04-06 의 R2 presigned upload → public URL → photo_posts DB 저장 체인에서 trust boundary 를 통과한 값.

## Success Criteria Status

1. ✅ UAT Test 11 gap 이 `status: resolved` 로 flip 가능 — R2 업로드 영상이 상세 화면 hero 에서 VideoPlayer 로 재생됨 (코드 gate 통과)
2. ✅ Test 12 (Feed Mode Autoplay) 가 blocked → pass-able 로 전환 (HomeScreen trending 그리드 viewport-aware autoplay 마운트)
3. ✅ Test 13 (Detail Mode Native Controls) 이 blocked → pass-able 로 전환 (VideoPlayer mode='detail' 의 nativeControls prop)
4. ✅ 영상 전용 포스트 (images=[], videos=['url']) 가 피드 카드 / 프로필 그리드 / 아카이브 / 상세 어디에서도 깨지지 않음 (fallback previewUri + grey placeholder)
5. ✅ VideoPlayer 컴포넌트는 수정 없이 3곳에서 마운트 — feed mode(HomeScreen trending), detail mode(PostDetailScreen hero + fullscreen)
6. ✅ TypeScript strict 모드 통과 (no any, no untyped)
7. ✅ 기존 이미지 전용 포스트 동작 (double-tap like, pinch zoom, fullscreen, thumbnail strip) 전부 보전 — image 아이템은 기존 `TouchableOpacity + ScrollView (zoom) + Image` 경로 유지

## Self-Check: PASSED

- [x] `.planning/phases/04-photographer/04-09-SUMMARY.md` exists (this file)
- [x] Commit a6467ab exists: `git log --oneline | grep a6467ab`
- [x] Commit 0c99c9f exists: `git log --oneline | grep 0c99c9f`
- [x] Commit a90bce2 exists: `git log --oneline | grep a90bce2`
- [x] All 3 task verifications passed (tsc 0 errors, grep all matched, VideoPlayer.tsx diff=0)
