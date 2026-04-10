# Phase 1: Database Foundation & Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 01-database-foundation-security
**Areas discussed:** users 테이블 설계, 보안 정리 방식, 마이그레이션 전략, RLS 정책 설계

---

## users 테이블 설계

### 스키마 구성

| Option | Description | Selected |
|--------|-------------|----------|
| 필수 칼럼만 (추천) | DB-01 명시 칼럼만, 향후 ALTER TABLE로 추가 | |
| 예측 칼럼 포함 | Phase 2~6 필요 칼럼도 미리 추가 | ✓ |
| 확장 가능한 구조 | core 칼럼 + metadata JSONB | |

**User's choice:** 예측 칼럼 포함
**Notes:** ALTER TABLE 횟수를 줄이기 위해 미리 포함

### auth.users 동기화

| Option | Description | Selected |
|--------|-------------|----------|
| DB 트리거 (추천) | PostgreSQL 트리거로 자동 생성 | ✓ |
| 클라이언트 코드 | 앱에서 INSERT 호출 | |
| Supabase Auth Hook | Edge Function으로 가입 이벤트 처리 | |

**User's choice:** DB 트리거
**Notes:** 가장 안정적이고 클라이언트 코드 불필요

### Soft Delete 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 콘텐츠 유지 (추천) | is_deleted=true, 콘텐츠는 "탈퇴한 사용자"로 표시 | ✓ |
| 콘텐츠 익명화 | is_deleted + nickname/avatar 널로 초기화 | |
| 완전 삭제 | 사용자 행 삭제 + user_id null | |

**User's choice:** 콘텐츠 유지
**Notes:** AUTH-09 요구사항과 일치

---

## 보안 정리 방식

### 테스트 계정 처리

| Option | Description | Selected |
|--------|-------------|----------|
| __DEV__ 게이트 (추천) | 개발 모드에서만 활성화 | |
| 완전 제거 | 코드에서 완전 삭제 | ✓ |
| env 플래그 | 환경변수로 제어 | |

**User's choice:** 완전 제거
**Notes:** 테스트는 Supabase Auth로만 진행

### console.log 정리

| Option | Description | Selected |
|--------|-------------|----------|
| 전량 제거 (추천) | 모든 console.log 제거 | ✓ |
| babel 플러그인 | 프로덕션 빌드 시 자동 제거 | |
| 로거 레퍼로 교체 | Sentry 등 커스텀 로거 사용 | |

**User's choice:** 전량 제거
**Notes:** None

### 환경변수 에러 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 명확한 에러 (추천) | 필수 환경변수 없으면 시작 시 에러 | ✓ |
| Graceful fallback 유지 | mock 모드로 동작 | |
| 이원화 | 개발은 fallback, 프로덕션은 필수 | |

**User's choice:** 명확한 에러
**Notes:** 더미 키 fallback 제거

---

## 마이그레이션 전략

### 구성 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 기능별 분리 (추천) | 테이블/기능별 개별 파일 | ✓ |
| 하나의 대형 마이그레이션 | 모든 변경을 하나에 | |
| 전체 리셋 | 001~010 합쳐서 새로 정리 | |

**User's choice:** 기능별 분리
**Notes:** 리뷰와 롤백 용이

### spam_filter 테이블

| Option | Description | Selected |
|--------|-------------|----------|
| 유지 (추천) | 테이블 두고 사용하지 않음 | |
| DROP TABLE | 삭제 마이그레이션 추가 | ✓ |

**User's choice:** DROP TABLE
**Notes:** Out of Scope 확정된 기능의 테이블 정리

### 시드 데이터

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 시드 유지 (추천) | teams/players 유지, cheerleaders 추가 | ✓ |
| 시드 통합 | 모든 시드를 하나의 파일로 | |
| 시드 제거 | 별도 스크립트로 관리 | |

**User's choice:** 기존 시드 유지
**Notes:** cheerleaders 시드 신규 추가

---

## RLS 정책 설계

### 어드민 권한 확인

| Option | Description | Selected |
|--------|-------------|----------|
| users.role 직접 확인 (추천) | public.users.role = 'admin' | ✓ |
| JWT custom claim | Auth Hook으로 JWT에 추가 | |
| 도우미 함수 | is_admin() SQL 함수 생성 | |

**User's choice:** users.role 직접 확인
**Notes:** DB-14와 일치

### 비인증 접근

| Option | Description | Selected |
|--------|-------------|----------|
| 완전 차단 (추천) | 모든 테이블 인증 필수 | ✓ |
| 부분 공개 | teams/players만 공개 | |
| 읽기 공개 | 읽기는 공개, 쓰기만 인증 | |

**User's choice:** 완전 차단
**Notes:** None

### RLS 작성 패턴

| Option | Description | Selected |
|--------|-------------|----------|
| 기존 패턴 따르기 (추천) | auth.uid() = user_id 직접 확인 | |
| 헬퍼 함수 패턴 | is_admin(), is_owner() 등 함수 사용 | |

**User's choice:** Claude 재량 (프로덕션에 적합한 방식 선택)
**Notes:** 사용자가 "둘 중에 프로덕션 환경에 더 적합한 방식을 선택해"라고 요청

## Claude's Discretion

- RLS 헬퍼 함수 패턴 채택 결정 (프로덕션 유지보수성 기준)
- 마이그레이션 번호 배정 및 순서
- 각 테이블 인덱스 설계
- photo_posts ALTER 구문 구체 설계

## Deferred Ideas

None
