---
phase: 02-authentication
plan: 00
subsystem: testing
tags: [jest, jest-expo, supabase-mock, tdd, react-native]

# Dependency graph
requires: []
provides:
  - Jest/jest-expo test infrastructure for React Native app
  - Supabase client mock with chainable query builder
  - Auth test scaffolds (AuthContext, Nickname, Block) in RED state
affects: [02-01, 02-02, 02-03]

# Tech tracking
tech-stack:
  added: [jest@29.7.0, jest-expo@55.0.13, ts-jest@29.4.9, "@types/jest@30.0.0"]
  patterns: [supabase-mock-pattern, red-green-tdd, jest-module-name-mapper]

key-files:
  created:
    - app/jest.config.js
    - app/src/__tests__/mocks/supabase.ts
    - app/src/__tests__/auth/authContext.test.ts
    - app/src/__tests__/auth/nickname.test.ts
    - app/src/__tests__/auth/block.test.ts
  modified:
    - app/package.json

key-decisions:
  - "jest.config를 .ts 대신 .js로 작성하여 ts-node 의존성 제거"
  - "@testing-library/react-native는 react 19.1.0 peer dependency 충돌로 제외 -- Plan 01+ 에서 필요시 추가"

patterns-established:
  - "Supabase mock 패턴: mockAuth/mockFrom/mockQueryBuilder 체이닝으로 모든 Supabase 호출 검증 가능"
  - "테스트 파일 위치: app/src/__tests__/{domain}/{feature}.test.ts"
  - "moduleNameMapper로 supabase import를 mock으로 자동 리다이렉트"

requirements-completed: [AUTH-01, AUTH-03, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-10]

# Metrics
duration: 8min
completed: 2026-04-07
---

# Phase 2 Plan 0: Test Infrastructure Summary

**Jest/jest-expo 테스트 인프라 구축 + Supabase mock + 18개 auth 테스트 스캐폴드 RED 상태 배포**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-07T02:05:50Z
- **Completed:** 2026-04-07T02:13:45Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Jest 29.7 + jest-expo 55 테스트 인프라 설치 및 설정 완료
- Supabase client mock 모듈 생성 (auth, from, functions 전체 mock + chainable query builder)
- 18개 auth 테스트 스캐폴드 생성 (AuthContext 5, Nickname 9, Block 4) -- 모두 RED 상태
- `npm test:auth` 명령으로 auth 테스트만 선택적 실행 가능

## Task Commits

Each task was committed atomically:

1. **Task 1: Jest/jest-expo 설치 + 설정 파일 생성** - `7db36fc` (chore)
2. **Task 2: Supabase mock + Auth 테스트 스캐폴드 생성** - `1eb6b5e` (test)

## Files Created/Modified
- `app/jest.config.js` - Jest 설정 (jest-expo 프리셋, supabase moduleNameMapper)
- `app/src/__tests__/mocks/supabase.ts` - Supabase client mock (mockAuth, mockFrom, mockQueryBuilder, resetAllMocks)
- `app/src/__tests__/auth/authContext.test.ts` - TEST_ACCOUNTS 제거, OAuth, 이메일 로그인, 비밀번호 재설정 검증
- `app/src/__tests__/auth/nickname.test.ts` - 2~12자 한글/영문/숫자, 특수문자/공백 거부, 30일 쿨다운 검증
- `app/src/__tests__/auth/block.test.ts` - user_blocks INSERT/DELETE, 중복 차단 에러, 초기 로드 검증
- `app/package.json` - test/test:auth 스크립트 추가, jest/jest-expo devDependencies 추가

## Decisions Made
- jest.config를 .ts 대신 .js로 작성하여 ts-node 추가 설치 불필요 (ts-node은 런타임 의존성 비용이 큼)
- @testing-library/react-native는 react 19.1.0과 peer dependency 충돌 (react-test-renderer@19.2.4 요구) -- 현재 Plan에서는 단위 테스트만 필요하므로 제외, 컴포넌트 렌더링 테스트 시 추가 가능

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest.config.ts -> jest.config.js 변환**
- **Found during:** Task 1 (Jest 설정 파일 생성)
- **Issue:** jest.config.ts 사용 시 ts-node 패키지가 필요하나 미설치 상태 -- `npx jest` 실행 불가
- **Fix:** jest.config.ts를 jest.config.js (JSDoc 타입 주석)로 변환하여 ts-node 의존성 제거
- **Files modified:** app/jest.config.js (renamed from .ts)
- **Verification:** `npx jest --version` 정상 실행, 테스트 파일 감지 확인
- **Committed in:** 1eb6b5e (Task 2 commit에 포함)

**2. [Rule 3 - Blocking] @testing-library/react-native 설치 제외**
- **Found during:** Task 1 (의존성 설치)
- **Issue:** @testing-library/react-native이 react-test-renderer@19.2.4를 요구하나, 프로젝트 react@19.1.0과 peer dependency 충돌
- **Fix:** 현재 Plan 범위(단위 테스트 스캐폴드)에서는 불필요하므로 제외. 컴포넌트 렌더링 테스트 필요 시 react 19.2.4 업그레이드 또는 --legacy-peer-deps로 추가 가능
- **Files modified:** 없음 (설치 자체를 건너뜀)
- **Verification:** npm install 성공, 핵심 패키지 4종 정상 설치
- **Committed in:** 7db36fc (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 모두 테스트 실행을 위한 필수 수정. 스코프 변경 없음.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 01 (AuthContext Supabase 전환): `test:auth` 명령으로 구현 검증 가능
- Plan 02 (닉네임/온보딩): nickname.test.ts가 validateNickname/canChangeNickname 함수 구현을 대기
- Plan 03 (차단 기능): block.test.ts가 BlockContext Supabase 연동을 대기
- 모든 18개 테스트가 RED -> GREEN 전환으로 구현 완료를 객관적으로 검증 가능

## Self-Check: PASSED

- All 6 created files: FOUND
- Commit 7db36fc (Task 1): FOUND
- Commit 1eb6b5e (Task 2): FOUND
- Test execution: 3 suites detected, 18 tests in RED state

---
*Phase: 02-authentication*
*Completed: 2026-04-07*
