---
phase: 04-photographer
plan: 06
subsystem: testing
tags: [react-native, useEffect, cancelled-guard, supabase, postgres, partial-unique-index, pgtap]
gap_closure: true

requires:
  - phase: 04-photographer
    provides: Plans 01~05 (all photographer feature code, DB schema 029~032)
provides:
  - StudioScreen useEffect cancelled/cleanup guard — unmount 후 setState 방지
  - MainTabNavigator user.is_photographer synchronous bootstrap — first-frame flicker 제거
  - photographer_applications (user_id) WHERE status='pending' 부분 UNIQUE INDEX — 서버 레벨 중복 pending 신청 차단
affects: [05-admin]

tech-stack:
  added: []
  patterns:
    - "React useEffect 에서 async 체인의 setState 는 항상 cancelled flag + cleanup 쌍으로 가드"
    - "Navigation tab label/icon 같은 visual state 는 가능하면 AuthContext 의 synchronous flag 로 bootstrap 후 async 로 override"
    - "행 상태 (status) 를 partial index WHERE 절로 강제 → 애플리케이션 레벨 검증 누락 시 DB 가 최후 방어선"

key-files:
  created:
    - supabase/migrations/033_photographer_apps_unique_pending.sql
    - supabase/tests/photographer-apps-unique-pending.sql
  modified:
    - app/src/screens/photographer/StudioScreen.tsx
    - app/src/navigation/MainTabNavigator.tsx

key-decisions:
  - "HI-02 fix: user.is_photographer 는 AuthContext.fetchUserProfile 에서 public.users row 로 이미 동기 로드됨 → useState lazy initializer 에서 바로 활용 가능 (추가 fetch 불필요)"
  - "HI-03 fix: 기존 일반 UNIQUE 대신 partial index (WHERE status='pending') 선택 — 거절된 사용자의 재신청 (status='pending' 새 row) 허용, 현재 pending 만 1인당 1건 보장"
  - "기존 중복 pending 데이터 pre-check 필요 — 본 plan 은 push 성공 확인 후에만 진행 (실제 push 시 중복 0건 확인됨)"

patterns-established:
  - "cancelled guard: let cancelled = false → 각 await 뒤 if (cancelled) return → cleanup: () => { cancelled = true }"
  - "Navigation synchronous bootstrap: user.is_photographer 로 초기 탭 label/icon 결정 → fetch 결과로 pending/rejected 분기 override"

requirements-completed: [PHOT-02]

duration: ~15min
completed: 2026-04-15
---

# Phase 04 Plan 06: Gap Closure — HI-01/02/03 해소

**StudioScreen unmount guard + MainTabNavigator flicker 제거 + photographer_applications 중복 pending 서버 차단 (원격 Supabase 배포 완료 + pgTAP 25 tests green)**

## Performance

- **Duration:** 약 15분 (worktree 생성 → 원격 배포 → pgTAP 검증)
- **Started:** 2026-04-15T03:37:00Z
- **Completed:** 2026-04-15T03:52:00Z
- **Tasks:** 3
- **Files created/modified:** 4

## Accomplishments

- **HI-01 MITIGATED:** StudioScreen.loadState 의 async 체인에 `cancelled` flag + cleanup 추가. 6개 setState 지점에 guard 배치. RN dev warning 및 메모리 leak 차단. 기존 6개 jest tests green.
- **HI-02 MITIGATED:** MainTabNavigator 가 `user?.is_photographer` 를 `useState` lazy initializer 로 사용 → Studio 탭 첫 프레임부터 올바른 label/icon 렌더. 네트워크 fetch 실패 시 synchronous flag 가 true 면 downgrade 차단.
- **HI-03 MITIGATED:** 033 migration 이 원격 프로덕션 (`jfynfapkbpkwyrjulsed`) 에 성공 적용. 기존 중복 pending 0건 확인 (push 시 unique violation 없음). pgTAP 3개 테스트 green — has_index / lives_ok 정상 INSERT / throws_ok(23505) 중복 INSERT 차단.

## Task Commits

1. **Task 1: HI-01 StudioScreen cancelled guard** — `f45a447` (fix)
2. **Task 2: HI-02 MainTabNavigator is_photographer bootstrap** — `449c3dd` (fix)
3. **Task 3a: HI-03 migration + pgTAP 파일 작성** — `ef60a8b` (fix)
   - Remote deploy: `supabase db push` → `Applying migration 033_photographer_apps_unique_pending.sql` 성공
   - pgTAP 검증: `supabase db reset` + `supabase test db` → 7 파일 25 tests green (신규 파일 포함)

## Files Created/Modified

**신규 생성:**
- `supabase/migrations/033_photographer_apps_unique_pending.sql` — partial unique index
- `supabase/tests/photographer-apps-unique-pending.sql` — pgTAP plan(3): has_index + lives_ok + throws_ok(23505)

**수정:**
- `app/src/screens/photographer/StudioScreen.tsx` — useEffect cancelled guard (~10 line 추가)
- `app/src/navigation/MainTabNavigator.tsx` — useState lazy initializer + fetch catch branch

## Decisions Made

- **HI-02 접근 — user.is_photographer synchronous bootstrap:** AuthContext 가 이미 login 시 `public.users` row 의 is_photographer 를 로드하므로, Navigation 은 이를 useState 초기값으로 쓰면 추가 fetch 없이 first-frame 부터 올바른 렌더. async fetchMyPhotographerApplication 은 application row 상태 (pending/rejected) 분기용으로만 사용.
- **HI-03 접근 — partial unique index:** WHERE status='pending' 조건으로 거절된 신청 행을 보존 (재신청 가능) + 현재 pending 1인당 1건 강제. 일반 UNIQUE(user_id) 는 재신청 UX 를 깨뜨림.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- 로컬 pgTAP 실행 시 `phase3-smoke.sql` 이 "No plan found" 경고 (Phase 3 legacy — `SELECT plan(N)` 없이 NOTICE 기반). Phase 4 tests 에 영향 없음, v1 전체 suite 는 exit 1 이지만 신규 `photographer-apps-unique-pending.sql` 및 기존 Phase 4 5개 파일은 모두 ok.

## User Setup Required

None - 033 migration 이 원격에 이미 적용됨. 추가 action 불필요.

## Next Phase Readiness

- Phase 4 의 모든 advisory High (HI-01/02/03) 해소 완료
- 남은 Warning/Info (WR-03 renameCollection, IN-07 as any) 는 Phase 5 (admin) 이관 기재 유지
- 실기기 QA matrix (HUMAN-UAT.md A~I) 은 여전히 pending — `/gsd-verify-work 4` 로 결과 반영 가능

---
*Phase: 04-photographer*
*Plan: 06 (gap closure)*
*Completed: 2026-04-15*
