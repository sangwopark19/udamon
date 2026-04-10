# Quick Task 260408-jny: 소셜 로그인 실패 알림 무한반복 버그 수정

**Date:** 2026-04-08
**Commit:** 762988c

## Changes

### app/src/contexts/AuthContext.tsx
- `isProcessingCallback` ref 추가 — `extractAndSetSession` 재진입 방지 (try/finally 패턴)
- Deep link 리스너에 `pendingOAuthProvider.current` 가드 추가 — OAuth 플로우 미진행 시 콜백 무시
- 웹 환경 OAuth 성공 후 `window.history.replaceState({}, '', '/')` 로 콜백 URL 정리

## Root Cause

네이티브에서 `WebBrowser.openAuthSessionAsync` 콜백과 `Linking.addEventListener`가 동일한 OAuth redirect URL을 각각 처리. WebBrowser 콜백이 먼저 code를 교환하면, Deep Link 리스너가 이미 소비된 code로 재시도하여 `exchangeCodeForSession` 실패 → `showToast('oauth_error')` 반복 발생.

## Fix Strategy

1. **isProcessingCallback guard**: `extractAndSetSession` 진입 시 ref 체크로 동시 호출 방지
2. **pendingOAuthProvider guard**: Deep link 리스너가 OAuth 플로우 진행 중(`pendingOAuthProvider.current !== null`)일 때만 콜백 처리
3. **Web URL cleanup**: OAuth 성공 후 `/auth/callback` URL을 `/`로 교체하여 재파싱 방지
