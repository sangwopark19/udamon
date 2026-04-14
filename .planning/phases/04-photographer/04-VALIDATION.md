---
phase: 4
slug: photographer
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

Derived from `04-RESEARCH.md §Validation Architecture`. Planner MUST bind each task ID in `PLAN.md` to one row below (column "Task ID") before `/gsd-execute-phase`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (mobile app)** | Jest 29.7 + jest-expo 55.0.13 + ts-jest 29.4.9 (`app/package.json:42-46`) |
| **Framework (DB triggers)** | pgTAP — `supabase test db` (Supabase 기본 포함) |
| **Framework (Edge Function)** | `supabase functions serve` 로컬 + `curl`/fetch 통합 테스트 |
| **Config file (mobile)** | jest-expo preset (`app/jest.config.js` — Phase 3 `npm test:auth` 검증 완료) |
| **Config file (DB)** | `supabase/tests/*.sql` (알파벳 순 실행) |
| **Quick run command (unit)** | `cd app && npm test -- --testPathPattern=photographerGrade` |
| **Quick run command (typecheck)** | `cd app && npx tsc --noEmit` |
| **Quick run command (DB)** | `supabase test db --file photographer-approval-trigger.sql` |
| **Full suite command (mobile)** | `cd app && npm test` |
| **Full suite command (DB)** | `supabase test db` |
| **Edge Function local test** | `supabase functions serve generate-thumbnails` + `curl` POST 샘플 PNG |
| **Estimated runtime (mobile full)** | ~60초 (Phase 3 기준) |
| **Estimated runtime (DB full)** | ~5초 (pgTAP) |

---

## Sampling Rate

- **After every task commit:** `npm test -- --testPathPattern=<related>` + `npx tsc --noEmit`
- **After Wave 0 merge:** `supabase test db` + Edge Function 로컬 샘플 검증 + `cd app && npm test`
- **After Wave 1/2/3 merge:** `cd app && npm test` (full) + manual QA matrix 진행 체크
- **Before `/gsd-verify-work`:** 풀 스위트 green + manual QA matrix 100% 통과
- **Max feedback latency:** < 90초 (mobile full + pgTAP)

---

## Per-Task Verification Map

> Task IDs (`04-XX-YY`) are filled by the planner during plan creation. Each row below is a required test anchor; planner MUST route the corresponding task to this row.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 029 videos alter | 0 | PHOT-03 | V5 validation | videos CHECK 1~3, images CHECK 1~7 | unit (pgTAP) | `supabase test db --file photo-posts-videos-check.sql` | ❌ W0 | ⬜ pending |
| TBD | 030 approval trigger | 0 | PHOT-02 | V11 business logic | pending→approved 시 photographers/notifications/is_photographer atomic | unit (pgTAP) | `supabase test db --file photographer-approval-trigger.sql` | ❌ W0 | ⬜ pending |
| TBD | 030 approval trigger | 0 | PHOT-02 | V11 business logic | rejected 시 photographer 미생성 + notification 생성 | unit (pgTAP) | 동일 파일, test 6/7 | ❌ W0 | ⬜ pending |
| TBD | 030 approval trigger | 0 | PHOT-02 | V11 business logic | 재신청→재승인 시 ON CONFLICT DO NOTHING | unit (pgTAP) | 동일 파일, test 8 | ❌ W0 | ⬜ pending |
| TBD | 031 apps extend | 0 | PHOT-02 | V5 validation | team_id/activity_links/activity_plan 컬럼 NOT NULL 또는 NULL 허용 검증 | unit (pgTAP) | `supabase test db --file photographer-apps-extend.sql` | ❌ W0 | ⬜ pending |
| TBD | 032 thumbnails alter | 0 | PHOT-05 | V8 data | thumbnail_urls TEXT[] DEFAULT '{}' + NOT NULL | unit (pgTAP) | `supabase test db --file photo-posts-thumbnails.sql` | ❌ W0 | ⬜ pending |
| TBD | generate-thumbnails EF | 0 | PHOT-05 | V12 file / V13 API | 400×400 cover-crop JPEG 생성, R2 put + DB UPDATE | manual | `supabase functions serve` + `curl` POST + ImageMagick 출력 dimensions 검증 | manual W0 | ⬜ pending |
| TBD | get-upload-url 수정 | 0 | PHOT-03 | V5 / V12 | video/mp4 + video/quicktime 허용, SIZE_LIMITS 영상=50MB | manual | `curl` POST staging EF, mp4/quicktime/size별 4개 케이스 | manual W0 | ⬜ pending |
| TBD | submitPhotographerApplication | 1 | PHOT-02 | V5 | status='pending' DEFAULT INSERT 성공 | integration | jest test (Supabase client mock) | ❌ W1 | ⬜ pending |
| TBD | fetchMyPhotographerApplication | 1 | PHOT-02 | V4 access | RLS로 본인 신청만 반환 | integration | jest test + staging 실측 | ❌ W1 | ⬜ pending |
| TBD | fetchCheerleaders | 1 | PHOT-07 | V5 | DB row → Cheerleader 타입(name_ko/name_en/position/image_url) 매핑 정확 | unit | jest test `mapCheerleader` | ❌ W1 | ⬜ pending |
| TBD | photographerGrade util | 1 | PHOT-06 | — | `calculateGrade(post, follower)` 공식 + edge(0, 음수) | unit | `npm test -- photographerGrade` | ❌ W1 | ⬜ pending |
| TBD | photographerGrade util | 1 | PHOT-06 | — | `gradeToBadge(grade)` 임계값 매핑 (0/5/20/50) | unit | 동일 | ❌ W1 | ⬜ pending |
| TBD | photographerApi 페이지네이션 | 1 | PHOT-01 | — | `fetchPhotoPosts({ teamId?, page? })` `.range(from, to)` 20개 반환 | unit | jest test (Supabase mock) | ❌ W1 | ⬜ pending |
| TBD | PhotographerContext 전환 | 2 | PHOT-01 | — | mockPhotographers/mockCheerleaders import 0건 | unit (typecheck + grep) | `npx tsc --noEmit` + `! git grep -l "mockPhotographers\\|mockCheerleaders" app/src/` | ❌ W2 | ⬜ pending |
| TBD | PhotographerContext 전환 | 2 | PHOT-01 | — | Provider mount 시 mock 없이 loading=true → fetch 결과 반영 | integration | jest test @testing-library/react-native | ❌ W2 | ⬜ pending |
| TBD | togglePhotoLike/toggleFollow 버그 | 2 | PHOT-08 | V4 access | userId 빈 문자열 방지 + useLoginGate 통과 | unit + snapshot | jest test (Context + gate mock) | ❌ W2 | ⬜ pending |
| TBD | collection await 전환 | 2 | PHOT-08 | — | createCollection/addPostToCollection await 후 state 업데이트 (optimistic 제거) | unit | jest test (Supabase mock) | ❌ W2 | ⬜ pending |
| TBD | UploadPostScreen 영상 흐름 | 3 | PHOT-03 | V5 / V12 | handleAddVideo helper — duration>30s / fileSize>50MB / mimeType 미허용 → Alert | unit | jest test helper 순수 함수 | ❌ W3 | ⬜ pending |
| TBD | UploadPostScreen 영상 흐름 | 3 | PHOT-03 | V12 | doPublish 순서 이미지→영상→INSERT, 실패 시 Alert + 폼 retain | manual | EAS dev 실기기 매트릭스 | manual W3 | ⬜ pending |
| TBD | VideoPlayer 컴포넌트 | 3 | PHOT-04 | — | useVideoPlayer + VideoView — feed muted 자동재생, detail 수동재생 | manual | iOS+Android QA matrix | manual W3 | ⬜ pending |
| TBD | VideoPlayer 컴포넌트 | 3 | PHOT-04 | — | FlatList viewport-aware play/pause | manual | 스크롤 QA (iOS+Android) | manual W3 | ⬜ pending |
| TBD | StudioScreen state machine | 3 | PHOT-02 | V4 access | null/pending/approved/rejected 4분기 렌더 + 거절 사유 표시 | snapshot | jest @testing-library/react-native | ❌ W3 | ⬜ pending |
| TBD | PhotographerRegisterScreen Step 4 | 3 | PHOT-02 | V5 | submitPhotographerApplication 호출 후 "심사 대기" 화면 + navigation.reset | manual / snapshot | jest snapshot + 실기기 QA | ❌ W3 / manual | ⬜ pending |
| TBD | GradeBadge 컴포넌트 | 3 | PHOT-06 | — | variant/size별 렌더 (bronze/silver/gold/diamond × sm/md/lg), UI-SPEC 매핑 | snapshot | jest @testing-library/react-native | ❌ W3 | ⬜ pending |
| TBD | PhotoPostCard thumbnail fallback | 3 | PHOT-05 | — | thumbnail_urls 비었을 때 images[0] 노출 | snapshot | jest | ❌ W3 | ⬜ pending |
| TBD | Cheerleader selector UI | 3 | PHOT-07 | — | 팀별 cheerleaders fetch → 치어리더 태그 입력 후 post row cheerleader_id 세팅 | manual | 실기기 QA matrix (SSG → 박기량) | manual W3 | ⬜ pending |
| TBD | CollectionDetailScreen 전환 | 3 | PHOT-08 | V4 access | 컬렉션 posts fetch (photo_collection_posts JOIN) | manual | 실기기 QA matrix | manual W3 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

신규 작성 필요:

- [ ] `supabase/tests/photographer-approval-trigger.sql` — 승인/거절/재신청 8개 케이스 (pgTAP Pattern 6)
- [ ] `supabase/tests/photo-posts-videos-check.sql` — videos CHECK 제약 (1~3, NULL 허용) 검증
- [ ] `supabase/tests/photo-posts-images-1-7-check.sql` — images CHECK 변경 (1~7) 검증, 8장 INSERT 실패
- [ ] `supabase/tests/photographer-apps-extend.sql` — team_id/activity_links/activity_plan 컬럼 존재 + 타입 검증
- [ ] `supabase/tests/photo-posts-thumbnails.sql` — thumbnail_urls TEXT[] NOT NULL DEFAULT '{}' 검증
- [ ] `app/src/utils/__tests__/photographerGrade.test.ts` — calculateGrade + gradeToBadge unit
- [ ] `supabase/functions/generate-thumbnails/__tests__/sample/` — 가로 800×600, 세로 600×800, 정사각 1000×1000 샘플 (Wave 0 수동 비교용)
- [ ] `docs/phase4-qa-matrix.md` — Wave 3 실기기 QA 매트릭스 (영상 업로드 iOS/Android, VideoPlayer feed/detail, Studio state machine, GradeBadge variants, Cheerleader selector, CollectionDetail)

기존 활용:

- jest-expo preset (Phase 3 `npm test:auth` 검증됨)
- pgTAP (Supabase 기본 포함, `supabase test db` 명령 사용 가능)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| iOS/Android 영상 업로드 E2E (30초 내, 50MB 내, mp4 또는 mov) | PHOT-03 | expo-image-picker 실제 asset 메타 + R2 presigned PUT 통합은 jest mock 범위 초과 | EAS dev 빌드 → 갤러리에서 25초 영상 1개 선택 → 업로드 → 피드에서 재생 확인 |
| VideoPlayer viewport-aware 자동재생 | PHOT-04 | expo-video 네이티브 브리지 jest mock 한계 | FlatList 스크롤 시 화면 밖 아이템 pause 확인 (iOS + Android) |
| generate-thumbnails Edge Function 400×400 JPEG 출력 정확성 | PHOT-05 | magick-wasm WASM 런타임은 jest 비호환 | `supabase functions serve` + 샘플 3종 POST → 반환 URL 이미지 dimensions/파일크기 검증 |
| 어드민 승인 → 클라이언트 반영 (세션 refresh) | PHOT-02 | Supabase Auth session refresh 타이밍 | 스테이징 DB에서 applications.status='approved' 수동 UPDATE → 클라이언트 로그아웃→로그인 후 Studio 진입 가능 확인 |
| Cheerleader selector (팀 변경 시 목록 전환) | PHOT-07 | 여러 팀 계정 + 네트워크 왕복 | SSG → 두산으로 my_team_id 전환 후 selector 리로드 확인 |
| Collection detail posts fetch | PHOT-08 | 대량 post join은 staging DB 필요 | 스테이징 컬렉션에 5개 post 추가 → CollectionDetailScreen 진입 후 5개 렌더 |

---

## Validation Sign-Off

- [ ] 모든 task에 `<automated>` verify 또는 Wave 0 의존이 명시됨 (planner가 task ID 바인딩 시 확인)
- [ ] Sampling continuity: 3 연속 task가 자동 verify 없는 구간이 없음 (Wave 3 manual QA 집중 구간 제외)
- [ ] Wave 0이 모든 ❌ W0 / manual W0 항목을 커버
- [ ] Watch mode flag 없음 (`npm test -- --watch` 금지)
- [ ] Feedback latency < 90초 (mobile full)
- [ ] `nyquist_compliant: true` frontmatter 설정 — Wave 0 종료 후

**Approval:** pending
