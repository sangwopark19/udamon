---
phase: 04-photographer
plan: 02
subsystem: app-services
tags: [typescript, supabase, r2, photographer, types, services, jest, tdd]

requires:
  - phase: 04-photographer
    plan: 01
    provides: photo_posts.videos/thumbnail_urls 컬럼, photographer_applications team_id/activity_links/activity_plan, generate-thumbnails Edge Function, get-upload-url 50MB
provides:
  - app/src/types/photographer.ts — PhotoPost.videos / thumbnail_urls / Photographer.grade 필드
  - app/src/types/cheerleader.ts — DB schema 기준 재정의 (name_ko/name_en/position/status/team_id)
  - app/src/types/photographerApplication.ts — 신규 PhotographerApplication 타입 + ApplicationStatus
  - app/src/utils/photographerGrade.ts — calculateGrade / gradeToBadge / GradeInfo (4-tier palette)
  - app/src/utils/__tests__/photographerGrade.test.ts — 14 tests green
  - app/src/services/photographerApi.ts — submitPhotographerApplication / fetchMyPhotographerApplication / fetchCheerleaders / fetchCollectionPosts 신규 + fetchPhotoPosts 페이지네이션 + createPhotoPost videos 파라미터 + 11종 Row 인터페이스로 any 제거
  - app/src/services/r2Upload.ts — uploadPostVideos(contentTypes: string[]) ADJ-02 시그니처
affects: [04-03, 04-04, 04-05]

tech-stack:
  added: []
  patterns:
    - "Row 인터페이스로 Supabase row 타입 안전 매핑 (PhotographerRow / PhotoPostRow / CheerleaderRow / ApplicationRow ...) — CLAUDE.md strict typing 준수"
    - "calculateGrade 유틸 분리 — mapPhotographer 와 GradeBadge 컴포넌트가 동일 로직 공유"
    - "fetchPhotoPosts({ teamSlug?, page?, pageSize? }) — communityApi 와 동일한 .range(from, to) 페이지네이션 패턴 mirror"
    - "uploadPostVideos asset-별 contentType 동적 수용 — get-upload-url 단일 contentType + count 가정에 맞춰 호출당 count=1 로 분리"

key-files:
  created:
    - app/src/types/photographerApplication.ts
    - app/src/utils/photographerGrade.ts
    - app/src/utils/__tests__/photographerGrade.test.ts
  modified:
    - app/src/types/photographer.ts
    - app/src/types/cheerleader.ts
    - app/src/services/photographerApi.ts
    - app/src/services/r2Upload.ts
    - app/jest.config.js

key-decisions:
  - "ADJ-jest-testMatch: jest.config.js testMatch 에 src/**/__tests__/**/*.test.{ts,tsx} 추가 — 기존은 src/__tests__/ 경로만 매칭. PLAN 의 artifacts 경로 (app/src/utils/__tests__/photographerGrade.test.ts) 를 인식하기 위한 Rule 3 (Blocking) 자동 수정"
  - "as unknown as PhotoPostRow cast 사용 — Supabase 의 .select() 가 조인된 row 타입을 정확히 추론하지 못하므로 mapping 직전에 unknown 경유 cast (deep object cast 표준 패턴)"
  - "uploadPostVideos: localUris 와 contentTypes 길이 mismatch 또는 unsupported mime 시 throw 가 아닌 ApiResult 에러 반환 — 기존 api 계약 (UploadResult shape) 유지"

requirements-completed: [PHOT-02, PHOT-05, PHOT-06, PHOT-07, PHOT-08]

duration: ~6m
completed: 2026-04-15
---

# Phase 04 Plan 02: Wave 1 — 서비스 레이어 + 타입 + 유틸 확장

**Wave 0 가 배포한 DB 스키마 / Edge Function 을 소비하는 **서비스 레이어 + 타입 + 유틸** 구축 완료. PhotographerContext (Plan 03) 와 화면 (Plan 04/05) 이 사용할 진입점이 모두 export 됨.**

## Performance

- **Duration:** 약 6분 (worktree 초기 reset + npm install 포함 8분, 코드 작성 자체 ~6분)
- **Started:** 2026-04-15T02:19:21Z
- **Completed:** 2026-04-15T02:24:59Z
- **Tasks:** 3
- **Files created:** 3
- **Files modified:** 5

## Accomplishments

- **타입 재정의 완료:** PhotoPost (videos/thumbnail_urls/cheerleader.name_ko), Photographer (grade), Cheerleader (DB schema 기반), PhotographerApplication (신규) — Wave 0 마이그레이션 029~032 결과를 그대로 클라이언트 타입으로 미러
- **photographerApi 대대적 확장:** 12개 함수 신규/수정 — submitPhotographerApplication, fetchMyPhotographerApplication, fetchCheerleaders, fetchCollectionPosts 신규 + fetchPhotoPosts (페이지네이션) + createPhotoPost (videos) 변경. 24개 export async function 중 어디에도 `any` 미사용
- **photographerGrade util 분리 + 14 tests green:** RED → GREEN TDD 사이클로 calculateGrade (음수/소수 방어 6 cases) + gradeToBadge (4-tier palette boundary 8 cases) 검증. Plan 04 의 GradeBadge 컴포넌트와 mapPhotographer 가 동일 로직 공유
- **uploadPostVideos ADJ-02 적용:** asset 별 contentType (mp4/quicktime) 을 string[] 로 받아 각 호출에서 검증. unsupported mime 또는 mismatch 길이 시 ApiResult 에러 반환
- **CLAUDE.md strict typing 준수:** photographerApi.ts 의 `(row: any)` 12곳 → Row 인터페이스 11종으로 교체. 모든 catch 가 `e: unknown` + `e instanceof Error` 내로잉 패턴

## Task Commits

각 Task 가 원자적으로 커밋됨:

1. **Task 1: 타입 재정의 + 신규 타입 파일** — `8902db0` (feat) — photographer.ts/cheerleader.ts/photographerApplication.ts (3개 파일, 35 lines added)
2. **Task 2-RED: photographerGrade 단위 테스트 14종** — `2c77298` (test) — RED phase + jest.config.js testMatch 확장 (Rule 3 auto-fix)
3. **Task 2-GREEN: photographerGrade 유틸 구현** — `d3cb153` (feat) — 14/14 tests green
4. **Task 3: photographerApi 확장 + r2Upload.uploadPostVideos** — `0641382` (feat) — 400 lines added / 88 lines removed

## Files Created/Modified

**신규 생성 (3):**
- `app/src/types/photographerApplication.ts` — ApplicationStatus + PhotographerApplication interface
- `app/src/utils/photographerGrade.ts` — calculateGrade + gradeToBadge + GradeInfo
- `app/src/utils/__tests__/photographerGrade.test.ts` — 14 jest tests

**수정 (5):**
- `app/src/types/photographer.ts` — PhotoPost.videos / thumbnail_urls / Photographer.grade / cheerleader.name_ko
- `app/src/types/cheerleader.ts` — DB schema 기반 전면 재정의 (name → name_ko, description 제거)
- `app/src/services/photographerApi.ts` — Row 인터페이스 11종 + 12 함수 신규/수정 + 모든 any 제거
- `app/src/services/r2Upload.ts` — uploadPostVideos(contentTypes: string[]) ADJ-02 시그니처
- `app/jest.config.js` — testMatch 에 src/**/__tests__/**/*.test.{ts,tsx} 추가

## Decisions Made

- **ADJ-jest-testMatch (Rule 3 auto-fix):** PLAN.md 의 artifacts 경로 (app/src/utils/__tests__/photographerGrade.test.ts) 를 jest 가 인식하지 못하는 blocking issue 발견. 기존 testMatch 는 src/__tests__/ 만 매칭 → src/**/__tests__/ 패턴 추가로 모듈 인접 테스트 폴더 모두 허용. 영향 범위: jest 만, runtime 무영향
- **as unknown as PhotoPostRow cast:** Supabase JS client 의 .select(`*, photographer:..., player:..., cheerleader:...`) 가 nested join 을 일관되게 추론하지 못해 (post: any[] 등 잘못된 추론 발생) deep-object cast 패턴 적용
- **uploadPostVideos asset 별 호출 분리:** get-upload-url Edge Function 이 호출당 단일 contentType + count 가정 (Wave 0 verify_jwt=false + 내부 재검증) 이므로 mp4+mov 혼합 시 호출당 count=1 로 분리. 성능보다 검증 일관성 우선

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] jest testMatch 가 src/utils/__tests__ 경로를 인식 못 함**
- **Found during:** Task 2 RED 단계 (테스트 실행 시도)
- **Issue:** 기존 jest.config.js 의 testMatch 가 `<rootDir>/src/__tests__/**/*.test.{ts,tsx}` 만 — PLAN 이 명시한 artifact 경로 `app/src/utils/__tests__/photographerGrade.test.ts` 를 매칭하지 못함
- **Fix:** testMatch 에 `<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}` 추가 (모듈 인접 폴더 패턴 허용)
- **Files modified:** app/jest.config.js
- **Verification:** `./node_modules/.bin/jest --testPathPattern=photographerGrade` 가 14/14 green
- **Committed in:** 2c77298

**2. [Rule 1 - Mechanical] Supabase nested join row 타입 추론 실패**
- **Found during:** Task 3 typecheck (`tsc --noEmit`)
- **Issue:** `supabase.from('photo_collection_posts').select(`post_id, post:photo_posts(...)`)` 의 결과가 `{ post_id: any; post: any[] }` 로 추론됨 — `post: PhotoPostRow | null` 로의 직접 cast 시 TS2352 (insufficient overlap)
- **Fix:** `(r as unknown as { post: PhotoPostRow | null }).post` 패턴으로 unknown 경유 cast
- **Files modified:** app/src/services/photographerApi.ts (fetchCollectionPosts)
- **Verification:** `tsc --noEmit` 에서 photographerApi.ts 자체 에러 0
- **Committed in:** 0641382

### Not Auto-fixed (Out of Scope, Plan 04 Resolves)

PLAN.md success_criteria 명시대로, 외부 사용처 (UploadPostScreen, PhotographerCard 등) 의 typecheck 오류 (cheerleader.name → name_ko, isRemote prop 제거, videos 파라미터 미전달) 는 본 Plan 검증 스코프 밖. Plan 04 (화면) 가 일괄 수정 예정.

---

**Total deviations:** 2 auto-fixed (1 Rule 3 Blocking, 1 Rule 1 Mechanical)
**Impact on plan:** 모든 deviation 이 코드 정합성 확보에 필수. 스코프 추가 없음.

## Issues Encountered

- **worktree 초기 상태 mismatch:** worktree 시작 시 working tree 가 base commit (Phase 02 종료 시점) 으로 거슬러 올라가 있어 `git reset --soft <expected_base>` 후 `git checkout HEAD -- .` 로 working tree 를 HEAD 의 5c1c8e4 상태에 동기화. 원격 브랜치 / 커밋 히스토리는 무영향
- **PATH 우선순위 jest 30 충돌:** `npx jest` 가 PATH 상위의 jest 30 (testPathPattern 옵션 명 변경) 을 먼저 호출. `./node_modules/.bin/jest` 직접 실행으로 우회 (worktree 에 npm install 필요)
- **app/node_modules 부재:** worktree 분리로 인해 app/node_modules 가 비어 있어 jest 실행 불가 → `npm install --no-audit --no-fund --prefer-offline` (5초, 1074 packages) 1회 실행

## User Setup Required

None - 본 Plan 은 코드 변경만 (DB / Edge Function 추가 배포 없음).

## Next Phase Readiness

**Wave 2 (Plan 03 — PhotographerContext) 진입 준비 완료:**

다음 진입점을 import 가능:

```ts
// 신규 함수
import {
  submitPhotographerApplication,
  fetchMyPhotographerApplication,
  fetchCheerleaders,
  fetchCollectionPosts,
  uploadPostVideos,                  // re-export
} from '../services/photographerApi';

// 변경된 시그니처
import { fetchPhotoPosts, createPhotoPost } from '../services/photographerApi';
//        ↑ params: { teamSlug?, page?, pageSize? }
//                                  ↑ params: { ..., videos: string[], cheerleaderId: string | null }

// 신규 타입
import type { PhotographerApplication, ApplicationStatus } from '../types/photographerApplication';
import type { Cheerleader } from '../types/cheerleader';   // 재정의됨

// 신규 유틸 (mapPhotographer 가 이미 사용 중)
import { calculateGrade, gradeToBadge, GradeInfo } from '../utils/photographerGrade';
```

**Plan 03 가 처리해야 할 항목:**
- PhotographerContext 의 mock 의존 → fetchCheerleaders, fetchPhotoPosts 호출로 교체
- applicationStatus state — fetchMyPhotographerApplication 폴링 또는 화면 진입 시 호출
- collectionPosts state — fetchCollectionPosts 사용
- pagination state (page, hasMore) — fetchPhotoPosts({ page, pageSize: 20 }) 활용

**Wave 3 (Plan 04/05) 영향:**
- GradeBadge 컴포넌트 → `gradeToBadge(photographer.grade)` 로 tier/iconColor/iconName 결정
- UploadPostScreen → `createPhotoPost({ ..., videos, cheerleaderId })` + `uploadPostVideos(userId, uris, token, contentTypes)` 호출 가능
- 외부 사용처 typecheck 오류 (cheerleader.name → name_ko 등) Plan 04 일괄 수정

## Self-Check: PASSED

**Created files exist:**
- FOUND: app/src/types/photographerApplication.ts
- FOUND: app/src/utils/photographerGrade.ts
- FOUND: app/src/utils/__tests__/photographerGrade.test.ts

**Commits exist:**
- FOUND: 8902db0 (Task 1)
- FOUND: 2c77298 (Task 2 RED)
- FOUND: d3cb153 (Task 2 GREEN)
- FOUND: 0641382 (Task 3)

**Verification metrics:**
- `tsc --noEmit` Plan 02 target files 자체 에러: 0
- `jest --testPathPattern=photographerGrade`: 14 passed, 14 total
- `grep -c "e: any" photographerApi.ts`: 0
- `grep -c "export async function" photographerApi.ts`: 24
- `grep -q "calculateGrade" photographerApi.ts`: OK
- `grep -q "contentTypes: string\[\]" r2Upload.ts`: OK

---
*Phase: 04-photographer*
*Plan: 02*
*Completed: 2026-04-15*
