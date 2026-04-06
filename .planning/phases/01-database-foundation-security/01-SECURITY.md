---
phase: 01
slug: database-foundation-security
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-06
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| auth.users -> public.users | 트리거로 자동 동기화. SECURITY DEFINER로 실행 | 사용자 ID, 이메일, 메타데이터 |
| anon -> authenticated | 비인증 사용자의 데이터 접근 차단 (D-11) | 모든 테이블 데이터 |
| authenticated -> admin | is_admin() 함수로 어드민 전용 리소스 보호 | audit_logs, site_settings 관리, 알림 생성 |
| client SDK -> RLS layer | 모든 테이블 접근이 RLS를 통과해야 함 | 모든 CRUD 작업 |
| client code -> credentials | 소스 코드에 하드코딩된 인증정보 제거 | 비밀번호, API 키, 테스트 계정 |
| browser -> Edge Function | CORS origin 제한으로 브라우저 요청 검증 | 업로드 presigned URL |
| app startup -> environment | 환경변수 필수 검증으로 미설정 시 차단 | Supabase URL/키 |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Elevation of Privilege | handle_new_user() | mitigate | `SECURITY DEFINER SET search_path = ''`, `public.users` 스키마 명시 (011_users.sql:47) | closed |
| T-01-02 | Tampering | public.users.role | mitigate | `CHECK (role IN ('user', 'admin'))`, DEFAULT 'user', 트리거에서 항상 'user' INSERT (011_users.sql:14) | closed |
| T-01-03 | Denial of Service | handle_new_user() 실패 | mitigate | 최소 칼럼 INSERT, COALESCE fallback, NOT NULL 최소화 (011_users.sql) | closed |
| T-01-04 | Information Disclosure | users 테이블 | accept | RLS 활성화, 정책 없음 = 접근 불가 → 012/023에서 정책 추가 완료 | closed |
| T-02-01 | Elevation of Privilege | is_admin() search_path | mitigate | `SECURITY DEFINER SET search_path = ''`, `public.users` 스키마 명시 (012_rls_helpers.sql:17) | closed |
| T-02-02 | Spoofing | 비인증 데이터 접근 | mitigate | 21개 정책 모두 `TO authenticated`, `posts_anon_read`/`comments_anon_read` DROP (021:35-36) | closed |
| T-02-03 | Tampering | soft-deleted users | mitigate | `users_read_authenticated`에 `is_deleted = FALSE` 조건 (012:45), `is_admin()`에서도 확인 (012:24) | closed |
| T-02-04 | Information Disclosure | audit_logs 노출 | mitigate | audit_logs는 `is_admin()` 전용 — SELECT/INSERT 모두 (023:90-97) | closed |
| T-02-05 | Spoofing | auto_blind 우회 | accept | 트리거/함수 완전 제거 (021:30-31). 관리자 수동 처리로 전환. 공격 벡터 자체 제거 | closed |
| T-03-01 | Information Disclosure | TEST_ACCOUNTS 하드코딩 | mitigate | 코드에서 완전 삭제. grep 0건 확인 (app/src/) | closed |
| T-03-02 | Information Disclosure | console.log OAuth URL/토큰 | mitigate | console.log 3곳 제거. grep 0건 확인 (AuthContext.tsx) | closed |
| T-03-03 | Information Disclosure | admin 하드코딩 비밀번호 | mitigate | VITE_ADMIN_PASSWORD 환경변수로 이동. grep admin1234 0건 (admin/src/) | closed |
| T-03-04 | Spoofing | CORS 와일드카드 | mitigate | ALLOWED_ORIGINS 기반 조건부 검증. 네이티브 앱 호환 유지 (get-upload-url:33-45) | closed |
| T-03-05 | Denial of Service | 환경변수 미설정 | mitigate | `throw new Error('Missing required...')` 앱 시작 차단 (supabase.ts:7-11) | closed |
| T-03-06 | Information Disclosure | DUMMY_KEY JWT 토큰 | mitigate | DUMMY_URL/DUMMY_KEY 완전 삭제. grep 0건 확인 (app/src/) | closed |

*Status: open / closed*
*Disposition: mitigate (implementation required) / accept (documented risk) / transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-04 | RLS 활성화 상태에서 정책 없음 = 모든 접근 차단. 012/023에서 정책 추가로 최종 해소 | plan author | 2026-04-06 |
| AR-02 | T-02-05 | auto_blind 트리거 자체를 제거하여 공격 벡터 제거. 관리자 수동 블라인드 처리로 전환 (D-12) | plan author | 2026-04-06 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-06 | 15 | 15 | 0 | gsd-secure-phase orchestrator |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-06
