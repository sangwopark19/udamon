#!/usr/bin/env bash
# ============================================================
# verify-phase-01.sh
# Phase 1 (DB Foundation & Security) 자동 검증 스크립트
#
# 검증 항목:
#   Gap 1  DB-01   : 011_users.sql — public.users CREATE TABLE
#   Gap 2  DB-03~09: 013~019 마이그레이션 파일 + CREATE TABLE 패턴
#   Gap 3  DB-10~11: 020_photo_posts_alter.sql — ALTER TABLE 컬럼
#   Gap 4  DB-12   : 021_drop_spam_and_cleanup.sql — DROP 구문
#   SEC-01~05 (grep 기반, 이미 통과된 항목 포함 재검증)
#
# 사용법: bash scripts/verify-phase-01.sh
# 종료코드: 0 = 전체 통과, 1 = 하나 이상 실패
# ============================================================

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS="${REPO_ROOT}/supabase/migrations"

PASS=0
FAIL=0

# ─── 헬퍼 함수 ──────────────────────────────────────────────

pass() {
  echo "  [PASS] $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "  [FAIL] $1"
  FAIL=$((FAIL + 1))
}

assert_file_exists() {
  local file="$1"
  local label="$2"
  if [ -f "$file" ]; then
    pass "${label}: 파일 존재"
  else
    fail "${label}: 파일 없음 (${file})"
  fi
}

assert_contains() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  if grep -qi "$pattern" "$file" 2>/dev/null; then
    pass "${label}: '${pattern}' 포함"
  else
    fail "${label}: '${pattern}' 없음"
  fi
}

assert_not_contains() {
  local target="$1"   # 파일 또는 디렉토리
  local pattern="$2"
  local label="$3"
  local count
  count=$(grep -ri "$pattern" "$target" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    pass "${label}: '${pattern}' 없음 (${count}건)"
  else
    fail "${label}: '${pattern}' ${count}건 잔존"
  fi
}

# ─── Gap 1: DB-01 — public.users 테이블 ──────────────────────

echo ""
echo "=== Gap 1: DB-01 — public.users 테이블 (011_users.sql) ==="

FILE="${MIGRATIONS}/011_users.sql"
assert_file_exists "$FILE" "DB-01"
assert_contains "$FILE" "create table public\.users" "DB-01 CREATE TABLE"
assert_contains "$FILE" "references auth\.users(id)" "DB-01 FK auth.users"
assert_contains "$FILE" "on delete cascade" "DB-01 ON DELETE CASCADE"
assert_contains "$FILE" "check (role in" "DB-01 role CHECK 제약"
assert_contains "$FILE" "handle_new_user" "DB-01 handle_new_user 함수"
assert_contains "$FILE" "on_auth_user_created" "DB-01 auth 트리거"
assert_contains "$FILE" "security definer set search_path" "DB-01 SECURITY DEFINER"

# ─── Gap 2: DB-03~DB-09 — 7개 신규 테이블 ───────────────────

echo ""
echo "=== Gap 2: DB-03~DB-09 — 7개 신규 테이블 마이그레이션 ==="

check_table_migration() {
  local filename="$1"
  local pattern="$2"
  local file="${MIGRATIONS}/${filename}"
  assert_file_exists "$file" "${filename}"
  assert_contains "$file" "$pattern" "${filename} CREATE TABLE"
  assert_contains "$file" "enable row level security" "${filename} RLS 활성화"
}

check_table_migration "013_notifications.sql"      "create table public\.notifications"
check_table_migration "014_announcements.sql"      "create table public\.announcements"
check_table_migration "015_inquiries.sql"          "create table public\.inquiries"
check_table_migration "016_photographer_apps.sql"  "create table public\.photographer_applications"
check_table_migration "017_cheerleaders.sql"       "create table public\.cheerleaders"
check_table_migration "018_audit_logs.sql"         "create table public\.audit_logs"
check_table_migration "019_site_settings.sql"      "create table public\.site_settings"

# ─── Gap 3: DB-10~DB-11 — photo_posts 컬럼 추가 ─────────────

echo ""
echo "=== Gap 3: DB-10~DB-11 — photo_posts 컬럼 추가 (020_photo_posts_alter.sql) ==="

FILE="${MIGRATIONS}/020_photo_posts_alter.sql"
assert_file_exists "$FILE" "DB-10/DB-11"
assert_contains "$FILE" "alter table photo_posts" "DB-10/DB-11 ALTER TABLE"
assert_contains "$FILE" "add column status" "DB-10 status 컬럼"
assert_contains "$FILE" "add column rejection_reason" "DB-10 rejection_reason 컬럼"
assert_contains "$FILE" "add column cheerleader_id" "DB-11 cheerleader_id 컬럼"
assert_contains "$FILE" "default 'approved'" "DB-10 DEFAULT approved"
assert_contains "$FILE" "references public\.cheerleaders" "DB-11 cheerleaders FK"

# ─── Gap 4: DB-12 — 자동 블라인드 트리거 제거 ───────────────

echo ""
echo "=== Gap 4: DB-12 — 자동 블라인드 트리거 제거 (021_drop_spam_and_cleanup.sql) ==="

FILE="${MIGRATIONS}/021_drop_spam_and_cleanup.sql"
assert_file_exists "$FILE" "DB-12"
assert_contains "$FILE" "drop table.*spam_filter_words" "DB-12 spam_filter_words DROP"
assert_contains "$FILE" "drop trigger.*trg_auto_blind" "DB-12 trg_auto_blind DROP"
assert_contains "$FILE" "drop function.*auto_blind_on_report" "DB-12 auto_blind_on_report 함수 DROP"
assert_contains "$FILE" "posts_anon_read" "DB-12/SEC anon 정책 제거"
assert_contains "$FILE" "comments_anon_read" "DB-12/SEC anon 정책 제거"

# ─── SEC-01~SEC-05 (기존 통과 항목 재검증) ──────────────────

echo ""
echo "=== SEC-01~SEC-05 — 보안 코드 정리 재검증 ==="

APP_SRC="${REPO_ROOT}/app/src"
ADMIN_SRC="${REPO_ROOT}/admin/src"
FUNCTIONS="${REPO_ROOT}/supabase/functions"

assert_not_contains "$APP_SRC" "test@udamon" "SEC-01 테스트 계정 이메일 제거"
assert_not_contains "$APP_SRC" "TEST_ACCOUNTS\|TEST_ACCOUNT_KEY" "SEC-01 테스트 계정 상수 제거"
assert_not_contains "$APP_SRC" "DUMMY_URL\|DUMMY_KEY" "SEC-02 더미 키 제거"
assert_not_contains "$APP_SRC" "isSupabaseConfigured" "SEC-02 isSupabaseConfigured 제거"
assert_not_contains "$ADMIN_SRC" "admin1234" "SEC-03 하드코딩 비밀번호 제거"
assert_not_contains "${APP_SRC}/contexts/AuthContext.tsx" "console\.log" "SEC-04 console.log 제거"
assert_not_contains "$FUNCTIONS" 'Allow-Origin.*\*' "SEC-05 CORS 와일드카드 제거"

# ─── 결과 요약 ───────────────────────────────────────────────

echo ""
echo "============================================================"
echo "  결과: PASS ${PASS} / FAIL ${FAIL} / TOTAL $((PASS + FAIL))"
echo "============================================================"

if [ "$FAIL" -gt 0 ]; then
  echo "  상태: FAILED"
  exit 1
else
  echo "  상태: ALL PASSED"
  exit 0
fi
