# Quick Task 260406-lrt: admin 빈 자격증명 취약점 수정 및 supabase 환경변수명 불일치 정리

**Status:** Complete
**Date:** 2026-04-06
**Commits:** b8d18e3, 8696bbe

## Changes

### Task 1: Admin 빈 자격증명 보안 취약점 수정
- `admin/src/contexts/AuthContext.tsx`: `|| ''` 폴백 제거, `console.error` → `throw new Error` 가드 추가
- guard 이후 non-empty string 보장을 위한 변수 재할당
- `login()` 함수에 빈 문자열 방어 (`if (!email || !password) return false`)

### Task 2: 활성 문서 환경변수명 불일치 수정
- `CLAUDE.md`: `EXPO_PUBLIC_SUPABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_KEY` 수정
- `.planning/codebase/STACK.md`: 동일 수정
- `.planning/codebase/INTEGRATIONS.md`: 동일 수정
- `.planning/codebase/ARCHITECTURE.md`: 동일 수정

## Verification

- `admin/src/contexts/AuthContext.tsx`: env 미설정 시 `throw Error` 발생, 빈 문자열 로그인 불가
- 활성 문서 내 `EXPO_PUBLIC_SUPABASE_ANON_KEY` 참조 모두 제거 (historical archive 제외)
