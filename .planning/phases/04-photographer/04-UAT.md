---
status: resolved
phase: 04-photographer
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md
started: 2026-04-15T06:02:29Z
updated: 2026-04-15T06:55:00Z
---

## Current Test

[Test 1 blocker 해소 — 04-07 gap closure 완료. Android emulator 에서 fresh start PASS 확인 (2026-04-15 15:55, 로그인 화면 정상 렌더링, ExpoVideo native module 로드, useLoginGate navigationRef 전환). Tests 2~24 는 unblock 되어 실기기 QA 매트릭스 재개 가능 (pending).]

## Tests

### 1. Cold Start Smoke Test
expected: Expo 앱 fresh start — 크래시 없이 로드되고 Supabase 피드 데이터가 표시됨. (Plans 01~06 배포 전수 동작 확인)
result: pass
resolved_at: 2026-04-15T15:55:00+09:00
resolved_by: Plan 04-07 gap closure — EAS dev build (Android build 0ea0f6c8 / iOS build f317a5a2) 재생성 + useLoginGate navigationRef 전환 (commit ad4e42d). Android emulator (Pixel_9) 에서 로그인 화면 정상 렌더링, ExpoVideo native module 로드, 어떤 RED screen 도 없음.

### 2. Photographer Register — Step 1~3 Form Submit
expected: 비-포토그래퍼 사용자가 "포토그래퍼 신청" 진입 → Step 1 팀 선택, Step 2 활동 링크(http/https, 1~3개), Step 3 활동 계획 입력 → Step 3 "제출" 탭 시 submitPhotographerApplication 호출 → 성공 시 Step 4 화면으로 전환.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 3. Photographer Register — Step 4 Pending Hero
expected: Step 4 화면에 time-outline 큰 아이콘(64px) + "심사 대기 중" 제목 + 설명 문구 + "홈으로" primary CTA 표시. CTA 탭 시 홈으로 이동.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 4. Studio Tab — No Application State
expected: 미신청 사용자 계정으로 로그인 → 하단 Studio 탭 레이블 "스튜디오 신청" + aperture-outline 아이콘. 탭 진입 시 no_application UI (신청 유도 화면).
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 5. Studio Tab — Pending State
expected: 심사 대기 중 사용자 → Studio 탭 레이블 "심사 중" + time-outline 아이콘. 탭 진입 시 pending UI (대기 메시지).
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 6. Studio Tab — Approved State + GradeBadge
expected: 승인된 포토그래퍼 → Studio 탭 레이블 "스튜디오" + camera 아이콘. 탭 진입 시 기존 Studio UI + 상단에 GradeBadge (icon-label sm) + is_verified 배지.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 7. Upload Post — Image Upload (1~7장)
expected: Studio > 업로드 화면에서 이미지 1~7장 선택 → R2 업로드 진행 → 완료 시 피드 상단에 새 포스트 prepend. 썸네일은 일정 시간 후 thumbnail_urls 반영 (fire-and-forget).
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 8. Upload Post — Video Validation (35초 초과 차단)
expected: 35초 초과 영상 선택 시 "영상이 너무 깁니다" Alert 표시되고 목록에 추가되지 않음 (T-4-02 mitigation).
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 9. Upload Post — Video Validation (60MB 초과 차단)
expected: 60MB 초과 영상 선택 시 "영상이 너무 큽니다" Alert 표시되고 목록에 추가되지 않음.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 10. Upload Post — Video Format Validation (webm 차단)
expected: webm/avi/mkv 등 지원 안 되는 형식 선택 시 "지원하지 않는 형식" Alert 표시되고 추가되지 않음 (T-4-06 mitigation). mp4/mov만 허용.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 11. Upload Post — Video Upload + Playback
expected: 정상 mp4 또는 mov 영상 업로드 → R2 presigned PUT 성공 → createPhotoPost 반영 → 피드에서 VideoPlayer 로 재생됨.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 12. VideoPlayer — Feed Mode Autoplay
expected: 홈 피드 스크롤 중 영상 포스트가 viewport 안에 들어오면 autoplay (muted + loop). 벗어나면 pause.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 13. VideoPlayer — Detail Mode Native Controls
expected: 포스트 상세에서 영상 영역 표시 시 native controls (재생/일시정지/seek bar) 사용 가능.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 14. GradeBadge — Photographer Profile Header
expected: PhotographerProfileScreen 진입 시 display_name 바로 뒤 marginLeft 8 위치에 GradeBadge (icon-label md) + spacing.sm(8px) 간격 후 is_verified. 4-tier 색상 (bronze/silver/gold/diamond) 정확.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 15. GradeBadge — Popular Photographers Feed
expected: 홈 "인기 포토그래퍼" 리스트에서 각 카드의 display_name 뒤에 GradeBadge icon variant (20px) 표시 + is_verified 뱃지.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 16. Photo Feed — Real Supabase Data (Mock 제거)
expected: 홈 피드에 표시되는 photo posts 와 community posts 가 Supabase 에서 fetch 한 실제 데이터 (mock 사라짐). cheerleader 이름은 name_ko 로 표시.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 17. Photo Feed — Pagination (loadMore)
expected: 피드 끝까지 스크롤 시 loadMorePhotoPosts 호출 → 다음 페이지 posts 가 append. dedupe 되어 동일 id 중복 없음.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 18. Photo Feed — Team Filter Switch
expected: 팀 필터(구단) 변경 시 posts 리셋 (page=0) → 해당 팀 posts 만 재로드.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 19. Collection Detail — 3-State UI (Loading/Error/Empty)
expected: 빈 컬렉션 진입 시 empty 상태 (ionicons + 문구). 네트워크 오류 시 EmptyState + retry 버튼. 로딩 중 ActivityIndicator.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 20. Collection Detail — Posts Display
expected: posts 가 있는 컬렉션 진입 시 getCollectionPosts async fetch → 썸네일 그리드 표시 + 영상 포함 post 는 24×24 play overlay.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 21. Like Toggle — Optimistic UI
expected: 하트 버튼 탭 시 즉시 빨간색 + count +1 → 백그라운드로 photo_likes 테이블 반영. 서버 에러 시 롤백.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 22. Follow Toggle — Optimistic UI
expected: 포토그래퍼 프로필에서 "팔로우" 탭 시 즉시 "팔로잉" 으로 전환 → 백그라운드 photographer_follows 반영. 서버 에러 시 롤백.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 23. Duplicate Pending Application — Server Block (HI-03)
expected: 이미 pending 신청이 있는 사용자가 재신청 시도 → 서버가 unique 위반 (23505) 로 거부 → UI 에 에러 Alert 표시. 재신청 폼 데이터는 보존.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

### 24. Photographer Approval Trigger — Notifications
expected: (어드민 영역 필요) admin 이 photographer_applications.status='approved' 업데이트 → 트리거가 photographers INSERT + users.is_photographer=TRUE + notifications INSERT. 승인된 사용자의 알림 화면에 "포토그래퍼 승인" 알림 표시.
result: pending
unblocked_at: 2026-04-15T15:55:00+09:00
unblocked_by: Plan 04-07 — Test 1 blocker 해소, 실기기 QA 매트릭스 재개 가능

## Summary

total: 24
passed: 1
issues: 0
pending: 23
skipped: 0
blocked: 0

## Gaps

- truth: "Expo 앱 fresh start 시 크래시 없이 로드되고 Supabase 피드 데이터가 표시됨"
  status: resolved
  resolved_at: 2026-04-15T15:55:00+09:00
  resolved_by: "Plan 04-07 gap closure. (a) EAS development build (Android 0ea0f6c8, iOS f317a5a2) 재생성 + emulator/simulator 재설치로 expo-video 3.0.16 native module 정상 등록 확인. (b) fresh build 후 드러난 2차 버그 (PhotographerContext useLoginGate → useNavigation 이 NavigationContainer 바깥에서 호출) 도 동시 수정 — navigation/navigationRef.ts 신설 후 useLoginGate 가 module-level navigationRef 사용하도록 전환 (commit ad4e42d). Android emulator (Pixel_9) 검증: 로그인 화면 정상 렌더링, ErrorBoundary fallback 없음, ExpoVideo / navigation 에러 로그 0건."
  reason: "User reported: npx expo start 후 안드 시뮬에서 앱 크래시 — [runtime not ready]: Error: Cannot find native module 'ExpoVideo', requireNativeModule@... (전체 native stack trace). Expo Go 또는 구 dev build 에서 expo-video 3.0.16 native module 을 찾을 수 없음. Plan 01 에서 expo-video 를 app.json plugins 에 추가했으나 native rebuild (EAS dev build) 가 필요함."
  severity: blocker
  test: 1
  root_cause: "순수 native rebuild 누락 — 코드/설정 변경 불필요. Expo managed workflow (CNG) 이므로 신규 native 의존성(expo-video 3.0.16) 추가 시 EAS dev build 재생성 + 시뮬레이터 재설치 필수. 사용자는 Plan 01 이전 빌드된 구 dev client 또는 Expo Go(expo-video 미번들) 로 실행 중 → App.tsx 부팅 시 UploadPostScreen → VideoPlayer → expo-video import 체인이 즉시 평가되어 requireNativeModule('ExpoVideo') throw → [runtime not ready] RED screen. 코드 5개 검증 모두 정상: package.json expo-video ~3.0.16, app.json plugins 등록, VideoPlayer.tsx 올바른 import/API, UploadPostScreen 호출, eas.json development 프로파일. app/ios, app/android 디렉토리 부재로 managed workflow 확정."
  artifacts:
    - path: "app/package.json"
      issue: "정상 — expo-video ~3.0.16 (SDK 54 호환). 변경 불필요."
    - path: "app/app.json"
      issue: "정상 — plugins 배열에 expo-video 등록됨. 변경 불필요."
    - path: "app/src/components/common/VideoPlayer.tsx"
      issue: "정상 — useVideoPlayer + VideoView import 올바름. 변경 불필요."
    - path: "app/eas.json"
      issue: "정상 — development 프로파일 그대로 사용 가능. 변경 불필요."
    - path: ".planning/phases/04-photographer/04-HUMAN-UAT.md"
      issue: "사전 준비 체크리스트 보강 권장 (선택) — 'EAS dev build 재생성 필수' 한 줄 추가하면 향후 재발 방지."
    - path: "docs/phase4-qa-matrix.md"
      issue: "사전 준비 체크리스트 보강 권장 (선택)."
  missing:
    - "EAS dev build 재생성 — `cd app && eas build --profile development --platform android` (+ iOS 병행, ~15~30분)"
    - "빌드 완료 → `eas build:run --platform android` 또는 dashboard 에서 APK 받아 시뮬레이터 install"
    - "`npx expo start --dev-client` 로 새 dev client 에 연결 → 정상 부팅 검증 후 UAT Test 1 재실행"
    - "(선택) 04-HUMAN-UAT.md / docs/phase4-qa-matrix.md 상단에 사전 준비 체크리스트 추가"
  debug_session: ".planning/debug/expo-video-native-missing.md"
  debug_session: "pending — 사용자가 /gsd-debug 로 진행 예정"
