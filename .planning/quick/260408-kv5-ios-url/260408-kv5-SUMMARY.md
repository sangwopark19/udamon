---
id: 260408-kv5
status: complete
commit: 6c02663
date: 2026-04-08
---

# Quick Task 260408-kv5: iOS OAuth 버그 수정

## Changes

### 1. Google OAuth URL 유효성 검증 및 에러 핸들링 강화
- `openAuthSessionAsync` 호출 전 `new URL()` 파싱 + HTTPS 프로토콜 체크 추가
- `data.url`이 falsy일 때 에러 토스트 표시 (기존엔 무시됨)
- `preferEphemeralSession: false` 옵션 명시 설정
- `oauth_url_error`, `oauth_url_invalid` i18n 키 추가

### 2. Kakao iOS Simulator CJK 폰트 이슈 문서화
- iOS Simulator의 ASWebAuthenticationSession CJK 렌더링 한계를 코드 주석으로 문서화
- 실제 기기에서는 정상 동작하므로 코드 워크어라운드 불필요

## Files Modified
- `app/src/contexts/AuthContext.tsx` — URL validation, error handling, preferEphemeralSession, CJK docs
- `app/src/i18n/locales/ko.ts` — 2 new OAuth error i18n keys
