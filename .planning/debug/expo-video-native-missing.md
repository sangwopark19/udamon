---
status: diagnosed
trigger: "Phase 04 UAT Test 1 blocker — npx expo start 후 안드 시뮬에서 [runtime not ready]: Error: Cannot find native module 'ExpoVideo'"
created: 2026-04-15T07:00:00Z
updated: 2026-04-15T07:00:00Z
goal: find_root_cause_only
---

## Current Focus

hypothesis: 사용자가 expo-video 추가 이후 native rebuild 없이 기존(Plan 01 이전 시점) dev client / Expo Go 로 앱 실행 — JS 모듈이 expo-video native module 을 require 하지만 native registry 미등록 상태
test: (1) 코드/설정 측 누락 점검, (2) workflow 타입 (managed vs bare) 판정, (3) import 체인 trace
expecting: 코드/설정 측 정상 → native rebuild 필요로 단순 재빌드 (EAS dev build) 만으로 해결되는 케이스로 결론
next_action: 진단 결과 plan-phase --gaps 로 반환 — 직접 fix 안 함 (find_root_cause_only)

## Symptoms

expected: Expo 앱 fresh start — 크래시 없이 로드되고 Supabase 피드 데이터가 표시됨
actual: 안드 시뮬에서 앱 실행 시 [runtime not ready]: Error: Cannot find native module 'ExpoVideo' RED screen, requireNativeModule@ stack trace
errors: "Cannot find native module 'ExpoVideo'" — expo-modules-core requireNativeModule('ExpoVideo') 호출 시 native registry 에 ExpoVideo 미등록
reproduction: cd app && npx expo start → 안드 시뮬레이터(API 34) 에서 Expo Go 또는 이전 dev build 로 실행 시도 → runtime not ready 크래시
started: Phase 4 Plan 01 Task 6 (expo-video ~3.0.16 추가 commit 973a721, 2026-04-15) 이후 — Plan 04 (commit 9f01892) 가 VideoPlayer.tsx 신설하여 expo-video import 시작 → Plan 05 가 UploadPostScreen 에서 VideoPlayer 사용 → App.tsx 가 UploadPostScreen 직접 import 하여 모듈 로드 시점 즉시 크래시

## Eliminated

- hypothesis: app.json plugins 에 expo-video 미등록
  evidence: app.json:65-78 plugins 배열에 "expo-video" 명시적 등록 확인 (Plan 01 Task 6 commit 973a721 에서 추가). config 측 누락 없음.
  timestamp: 2026-04-15T07:00:00Z

- hypothesis: package.json 의존성 누락
  evidence: app/package.json:31 "expo-video": "~3.0.16" + package-lock.json:6608 "node_modules/expo-video": "3.0.16" 둘 다 존재. Expo SDK 54 에서 ~3.0.16 은 공식 호환 버전 (RESEARCH §Standard Stack).
  timestamp: 2026-04-15T07:00:00Z

- hypothesis: VideoPlayer 의 expo-video import / API 사용 오류 (잘못된 module name 유발)
  evidence: VideoPlayer.tsx:4 `import { useVideoPlayer, VideoView } from 'expo-video'` — expo-video 3.x 공식 API 정확히 사용. RESEARCH §Pattern 1 (line 257) 동일 패턴 권장. native module name 'ExpoVideo' 는 expo-video 라이브러리 내부에서 expo-modules-core 가 자동 호출하는 것이지 사용자 코드가 결정하는 게 아님.
  timestamp: 2026-04-15T07:00:00Z

- hypothesis: app.json android/ios additional config 필요 (permissions 등)
  evidence: expo-video 3.x 는 기본 사용 시 별도 permission 불필요 (background playback / PiP 사용 시에만 추가 config 필요. VideoPlayer.tsx 는 detail mode 에서 allowsPictureInPicture 사용하나 이는 build-time native 등록과 무관 — app crash on load 와 관계 없음).
  timestamp: 2026-04-15T07:00:00Z

## Evidence

- timestamp: 2026-04-15T07:00:00Z
  checked: app/package.json 의존성 + app/app.json plugins
  found: "expo-video": "~3.0.16" 정확히 등록 (line 31), plugins 배열에 "expo-video" 등록 (line 77). expo-dev-client ~6.0.20 도 설치되어 있음 (line 21) — 사용자가 EAS dev build 를 사용하는 환경임을 시사
  implication: 코드/config 측 누락 없음. 의존성과 plugin 등록은 Plan 01 Task 6 (commit 973a721) 에서 정확히 수행됨

- timestamp: 2026-04-15T07:00:00Z
  checked: app/ios/, app/android/ 디렉토리 존재 여부
  found: 둘 다 MISSING — app 디렉토리에는 src/, assets/, App.tsx, app.json, eas.json, package.json 만 존재. ios/ android/ 폴더 부재.
  implication: 이 프로젝트는 **Expo managed workflow (CNG — Continuous Native Generation)** — bare workflow 가 아님. 따라서 native code 는 EAS Build 시 동적으로 생성됨. 사용자가 로컬에서 `npx expo prebuild` 를 실행하지 않는 한, native rebuild = EAS dev build 재생성을 의미

- timestamp: 2026-04-15T07:00:00Z
  checked: App.tsx import 체인 (모듈 로드 시점에 expo-video 가 어떻게 요구되는지)
  found: App.tsx:66 `import UploadPostScreen from './src/screens/photographer/UploadPostScreen'` — 즉시 평가됨 (lazy import 아님). UploadPostScreen.tsx:33 `import VideoPlayer from '../../components/common/VideoPlayer'`. VideoPlayer.tsx:4 `import { useVideoPlayer, VideoView } from 'expo-video'`. expo-video index 는 import 시점에 expo-modules-core 의 requireNativeModule('ExpoVideo') 를 호출하여 native registry 에서 모듈을 가져옴
  implication: 앱이 부팅하는 순간 (Navigator 진입 전, 사용자가 Studio/Upload 화면에 가지 않더라도) 즉시 expo-video native module 요구. native 측에 ExpoVideo 가 등록되어 있지 않으면 reactBridge 초기화 직후 throw → [runtime not ready] RED screen

- timestamp: 2026-04-15T07:00:00Z
  checked: Plan 01 ~ Plan 05 SUMMARY native rebuild 관련 노트
  found: 04-01-SUMMARY.md "expo-video 설치: app/package.json 에 expo-video ~3.0.16 추가 + app.json plugins 등록 완료 (Wave 3 VideoPlayer 의존성)" — 설치만 함, 빌드 안 함. 04-05-SUMMARY.md "User Setup Required: EAS development 빌드 iOS + Android (expo-video native module 포함 → Plan 01 Task 6 에서 설치 후 native rebuild 필요)" — 명시적으로 EAS dev rebuild 가 사용자 책임으로 표기됨. 04-RESEARCH.md line 659 "신규 native 모듈 추가 시 native build 필요"
  implication: 진단/계획 자체는 native rebuild 필요성을 명확히 인지하고 있었음. UAT 시점에 사용자가 이 단계를 수행하지 않은 채 기존 (Plan 01 이전 시점) dev client APK 또는 Expo Go 로 시도한 것이 원인. 코드 변경 없이 EAS dev build 1회 실행으로 해결되는 운영 단계 누락

- timestamp: 2026-04-15T07:00:00Z
  checked: expo-dev-client 설치 여부 (Expo Go 인지 dev client 인지)
  found: package.json:21 "expo-dev-client": "~6.0.20" — dev-client 가 설치되어 있음. App.tsx:39 `const isExpoGo = Constants.appOwnership === 'expo'` — 코드는 dev-client 와 Expo Go 둘 다 분기 처리. expo-video 3.x 는 Expo Go SDK 54 에 번들되어 있지 않음 (Expo Go 에 새 native 모듈 추가 시점 ≠ SDK 출시 시점) — 따라서 사용자가 Expo Go 로 실행해도 동일 크래시 발생
  implication: 두 경로 모두 EAS dev build 가 필수: ① Expo Go 는 expo-video 미번들 → 크래시. ② 기존 dev client APK 는 Plan 01 추가 이전에 빌드된 것이라 ExpoVideo 가 native registry 에 없음 → 크래시. 해결 = EAS dev build 재생성 + 시뮬레이터에 install

- timestamp: 2026-04-15T07:00:00Z
  checked: 04-VERIFICATION.md / Wave 4 (Plan 06) gap closure 가 native build 를 다뤘는지
  found: 04-06 (Wave 4) 는 HI-01 (StudioScreen.loadState cancelled), HI-02 (MainTabNavigator is_photographer-first bootstrap), HI-03 (partial unique index for pending photographer applications) 만 처리. EAS dev build 재생성은 04-06 범위 외였음. UAT (04-UAT.md) Test 1 부터 막히고 Tests 2~24 가 모두 release-build blocked 표시
  implication: UAT 가 Test 1 에서 막힌 것은 1단계 운영 작업 (EAS dev build) 누락이 원인. 코드 / DB / 설정 추가 변경 불필요 — 단순히 빌드 + 설치 재실행만으로 해결되어야 정상

## Resolution

root_cause: |
  **순수 native rebuild 누락 — 코드/설정 변경 불필요.**

  Phase 4 Plan 01 (commit 973a721, 2026-04-15) 에서 `expo-video ~3.0.16` 을 신규 native 의존성으로 `app/package.json` + `app.json` plugins 에 추가했지만, 이 프로젝트는 **Expo managed workflow** (`app/ios/`, `app/android/` 부재 — CNG 사용) 이므로 새 native 모듈을 추가하면 **EAS development build 를 재생성하여 시뮬레이터에 재설치해야 함**.

  사용자는 UAT 시점에 (a) Plan 01 이전에 빌드된 기존 dev client APK 를 사용하거나, (b) Expo Go 로 실행을 시도했음. 두 경로 모두 ExpoVideo native module 이 native registry 에 등록되어 있지 않은 상태 → App.tsx 가 부팅 시 UploadPostScreen → VideoPlayer 를 import 하면서 expo-video 가 `requireNativeModule('ExpoVideo')` 를 호출 → "Cannot find native module 'ExpoVideo'" 던지면서 [runtime not ready] RED screen 으로 크래시.

  **5가지 검증 모두 정상:**
  1. ✅ `app/package.json` expo-video ~3.0.16 등록 (SDK 54 호환)
  2. ✅ `app/app.json` plugins 배열에 "expo-video" 등록
  3. ✅ `VideoPlayer.tsx` import / API 사용 정확 (`useVideoPlayer`, `VideoView` from 'expo-video')
  4. ✅ android/ios 측 추가 permission 불필요 (현재 사용 모드는 PiP/background 미요구)
  5. ✅ package-lock.json 에 expo-video 3.0.16 잠겨 있음

  Plan 05 SUMMARY 의 "User Setup Required" 섹션에 "EAS development 빌드 iOS + Android (expo-video native module 포함 → Plan 01 Task 6 에서 설치 후 native rebuild 필요)" 라고 명시되어 있는데, 이 단계를 UAT 전에 수행하지 않은 운영 단계 누락이 root cause.

fix: |
  **(find_root_cause_only 모드 — 코드 수정 없음. plan-phase --gaps 가 fix plan 작성 예정.)**

  권장 fix direction:
  1. **EAS dev build 재생성** (`eas build --profile development --platform android` + `--platform ios`) — eas.json 의 `development` 프로파일 사용 (기존 설정 그대로). 약 15~30분 소요.
  2. 빌드 완료 후 안드 시뮬레이터에 install (Android: `eas build:run --platform android` 또는 EAS dashboard 에서 APK 다운로드 → drag-drop 시뮬레이터). iOS 시뮬레이터: `eas build:run --platform ios`.
  3. 새 dev client 로 `npx expo start --dev-client` → 시뮬레이터에서 dev client 앱 열기 → 정상 부팅 검증.
  4. (선택) 로컬 prebuild 옵션: `cd app && npx expo prebuild --clean` 으로 ios/, android/ 디렉토리 생성 후 `npx expo run:android`. 단, 이 경로는 워크플로우 변경 (managed → bare-ish) 이 되므로 권장 안 함. EAS dev build 가 정공법.

  코드 / DB / Edge Function / 환경변수 추가 변경 일체 불필요.

  **운영 가이드 보강 권장 (별도 작업):**
  - `04-HUMAN-UAT.md` 또는 `docs/phase4-qa-matrix.md` 상단에 "사전 준비: EAS dev build 재생성 (expo-video native 모듈 포함)" 체크리스트 추가
  - 향후 새 native 모듈 도입 시 동일 단계가 누락되지 않도록 Plan SUMMARY 의 "User Setup Required" 를 워크플로우 hook 으로 격상 검토

verification: (pending — find_root_cause_only)
files_changed: []
