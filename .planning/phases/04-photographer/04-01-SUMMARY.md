---
phase: 04-photographer
plan: 01
subsystem: database
tags: [supabase, postgres, pgtap, edge-functions, r2, cloudflare, deno, magick-wasm, expo-video]

requires:
  - phase: 03-community
    provides: auth.users trigger handle_new_user, notifications table + RLS, pg_cron update-trending-posts schedule
provides:
  - photo_posts.videos TEXT[] (CHECK 1~3) + images CHECK 1~7 축소
  - photo_posts.thumbnail_urls TEXT[] DEFAULT '{}'
  - photographer_applications.team_id/activity_links/activity_plan
  - handle_photographer_application_decision trigger (승인 시 photographers INSERT + users.is_photographer=TRUE + notifications INSERT; 거절 시 notifications INSERT only)
  - notifications.type CHECK 확장 (photographer_approved, photographer_rejected)
  - generate-thumbnails Edge Function (R2 download → magick-wasm 400x400 cover crop JPEG → R2 upload → photo_posts.thumbnail_urls UPDATE)
  - get-upload-url SIZE_LIMITS photo-posts 50MB 상향
  - expo-video ~3.0.16 의존성 추가
affects: [04-02, 04-03, 04-04, 04-05]

tech-stack:
  added: [magick-wasm (Edge Function 번들), expo-video 3.0.16]
  patterns:
    - "SECURITY DEFINER + SET search_path = '' trigger function (T-4-03 RLS 우회 안전)"
    - "verify_jwt=false + supabase.auth.getUser(token) 내부 재검증 (Phase 3 ES256 rotation 이슈 우회)"
    - "Edge Function static_files 배열로 WASM 번들링 (Supabase CLI 2.84+)"

key-files:
  created:
    - supabase/migrations/029_photo_posts_videos.sql
    - supabase/migrations/030_photographer_approval_trigger.sql
    - supabase/migrations/031_photographer_apps_extend.sql
    - supabase/migrations/032_photo_posts_thumbnails.sql
    - supabase/functions/generate-thumbnails/index.ts
    - supabase/functions/generate-thumbnails/deno.json
    - supabase/functions/generate-thumbnails/magick.wasm
    - supabase/tests/photographer-approval-trigger.sql
    - supabase/tests/photo-posts-videos-check.sql
    - supabase/tests/photo-posts-images-1-7-check.sql
    - supabase/tests/photographer-apps-extend.sql
    - supabase/tests/photo-posts-thumbnails.sql
    - docs/phase4-qa-matrix.md
  modified:
    - supabase/functions/get-upload-url/index.ts
    - supabase/config.toml
    - app/package.json
    - app/app.json

key-decisions:
  - "ADJ-01: users.role 을 'photographer' 로 변경하지 않고 is_photographer = TRUE 로만 승격 — 권한 확장은 is_photographer 플래그로 분기"
  - "ADJ-02: get-upload-url ALLOWED_TYPES 에 video/mp4, video/quicktime 유지 (AVI/MKV 차단) — T-4-06 (악성 페이로드 방지)"
  - "030 에 notifications.type CHECK drop+add 선제 포함 — 기존 CHECK 가 photographer_approved/rejected 미허용이라 트리거 INSERT 실패 예방"
  - "Edge Function verify_jwt=false + 내부 supabase.auth.getUser(token) 재검증 — Phase 3 ES256 key rotation 후 gateway 토큰 거부 이슈 회피"
  - "supabase/config.toml static_files = [...] (배열) — supabase CLI 2.84 호환 (2.80 이전 [[...]] nested table 문법 제거)"

patterns-established:
  - "Approval trigger: SECURITY DEFINER + search_path='' + WHEN (OLD.status IS DISTINCT FROM NEW.status) — 부수 효과 최소화"
  - "pgTAP plan 선언은 실제 실행 test 수와 일치시킨다 (plan(N) == actual)"
  - "photographer_applications CHECK 제약: activity_links 1~3개 + activity_plan NOT NULL"

requirements-completed: [PHOT-02, PHOT-03, PHOT-05, PHOT-07]

duration: ~4h
completed: 2026-04-15
---

# Phase 04 Plan 01: Wave 0 — 서버측 기반 배포 완료

**Photographer 승인 트리거 + 영상/썸네일 DB 스키마 + generate-thumbnails Edge Function 원격 배포 완료 (pgTAP 22개 green)**

## Performance

- **Duration:** 약 4시간 (plan 작성 ~ 원격 배포 검증)
- **Started:** 2026-04-15T00:00:00Z
- **Completed:** 2026-04-15T02:14:54Z
- **Tasks:** 7
- **Files modified:** 17

## Accomplishments

- **DB 스키마 원격 반영:** `supabase db push` 로 029~032 4개 마이그레이션이 원격 프로젝트 `jfynfapkbpkwyrjulsed` 에 성공 적용 (`photo_posts.videos`, `photo_posts.thumbnail_urls`, `photographer_applications.team_id/activity_links/activity_plan`, `handle_photographer_application_decision` trigger)
- **Edge Function 배포:** `generate-thumbnails` (script size 11.36MB, magick.wasm 포함) 신규 + `get-upload-url` (script size 1.996MB, SIZE_LIMITS 50MB) 재배포 — 둘 다 ACTIVE 상태 확인
- **pgTAP 전수 통과:** Phase 4 테스트 5개 파일, 총 22개 test 로컬 `supabase db reset` + `supabase test db` 에서 green (images 1~7, videos 1~3, thumbnails 컬럼, apps 확장, approval trigger 승인/거절/재승인 10개 케이스)
- **승인 원자성 검증:** pgTAP 로 승인→photographers INSERT + users.is_photographer=TRUE + notifications(photographer_approved) INSERT 가 단일 트랜잭션으로 실행됨 확인. ADJ-01 준수 — `users.role` 변경 없음
- **expo-video 설치:** `app/package.json` 에 `expo-video ~3.0.16` 추가 + `app.json` plugins 등록 완료 (Wave 3 VideoPlayer 의존성)

## Task Commits

각 Task 가 원자적으로 커밋됨:

1. **Task 1: 029_photo_posts_videos.sql** — `835e877` (feat) — videos 컬럼 + images CHECK 1~7 변경
2. **Task 2: get-upload-url 50MB** — `397643c` (feat) — SIZE_LIMITS['photo-posts'] 50*1024*1024
3. **Task 3: 030_photographer_approval_trigger.sql** — `8440e05` (feat) — SECURITY DEFINER trigger + notifications.type CHECK 확장
4. **Task 4: 031_photographer_apps_extend.sql** — `a560cff` (feat) — team_id UUID REFERENCES teams + activity_links TEXT[] CHECK ≤3 + activity_plan
5. **Task 5: 032_photo_posts_thumbnails.sql + generate-thumbnails Edge** — `139170a` (feat) — thumbnail_urls 컬럼 + magick-wasm 번들
6. **Task 6: pgTAP 5종 + QA matrix + expo-video** — `973a721` (test) — 22 tests + docs/phase4-qa-matrix.md
7. **Task 7: 원격 배포 + pgTAP 검증** (사용자 CLI 진행)
   - Deploy: `supabase db push` → 4 migrations applied
   - Deploy: `supabase functions deploy generate-thumbnails get-upload-url` → 둘 다 ACTIVE
   - Verify: `supabase test db` → Phase 4 테스트 22/22 green
   - Fix: `7274a7f` (fix) — static_files 배열 문법 (CLI 2.84 호환)
   - Fix: `e7c1f1a` (fix) — plan(10) 수정 (실제 10 테스트 실행 일치)

## Files Created/Modified

**신규 생성 (14):**
- `supabase/migrations/029_photo_posts_videos.sql` — videos TEXT[] + images CHECK 1~7
- `supabase/migrations/030_photographer_approval_trigger.sql` — 승인/거절 트리거 + notifications.type CHECK 확장
- `supabase/migrations/031_photographer_apps_extend.sql` — photographer_applications 3개 컬럼 추가
- `supabase/migrations/032_photo_posts_thumbnails.sql` — thumbnail_urls 컬럼 추가
- `supabase/functions/generate-thumbnails/index.ts` — Edge Function 본문 (R2 ↔ magick-wasm 400x400 cover)
- `supabase/functions/generate-thumbnails/deno.json` — deno import map
- `supabase/functions/generate-thumbnails/magick.wasm` — 14MB wasm binary
- `supabase/tests/photographer-approval-trigger.sql` — pgTAP 10 케이스
- `supabase/tests/photo-posts-videos-check.sql` — pgTAP 3 케이스
- `supabase/tests/photo-posts-images-1-7-check.sql` — pgTAP 2 케이스
- `supabase/tests/photographer-apps-extend.sql` — pgTAP 5 케이스
- `supabase/tests/photo-posts-thumbnails.sql` — pgTAP 2 케이스
- `docs/phase4-qa-matrix.md` — Wave 3 manual QA 체크리스트
- `.planning/phases/04-photographer/deferred-items.md` — scope-out 기록

**수정 (4):**
- `supabase/functions/get-upload-url/index.ts` — SIZE_LIMITS photo-posts 50MB
- `supabase/config.toml` — `[functions.generate-thumbnails]` + verify_jwt=false + static_files 추가
- `app/package.json` — expo-video ~3.0.16 추가
- `app/app.json` — plugins 에 expo-video 등록

## Decisions Made

- **ADJ-01 (users.role 미변경):** 승인 시 `is_photographer=TRUE` 플래그로만 승격. role 변경은 RLS 정책이 광범위하게 재정의되므로 안전하지 않음. is_photographer 기반 RLS 정책으로 권한 분기.
- **ADJ-02 (video MIME whitelist):** video/mp4 + video/quicktime 만 허용. AVI/MKV 는 악성 페이로드 리스크 (T-4-06) 로 차단.
- **notifications.type CHECK 선제 확장:** 030 마이그레이션 헤더에 `DROP CONSTRAINT + ADD CONSTRAINT` 포함. 이 작업 없이 트리거가 notification INSERT 시 CHECK 위반으로 실패하는 의존성 문제를 미리 해결.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] notifications.type CHECK 미허용으로 트리거 실패 예정**
- **Found during:** Task 3 (030 마이그레이션 작성 중)
- **Issue:** 기존 `013_notifications.sql:9` 의 type CHECK 가 'like','comment','follow','announcement','system' 5개만 허용 → 트리거가 photographer_approved/rejected INSERT 시 CHECK 위반
- **Fix:** 030 마이그레이션 앞부분에 DROP CONSTRAINT + ADD CONSTRAINT (7개 허용) 포함
- **Files modified:** supabase/migrations/030_photographer_approval_trigger.sql
- **Verification:** pgTAP photographer-approval-trigger.sql Test 5/7 에서 알림 INSERT 카운트 검증
- **Committed in:** 8440e05

**2. [Rule 1 - Mechanical] Supabase CLI 2.84 static_files 문법 변경**
- **Found during:** Task 7 (`supabase link` 실행 중 config 파싱 에러)
- **Issue:** `[[functions.generate-thumbnails.static_files]] files = [...]` nested table 문법이 2.84 에서 string 배열 요구 → "expected type 'string', got unconvertible type 'map[string]interface {}'"
- **Fix:** `static_files = ["./functions/generate-thumbnails/magick.wasm"]` 단순 배열로 변경
- **Files modified:** supabase/config.toml
- **Verification:** `supabase link` + `supabase db push` + `supabase functions deploy` 모두 성공
- **Committed in:** 7274a7f

**3. [Rule 1 - Mechanical] pgTAP plan 선언 mismatch**
- **Found during:** Task 7 (로컬 `supabase test db` 실행 중)
- **Issue:** photographer-approval-trigger.sql 에 `SELECT plan(9)` 이지만 실제 10개 test 존재 → "planned 9 tests but ran 10" 실패
- **Fix:** `SELECT plan(10)` 으로 수정
- **Files modified:** supabase/tests/photographer-approval-trigger.sql
- **Verification:** `supabase test db` 에서 Phase 4 5 파일 × 22 tests 전수 ok
- **Committed in:** e7c1f1a

---

**Total deviations:** 3 auto-fixed (1 Rule 3 Blocking, 2 Rule 1 Mechanical)
**Impact on plan:** 모든 deviation 이 배포 정합성 확보에 필수. 스코프 추가 없음.

## Issues Encountered

- **로컬 pgTAP 초기 실행 실패:** `supabase test db` 가 로컬 DB 에 연결하지만 local 에 마이그레이션이 없어 컬럼 부재로 실패 → `supabase start` + `supabase db reset` 으로 모든 마이그레이션 로컬 적용 후 재실행 → green.
- **phase3-smoke.sql 레거시 warning:** Phase 3 smoke test 가 `SELECT plan(N)` 없이 NOTICE 기반 → pgTAP "No plan found" 출력. Phase 3 레거시 이슈이며 Phase 4 테스트 22개와 무관. Phase 4 블록 없음.

## User Setup Required

None - v1 단일 Supabase 프로젝트 (`jfynfapkbpkwyrjulsed`) 에 모든 변경 반영 완료. `SUPABASE_ACCESS_TOKEN` 는 CLI 세션에서 사용 후 영구 저장 필요 없음.

## Next Phase Readiness

**Wave 1 (04-02) 진입 준비 완료:**
- 서비스 레이어 (photographerApi, r2Upload) 와 타입 (photographer.ts, cheerleader.ts, photographerApplication.ts) 을 새로운 DB 스키마에 맞춰 확장 가능
- videos/thumbnail_urls 컬럼 존재 → mapPhotoPost 가 안전하게 매핑 가능
- photographer_applications 확장 컬럼 존재 → submitPhotographerApplication RPC 전달값 검증 가능

**Wave 2 (04-03) 영향:**
- PhotographerContext 의 fetchCheerleaders / fetchCollectionPosts / applicationStatus 쿼리가 Supabase 에서 실제 데이터 반환

**Wave 3 (04-04, 04-05) 영향:**
- generate-thumbnails Edge Function URL 이 활성 → UploadPostScreen 에서 업로드 완료 후 호출 가능
- expo-video 설치 완료 → VideoPlayer 컴포넌트 구현 시작 가능

---
*Phase: 04-photographer*
*Plan: 01*
*Completed: 2026-04-15*
