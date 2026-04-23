# Dev Environment Setup — UDAMON 앱

UDAMON 은 Expo managed workflow (CNG — Continuous Native Generation) 을 사용한다.
`app/ios/` 와 `app/android/` 디렉토리가 없으며, native code 는 EAS Build 시 동적으로 생성된다.
이 문서는 신규 native 의존성 추가 시 필수 운영 단계를 정의한다.

## Workflow 타입 확인

```bash
ls app/ios app/android 2>/dev/null
```

- 둘 다 부재 → Managed workflow (CNG). native 변경 시 EAS dev build 재생성 필수
- 둘 다 존재 → Bare workflow. `npx expo run:ios` / `npx expo run:android` 로 로컬 native 빌드 가능

## 새 Native 모듈 추가 시 필수 단계

### 1. 의존성 설치 + config 등록

- `cd app && npx expo install <package>` (SDK 호환 버전 자동 선택)
- `app.json` 의 `plugins` 배열에 플러그인명 추가 (필요한 경우)
- `package.json` + `package-lock.json` 커밋

### 2. EAS development build 재생성 (CRITICAL)

**이 단계를 건너뛰면 앱 부팅 시 "Cannot find native module 'X'" RED screen 이 발생한다.**

```bash
cd app
eas build --profile development --platform android --non-interactive
eas build --profile development --platform ios --non-interactive
```

- 소요: 15~25분 per 플랫폼 (병렬 실행 권장)
- 빌드 산출물: `.apk` (Android), `.tar.gz` simulator app bundle (iOS, `eas.json` 의 `ios.simulator: true` 설정 시)
- 빌드 상태 확인: `eas build:list --profile development --limit 5`

### 3. 시뮬레이터/실기기 install

```bash
eas build:run --platform android --profile development
eas build:run --platform ios --profile development
```

또는 EAS dashboard (https://expo.dev) 에서 수동 다운로드 후 drag-drop:

- Android: `.apk` → `adb install <path>` 또는 에뮬레이터 창 drag-drop
- iOS: `.tar.gz` 압축 해제 → `*.app` → simulator 창 drag-drop

### 4. Dev client 연결 + fresh start 검증

```bash
cd app && npx expo start --dev-client
```

- 시뮬레이터에서 새 dev client 앱을 열어 Metro URL 로 연결
- 로그인/홈 화면까지 RED screen 없이 도달하면 통과

## Expo Go 사용 불가 케이스

Expo Go (AppStore 앱) 는 SDK 출시 시점에 번들된 native 모듈만 포함한다. 아래 경우는 EAS dev build 만 사용한다:

- SDK 출시 이후 추가된 native 모듈 (예: `expo-video` 3.x 는 SDK 54 Expo Go 에 미번들)
- 커스텀 native 모듈 (3rd party 패키지)
- Firebase / Sentry 등 통합 SDK

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `Cannot find native module 'X'` RED screen | 기존 dev client 에 native 모듈 부재 | EAS development build 재생성 + 시뮬레이터 재설치 |
| `CocoaPods could not find compatible versions` iOS 빌드 실패 | 의존성 버전 충돌 | `npx expo install --check` 로 SDK 호환 버전 확인 |
| Expo Go 에서 앱 크래시 | Expo Go 는 새 native 모듈 미번들 | EAS dev build 사용 |
| `eas build` 중 authentication 실패 | 세션 만료 | `eas login` 재실행 |
| Build queue 대기 과다 | 무료 티어 quota 초과 | 월 초 갱신 대기 또는 paid plan |

## 참고

- EAS project ID: `bdc10dd6-5555-4594-a592-8c1e1ba17e8c`
- Build profiles: `app/eas.json`
  - `development` — internal distribution, iOS simulator 타겟, developmentClient=true
  - `preview` — APK 직접 배포
  - `production` — auto-increment 버전
- 최근 적용 사례: Phase 4 Plan 01 — `expo-video ~3.0.16` 추가 (commit 973a721) 후 Plan 07 에서 본 프로토콜 수립 (2026-04-15)

## 관련 문서

- `docs/phase4-qa-matrix.md` — Phase 4 QA 체크리스트 (사전 준비 섹션 포함)
- `.planning/debug/expo-video-native-missing.md` — 2026-04-15 디버그 세션 (본 프로토콜 출발점)
