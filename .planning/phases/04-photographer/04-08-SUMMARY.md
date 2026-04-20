---
phase: 04-photographer
plan: 08
subsystem: photographer
tags: [photographer, context, state-management, gap-closure, uat-test-4]
requires:
  - 04-07 (PhotographerContext Supabase 연동)
  - app/src/services/photographerApi.ts (fetchMyPhotographerApplication, submitPhotographerApplication)
  - app/src/types/photographerApplication.ts (PhotographerApplication interface)
provides:
  - PhotographerContext myApplication state (단일 source-of-truth)
  - usePhotographer().submitPhotographerApplication wrapper
  - usePhotographer().refreshMyApplication manual trigger
  - MainTabNavigator derive-only studioState (submit → 자동 리렌더 체인)
affects:
  - app/src/screens/photographer/PhotographerRegisterScreen.tsx (Context 기반 submit)
  - app/src/navigation/MainTabNavigator.tsx (derive-only studioState)
  - app/src/screens/photographer/StudioScreen.tsx (Context 구독, 중복 fetch 제거)
tech_stack:
  added: []
  patterns:
    - "Context-as-store 확장 (myApplication을 photoPosts와 동일 패턴으로 관리)"
    - "Derive-only state pattern (MainTabNavigator useState/useEffect 제거, Context derive)"
    - "중복 API 호출 제거 via shared Context (3곳 → 1곳)"
key_files:
  created: []
  modified:
    - app/src/contexts/PhotographerContext.tsx
    - app/src/screens/photographer/PhotographerRegisterScreen.tsx
    - app/src/navigation/MainTabNavigator.tsx
    - app/src/screens/photographer/StudioScreen.tsx
decisions:
  - "PhotographerContext 가 application state의 단일 source-of-truth — 기존 photographers/photoPosts 관리 패턴과 동일 (Context-as-store 원칙 유지)"
  - "MainTabNavigator: useState 제거, derive-only. user.is_photographer(synchronous baseline) + myApplication.status로 결정 → submit 시 Context state 업데이트만으로 자동 리렌더"
  - "StudioScreen: useEffect를 override 경로와 본인 경로로 분할. 본인 경로는 Context myApplication 구독. approved 상태만 photographer row 추가 fetch"
  - "refreshMyApplication은 후속 pull-to-refresh 확장을 위해 노출. 현재 경로에서는 미호출 (void 표기로 unused 경고 방지)"
metrics:
  duration: 4m
  completed_date: 2026-04-20
  tasks_completed: 3
  files_modified: 4
  commits: 3
---

# Phase 4 Plan 08: Studio State Realtime Transition (Gap Closure) Summary

UAT Test 4 gap 해소 — PhotographerContext 가 myApplication 상태의 단일 source-of-truth 가 되도록 통합하여 신청 제출 후 앱 재시작 없이 Studio 탭 label/icon 이 실시간 전환되고 fetchMyPhotographerApplication 호출이 Context 1곳으로 수렴.

## Objective Recap

UAT Test 4 에서 발견된 gap: 신청 제출 후 Step 4 pending hero 로 전환되어도 Studio 탭 label/icon 은 no_app 상태 (camera-outline + "포토그래퍼") 로 유지되고, 앱 재시작 해야만 "심사중" + time-outline 으로 바뀌던 문제.

원인: MainTabNavigator 와 StudioScreen 이 각자 독립적으로 photographerApi.fetchMyPhotographerApplication 을 호출하고 있어 submit 과 fetch 사이에 shared channel 이 없었음. PhotographerRegisterScreen 의 submit 성공이 다른 화면에 전파될 경로가 없었음.

해결: PhotographerContext 를 application state 의 단일 source-of-truth 로 승격. 기존 photoPosts 를 관리하는 동일 패턴 (state + refresh + mutation → consumers 자동 리렌더) 로 myApplication 을 통합.

## Changes by File

### `app/src/contexts/PhotographerContext.tsx` — Context-as-store 확장

**추가 1: PhotographerContextValue interface 필드**
```typescript
// Application (PHOT-02 — Context-as-store 통합, Plan 04-08 gap closure)
myApplication: PhotographerApplication | null;
applicationLoading: boolean;
submitPhotographerApplication: (params: {...}) => Promise<{data, error}>;
refreshMyApplication: () => Promise<void>;
```

**추가 2: Provider 내부 state + refresh + submit 로직**
- `const [myApplication, setMyApplication] = useState<PhotographerApplication | null>(null)`
- `const [applicationLoading, setApplicationLoading] = useState(false)`
- `refreshMyApplication` useCallback → userId 변경 시 자동 재fetch (useEffect 구독)
- `submitApplication` useCallback → api 호출 후 성공 시 즉시 setMyApplication → consumers 자동 리렌더
- useMemo value + deps 배열에 4종 필드 추가

**중요 설계 결정:**
- refresh 에러 시 기존 state 유지 (network blip 대응). 명시적 fail-closed 하지 않음 — 이전 상태가 stale 이더라도 UI 가 갑자기 no_app 으로 회귀하는 것보다 나음
- Context value 최종 노출 이름은 `submitPhotographerApplication` (photographerApi 와 동일 시그니처). 내부 변수명만 `submitApplication` 으로 naming collision 회피

### `app/src/screens/photographer/PhotographerRegisterScreen.tsx` — Context submit 전환

- Import: `* as photographerApi` 제거, `usePhotographer` 추가
- 컴포넌트 상단: `const { submitPhotographerApplication } = usePhotographer()` 추가
- Step 3 handleNext: `photographerApi.submitPhotographerApplication(...)` → `submitPhotographerApplication(...)` (인자 동일)

### `app/src/navigation/MainTabNavigator.tsx` — Derive-only studioState

**제거:**
- `import React, { useEffect, useState }` → `import React`
- `import * as photographerApi from '../services/photographerApi'`
- `const [studioState, setStudioState] = useState<StudioTabState>(...)`
- 전체 useEffect 블록 (27~62줄, 로그인 이벤트 + fetch + 에러 핸들링)

**추가:**
- `import { usePhotographer } from '../contexts/PhotographerContext'`
- `const { myApplication } = usePhotographer()`
- 삼항 체인으로 derive-only studioState:
  ```typescript
  const studioState: StudioTabState = !user?.id
    ? 'no_app'
    : user.is_photographer
      ? 'approved'
      : myApplication?.status === 'pending' ? 'pending'
      : myApplication?.status === 'rejected' ? 'rejected'
      : 'no_app';
  ```

**HI-02 (approved 사용자 cold-start camera→aperture flicker 방지) 유지:**
- `user.is_photographer` 는 AuthContext 에서 public.users 로부터 synchronous 로드된 상태 → 승인 사용자는 즉시 'approved' 경로로 진입
- application status 는 그 뒤에 평가되므로 승인 사용자가 pending application 을 가진 edge case 에서도 approved 가 우선 (HI-02 의도대로)

### `app/src/screens/photographer/StudioScreen.tsx` — Context 구독으로 분할

**변경:**
- `usePhotographer()` destructure 에 `myApplication, applicationLoading, refreshMyApplication` 추가
- 단일 useEffect → 두 useEffect 로 분할:
  1. override 경로 (기존 그대로, deps: `overridePhotographerId`, `getPhotographer`)
  2. 본인 경로 (Context 구독, deps: `user?.id`, `overridePhotographerId`, `myApplication`, `applicationLoading`)
- 본인 경로의 `photographerApi.fetchMyPhotographerApplication(user.id)` 직접 호출 제거
- approved 상태일 때만 `photographerApi.fetchPhotographerByUserId(user.id)` 추가 호출 유지 (photographer row 는 Context 에 없음)
- `refreshMyApplication` 은 후속 pull-to-refresh 를 위해 destructure 만 해두고 현재는 미호출 (`void refreshMyApplication` 으로 unused 경고 회피)

## Verification

### Code-level Automated Verification

- **TypeScript 타입체크**: `npx tsc --noEmit` → 0 errors (완료)
- **외부 직접 호출 제거**: `grep -rn "photographerApi.submitPhotographerApplication\|photographerApi.fetchMyPhotographerApplication" app/src/screens app/src/navigation` → **0 results**
- **Context 내부 호출 1건 유지**: PhotographerContext.tsx 에서 submit/fetch 각 1회 (정상)
- **myApplication 3개 파일 매치 확인**: PhotographerContext.tsx / MainTabNavigator.tsx / StudioScreen.tsx 모두 매치 (완료)

### Behavior-level (실기기 UAT Test 4 재실행 대상)

> 실기기 QA 는 별도 UAT 사이클에서 수행. Context 레벨에서 아래 체인이 성립함을 코드 인스펙션으로 확인:

1. 미신청 계정 로그인 → cold-start: refreshMyApplication 1회 호출 → myApplication=null → studioState='no_app' → label='포토그래퍼', icon='camera-outline'
2. PhotographerRegister Step 3 '포토그래퍼 신청하기' 탭 → submitPhotographerApplication 성공 → Context setMyApplication(pendingApp) → MainTabNavigator 리렌더 → studioState='pending' → label='심사중', icon='time-outline'
3. Studio 탭 진입 → StudioScreen 의 본인 경로 useEffect → applicationLoading=false, myApplication.status='pending' → determineStudioState → kind='pending' → pending hero UI

## Deviations from Plan

**None — 플랜 설계대로 정확히 실행.**

자잘한 문서적 차이:
- StudioScreen 에서 `refreshMyApplication` 을 destructure 하되 현재 호출 지점이 없으므로 `void refreshMyApplication` 으로 명시적 no-op 처리. (플랜에서 "선택적 호출" 로 언급됨 — 의도대로)

## Self-Check

### Commits

- TASK 1 (56beb7f) — PhotographerContext에 myApplication state + submit/refresh 통합 ✓
- TASK 2 (27dec06) — PhotographerRegisterScreen을 Context 기반 submit으로 전환 ✓
- TASK 3 (fdda0d8) — MainTabNavigator + StudioScreen을 Context myApplication 구독으로 전환 ✓

### Files Modified

- app/src/contexts/PhotographerContext.tsx ✓
- app/src/screens/photographer/PhotographerRegisterScreen.tsx ✓
- app/src/navigation/MainTabNavigator.tsx ✓
- app/src/screens/photographer/StudioScreen.tsx ✓

### Verification Commands

- `cd app && npx tsc --noEmit` → 0 errors ✓
- `grep "photographerApi.submitPhotographerApplication\|photographerApi.fetchMyPhotographerApplication" app/src/screens app/src/navigation -rn` → 0 results ✓
- `grep "myApplication" PhotographerContext.tsx MainTabNavigator.tsx StudioScreen.tsx` → all 3 match ✓

## Self-Check: PASSED

All files created/modified verified present. All commits verified in git log.

## Success Criteria Status

| # | Criterion | Status |
|---|-----------|--------|
| 1 | UAT Test 4 gap 해소 — 실시간 탭 전환 | Code-level PASS (behavior QA pending) |
| 2 | PhotographerContext = application 단일 source-of-truth | PASS |
| 3 | fetchMyPhotographerApplication 호출 지점 1곳 | PASS (3곳 → 1곳) |
| 4 | TypeScript strict (no any) | PASS (0 errors) |
| 5 | 5가지 StudioState 모두 정상 동작 | PASS (determineStudioState 로직 유지) |
