---
id: 260423-gz3
kind: quick
status: complete
description: "안드로이드 실기기에서 이번주베스트컷 등의 영상 썸네일 탭 시 게시글 상세로 네비게이션되지 않는 문제 수정"
date: 2026-04-23
commit: 28dd6d7
---

# Quick Task 260423-gz3 — Summary

## 결과

안드로이드 실기기에서 영상 썸네일 탭이 게시글 상세로 이어지지 않던 문제를
`VideoPlayer` 컴포넌트 한 곳을 수정해 해결했다. 이미지 썸네일 동작은 그대로
이며, 영상 상세화면(`mode="detail"`)의 nativeControls 는 영향 없다.

## 근본 원인

`app/src/components/common/VideoPlayer.tsx` 의 `<VideoView>` (expo-video) 가
Android 에서 자기 자신과 자식 뷰에서 발생한 터치 이벤트를 모두 소비했다.
부모 `TouchableOpacity`/`PressableScale` 의 `onPress` 가 호출되지 않아
`navigation.navigate('PostDetail', ...)` 가 발생하지 않았다.

이미지 경로는 `<Image>` 가 터치를 가로채지 않으므로 정상 동작했다.

## 수정

1 파일만 변경. 모드별 `pointerEvents` 정책을 도입:

- `feed` / `studio` 모드 — 루트 `<View>` + 에러 placeholder 에 `pointerEvents="none"` (부모 카드로 터치 전달)
- `detail` 모드 — `pointerEvents="auto"` (nativeControls 가 터치 수용)
- 로딩 오버레이 — 모드 무관 항상 `pointerEvents="none"` (시각 전용)

## 영향 범위 (단일 수정으로 전부 해결)

- HomeScreen Featured carousel (이번 주 베스트 컷)
- HomeScreen Trending 2-col grid
- FeaturedAllScreen
- AllPostsScreen
- PhotographerProfileScreen 썸네일 그리드
- ArchiveScreen 그리드
- ExploreScreen Hot / List (video-only fallback)
- CollectionDetailScreen 썸네일
- StudioScreen 포스트 그리드
- CheerleaderProfileScreen 그리드
- UploadPostScreen 업로드 프리뷰 (부모 Pressable 없음 — 기존 동작 영향 없음)

## 검증

- `npx tsc --noEmit` ✅ (app 디렉터리, 에러 없음)
- `jest` ✅ 회귀 없음 (pre-existing 인증 테스트 실패는 수정 전/후 동일 — 이 변경과 무관)
- 안드로이드 실기기 수동 확인 — **사용자 검증 필요**:
  - 홈 → 이번 주 베스트 컷 영상 카드 탭 → 상세 진입 확인
  - 트렌딩/전체보기/아카이브/포토그래퍼 프로필/익스플로어 영상 썸네일 탭 동일 확인
  - 이미지 썸네일 탭 동작이 깨지지 않았는지 확인
  - PostDetail 화면 영상 재생 컨트롤(재생/일시정지/PiP) 정상 동작 확인

## Commit

`28dd6d7 fix(video-player): pass touches to parent in feed/studio modes`

## Files Changed

- `app/src/components/common/VideoPlayer.tsx` (+17 / -3)

## Out of Scope (건드리지 않은 것)

- VideoPlayer 내부 player lifecycle / autoplay 로직
- 각 화면 개별 수정 (단일 지점 수정으로 충분)
- `expo-video` 버전 변경
