---
phase: quick-260408-eai
plan: 01
subsystem: auth
tags: [oauth, deep-link, android, react-navigation]
dependency_graph:
  requires: []
  provides: [oauth-callback-routing, android-custom-scheme-intent]
  affects: [app/App.tsx, app/app.json, app/src/contexts/AuthContext.tsx, app/src/types/navigation.ts]
tech_stack:
  added: []
  patterns: [oauth-callback-deep-link, provider-type-safety, url-validation-guard]
key_files:
  created: []
  modified:
    - app/src/types/navigation.ts
    - app/App.tsx
    - app/app.json
    - app/src/contexts/AuthContext.tsx
    - app/src/i18n/locales/ko.ts
decisions:
  - Naver OIDC는 Supabase 미지원으로 early return 처리, 향후 활성화
  - Provider 타입을 @supabase/auth-js에서 직접 import (supabase-js에서 re-export 안 됨)
  - AuthCallbackScreen은 null 반환하는 최소 컴포넌트 (실제 처리는 Linking listener)
metrics:
  duration: 7m
  completed: 2026-04-08
  tasks: 2/2
  files_modified: 5
---

# Quick Task 260408-eai: OAuth Callback Routing Fix Summary

OAuth 콜백 deep link 라우팅 설정 보강 및 AuthContext OAuth 흐름 견고성 개선

## What Was Done

### Task 1: App.tsx linking config + app.json Android intentFilter (a90049b)

- `RootStackParamList`에 `AuthCallback` 라우트 타입 추가 (code, access_token, refresh_token 파라미터)
- `linking.config.screens`에 `AuthCallback: 'auth/callback'` 경로 매핑 등록
- `AppNavigator`의 `canBrowse`/`!canBrowse` 양쪽 분기에 `AuthCallbackScreen` 등록
- `app.json`의 Android `intentFilters`에 `udamon://auth/callback` 용 커스텀 스킴 항목 추가

### Task 2: AuthContext OAuth 흐름 개선 (95b5ec3)

- Naver provider early return + "준비 중" 토스트 (Supabase 미지원)
- `providerMap` 타입을 `Record<string, Provider>`로 변경 (unsafe 캐스팅 제거)
- `@supabase/auth-js`에서 `Provider` 타입 import
- `extractAndSetSession`에 URL 유효성 검증 가드 추가 (auth/callback 미포함 시 무시)
- Android OAuth 분기에 60초 타임아웃 cleanup 추가 (pendingOAuthProvider 누수 방지)
- `oauth_naver_preparing` i18n 키 추가

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a90049b | feat(quick-260408-eai): add OAuth callback route to linking config and Android intent filter |
| 2 | 95b5ec3 | fix(quick-260408-eai): improve OAuth flow robustness in AuthContext |

## Self-Check: PASSED

- All 5 modified files exist on disk
- Both task commits verified: a90049b, 95b5ec3
- TypeScript compilation: zero errors
