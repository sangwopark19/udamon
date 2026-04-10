# Quick Task 260408-kcl: 소셜 로그인 웹/네이티브 OAuth 플로우 디버깅 및 수정

**Date:** 2026-04-08
**Commit:** d48a746

## Root Cause

`supabase.ts`에서 `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`를 참조하지만, 실제 `.env` 파일의 변수명은 `EXPO_PUBLIC_SUPABASE_KEY`였음. env 변수 불일치로 dummy API key가 사용되어 `setSession()` → `_getUser()` → 401 "Invalid API key" 발생.

## Changes

### app/src/services/supabase.ts
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_KEY`로 env 변수명 수정
- `detectSessionInUrl: false`로 복원 (getUser() 401 문제와 무관하게 수동 처리가 더 안정적)

### app/src/contexts/AuthContext.tsx
- `init()`에서 웹 `/auth/callback` URL의 토큰을 `extractAndSetSession()`으로 수동 처리
- `init()` 및 `onAuthStateChange` SIGNED_IN에서 웹 콜백 URL을 `/`로 정리
- (이전 260408-jny에서) `isProcessingCallback` 가드, deep link 리스너 pendingOAuthProvider 가드

## Verification

dev-browser로 카카오 로그인 E2E 테스트 완료:
- `200 GET /auth/v1/user` (이전: 401)
- 로그인 후 Onboarding 화면 정상 표시
- 에러 토스트 미발생
