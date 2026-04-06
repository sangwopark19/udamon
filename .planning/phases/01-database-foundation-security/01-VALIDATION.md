---
phase: 1
slug: database-foundation-security
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 -- 프로젝트에 테스트 인프라 미구축 |
| **Config file** | none |
| **Quick run command** | `supabase db reset` |
| **Full suite command** | `supabase db reset && grep -r "test@udamon\|DUMMY_URL\|console.log" app/src/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** SQL 마이그레이션은 `supabase db reset`으로 무결성 검증
- **After every plan wave:** 전체 마이그레이션 순서대로 실행 확인
- **Before `/gsd-verify-work`:** Full suite must be green + Supabase Dashboard 수동 검증
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | DB-01 | — | users 테이블 존재 | SQL query | `supabase db reset` | N/A | ⬜ pending |
| 01-01-02 | 01 | 1 | DB-02 | — | auth trigger 동작 | manual | Dashboard에서 사용자 생성 후 확인 | N/A | ⬜ pending |
| 01-01-03 | 01 | 1 | DB-03~DB-09 | — | 테이블 존재 확인 | SQL query | `supabase db reset` | N/A | ⬜ pending |
| 01-01-04 | 01 | 1 | DB-10~DB-11 | — | photo_posts 칼럼 추가 | SQL query | `\d photo_posts` | N/A | ⬜ pending |
| 01-01-05 | 01 | 1 | DB-12 | — | 자동 블라인드 트리거 제거 | SQL query | `select * from pg_trigger` | N/A | ⬜ pending |
| 01-02-01 | 02 | 1 | DB-13~DB-14 | T-1-06 | RLS 비인증 차단 | manual | anon key SELECT -> 빈 결과 | N/A | ⬜ pending |
| 01-03-01 | 03 | 2 | SEC-01 | T-1-02 | 테스트 계정 제거 | grep | `grep -r "test@udamon" app/src/` | N/A | ⬜ pending |
| 01-03-02 | 03 | 2 | SEC-02 | T-1-02 | 더미 키 제거 | grep | `grep -r "DUMMY_URL\|DUMMY_KEY" app/src/` | N/A | ⬜ pending |
| 01-03-03 | 03 | 2 | SEC-03 | T-1-02 | 하드코딩 비밀번호 제거 | grep | `grep -r "admin1234" admin/src/` | N/A | ⬜ pending |
| 01-03-04 | 03 | 2 | SEC-04 | T-1-03 | console.log 제거 | grep | `grep -r "console.log" app/src/` | N/A | ⬜ pending |
| 01-03-05 | 03 | 2 | SEC-05 | T-1-04 | CORS origin 제한 | grep | `grep "Allow-Origin.*\*" supabase/functions/` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- 이 Phase는 SQL 마이그레이션 + 코드 보안 정리로 구성되어 자동화된 테스트 프레임워크가 불필요
- 검증은 `supabase db reset`, grep 검색, Supabase Dashboard 수동 테스트로 수행
- Phase 2(Auth) 이후부터 단위 테스트 도입이 적절

*Existing infrastructure covers all phase requirements via SQL migration and grep verification.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| auth.users -> public.users 트리거 | DB-02 | Supabase Dashboard에서만 확인 가능 | Dashboard에서 사용자 생성 -> public.users 행 확인 |
| RLS 비인증 차단 | DB-13~DB-14 | 실제 Supabase 인스턴스 필요 | anon key로 보호된 테이블 SELECT -> 빈 결과 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
