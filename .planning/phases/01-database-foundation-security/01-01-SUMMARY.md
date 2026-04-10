---
phase: 01-database-foundation-security
plan: 01
subsystem: database
tags: [postgresql, supabase, migrations, triggers, rls, schema]

# Dependency graph
requires: []
provides:
  - "public.users 테이블 + handle_new_user auth.users INSERT 트리거"
  - "notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings 테이블"
  - "photo_posts에 status/rejection_reason/cheerleader_id 컬럼"
  - "cheerleaders KBO 10개 구단 시드 데이터"
affects: [01-02-rls-helpers, 02-auth, 03-community, 04-photographer, 05-admin, 06-notification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER SET search_path = '' 트리거 함수 패턴"
    - "기능별 분리 마이그레이션 (011~022)"
    - "partial index (WHERE 조건부 인덱스)"
    - "UPDATE 트리거 재사용 (update_updated_at)"

key-files:
  created:
    - supabase/migrations/011_users.sql
    - supabase/migrations/013_notifications.sql
    - supabase/migrations/014_announcements.sql
    - supabase/migrations/015_inquiries.sql
    - supabase/migrations/016_photographer_apps.sql
    - supabase/migrations/017_cheerleaders.sql
    - supabase/migrations/018_audit_logs.sql
    - supabase/migrations/019_site_settings.sql
    - supabase/migrations/020_photo_posts_alter.sql
    - supabase/migrations/022_seed_cheerleaders.sql
  modified: []

key-decisions:
  - "update_updated_at() 함수 재사용 (007에서 정의된 기존 함수)"
  - "announcements/inquiries/photographer_applications에 updated_at 트리거 추가 (플랜에 명시되지 않았으나 updated_at 컬럼 존재하므로 Rule 2 적용)"

patterns-established:
  - "SECURITY DEFINER SET search_path = '': 모든 트리거 함수에서 스키마 명시"
  - "partial unique index: 논리적으로 삭제되지 않은 행만 유니크 적용"
  - "DEFAULT로 기존 데이터 호환: photo_posts.status DEFAULT 'approved'"
  - "모든 신규 테이블에 ENABLE ROW LEVEL SECURITY (정책은 Plan 02에서 생성)"

requirements-completed: [DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11]

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 01 Plan 01: DB Schema Summary

**public.users 테이블 + auth.users 자동 생성 트리거, 7개 신규 테이블 (notifications~site_settings), photo_posts 컬럼 확장, KBO 10구단 cheerleaders 시드 데이터**

## Performance

- **Duration:** 2min
- **Started:** 2026-04-06T01:30:50Z
- **Completed:** 2026-04-06T01:33:16Z
- **Tasks:** 2
- **Files created:** 10

## Accomplishments
- public.users 테이블 생성 (15개 칼럼, 3개 인덱스, handle_new_user 트리거)
- 7개 신규 테이블 생성 (notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings) -- 모두 RLS 활성화
- photo_posts에 status (DEFAULT 'approved'), rejection_reason, cheerleader_id 컬럼 추가
- KBO 10개 구단별 치어리더 시드 데이터 삽입

## Task Commits

Each task was committed atomically:

1. **Task 1: public.users 테이블 + auth.users 트리거 생성** - `9492031` (feat)
2. **Task 2: 7개 신규 테이블 + photo_posts ALTER + cheerleaders 시드** - `cb24953` (feat)

## Files Created
- `supabase/migrations/011_users.sql` - public.users 테이블, handle_new_user 트리거, 인덱스 3개, updated_at 트리거
- `supabase/migrations/013_notifications.sql` - notifications 테이블 (type CHECK, 인덱스 2개)
- `supabase/migrations/014_announcements.sql` - announcements 테이블 (길이 CHECK, updated_at 트리거)
- `supabase/migrations/015_inquiries.sql` - inquiries 테이블 (category/status CHECK, updated_at 트리거)
- `supabase/migrations/016_photographer_apps.sql` - photographer_applications 테이블 (status CHECK, updated_at 트리거)
- `supabase/migrations/017_cheerleaders.sql` - cheerleaders 테이블 (position/status CHECK, team FK)
- `supabase/migrations/018_audit_logs.sql` - audit_logs 테이블 (admin FK, target 인덱스)
- `supabase/migrations/019_site_settings.sql` - site_settings 테이블 (key-value JSONB)
- `supabase/migrations/020_photo_posts_alter.sql` - photo_posts 컬럼 추가 (status, rejection_reason, cheerleader_id)
- `supabase/migrations/022_seed_cheerleaders.sql` - KBO 10개 구단 치어리더 시드

## Decisions Made
- update_updated_at() 함수 재사용: 007_photographer.sql에서 이미 정의된 함수를 users 및 신규 테이블에서 재사용
- announcements, inquiries, photographer_applications에 updated_at 트리거 추가: 플랜에는 명시되지 않았으나 updated_at 컬럼이 있으므로 자동 갱신 트리거 필요 (Rule 2 적용)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] cheerleaders 시드 데이터에서 name_ko 누락 수정**
- **Found during:** Task 2 (022_seed_cheerleaders.sql 작성)
- **Issue:** 초기 작성 시 VALUES에 name_ko 칼럼이 빠져서 한글 이름이 삽입되지 않음
- **Fix:** VALUES에 name_ko 포함하여 4개 칼럼 (slug, name_ko, name_en, position)으로 수정
- **Files modified:** supabase/migrations/022_seed_cheerleaders.sql
- **Verification:** 10개 구단 slug + 한글 이름 모두 확인
- **Committed in:** cb24953 (Task 2 commit)

**2. [Rule 2 - Missing Critical] announcements/inquiries/photographer_applications에 updated_at 트리거 추가**
- **Found during:** Task 2 (테이블 생성)
- **Issue:** 플랜에서 이 테이블들의 updated_at 트리거가 명시되지 않았으나, updated_at 컬럼이 존재하면 자동 갱신이 필수
- **Fix:** trg_announcements_updated, trg_inquiries_updated, trg_photographer_apps_updated 트리거 추가
- **Files modified:** 014_announcements.sql, 015_inquiries.sql, 016_photographer_apps.sql
- **Verification:** 각 파일에 EXECUTE FUNCTION update_updated_at() 확인
- **Committed in:** cb24953 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** 모두 정확성을 위해 필수적인 수정. 스코프 변경 없음.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 모든 신규 테이블에 RLS가 활성화되어 있으나 정책(POLICY)은 아직 없음 -- Plan 02 (RLS Helpers + Policies)에서 생성 예정
- public.users 테이블이 준비되어 Phase 2 Auth 연동의 기반 완성
- cheerleaders 테이블 + 시드가 준비되어 photo_posts.cheerleader_id FK 사용 가능

## Self-Check: PASSED

All 10 migration files verified present. Both commits (9492031, cb24953) verified in git log. SUMMARY.md exists.

---
*Phase: 01-database-foundation-security*
*Completed: 2026-04-06*
