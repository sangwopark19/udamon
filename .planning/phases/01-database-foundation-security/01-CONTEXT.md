# Phase 1: Database Foundation & Security - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

앱의 모든 기능이 의존하는 DB 스키마가 완성되고, 모든 테이블에 RLS가 적용되며, 프로덕션 보안 취약점이 제거된 상태. public.users 테이블 생성, 7개 신규 테이블, 기존 테이블 수정, RLS 전면 적용, 보안 크리닝이 범위.

</domain>

<decisions>
## Implementation Decisions

### users 테이블 설계
- **D-01:** public.users에 DB-01 필수 칼럼 + Phase 2~6에서 필요한 예측 칼럼(bio, push_token, blocked_users 등)을 미리 포함. ALTER TABLE 횟수 최소화
- **D-02:** auth.users INSERT 시 PostgreSQL 트리거로 public.users 행 자동 생성. 클라이언트 코드 불필요, 누락 방지
- **D-03:** 회원 탈퇴는 soft delete — is_deleted=true, deleted_at 기록. 게시글/댓글은 그대로 유지하되 작성자를 "탈퇴한 사용자"로 표시 (AUTH-09 일치)

### 보안 정리
- **D-04:** 테스트 계정 3개(test@udamon.com, test2@udamon.com, admin@udamon.com) 코드에서 완전 삭제. __DEV__ 게이트 없이 완전 제거. 개발 테스트는 Supabase Auth로만
- **D-05:** console.log 13곳 전량 제거. babel 플러그인 없이 코드에서 직접 삭제
- **D-06:** 환경변수 미설정 시 앱 시작 에러 표시 후 중단. isSupabaseConfigured 플래그와 더미 키 fallback 제거. 필수 환경변수 목록 명확화

### 마이그레이션 전략
- **D-07:** 기능별 분리 마이그레이션 — 011_users.sql, 012_notifications.sql 등 테이블/기능별로 개별 파일. 리뷰와 롤백 용이
- **D-08:** spam_filter 테이블 DROP TABLE 마이그레이션 추가. Out of Scope 확정된 기능의 테이블 정리
- **D-09:** 기존 시드(teams, photographer) 유지. cheerleaders 시드 데이터 신규 추가

### RLS 정책 설계
- **D-10:** 어드민 권한은 public.users.role = 'admin' 직접 확인 (DB-14 일치). JWT custom claim 불사용
- **D-11:** 비인증 사용자 완전 차단 — 모든 테이블에 인증 필수. 로그인 없이는 데이터 조회 불가
- **D-12:** community_reports 자동 블라인드 트리거 제거 (DB-12). 관리자 수동 처리로 전환

### Claude's Discretion
- RLS 헬퍼 함수 패턴 채택 (is_admin(), is_owner() 등) — 프로덕션 유지보수성과 감사 용이성 기준으로 결정
- 마이그레이션 번호 배정 및 순서
- 각 테이블의 인덱스 설계
- photo_posts ALTER 구문 구체 설계 (status, rejection_reason, cheerleader_id)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `supabase/migrations/001_teams_players.sql` — teams, players 테이블 정의
- `supabase/migrations/002_community.sql` — community_posts, comments, likes, reports 테이블
- `supabase/migrations/003_polls.sql` — community_polls 테이블
- `supabase/migrations/004_spam_filter.sql` — spam_filter 테이블 (DROP 대상)
- `supabase/migrations/007_photographer.sql` — photo_posts, photographers, pg_collections 테이블

### Existing RLS
- `supabase/migrations/005_rls_policies.sql` — community 테이블 RLS 패턴 참조
- `supabase/migrations/008_photographer_rls.sql` — photographer 테이블 RLS 패턴 참조

### Seed Data
- `supabase/migrations/006_seed_teams.sql` — KBO teams/players 시드
- `supabase/migrations/009_seed_photographer.sql` — photographer 시드

### Application Code (보안 정리 대상)
- `app/src/contexts/AuthContext.tsx` — 테스트 계정 하드코딩 (lines 57-112, 278-288), users 테이블 참조
- `app/src/services/supabase.ts` — isSupabaseConfigured 플래그, 더미 키 fallback
- `admin/src/contexts/AuthContext.tsx` — 어드민 하드코딩 비밀번호

### Type Definitions
- `app/src/types/photographer.ts` — PhotoPost 타입 (status, rejection_reason, cheerleader_id 필드)
- `app/src/types/admin.ts` — AdminStats, UserProfile 관련 타입

### Requirements
- `.planning/REQUIREMENTS.md` — DB-01~DB-14, SEC-01~SEC-05 상세 요구사항

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/005_rls_policies.sql`: RLS 정책 패턴 — auth.uid() 기반 소유자 확인, SELECT 허용 패턴
- `supabase/migrations/008_photographer_rls.sql`: photographer 도메인 RLS — 동일 패턴 재사용 가능
- `app/src/services/photographerApi.ts`: Supabase CRUD 서비스 패턴 — { data, error } 반환 구조

### Established Patterns
- 마이그레이션 번호: 001~010 순차 (다음은 011부터)
- RLS: `auth.uid() = user_id` 기반, SELECT은 인증 사용자 전체 허용
- 시드: 별도 마이그레이션 파일로 관리 (006, 009)

### Integration Points
- `app/src/contexts/AuthContext.tsx`: public.users 테이블 직접 참조 — 테이블 생성 후 즉시 동작 가능
- `app/src/services/supabase.ts`: Supabase 클라이언트 싱글톤 — 환경변수 정리 시 수정 필요
- `supabase/functions/get-upload-url/index.ts`: CORS origin 제한 필요 (SEC-05)

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 01-database-foundation-security*
*Context gathered: 2026-04-06*
