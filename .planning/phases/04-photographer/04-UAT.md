---
status: partial
phase: 04-photographer
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md
started: 2026-04-15T06:02:29Z
updated: 2026-04-20T00:00:00Z
---

## Current Test

[session paused — video rendering issue (Test 11) 우선 해결 후 재개]

## Tests

### 1. Cold Start Smoke Test
expected: Expo 앱 fresh start — 크래시 없이 로드되고 Supabase 피드 데이터가 표시됨. (Plans 01~06 배포 전수 동작 확인)
result: pass
resolved_at: 2026-04-15T15:55:00+09:00
resolved_by: Plan 04-07 gap closure — EAS dev build (Android build 0ea0f6c8 / iOS build f317a5a2) 재생성 + useLoginGate navigationRef 전환 (commit ad4e42d). Android emulator (Pixel_9) 에서 로그인 화면 정상 렌더링, ExpoVideo native module 로드, 어떤 RED screen 도 없음.

### 2. Photographer Register — Step 1~3 Form Submit
expected: 비-포토그래퍼 사용자가 "포토그래퍼 신청" 진입 → Step 1 프로필 설정(팀 선택 + 활동 링크 http/https 1~3개 + 활동 계획 입력), Step 2 약관 동의(포토그래퍼 약관 + 저작권 정책 체크박스), Step 3 저작권 확인(consent 체크) → "포토그래퍼 신청하기" 탭 시 submitPhotographerApplication 호출 → 성공 시 Step 4 화면으로 전환. (UI-SPEC §PhotographerRegisterScreen 기준 3-step 구조)
result: pass
verified_at: 2026-04-15T17:00:00+09:00
verified_by: 실기기(Android emulator Pixel_9) — 사용자가 Step 1~3 입력 후 제출 → Step 4 "심사 대기 중" 화면 전환 확인. UAT 원본 expected 는 구조 설명이 outdated 였으나 실제 구현은 UI-SPEC 의도대로 동작. expected 를 현재 구조(프로필/약관/저작권) 로 갱신함.

### 3. Photographer Register — Step 4 Pending Hero
expected: Step 4 화면에 time-outline 큰 아이콘(64px) + "심사 대기 중" 제목 + 설명 문구 + "홈으로" primary CTA 표시. CTA 탭 시 홈으로 이동.
result: pass
verified_at: 2026-04-15T17:00:00+09:00
verified_by: 실기기(Android emulator) — Step 4 pending hero 정상 렌더링 확인 (time-outline 아이콘 + 심사 대기 중 + 신청 접수 안내 + 홈으로 돌아가기 CTA).

### 4. Studio Tab — No Application State
expected: 미신청 사용자 계정으로 로그인 → 하단 Studio 탭 레이블 "포토그래퍼" + camera-outline 아이콘(focused: camera). 탭 진입 시 no_application UI (신청 유도 화면 — "직관 사진과 영상을 팬들과 나눠보세요" + studio_signup_cta CTA). (UI-SPEC §MainTabNavigator + §StudioScreen State A 기준)
result: issue
reported: "미신청일때 맞게 나오는데 신청하고 나서도 그대로 보임. 앱을 아예 껐다키면 심사중으로 뜨지만 수정해야됨"
severity: major
verified_at: 2026-04-15T17:05:00+09:00
observation: "no_app state UI/label/icon 자체는 정상. 단, 신청 제출(submitPhotographerApplication 성공 → Step 4 pending hero 전환) 후 탭으로 복귀해도 studioState 가 'no_app' 그대로 유지됨 → 레이블 '포토그래퍼' + camera 아이콘 유지. 앱 kill-and-restart 시에만 MainTabNavigator 의 useEffect 가 fetchMyPhotographerApplication 재호출하여 'pending' 으로 전환됨. 실시간 반영을 위한 state 동기화 누락."

### 5. Studio Tab — Pending State
expected: 심사 대기 중 사용자 → Studio 탭 레이블 "심사중" + time-outline 아이콘(focused: time). 탭 진입 시 pending UI (time-outline 64px + studio_pending_title + body + 선택 info card "결과는 알림 탭에서 확인할 수 있어요", CTA 없음 — UI-SPEC §StudioScreen State B).
result: pass
verified_at: 2026-04-15T17:10:00+09:00
verified_by: 실기기(Android emulator) — 앱 재시작 후 pending 사용자로 로그인 → 탭 레이블 "심사중" + time 아이콘 + pending UI 정상 표시.

### 6. Studio Tab — Approved State + GradeBadge
expected: 승인된 포토그래퍼 → Studio 탭 레이블 "스튜디오" + aperture-outline 아이콘(focused: aperture). 탭 진입 시 기존 Studio UI + 상단에 GradeBadge (icon-label sm, display_name 옆 8px 간격) + is_verified 배지(spacing.sm, check-circle 16). (UI-SPEC §MainTabNavigator + §StudioScreen State C 기준)
result: pass
verified_at: 2026-04-15T17:50:00+09:00
verified_by: CLI 직접 승인 후 실기기(Android emulator) — wecord.admin@gmail.com(박상우) application 을 Supabase SQL 로 approved 전환 → 트리거가 photographers INSERT + users.is_photographer=TRUE + approval notification INSERT 수행(전수 검증). 앱 kill-and-restart 후 Studio 탭 '스튜디오' + aperture 아이콘 + approved UI + GradeBadge bronze(post 0) 정상 표시.
approval_artifact: application_id=9a2abfdc-7113-4f25-aedf-1bc3ca019607, user_id=cde60f4d-207c-43ab-9da9-76bf2dd70bfb, reviewed_at=2026-04-15 08:46:01+00

### 7. Upload Post — Image Upload (1~7장)
expected: Studio > 업로드 화면에서 이미지 1~7장 선택 → R2 업로드 진행 → 완료 시 피드 상단에 새 포스트 prepend. 썸네일은 일정 시간 후 thumbnail_urls 반영 (fire-and-forget).
result: pass
verified_at: 2026-04-15T18:15:00+09:00
initial_issue: "upload url request failed: 401 — get-upload-url Edge Function 이 Supabase gateway 단계에서 user JWT 를 거부."
root_cause: "Phase 4-01 에서 generate-thumbnails 에만 verify_jwt=false 적용하고 get-upload-url 은 누락. Supabase gateway 의 ES256 rotation 이슈로 user token 이 gateway 에서 거부됨 (Phase 3 03-04 에서 이미 확인된 패턴)."
resolved_by: "supabase/config.toml 에 [functions.get-upload-url] verify_jwt=false 추가 + `supabase functions deploy get-upload-url --no-verify-jwt` 재배포. Edge Function 내부의 supabase.auth.getUser(token) 재검증은 유지되므로 보안 동일."
verified_by: "실기기(Android emulator) — 재배포 후 이미지 업로드 성공, R2 presigned PUT → createPhotoPost → 피드 prepend 정상 동작."

### 8. Upload Post — Video Validation (30초 초과 차단)
expected: 30초(VIDEO_MAX_DURATION_MS = 30_000) 초과 영상 선택 시 "영상이 너무 깁니다" Alert 표시되고 목록에 추가되지 않음 (T-4-02 mitigation, videoValidation.ts 기준).
result: pass
verified_at: 2026-04-20T00:00:00+09:00
verified_by: 실기기 — 30초 초과 영상 선택 시 "영상이 너무 깁니다" Alert 정상 표시, 목록에 추가되지 않음. 단, 별도 관찰: 허용되는 영상 업로드 완료 후 실제 게시물에서 영상이 렌더링되지 않음 (Test 11 에서 별도 이슈로 기록).
side_observation: "허용된 영상 업로드 후 게시물에서 영상이 보이지 않음 — Test 11 (Video Upload + Playback) 에서 재현/추가 조사 예정"

### 9. Upload Post — Video Validation (50MB 초과 차단)
expected: 50MB(VIDEO_MAX_SIZE_BYTES = 50*1024*1024) 초과 영상 선택 시 "영상이 너무 큽니다" Alert 표시되고 목록에 추가되지 않음 (videoValidation.ts 기준).
result: pass
verified_at: 2026-04-20T00:00:00+09:00
verified_by: 실기기 — 50MB 초과 영상 차단 Alert 정상

### 10. Upload Post — Video Format Validation (webm 차단)
expected: webm/avi/mkv 등 지원 안 되는 형식 선택 시 "지원하지 않는 형식" Alert 표시되고 추가되지 않음 (T-4-06 mitigation). mp4/mov만 허용.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: 사용자 skip 선택

### 11. Upload Post — Video Upload + Playback
expected: 정상 mp4 또는 mov 영상 업로드 → R2 presigned PUT 성공 → createPhotoPost 반영 → 피드에서 VideoPlayer 로 재생됨.
result: issue
reported: "r2에는 정상 업로드가 된걸 확인했는데 실제 앱의 게시물에서 확인이 불가능함"
severity: major
reported_at: 2026-04-20T00:00:00+09:00
observation: "R2 업로드까지는 성공 (bucket 에 object 존재 확인). 그러나 피드/게시물 UI 에서 VideoPlayer 가 렌더링되지 않거나 video 소스가 재생되지 않음. createPhotoPost 가 media_urls 를 정상 기록했는지, VideoPlayer 컴포넌트가 video 타입 post 를 올바르게 분기 렌더링하는지, R2 public URL 이 앱에서 접근 가능한지 조사 필요."

### 12. VideoPlayer — Feed Mode Autoplay
expected: 홈 피드 스크롤 중 영상 포스트가 viewport 안에 들어오면 autoplay (muted + loop). 벗어나면 pause.
result: blocked
blocked_by: prior-test
reason: "테스트 불가 — Test 11 이슈(영상이 피드에서 렌더링되지 않음)로 인해 autoplay 관찰 자체가 불가능. Test 11 gap closure 이후 재테스트 필요."
blocked_at: 2026-04-20T00:00:00+09:00

### 13. VideoPlayer — Detail Mode Native Controls
expected: 포스트 상세에서 영상 영역 표시 시 native controls (재생/일시정지/seek bar) 사용 가능.
result: blocked
blocked_by: prior-test
reason: "테스트 불가 — Test 11 이슈(영상이 게시물에서 렌더링되지 않음)로 인해 상세 화면의 native controls 검증 불가. Test 11 gap closure 이후 재테스트 필요."
blocked_at: 2026-04-20T00:00:00+09:00

### 14. GradeBadge — Photographer Profile Header
expected: PhotographerProfileScreen 진입 시 display_name 바로 뒤 marginLeft 8 위치에 GradeBadge (icon-label md) + spacing.sm(8px) 간격 후 is_verified. 4-tier 색상 (bronze/silver/gold/diamond) 정확.
result: blocked
blocked_by: other
reason: "테스트 불가 — 사용자가 구체적 사유 미제공. 추정: PhotographerProfileScreen 진입 경로(포토그래퍼 선택/팔로우 목록) 또는 프로필 데이터 부재. 재개 시 구체적 사유 확인 필요."
blocked_at: 2026-04-20T00:00:00+09:00

### 15. GradeBadge — Popular Photographers Feed
expected: 홈 "인기 포토그래퍼" 리스트에서 각 카드의 display_name 뒤에 GradeBadge icon variant (20px) 표시 + is_verified 뱃지.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 16. Photo Feed — Real Supabase Data (Mock 제거)
expected: 홈 피드에 표시되는 photo posts 와 community posts 가 Supabase 에서 fetch 한 실제 데이터 (mock 사라짐). cheerleader 이름은 name_ko 로 표시.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 17. Photo Feed — Pagination (loadMore)
expected: 피드 끝까지 스크롤 시 loadMorePhotoPosts 호출 → 다음 페이지 posts 가 append. dedupe 되어 동일 id 중복 없음.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 18. Photo Feed — Team Filter Switch
expected: 팀 필터(구단) 변경 시 posts 리셋 (page=0) → 해당 팀 posts 만 재로드.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 19. Collection Detail — 3-State UI (Loading/Error/Empty)
expected: 빈 컬렉션 진입 시 empty 상태 (ionicons + 문구). 네트워크 오류 시 EmptyState + retry 버튼. 로딩 중 ActivityIndicator.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 20. Collection Detail — Posts Display
expected: posts 가 있는 컬렉션 진입 시 getCollectionPosts async fetch → 썸네일 그리드 표시 + 영상 포함 post 는 24×24 play overlay.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 21. Like Toggle — Optimistic UI
expected: 하트 버튼 탭 시 즉시 빨간색 + count +1 → 백그라운드로 photo_likes 테이블 반영. 서버 에러 시 롤백.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 22. Follow Toggle — Optimistic UI
expected: 포토그래퍼 프로필에서 "팔로우" 탭 시 즉시 "팔로잉" 으로 전환 → 백그라운드 photographer_follows 반영. 서버 에러 시 롤백.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 23. Duplicate Pending Application — Server Block (HI-03)
expected: 이미 pending 신청이 있는 사용자가 재신청 시도 → 서버가 unique 위반 (23505) 로 거부 → UI 에 에러 Alert 표시. 재신청 폼 데이터는 보존.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

### 24. Photographer Approval Trigger — Notifications
expected: (어드민 영역 필요) admin 이 photographer_applications.status='approved' 업데이트 → 트리거가 photographers INSERT + users.is_photographer=TRUE + notifications INSERT. 승인된 사용자의 알림 화면에 "포토그래퍼 승인" 알림 표시.
result: skipped
skipped_at: 2026-04-20T00:00:00+09:00
reason: "사용자 지시 — 잔여 테스트 전부 skip, 영상 렌더링 이슈(Test 11) 우선 수정 후 재개. 영상 수정 이후 /gsd-verify-work 로 재진입하여 pending → pass 로 전환 예정."

## Summary

total: 24
passed: 8
issues: 2
pending: 0
skipped: 11
blocked: 3

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

- truth: "신청 제출(submitPhotographerApplication 성공) 직후 MainTabNavigator 의 Studio 탭 레이블/아이콘이 no_app('포토그래퍼' + camera-outline) → pending('심사중' + time-outline) 로 실시간 전환되어야 함"
  status: failed
  reason: "User reported: 미신청일때 맞게 나오는데 신청하고 나서도 그대로 보임. 앱을 아예 껐다키면 심사중으로 뜨지만 수정해야됨."
  severity: major
  test: 4
  artifacts: []
  missing: []

- truth: "정상 mp4/mov 영상 업로드 후 피드/게시물에서 VideoPlayer 로 재생되어야 함 (R2 업로드 → createPhotoPost → 피드 렌더링 전수)"
  status: failed
  reason: "User reported: r2에는 정상 업로드가 된걸 확인했는데 실제 앱의 게시물에서 확인이 불가능함."
  severity: major
  test: 11
  artifacts: []
  missing: []
