---
phase: 1
reviewers: [codex, opencode]
reviewed_at: 2026-04-06T20:30:00+09:00
plans_reviewed: [01-01-PLAN.md, 01-02-PLAN.md, 01-03-PLAN.md]
---

# Cross-AI Plan Review — Phase 1

## Codex Review

### Plan 01: Schema Creation

**Summary**
스키마 범위는 phase goal과 대체로 잘 맞고, `public.users` 자동 생성 trigger와 신규 테이블 일괄 도입도 방향은 적절합니다. 다만 이 플랜은 "생성"에 집중되어 있어도 보안 경계는 이미 여기서 결정됩니다. 특히 `SECURITY DEFINER` 함수 배치, foreign key/unique/index 설계, trigger 실패 복구 전략이 명확하지 않으면 이후 RLS를 잘 얹어도 운영 리스크가 남습니다.

**Strengths**
- `public.users`를 `auth.users`와 trigger로 동기화하는 방향이 요구사항과 정확히 맞습니다.
- 신규 테이블을 phase 초기에 한 번에 정리해 이후 기능 개발의 기반을 만드는 점은 좋습니다.
- `ENABLE ROW LEVEL SECURITY`를 스키마 생성 시점에 같이 넣는 접근은 안전합니다.
- threat model에 trigger privilege escalation, pre-RLS disclosure 같은 실제 위험이 포함되어 있습니다.
- feature별 migration 분리는 D-07과 맞고 rollback/review에도 유리합니다.

**Concerns**
- HIGH: `handle_new_user()`가 `SECURITY DEFINER`인데 `public` 같은 exposed schema에 둘 가능성이 보입니다. Supabase에서는 이런 함수는 private schema에 두는 편이 안전합니다.
- HIGH: trigger 실패 시 `auth.users` 생성 자체가 막혀 signup 장애로 이어질 수 있는데, idempotency나 backfill 전략이 보이지 않습니다.
- MEDIUM: `public.users`에 미래용 컬럼을 많이 넣으면서도 private/public 데이터 경계가 아직 안 나뉘어 있습니다.
- MEDIUM: RLS 대상 컬럼(`user_id`, `role`, `cheerleader_id`, `status`)에 대한 index 계획이 없습니다.
- MEDIUM: seed data의 `cheerleaders` unique key 기준이 불명확합니다.
- LOW: `audit_logs`는 append-only 성격이 강한데 immutable 보장 제약이 없습니다.

**Suggestions**
- `handle_new_user()`는 `private` schema로 이동하고 최소 권한으로 작성하세요.
- trigger는 `insert ... on conflict do nothing` 또는 동등한 idempotent 패턴을 고려하세요.
- 지금 단계에서 RLS 예정 컬럼에 index 초안을 같이 포함하세요.
- `cheerleaders`, `site_settings`에는 natural key 또는 `unique` 제약을 명확히 두세요.
- `audit_logs`는 update/delete를 원천적으로 막는 방향까지 스키마에서 정의하세요.

**Risk Assessment: MEDIUM**

### Plan 02: RLS Policies

**Summary**
이 phase의 핵심 플랜이고, 테이블별 접근 모델도 대체로 합리적입니다. 하지만 가장 위험한 플랜이기도 합니다. `Wave 1`로 독립 실행되는 점, `SECURITY DEFINER` helper 함수 위치, `public.users` 전체 read 정책, column tampering 방지 부재 가능성 때문에 보안 목표 달성에 확신이 부족합니다.

**Strengths**
- 테이블별로 owner/admin/public access 모델을 분리한 점은 구조적으로 맞습니다.
- `admin` 판별을 JWT custom claim이 아니라 DB source of truth인 `public.users.role`로 두는 결정은 D-10과 일치합니다.
- legacy 정리를 같이 묶은 것은 보안 모델 단순화에 도움이 됩니다.

**Concerns**
- HIGH: Plan 02가 `Wave 1`로 잡혀 있는데 실제로는 Plan 01 스키마에 의존합니다.
- HIGH: `is_admin()`/`is_owner()`가 exposed schema 배치가 위험합니다.
- HIGH: `users: authenticated read`는 `push_token`, `blocked_users` 등 민감 컬럼 과노출 위험.
- HIGH: "own update"만으로는 `role`, `is_deleted` 등 관리자 컬럼 변경 방지 불충분.
- MEDIUM: `audit_logs`에 admin insert를 허용하면 감사 로그 무결성이 약해집니다.
- MEDIUM: 기존 public 테이블 전수 점검 범위가 불명확합니다.

**Suggestions**
- 실행 순서를 `Plan 01 -> Plan 02`로 명시적으로 고정하세요.
- helper 함수는 private schema로 옮기세요.
- `public.users`는 전체 row read 대신 public profile view를 고려하세요.
- 모든 update 정책에는 변경 불가 컬럼을 명시하세요.

**Risk Assessment: HIGH**

### Plan 03: Security Cleanup

**Summary**
phase 마감 품질을 좌우하는 정리 작업. 가장 큰 문제는 "admin password를 `VITE_` env로 이동"하는 부분으로, 브라우저 번들에 비밀번호를 실어 보내는 방향일 수 있습니다.

**Strengths**
- `.env` 강제와 dummy fallback 제거는 D-06과 직접 맞물려 있고 운영 안전성에 도움.
- test account 제거를 완전 삭제로 보는 방향은 맞습니다.
- human verification checkpoint는 적절합니다.

**Concerns**
- HIGH: `VITE_ADMIN_EMAIL`, `VITE_ADMIN_PASSWORD`는 Vite client bundle에 노출됩니다.
- HIGH: repo-wide sweep이 필요한데 범위가 너무 좁습니다.
- MEDIUM: `supabase.ts`의 strict env validation이 테스트 환경에서의 동작이 불명확합니다.
- MEDIUM: native app fallback이 잘못되면 사실상 allow-all CORS가 될 수 있습니다.

**Suggestions**
- admin credential은 frontend env에 두지 마세요.
- repo 전체 전수 점검을 plan에 포함하세요.
- lint/CI에 `no-console` 체크를 넣어 재발 방지.

**Risk Assessment: HIGH**

---

## OpenCode Review

### Plan 01: Schema Creation

**Summary**
Well-structured plan that correctly implements public.users with the auth trigger pattern, creates 7 new tables, and adds columns to photo_posts. The migration files (011, 013-020, 022) already exist in the codebase with complete implementations.

**Strengths**
- Correct SECURITY DEFINER pattern: `SET search_path = ''` properly applied
- Sound index strategy: Partial indexes for soft-delete filtering and role-based queries
- Future-proofed columns per D-01 to minimize future ALTER TABLEs
- Proper trigger design: AFTER INSERT on auth.users with COALESCE fallback
- Good FK constraints: References to auth.users, public.teams appropriately defined

**Concerns**
- MEDIUM: `011_users.sql` uses `update_updated_at()` but `002_community.sql` defines it as `set_updated_at()`. Function name mismatch could cause migration failure.
- LOW: No EXCEPTION handler in handle_new_user trigger.
- LOW: announcements table missing updated_at trigger despite having the column.

**Suggestions**
- Verify `update_updated_at()` function exists before `supabase db push`
- Add comment documenting why announcements lacks updated_at trigger

**Risk Assessment: LOW**

### Plan 02: RLS Policies

**Summary**
Comprehensive RLS implementation covering all 8 tables with proper helper functions, consistent `(SELECT auth.uid())` wrapping, and threat-aware design.

**Strengths**
- Correct RLS architecture: SECURITY DEFINER functions bypass RLS, preventing policy recursion
- Performance optimization: `(SELECT auth.uid())` wrapping per Supabase best practices
- Clean policy separation: Admin-only, owner-only, and authenticated-read properly scoped
- Good cleanup: spam_filter_words DROP, trg_auto_blind removal, anon policy removal

**Concerns**
- MEDIUM: Dependency on existing 004_spam_filter.sql structure — DROP could fail if modified.
- LOW: audit_logs WITH CHECK on is_admin() intent should be documented.
- LOW: No INSERT policy for inquiries by admin.

**Suggestions**
- Add inline comment in 023 explaining why policies were split from 012
- Consider documenting the intent behind each policy group

**Risk Assessment: LOW**

### Plan 03: Security Cleanup

**Summary**
Addresses security hardening requirements effectively. Most changes have already been implemented.

**Strengths**
- Proper env validation: Throw pattern correctly implements D-06
- Complete test account removal: All 3 test accounts and related AsyncStorage logic
- CORS handling: Correctly handles native app (empty origin) vs browser distinction

**Concerns**
- HIGH: Admin env var validation too lenient — only logs console.error when env vars missing, should throw per D-06 intent.
- HIGH: Type mismatch between public.users (`nickname`) and UserProfile type (`username`, `display_name`). Needs transformation layer or type alignment.
- MEDIUM: Missing verification for `isSupabaseConfigured` references across the codebase.
- MEDIUM: supabase.ts already implements the throw pattern — Plan Task 1 Part A may be redundant.

**Suggestions**
- Admin AuthContext should throw instead of just logging when env vars missing
- Resolve UserProfile type vs public.users column mismatch
- Grep for `isSupabaseConfigured` across all source files

**Risk Assessment: MEDIUM**

---

## Consensus Summary

### Agreed Strengths
*Mentioned by both reviewers:*
- SECURITY DEFINER SET search_path = '' 패턴이 올바르게 적용됨
- feature별 migration 분리 전략이 rollback/review에 유리
- test account 완전 삭제 방향이 올바름
- `(SELECT auth.uid())` 래핑을 통한 RLS 성능 최적화
- human verification checkpoint 포함

### Agreed Concerns
*Raised by both reviewers — highest priority:*

| # | Concern | Severity | Codex | OpenCode |
|---|---------|----------|-------|----------|
| 1 | **Admin credential을 VITE_ env로 이동하면 client bundle에 노출** | HIGH | YES | YES (validation too lenient) |
| 2 | **handle_new_user() trigger 실패 시 복구 전략 없음** | HIGH/LOW | HIGH (idempotency 필요) | LOW (EXCEPTION handler 권장) |
| 3 | **Plan 01/02 실행 순서 의존성 문제** | HIGH/MEDIUM | HIGH (Wave 1 병렬 위험) | MEDIUM (split 필요성 언급) |
| 4 | **public.users 민감 컬럼 과노출 (push_token, blocked_users)** | HIGH | YES | (implicit in type mismatch concern) |
| 5 | **isSupabaseConfigured 참조 전수 점검 필요** | MEDIUM | YES (repo-wide sweep) | YES (grep 범위 부족) |

### Divergent Views

| Topic | Codex | OpenCode | Notes |
|-------|-------|----------|-------|
| **Overall Plan 01 risk** | MEDIUM (trigger 배치/실패 우려) | LOW (이미 구현됨, 패턴 적절) | OpenCode는 구현 코드를 직접 확인함 |
| **Overall Plan 02 risk** | HIGH (과노출, column tampering) | LOW (clean implementation) | Codex가 더 보수적으로 평가. 실제 구현에 `TO authenticated` 명시 여부 확인 필요 |
| **SECURITY DEFINER 함수 schema** | private schema 강력 권장 | public schema에서 충분 (SET search_path로 보호) | Supabase 공식 예제는 public schema 사용. 프로덕션 보안 요구에 따라 결정 |
| **update_updated_at 함수명** | 언급 없음 | MEDIUM (함수명 불일치 가능성) | 실행 전 확인 필요 |
| **UserProfile 타입 불일치** | 언급 없음 | HIGH (nickname vs username/display_name) | Plan 03에서 추가 수정 필요할 수 있음 |

---

*Phase: 01-database-foundation-security*
*Reviewed: 2026-04-06*
*Reviewers: Codex (GPT-5.4), OpenCode*
