-- ============================================================
-- 021_drop_spam_and_cleanup.sql
-- Out-of-scope 기능 정리: spam_filter DROP, 자동 블라인드 제거, anon 정책 제거
-- ============================================================
-- D-08: spam_filter 테이블 DROP (Out of Scope 확정)
-- D-11: 비인증 사용자 완전 차단 (anon 정책 제거)
-- D-12: 자동 블라인드 트리거 제거 (관리자 수동 처리로 전환)

-- ─── Part A: spam_filter_words 테이블 DROP (per D-08) ─────

-- Out of Scope 확정: 금칙어/스팸 필터 기능 제거
-- 004_spam_filter.sql에서 생성된 spam_filter_words만 DROP
-- user_restrictions, user_blocks, recent_searches는 유지 (다른 기능에서 사용)

-- RLS 비활성화 후 DROP (005_rls_policies.sql에서 ENABLE만 되어 있고 정책은 없음)
ALTER TABLE IF EXISTS spam_filter_words DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS spam_filter_words;

-- ─── Part B: 자동 블라인드 트리거/함수 제거 (per D-12) ────

-- 002_community.sql에서 생성된 자동 블라인드 로직 제거
-- 관리자 수동 처리로 전환 (REQUIREMENTS.md -- Out of Scope: "자동 블라인드 (5건 누적)" 제거 확정)
-- 주의: check_self_report() 함수와 trg_prevent_self_report 트리거는 유지
--       (신고 기능은 관리자 수동 처리로 계속 사용)

DROP TRIGGER IF EXISTS trg_auto_blind ON community_reports;
DROP FUNCTION IF EXISTS auto_blind_on_report();

-- ─── Part C: 비인증 사용자 조회 정책 제거 (per D-11) ──────

-- 005_rls_policies.sql에서 생성된 anon 정책 제거
-- D-11: 비인증 사용자 완전 차단
-- 주의: posts_public_read, comments_public_read 정책은 유지 (인증 사용자용 -- anon이 아님)

DROP POLICY IF EXISTS "posts_anon_read" ON community_posts;
DROP POLICY IF EXISTS "comments_anon_read" ON community_comments;
