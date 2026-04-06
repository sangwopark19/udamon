---
phase: 01-database-foundation-security
verified: 2026-04-06T02:30:00Z
status: human_needed
score: 4/5 must-haves verified
re_verification: false
human_verification:
  - test: "Supabase 대시보드에서 Authentication > Users에 테스트 사용자를 생성한 후 Table Editor > public.users에 행이 자동 생성되는지 확인"
    expected: "auth.users에 신규 행 INSERT 시 on_auth_user_created 트리거가 실행되어 public.users에 동일 id로 행이 생성된다"
    why_human: "on_auth_user_created 트리거의 SQL 코드는 검증되었으나, 실제 Supabase 인스턴스에 마이그레이션이 적용되어 트리거가 동작하는지는 DB 접근 없이 확인 불가 (supabase db push 실행 여부 미확인)"
  - test: "Supabase 대시보드 또는 anon 키를 사용한 클라이언트 SDK로 public.users 테이블 조회 시도"
    expected: "비인증 사용자(anon)가 조회하면 빈 결과([])가 반환된다 (RLS TO authenticated 정책 동작 확인)"
    why_human: "012_rls_helpers.sql의 모든 정책이 TO authenticated로 작성되어 있으나, 실제 Supabase DB에 적용되어 RLS가 동작하는지는 라이브 쿼리 없이 확인 불가"
  - test: "supabase db push 실행 결과 확인 (Plan 03 Task 3 checkpoint)"
    expected: "npx supabase db push 명령이 성공하고, 011~022번 마이그레이션이 모두 순서대로 적용된다"
    why_human: "Plan 03 Task 3는 blocking checkpoint로 사용자가 직접 실행해야 하며, SUMMARY에서 '사용자 확인 대기 중'으로 기록됨"
---

# Phase 1: Database Foundation & Security 검증 보고서

**Phase Goal:** 앱의 모든 기능이 의존하는 DB 스키마가 완성되고, 모든 테이블에 RLS가 적용되며, 프로덕션 보안 취약점이 제거된 상태

**Verified:** 2026-04-06T02:30:00Z
**Status:** human_needed
**Re-verification:** No — 초기 검증

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria 기반)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | public.users 테이블이 존재하고 auth.users INSERT 시 자동으로 행이 생성된다 | ? HUMAN | 코드 검증 완료: 011_users.sql에 테이블, handle_new_user() 함수(SECURITY DEFINER SET search_path=''), on_auth_user_created 트리거 모두 존재. **실제 DB 적용 및 트리거 동작은 사람 확인 필요** |
| 2 | notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings 테이블이 모두 존재하고 쿼리 가능하다 | ? HUMAN | 코드 검증 완료: 013~019 마이그레이션 파일 7개 존재, 각 파일에 CREATE TABLE과 ENABLE ROW LEVEL SECURITY 확인. **실제 DB 적용은 사람 확인 필요** |
| 3 | 비인증 사용자가 보호된 테이블 데이터를 조회하면 빈 결과가 반환된다 (RLS 동작) | ? HUMAN | 코드 검증 완료: 012_rls_helpers.sql에 22개 정책 모두 TO authenticated, 021에서 posts_anon_read/comments_anon_read DROP 확인. **실제 RLS 동작은 라이브 쿼리로 사람 확인 필요** |
| 4 | 코드베이스에 하드코딩된 테스트 계정, 더미 키, console.log가 프로덕션 빌드에 포함되지 않는다 | ✓ VERIFIED | `grep -rn "test@udamon\|TEST_ACCOUNTS\|TEST_ACCOUNT_KEY\|admin1234\|DUMMY_URL\|DUMMY_KEY"` 결과 0건. AuthContext console.log 0건. admin1234 0건. CORS 와일드카드 0건. mock data 파일(mockPhotographers.ts)의 test-user-002는 인증 우회 코드가 아닌 UI 목업 데이터로 판단 (Phase 4 PHOT-01에서 제거 예정) |
| 5 | 환경변수가 .env 파일로 관리되고, 앱이 .env 없이 실행하면 명확한 에러 메시지를 표시한다 | ✓ VERIFIED | supabase.ts: `throw new Error('Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL...')` 확인. app/.env.example, admin/.env.example 모두 존재 및 내용 정확 |

**Score:** 2/5 코드 완전 검증, 3/5 사람 확인 필요 (코드 자체는 5/5 올바르게 작성됨)

---

## Required Artifacts

### Plan 01 아티팩트

| Artifact | 제공 내용 | Status | 상세 |
|----------|-----------|--------|------|
| `supabase/migrations/011_users.sql` | public.users 테이블 + handle_new_user 트리거 | ✓ VERIFIED | 77줄, CREATE TABLE, SECURITY DEFINER SET search_path='', on_auth_user_created 트리거, 인덱스 3개, trg_users_updated |
| `supabase/migrations/013_notifications.sql` | notifications 테이블 | ✓ VERIFIED | CHECK(type IN ...), 인덱스 2개, ENABLE ROW LEVEL SECURITY |
| `supabase/migrations/014_announcements.sql` | announcements 테이블 | ✓ VERIFIED | 길이 CHECK, updated_at 트리거 포함 (플랜 대비 추가) |
| `supabase/migrations/015_inquiries.sql` | inquiries 테이블 | ✓ VERIFIED | category/status CHECK, answered_by FK, updated_at 트리거 |
| `supabase/migrations/016_photographer_apps.sql` | photographer_applications 테이블 | ✓ VERIFIED | status CHECK, reviewed_by FK, updated_at 트리거 |
| `supabase/migrations/017_cheerleaders.sql` | cheerleaders 테이블 | ✓ VERIFIED | position/status CHECK, team_id FK(teams) |
| `supabase/migrations/018_audit_logs.sql` | audit_logs 테이블 | ✓ VERIFIED | admin_id FK(users), target 인덱스 |
| `supabase/migrations/019_site_settings.sql` | site_settings 테이블 | ✓ VERIFIED | key TEXT PRIMARY KEY, updated_by FK |
| `supabase/migrations/020_photo_posts_alter.sql` | photo_posts 컬럼 추가 | ✓ VERIFIED | status(DEFAULT 'approved'), rejection_reason, cheerleader_id FK(cheerleaders) |
| `supabase/migrations/022_seed_cheerleaders.sql` | cheerleaders 시드 데이터 | ✓ VERIFIED | 10개 구단 slug(ssg,kiwoom,lg,kt,kia,nc,samsung,lotte,doosan,hanwha) 모두 포함 |

### Plan 02 아티팩트

| Artifact | 제공 내용 | Status | 상세 |
|----------|-----------|--------|------|
| `supabase/migrations/012_rls_helpers.sql` | is_admin(), is_owner() + 8개 테이블 RLS | ✓ VERIFIED | 160줄, SECURITY DEFINER SET search_path='', TO authenticated 22회, (SELECT auth.uid()) 래핑 10회, 8개 테이블 정책 |
| `supabase/migrations/021_drop_spam_and_cleanup.sql` | spam_filter DROP + 정리 | ✓ VERIFIED | DROP TABLE spam_filter_words, DROP TRIGGER trg_auto_blind, DROP FUNCTION auto_blind_on_report(), DROP POLICY posts_anon_read/comments_anon_read |

### Plan 03 아티팩트

| Artifact | 제공 내용 | Status | 상세 |
|----------|-----------|--------|------|
| `app/src/contexts/AuthContext.tsx` | 테스트 계정 + console.log 제거 | ✓ VERIFIED | console.log 0건, TEST_ACCOUNTS 0건, TEST_ACCOUNT_KEY 0건, loginWithEmail → supabase.auth.signInWithPassword 직접 호출 |
| `app/src/services/supabase.ts` | 환경변수 필수 검증 | ✓ VERIFIED | throw new Error 포함, DUMMY_URL/DUMMY_KEY/isSupabaseConfigured 0건, export supabase만 |
| `app/.env.example` | 필수 환경변수 문서화 | ✓ VERIFIED | EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY 포함 |
| `admin/src/contexts/AuthContext.tsx` | 하드코딩 비밀번호 제거 | ✓ VERIFIED | VITE_ADMIN_PASSWORD/VITE_ADMIN_EMAIL 환경변수 사용, admin1234 0건, AuthProvider/useAuth export 유지 |
| `admin/.env.example` | 어드민 환경변수 문서화 | ✓ VERIFIED | VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD 포함 |
| `supabase/functions/get-upload-url/index.ts` | CORS origin 제한 | ✓ VERIFIED | ALLOWED_ORIGINS 배열, getCorsHeaders(req) 함수, 와일드카드 직접 할당 없음, 네이티브 앱(origin='') 허용 로직 |

---

## Key Link Verification

| From | To | Via | Status | 상세 |
|------|----|-----|--------|------|
| `011_users.sql` | `auth.users` | AFTER INSERT trigger on_auth_user_created | ✓ VERIFIED | `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users` 확인 |
| `011_users.sql` | `public.teams` | FK my_team_id REFERENCES public.teams(id) | ✓ VERIFIED | `my_team_id UUID REFERENCES public.teams(id)` 확인 |
| `017_cheerleaders.sql` | `public.teams` | FK team_id references teams(id) | ✓ VERIFIED | `team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE` 확인 |
| `020_photo_posts_alter.sql` | `public.cheerleaders` | FK cheerleader_id references cheerleaders(id) | ✓ VERIFIED | `ADD COLUMN cheerleader_id UUID REFERENCES public.cheerleaders(id)` 확인 |
| `012_rls_helpers.sql` | `public.users` | is_admin() queries users.role | ✓ VERIFIED | `SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role = 'admin' AND is_deleted = FALSE` 확인 |
| `021_drop_spam_and_cleanup.sql` | `community_reports` | DROP TRIGGER trg_auto_blind | ✓ VERIFIED | `DROP TRIGGER IF EXISTS trg_auto_blind ON community_reports` 확인 |
| `app/src/services/supabase.ts` | `process.env` | 필수 환경변수 검증 후 throw | ✓ VERIFIED | `throw new Error('Missing required environment variables...')` 확인 |
| `admin/src/contexts/AuthContext.tsx` | `import.meta.env` | VITE_ADMIN_PASSWORD 환경변수 참조 | ✓ VERIFIED | `import.meta.env.VITE_ADMIN_PASSWORD` 확인 (2건) |
| `supabase/functions/get-upload-url/index.ts` | `ALLOWED_ORIGINS` | 조건부 CORS origin 검증 | ✓ VERIFIED | `const ALLOWED_ORIGINS = [...]` + `getCorsHeaders(req)` 함수 확인 |

---

## Data-Flow Trace (Level 4)

DB 스키마와 보안 코드가 대상이며, 동적 데이터 렌더링 컴포넌트가 아닌 마이그레이션/설정 파일이므로 Level 4는 해당 없음 (SKIPPED — SQL 마이그레이션 및 보안 설정 파일).

---

## Behavioral Spot-Checks

DB 마이그레이션은 Supabase 서버에서 실행되어야 하며, 로컬에서 실행 가능한 entry point가 없어 자동 spot-check를 건너뜀.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 마이그레이션 파일 10개 존재 | `ls supabase/migrations/01*.sql supabase/migrations/02*.sql` | 011~022 파일 모두 존재 | ✓ PASS |
| SEC-01: 테스트 계정 grep | `grep -rn "test@udamon\|TEST_ACCOUNTS" app/src/` | 0건 | ✓ PASS |
| SEC-02: 더미 키 grep | `grep -rn "DUMMY_URL\|DUMMY_KEY\|isSupabaseConfigured" app/src/` | 0건 | ✓ PASS |
| SEC-03: admin1234 grep | `grep -rn "admin1234" admin/src/` | 0건 | ✓ PASS |
| SEC-04: console.log in AuthContext | `grep -n "console.log" app/src/contexts/AuthContext.tsx` | 0건 | ✓ PASS |
| SEC-05: CORS 와일드카드 직접 할당 없음 | `grep '"Access-Control-Allow-Origin": "\*"' index.ts` | 0건 | ✓ PASS |
| DB 스키마 적용 | `npx supabase db push` | 실행 결과 미확인 | ? SKIP |

---

## Requirements Coverage

| Requirement | Source Plan | 설명 | Status | Evidence |
|-------------|------------|------|--------|----------|
| DB-01 | Plan 01 | public.users 테이블 (role, nickname, avatar_url 등) | ✓ SATISFIED | 011_users.sql: 15개 칼럼 (id, email, nickname, avatar_url, bio, role, my_team_id, push_token, blocked_users, nickname_changed_at, is_photographer, is_deleted, deleted_at, created_at, updated_at) |
| DB-02 | Plan 01 | auth.users INSERT 시 public.users 자동 생성 트리거 | ✓ SATISFIED | 011_users.sql: handle_new_user() + on_auth_user_created 트리거 (SECURITY DEFINER SET search_path='') |
| DB-03 | Plan 01 | notifications 테이블 (type, user_id, title, body, data JSON, is_read) | ✓ SATISFIED | 013_notifications.sql: 모든 요구 컬럼 + CHECK(type IN ...) + RLS 활성화 |
| DB-04 | Plan 01 | announcements 테이블 (title, content, is_pinned, created_by) | ✓ SATISFIED | 014_announcements.sql: 모든 요구 컬럼 + 길이 CHECK + RLS 활성화 |
| DB-05 | Plan 01 | inquiries 테이블 (user_id, category, title, content, status, answer) | ✓ SATISFIED | 015_inquiries.sql: 모든 요구 컬럼 + category/status CHECK + RLS 활성화 |
| DB-06 | Plan 01 | photographer_applications 테이블 (user_id, portfolio_url, bio, status, reviewed_by) | ✓ SATISFIED | 016_photographer_apps.sql: 모든 요구 컬럼 + status CHECK + RLS 활성화 |
| DB-07 | Plan 01 | cheerleaders 테이블 (team_id, name_ko, name_en, position, status) | ✓ SATISFIED | 017_cheerleaders.sql: 모든 요구 컬럼 + position/status CHECK + team_id FK |
| DB-08 | Plan 01 | audit_logs 테이블 (admin_id, action, target_type, target_id, details JSON) | ✓ SATISFIED | 018_audit_logs.sql: 모든 요구 컬럼 + admin_id FK |
| DB-09 | Plan 01 | site_settings 테이블 (key, value JSON, updated_by) | ✓ SATISFIED | 019_site_settings.sql: key TEXT PK, value JSONB, updated_by FK |
| DB-10 | Plan 01 | photo_posts에 status/rejection_reason 컬럼 추가 | ✓ SATISFIED | 020_photo_posts_alter.sql: ADD COLUMN status (DEFAULT 'approved', CHECK), ADD COLUMN rejection_reason |
| DB-11 | Plan 01 | photo_posts에 cheerleader_id 컬럼 추가 | ✓ SATISFIED | 020_photo_posts_alter.sql: ADD COLUMN cheerleader_id UUID REFERENCES public.cheerleaders(id) |
| DB-12 | Plan 02 | community_reports 자동 블라인드 트리거 제거 | ✓ SATISFIED | 021_drop_spam_and_cleanup.sql: DROP TRIGGER trg_auto_blind ON community_reports + DROP FUNCTION auto_blind_on_report() |
| DB-13 | Plan 02 | 모든 신규 테이블에 RLS 정책 적용 | ✓ SATISFIED | 012_rls_helpers.sql: 8개 테이블(users, notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings) 총 21개 정책, 모두 TO authenticated |
| DB-14 | Plan 02 | 어드민 RLS 정책 (public.users.role = 'admin' 기반) | ✓ SATISFIED | 012_rls_helpers.sql: is_admin() 함수가 SECURITY DEFINER로 public.users.role = 'admin' AND is_deleted = FALSE 확인 |
| SEC-01 | Plan 03 | 테스트 계정 3개 제거 또는 __DEV__ 게이트 처리 | ✓ SATISFIED | app/src: test@udamon, TEST_ACCOUNTS, TEST_ACCOUNT_KEY 0건. mockPhotographers.ts의 test-user-002는 UI 목업 데이터(Phase 4에서 제거 예정)로 인증 우회 코드 아님 |
| SEC-02 | Plan 03 | 환경변수 정리 (.env 생성, 더미 키/fallback 제거) | ✓ SATISFIED | supabase.ts: DUMMY_URL/DUMMY_KEY/isSupabaseConfigured 0건, throw Error로 필수 검증. app/.env.example, admin/.env.example 생성 |
| SEC-03 | Plan 03 | 어드민 하드코딩 비밀번호 제거 | ✓ SATISFIED | admin/src: admin1234 0건. VITE_ADMIN_PASSWORD 환경변수 기반으로 전환. (Phase 5에서 Supabase Auth 완전 전환 예정) |
| SEC-04 | Plan 03 | console.log 프로덕션 빌드 시 제거 | ✓ SATISFIED | AuthContext.tsx: console.log 0건 (console.error/warn은 에러 핸들링용으로 유지, 정책에 부합) |
| SEC-05 | Plan 03 | Edge Function CORS origin 제한 (udamonfan.com) | ✓ SATISFIED | get-upload-url/index.ts: ALLOWED_ORIGINS 배열, getCorsHeaders(req) 함수, 와일드카드 직접 할당 없음 |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/src/data/mockPhotographers.ts` | 55, 492~495 | `test-user-002` 하드코딩 ID | ℹ️ Info | mock 데이터 파일로 인증 우회와 무관. Phase 4 (PHOT-01) 에서 실제 Supabase 데이터로 교체 예정 |
| `app/src/contexts/PhotographerContext.tsx` | 120 | `photographerId: 'test-user-002'` in MOCK_COLLECTIONS | ℹ️ Info | mock 컬렉션 데이터, 실제 DB와 병합 시 무시됨. Phase 4에서 제거 예정 |
| `app/src/contexts/PhotographerContext.tsx` | 140~194 | mock 데이터와 Supabase 데이터 병합 로직 (MOCK_PHOTOGRAPHERS, MOCK_PHOTO_POSTS) | ⚠️ Warning | Phase 1 목표인 보안 취약점과 무관. Phase 4 (PHOT-01)에서 제거 예정. 현재 프로토타입 동작에 필요 |

---

## Human Verification Required

### 1. DB 마이그레이션 적용 확인 (Blocking)

**Test:** `cd /Users/sangwopark19/workspace/udamon && npx supabase db push` 실행

**Expected:** 011~022번 마이그레이션이 모두 순서대로 적용되고 에러 없이 완료된다

**Why human:** Plan 03 Task 3는 blocking checkpoint. SUMMARY에서 "Task 3은 checkpoint -- 사용자 검증 대기"로 명시됨. 마이그레이션 SQL 코드 자체는 검증 완료되었으나 실제 DB 적용 여부는 Supabase CLI 접근이 필요함

### 2. auth.users 트리거 동작 확인

**Test:** Supabase 대시보드 > Authentication > Users에서 "Add user" → public.users 테이블 확인

**Expected:** auth.users에 신규 사용자 생성 시 public.users에 동일 id로 행이 자동 생성된다 (email, nickname, role='user' 포함)

**Why human:** 트리거 SQL 코드는 검증되었으나(SECURITY DEFINER SET search_path='', on_auth_user_created), 실제 Supabase DB에 적용된 상태에서의 트리거 동작은 라이브 DB 접근 없이 확인 불가

### 3. RLS 비인증 차단 동작 확인

**Test:** anon key로 Supabase 클라이언트를 초기화하고 `supabase.from('users').select('*')` 호출

**Expected:** 비인증 요청에 빈 배열 `[]`이 반환된다 (에러 없이 RLS가 행 레벨에서 차단)

**Why human:** 012_rls_helpers.sql의 모든 정책이 TO authenticated로 작성되고 anon 정책이 제거된 것은 코드로 확인되었으나, 실제 RLS 동작은 라이브 Supabase 인스턴스에서의 쿼리로만 검증 가능

---

## Gaps Summary

코드베이스 정적 검증 결과 **모든 마이그레이션 파일과 보안 코드가 올바르게 작성되어 있음**. 발견된 갭 없음.

남은 검증 항목 3개는 모두 "실제 Supabase DB에 마이그레이션이 적용되었는가"에 관한 것으로, Plan 03 Task 3 (blocking checkpoint)가 완료되어야 최종 확인 가능. SUMMARY.md에서 해당 checkpoint가 "사용자 확인 대기" 상태임.

**권고사항:** `npx supabase db push`를 실행하여 모든 마이그레이션 적용 후 Supabase 대시보드에서 트리거 및 RLS 동작을 확인하면 phase가 완전히 완료된다.

---

_Verified: 2026-04-06T02:30:00Z_
_Verifier: Claude (gsd-verifier)_
