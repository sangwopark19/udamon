---
phase: 01-database-foundation-security
plan: 03
subsystem: security
tags: [supabase, cors, env-vars, auth, hardcoded-credentials]

# Dependency graph
requires:
  - phase: 01-database-foundation-security (plan 01, 02)
    provides: DB 마이그레이션 파일, 기존 코드베이스 구조
provides:
  - 테스트 계정 완전 제거된 AuthContext
  - 환경변수 필수 검증 supabase 클라이언트
  - 환경변수 기반 어드민 인증
  - CORS origin 제한된 Edge Function
  - app/.env.example, admin/.env.example
affects: [02-auth-social-login, 05-admin-supabase]

# Tech tracking
tech-stack:
  added: []
  patterns: [환경변수 필수 검증 throw 패턴, CORS origin 조건부 검증 패턴]

key-files:
  created:
    - app/.env.example
    - admin/.env.example
  modified:
    - app/src/contexts/AuthContext.tsx
    - app/src/services/supabase.ts
    - app/src/services/photographerApi.ts
    - app/src/contexts/PhotographerContext.tsx
    - admin/src/contexts/AuthContext.tsx
    - admin/src/pages/LoginPage.tsx
    - supabase/functions/get-upload-url/index.ts

key-decisions:
  - "환경변수 미설정 시 throw Error로 앱 시작 차단 (더미 키 fallback 제거)"
  - "네이티브 앱(origin 없음)은 CORS 와일드카드 허용, 브라우저만 도메인 제한"
  - "어드민 비밀번호를 VITE_ADMIN_PASSWORD 환경변수로 이동 (Phase 5에서 Supabase Auth 전환 예정)"

patterns-established:
  - "환경변수 검증: 필수 환경변수 미설정 시 throw로 명확한 에러 메시지 제공"
  - "CORS: getCorsHeaders(req) 함수로 요청별 origin 검증"

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05]

# Metrics
duration: 5min
completed: 2026-04-06
---

# Phase 1 Plan 3: 프로덕션 보안 취약점 제거 Summary

**테스트 계정 3개 완전 삭제, console.log 제거, 환경변수 필수 검증 적용, 어드민 비밀번호 환경변수 이동, CORS origin 제한**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-06T01:38:07Z
- **Completed:** 2026-04-06T01:42:48Z
- **Tasks:** 2/3 (Task 3은 checkpoint -- 사용자 검증 대기)
- **Files modified:** 9

## Accomplishments
- 코드베이스에서 하드코딩된 인증정보(test@udamon.com, admin1234, DUMMY_KEY) 완전 제거
- 환경변수 미설정 시 명확한 에러 메시지로 앱 시작 차단
- Edge Function CORS를 와일드카드에서 도메인 기반 조건부 검증으로 변경
- isSupabaseConfigured 플래그 및 더미 키 fallback 패턴 완전 제거

## Task Commits

Each task was committed atomically:

1. **Task 1: 테스트 계정 제거 + console.log 제거 + 환경변수 정리** - `4435036` (fix)
2. **Task 2: 어드민 하드코딩 비밀번호 제거 + CORS origin 제한** - `082c096` (fix)
3. **[Rule 1] LoginPage 비밀번호 힌트 제거** - `6911861` (fix)

## Files Created/Modified
- `app/src/services/supabase.ts` - 환경변수 필수 검증 + 더미 키 제거
- `app/src/contexts/AuthContext.tsx` - 테스트 계정 3개 삭제, console.log 3곳 제거, AsyncStorage 테스트 로직 제거
- `app/src/services/photographerApi.ts` - isSupabaseConfigured import 제거
- `app/src/contexts/PhotographerContext.tsx` - isSupabaseConfigured import 및 guard 제거
- `app/.env.example` - 필수 환경변수 목록 문서화
- `admin/src/contexts/AuthContext.tsx` - 하드코딩 비밀번호를 환경변수로 이동
- `admin/src/pages/LoginPage.tsx` - UI에 노출된 비밀번호 힌트 제거
- `admin/.env.example` - 어드민 필수 환경변수 목록
- `supabase/functions/get-upload-url/index.ts` - CORS origin 조건부 검증

## Decisions Made
- 환경변수 미설정 시 throw Error로 앱 시작 차단 (기존 더미 키 fallback 제거)
- 네이티브 앱(origin 헤더 없음)은 CORS에서 와일드카드 허용하여 호환성 유지
- 어드민 비밀번호는 Phase 5(ADM-01)에서 Supabase Auth로 완전 전환될 때까지 환경변수 기반 인증 유지

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] LoginPage.tsx에 하드코딩된 비밀번호 노출**
- **Found during:** Task 3 (보안 검증 중)
- **Issue:** admin/src/pages/LoginPage.tsx에 "테스트: admin@udamon.com / admin1234" 텍스트가 UI에 노출
- **Fix:** 비밀번호 힌트 텍스트를 "UDAMON Admin Panel"로 교체
- **Files modified:** admin/src/pages/LoginPage.tsx
- **Verification:** grep -r "admin1234" admin/src/ 결과 0건
- **Committed in:** 6911861

**2. [Rule 3 - Blocking] isSupabaseConfigured 참조 정리**
- **Found during:** Task 1 (supabase.ts 교체 후)
- **Issue:** photographerApi.ts, PhotographerContext.tsx에서 제거된 isSupabaseConfigured를 import하여 빌드 실패
- **Fix:** 두 파일에서 import 제거, PhotographerContext의 guard 조건 제거
- **Files modified:** app/src/services/photographerApi.ts, app/src/contexts/PhotographerContext.tsx
- **Verification:** grep -r "isSupabaseConfigured" app/src/ 결과 0건
- **Committed in:** 4435036 (Task 1 커밋에 포함)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** 모두 보안/정합성을 위한 필수 수정. 스코프 확장 없음.

## Issues Encountered
None

## Next Phase Readiness
- 보안 코드 정리 완료 -- Phase 2 (Auth/Social Login) 진행 준비 완료
- Task 3 (DB 스키마 푸시 + 검증)은 사용자 확인 대기 중
- Blocker: 도메인(udamonfan.com) 구매 후 CORS ALLOWED_ORIGINS 실제 도메인 업데이트 필요

## Self-Check: PASSED

- All 9 created/modified files verified present on disk
- All 3 commits verified in git log (4435036, 082c096, 6911861)
- Security grep scan: 0 matches for test@udamon, admin1234, DUMMY_URL, DUMMY_KEY, console.log in AuthContext, CORS wildcard

---
*Phase: 01-database-foundation-security*
*Completed: 2026-04-06*
