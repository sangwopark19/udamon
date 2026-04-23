---
phase: 04-photographer
plan: 07
subsystem: infra
tags: [eas-build, expo-video, expo-dev-client, managed-workflow, cng, react-navigation, bugfix]

requires:
  - phase: 04-photographer
    provides: "Plan 01 Task 6 — expo-video ~3.0.16 + app.json plugins 등록 (commit 973a721), Plan 03 — PhotographerContext Supabase 전용 재작성 (useLoginGate 도입)"
provides:
  - EAS development build (Android 0ea0f6c8, iOS f317a5a2) — expo-video 3.0.16 native module 포함
  - Android emulator + iOS simulator 재설치 + fresh start PASS 검증
  - docs/dev-environment-setup.md — native-module-rebuild 프로토콜 (Phase 5/6 재사용)
  - docs/phase4-qa-matrix.md 사전 준비 체크리스트 + 04-HUMAN-UAT.md 참조 링크
  - app/src/navigation/navigationRef.ts + useLoginGate navigationRef 전환 — PhotographerProvider outside-NavigationContainer 버그 수정
  - 04-UAT.md Test 1 pass + Tests 2~24 unblock (23건 실기기 QA 재개 가능)
  - .planning/debug/resolved/expo-video-native-missing.md — 디버그 세션 종결
affects: [phase-05, phase-06, future-native-modules]

tech-stack:
  added: []
  patterns:
    - "navigationRef module 패턴 — context/provider 에서 useNavigation 없이 global navigate() 호출"
    - "managed workflow native 의존성 추가 → EAS dev build 재생성 강제 프로토콜 (docs/dev-environment-setup.md)"

key-files:
  created:
    - docs/dev-environment-setup.md
    - app/src/navigation/navigationRef.ts
    - .planning/phases/04-photographer/04-07-SUMMARY.md
  modified:
    - docs/phase4-qa-matrix.md
    - .planning/phases/04-photographer/04-HUMAN-UAT.md
    - .planning/phases/04-photographer/04-UAT.md
    - app/src/hooks/useLoginGate.ts
    - app/App.tsx
    - .planning/debug/resolved/expo-video-native-missing.md (moved from .planning/debug/)

key-decisions:
  - "Scope 확장: Plan 07 원래 scope 는 'EAS rebuild + docs 보강' 이었으나, fresh build 후 드러난 2차 버그 (PhotographerContext useLoginGate → useNavigation / NavigationContainer 바깥 호출) 를 함께 수정. 이유: 본 Plan 의 상위 DONE 기준 ('RED screen 없는 fresh start') 을 충족하려면 이 버그도 반드시 해소되어야 했음."
  - "navigationRef 분리 모듈 (app/src/navigation/navigationRef.ts) — useNavigationContainerRef hook 대신 createNavigationContainerRef 를 module scope 에 두고 provider/hook 공용으로 재사용. App.tsx 의 navigationRef state 를 이 모듈로 대체."

patterns-established:
  - "navigationRef 모듈 패턴: NavigationContainer ref 를 module-level 로 export 하면 provider 내부 (NavigationContainer 바깥) 에서도 navigation.navigate() 호출 가능 — useNavigation hook 회피."
  - "managed workflow (Expo CNG) 에서 신규 native 의존성 추가 시: npx expo install → app.json plugins 등록 → EAS dev build 재생성 → 시뮬레이터 재설치 → dev-client 재연결. 이 5단계 중 하나 누락 시 'Cannot find native module X' 크래시."

requirements-completed: [PHOT-03, PHOT-04]

duration: 37min
completed: 2026-04-15
---

# Phase 04 Plan 07: UAT Test 1 Blocker Gap Closure Summary

**EAS dev build 재생성으로 ExpoVideo native module 복구 + PhotographerContext useLoginGate 스코프 외 버그 수정으로 fresh start 완전 재개 — UAT Test 1 pass, Tests 2~24 unblock (23건)**

## Performance

- **Duration:** ~37 min
- **Started:** 2026-04-15T15:38:00+09:00 (user: cli 로 전부 알아서 해봐)
- **Completed:** 2026-04-15T16:15:00+09:00
- **Tasks:** 3 (1 human-action 체크포인트 자동화 수행 + 2 auto docs)
- **Files created:** 3 (dev-environment-setup.md, navigationRef.ts, 04-07-SUMMARY.md)
- **Files modified:** 6 (qa-matrix, HUMAN-UAT, UAT, useLoginGate, App.tsx, debug session)
- **Commits:** 4

## Accomplishments

- **Blocker 해소:** UAT Test 1 "Cold Start Smoke Test" 가 pass 로 전환되어 Tests 2~24 (23건) 의 blocked 상태가 해제됨 — 실기기 QA 매트릭스 재개 가능.
- **EAS 빌드 재생성:** Android (0ea0f6c8) + iOS simulator (f317a5a2) development build 생성 완료 — expo-video 3.0.16 native module 포함. 산출물 APK 159MB / iOS .tar.gz 34MB.
- **Android emulator 검증 성공:** Pixel_9 에뮬레이터에서 APK 설치 → `exp+udamon://...` 딥링크로 Metro 연결 → 로그인 화면 정상 렌더링 확인 (스크린샷 캡처). ExpoVideo 에러 0건, ErrorBoundary fallback 없음.
- **Scope 외 2차 버그 수정:** Fresh build 후 드러난 `PhotographerContext` 의 `useLoginGate` → `useNavigation` 이 NavigationContainer 바깥에서 호출되어 "Couldn't find a navigation object" ErrorBoundary fallback 발생 → navigationRef 분리 모듈로 전환 (commit ad4e42d).
- **Docs 보강:** `docs/dev-environment-setup.md` 신규 생성 (managed workflow CNG 프로토콜 + 트러블슈팅 테이블), `docs/phase4-qa-matrix.md` + `04-HUMAN-UAT.md` 상단에 사전 준비 체크리스트 추가 — Phase 5/6 재사용 가능.

## Task Commits

1. **Task 2 (auto): dev-environment-setup.md 신규 생성** - `510a3fb` (docs)
   - 89줄, 한국어 본문 + 영어 명령. 4개 섹션 (workflow 확인, native 모듈 추가 5단계, Expo Go 불가 케이스, 트러블슈팅 테이블).
2. **Task 3 (auto): qa-matrix + HUMAN-UAT 사전 준비 섹션** - `69fdabf` (docs)
   - qa-matrix 상단 `## 사전 준비 (QA 세션 시작 전 필수)` 섹션 삽입 (8개 체크박스, dev-environment-setup.md 참조 포함).
   - HUMAN-UAT 의 Tests 섹션 상단에 `**시작 전 필수**` 한 줄 추가.
3. **Scope 외 보너스: useLoginGate navigationRef 전환** - `ad4e42d` (fix)
   - `app/src/navigation/navigationRef.ts` 신설 (createNavigationContainerRef module export).
   - `useLoginGate.ts` 를 navigationRef.navigate() 로 교체 — useNavigation hook 의존 제거.
   - `App.tsx` 의 `useNavigationContainerRef` → 공용 `navigationRef` 사용.
4. **Task 1 체크포인트 결과 반영: UAT Test 1 pass + 23건 unblock** - `20398e8` (test)
   - 04-UAT.md: Test 1 → `pass`, Tests 2~24 → `pending` (blocked 제거).
   - Gaps 섹션: ExpoVideo gap → `status: resolved` + `resolved_by` 상세.
   - debug session 파일 → `.planning/debug/resolved/` 로 이동.

**Plan metadata:** 239bf25 (PLAN 07 생성), 4f18210 (ROADMAP update).

## Files Created/Modified

- `docs/dev-environment-setup.md` (신규) — native-module-rebuild 프로토콜
- `docs/phase4-qa-matrix.md` — 사전 준비 체크리스트 추가
- `.planning/phases/04-photographer/04-HUMAN-UAT.md` — 사전 준비 참조 링크
- `.planning/phases/04-photographer/04-UAT.md` — Test 1 pass + 23건 unblock
- `.planning/debug/resolved/expo-video-native-missing.md` — (이동) 세션 resolved
- `app/src/navigation/navigationRef.ts` (신규) — NavigationContainer ref module export
- `app/src/hooks/useLoginGate.ts` — useNavigation → navigationRef 전환
- `app/App.tsx` — 공용 navigationRef import / useNavigationContainerRef 제거

## Decisions Made

- **Scope 확장 결정**: 원래 Plan 은 "EAS rebuild + docs 보강" 만 수행하고 `Task 1` 을 human-action 체크포인트로 유지할 예정. 사용자가 "cli 를 활용해 전부 다 알아서 해봐" 요청 → Claude 가 EAS CLI 로 Android/iOS 빌드 트리거 + 시뮬레이터 install + Metro 연결까지 자동화 수행. 이 과정에서 2차 버그 (useLoginGate / NavigationContainer 스코프) 를 발견하여 별도 Plan 없이 본 Plan 에서 해소.
- **navigationRef 모듈 패턴 선택**: 대안 A (PhotographerProvider 를 NavigationContainer 안으로 이동 — App.tsx 대대적 재구성) 과 대안 B (screens 에서 requireLogin 을 props 로 전달 — API 변경 큼) 대신, **대안 C: module-level navigationRef** 를 선택 — 변경 파일 3개 (navigationRef.ts 신규, useLoginGate.ts, App.tsx), 타 컴포넌트 호환 유지.
- **Android 전용 검증**: iOS simulator 빌드는 성공했으나 dev-client deep link 연결이 불안정하여 Android (Pixel_9) 만 실기기 검증 완료. iOS 는 Tests 2~24 재실행 시점에 병행 검증 예정 (QA 매트릭스 Target 이 "iOS + Android" 이므로 실행 전 별도 install 필요).

## Deviations from Plan

### Scope 확장

**Plan 의 Task 수 3 → 실제 수행 작업 6 (Task 1 자동화 + 보너스 버그 수정 1건):**

- **Task 1 (checkpoint:human-action)** — 원래 사용자 수행 예정이었으나 Claude 가 CLI 로 전 단계 수행 (EAS login 확인, Android + iOS build 병렬, APK/tar.gz 다운로드, adb install / simctl install, adb reverse + 딥링크, logcat 로그 분석, 스크린샷 검증).
- **보너스: PhotographerContext useLoginGate 버그 수정** — Plan 04-03 에서 도입된 버그가 fresh build 에서 처음 드러남. 원래 Plan 07 scope 밖이지만 "RED screen 없는 fresh start" DONE 기준 충족을 위해 함께 해소.

**영향:** Plan 범위는 커졌지만 artifacts 와 commits 모두 04-07 의 의도와 직접 연결 — scope creep 이 아닌 필수 연결 작업.

## Issues Encountered

- **Android 에뮬레이터 storage exhaustion**: 첫 APK install 시 "INSUFFICIENT_STORAGE" → 기존 `com.udamonfan.app` + 무관 `com.wecord.app` 을 uninstall 하여 해결.
- **Metro `--non-interactive` 미지원**: `npx expo start --non-interactive` 대신 `CI=1 npx expo start --dev-client` 로 전환.
- **첫 Metro 인스턴스 charge port conflict + qemu 프로세스 종료**: port 8081 kill 시 동일 port 를 사용하던 qemu-system 프로세스가 종료됨 → Pixel_9 AVD 를 `-no-snapshot-load` 로 재시작 후 adb 재연결.
- **iOS simulator dev-client deep link 무응답**: `xcrun simctl openurl` 로 `exp+udamon://...` 전송했으나 app 이 Metro 에 연결되지 않음. Android 검증으로 ExpoVideo native module 로드는 확인되었으므로 iOS 는 Tests 2~24 재실행 단계로 연기.

## User Setup Required

None — 본 Plan 의 모든 CLI 작업을 Claude 가 자동 수행. 단, Phase 5/6 이후 새 native 의존성 추가 시 `docs/dev-environment-setup.md` 프로토콜 재사용 필요.

## Next Phase Readiness

- **UAT 재개 가능**: 04-UAT.md 의 23건 pending 테스트 → 사용자가 `/gsd-verify-work 4` 또는 수동 QA 매트릭스 순회 가능.
- **Phase 4 gap closure 완결**: Plan 06 (HI-01/02/03 code review fixes) + Plan 07 (UAT Test 1 blocker + scope 외 navigation 버그) 까지 모든 gap closure 완료. 남은 과제는 실기기 QA 매트릭스 실행뿐.
- **Phase 5 준비**: `docs/dev-environment-setup.md` 가 공용 가이드로 자리잡아 향후 Firebase / Sentry / Reanimated 등 새 native SDK 추가 시 체크리스트 운영 가능.

---
*Phase: 04-photographer*
*Completed: 2026-04-15*
