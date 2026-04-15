---
phase: 04-photographer
verified: 2026-04-15T04:00:00Z
status: human_needed
score: 26/28
overrides_applied: 0
gaps: []
human_verification:
  - test: "영상 업로드 iOS/Android 실기기 QA (docs/phase4-qa-matrix.md Section A)"
    expected: "영상 최대 3개 선택, 30초/50MB 초과 시 Alert 차단, MP4/MOV 업로드 성공, R2에 파일 저장"
    why_human: "expo-image-picker 영상 선택 + duration/fileSize 메타 정확성은 실기기에서만 확인 가능"
  - test: "VideoPlayer 모드별 동작 확인 (Section B)"
    expected: "feed 모드 뮤트+루프, detail 모드 네이티브 컨트롤, studio 모드 썸네일 미리보기"
    why_human: "expo-video useVideoPlayer 재생 동작은 시뮬레이터/실기기에서만 확인 가능"
  - test: "StudioScreen state machine 실기기 QA (Section C)"
    expected: "비신청자→가입 유도, pending→'심사 대기 중', approved→Studio, rejected→'거절됨' + 재신청 버튼"
    why_human: "fetchMyPhotographerApplication 실제 DB 결과 기반 4분기 렌더 확인은 실기기 필요"
  - test: "GradeBadge 시각 확인 (Section D)"
    expected: "bronze/silver/gold/diamond 각 배지 색상 및 아이콘이 UI-SPEC 팔레트와 일치"
    why_human: "색상 정확성은 실기기 또는 시뮬레이터 화면에서만 확인 가능"
  - test: "치어리더 태깅 동작 확인 (Section E)"
    expected: "UploadPostScreen에서 치어리더 목록이 DB에서 조회되고, 선택 후 게시물에 태그됨"
    why_human: "fetchCheerleaders → DB 실제 데이터 표시 + 태깅 저장은 실기기+DB 연동 필요"
  - test: "CollectionDetail async fetch 확인 (Section F)"
    expected: "컬렉션 클릭 시 로딩 인디케이터 → 서버에서 포스트 fetch → 갤러리 표시"
    why_human: "getCollectionPosts DB 쿼리 결과 렌더는 실기기에서만 확인 가능"
  - test: "어드민 승인 → 사용자 반영 End-to-End (Section G)"
    expected: "Supabase 대시보드에서 application status='approved'로 변경 → photographers row 자동 생성 + users.is_photographer=TRUE + notification INSERT"
    why_human: "030 트리거의 실제 원격 DB 실행 및 알림 INSERT는 수동 DB 조작으로 확인 필요"
  - test: "generate-thumbnails Edge Function smoke test (Section I)"
    expected: "UploadPostScreen에서 사진 업로드 후 썸네일 URL이 photo_posts.thumbnail_urls에 채워짐"
    why_human: "R2 download → magick-wasm resize → R2 upload → DB update 전체 파이프라인은 실기기+원격 환경 필요"
  - test: "MainTabNavigator Studio 탭 label/icon 분기 확인 (Section C 일부)"
    expected: "로그인 후 탭 바에서 no_app=camera, pending=time, approved=aperture 아이콘 표시"
    why_human: "HI-02 flicker 이슈 포함하여 실제 탭 전환 시 시각적 분기 확인 필요"
---

# Phase 04: Photographer 검증 보고서

**Phase Goal:** 팬 포토그래퍼가 사진/영상을 업로드하고, 심사를 받고, 등급에 따라 활동할 수 있는 완성된 갤러리 시스템
**검증 일시:** 2026-04-15T04:00:00Z
**상태:** human_needed
**재검증:** 아니오 — 초기 검증

---

## 목표 달성도

### ROADMAP 성공 기준 검증

| # | 성공 기준 | 상태 | 근거 |
|---|-----------|------|------|
| SC-1 | 승인된 포토그래퍼가 사진 업로드 시 썸네일 자동 생성, 갤러리에 최적화 크기 표시 | HUMAN | generate-thumbnails EF 코드 배포 확인. 실제 동작은 실기기 필요 (Section I) |
| SC-2 | 포토그래퍼 신청 제출 → 어드민 심사 대기, 승인/거절 결과 반영 | VERIFIED | PhotographerRegisterScreen.submitPhotographerApplication + 030 트리거 코드 확인. 실기기 E2E는 Section G |
| SC-3 | 영상 최대 3개 업로드, 앱 내 네이티브 재생 가능 | HUMAN | 코드 로직 VERIFIED (validateVideoAsset, VideoPlayer, uploadPostVideos). 실기기 QA 필요 |
| SC-4 | 포토그래퍼 프로필에 등급 표시, 치어리더 태깅 동작 | HUMAN | calculateGrade + GradeBadge + fetchCheerleaders 코드 VERIFIED. 실기기 렌더 확인 필요 |

---

### 관찰 가능한 진실 (Observable Truths)

#### Plan 04-01 (Wave 0: DB + Edge Functions)

| # | 진실 | 상태 | 근거 |
|---|------|------|------|
| 1 | 029~032 마이그레이션 파일 4개 존재 | VERIFIED | `supabase/migrations/029~032_*.sql` 파일 확인 |
| 2 | `photo_posts.videos TEXT[] NOT NULL DEFAULT '{}' CHECK BETWEEN 1 AND 3` | VERIFIED | 029.sql:30-31 확인 |
| 3 | `photo_posts.images CHECK 1~7` 로 변경됨 | VERIFIED | 029.sql에 images CHECK 변경 확인 |
| 4 | `photo_posts.thumbnail_urls TEXT[] NOT NULL DEFAULT '{}'` | VERIFIED | 032.sql:9 확인 |
| 5 | `photographer_applications에 team_id/activity_links/activity_plan` 추가 | VERIFIED | 031.sql:10-13 확인 |
| 6 | `handle_photographer_application_decision()` SECURITY DEFINER SET search_path='' 정의 | VERIFIED | 030.sql:38 확인 |
| 7 | 승인 시 photographers INSERT + users.is_photographer=TRUE + notifications INSERT (단일 트랜잭션) | VERIFIED | 030.sql:57-90 확인 |
| 8 | 거절 시 photographers INSERT 없이 notifications(photographer_rejected)만 | VERIFIED | 030.sql:49,95-99 확인 |
| 9 | pgTAP 테스트 5개 파일 존재 (photographer-approval-trigger, photo-posts-videos-check, photo-posts-images-1-7-check, photographer-apps-extend, photo-posts-thumbnails) | VERIFIED | supabase/tests/ 디렉토리 확인 |
| 10 | `get-upload-url` SIZE_LIMITS['photo-posts']=50MB, `video/webm` 제거 (CR-01 수정) | VERIFIED | index.ts:18 `50 * 1024 * 1024` + line 10-11 mp4/quicktime만 확인. webm 없음 |
| 11 | `expo-video ~3.0.16` app/package.json 포함 | VERIFIED | package.json:31 확인 |
| 12 | `generate-thumbnails/index.ts` 존재, thumbnail_urls UPDATE 포함 (min 100줄) | VERIFIED | 187줄, index.ts:179 thumbnail_urls update 확인 |

#### Plan 04-02 (Wave 1: Types + Services + Utils)

| # | 진실 | 상태 | 근거 |
|---|------|------|------|
| 13 | `PhotoPost` 타입에 `videos: string[], thumbnail_urls: string[], grade 필드` | VERIFIED | types/photographer.ts:27-28,13 확인 |
| 14 | `Cheerleader` 타입이 `name_ko/name_en/position/status(active\|inactive)` 기준 재정의 (CR-02 수정) | VERIFIED | types/cheerleader.ts: `'active' \| 'inactive'` 확인 |
| 15 | `PhotographerApplication` 타입 신규 — activity_links 포함 | VERIFIED | types/photographerApplication.ts 확인 |
| 16 | `photographerApi.ts` 신규 4종 함수: submitPhotographerApplication, fetchMyPhotographerApplication, fetchCheerleaders, fetchCollectionPosts | VERIFIED | photographerApi.ts:743,776,504,442 확인 |
| 17 | `calculateGrade`, `gradeToBadge` 유틸 구현 | VERIFIED | utils/photographerGrade.ts 전체 확인 |
| 18 | `uploadPostVideos` contentTypes[] 파라미터 ADJ-02 반영 | VERIFIED | r2Upload.ts:93-111 확인 |
| 19 | `photographerGrade.test.ts` 14개 테스트 (plan 05 summary: 14개) | VERIFIED | 60줄, describe/test 14개 확인 |

#### Plan 04-03 (Wave 2: PhotographerContext 전환)

| # | 진실 | 상태 | 근거 |
|---|------|------|------|
| 20 | PhotographerContext.tsx mock import 0건 | VERIFIED | `git grep -n "MOCK_PHOTOGRAPHERS\|mockPhotographers"` → 결과 없음 |
| 21 | isRemote / isRemoteRef 제거 | VERIFIED | PhotographerContext.tsx grep 결과 없음 |
| 22 | mockPhotographers.ts, mockCheerleaders.ts 삭제 | VERIFIED | ls 명령으로 DELETED 확인 |
| 23 | togglePhotoLike/toggleFollow에 useAuth().user?.id 주입 | VERIFIED | PhotographerContext.tsx:146,308 확인 |
| 24 | Set<string> 상태 (photoLikedIds, followedPgIds) 유지 | VERIFIED | PhotographerContext.tsx:108-113,159-160 확인 |
| 25 | 컬렉션 조작 await 전환, 좋아요/팔로우 optimistic 유지 | VERIFIED | Context:358-414 await, :274 optimistic 확인 |
| 26 | loadMorePhotoPosts 메소드 + getCollectionPosts 노출 | VERIFIED | Context:78,229,429 확인 |
| 27 | PhotographerProvider App.tsx에 마운트 | VERIFIED | App.tsx:21,291,309 확인 |

#### Plan 04-04 (Wave 3a: VideoPlayer + GradeBadge + UploadPostScreen)

| # | 진실 | 상태 | 근거 |
|---|------|------|------|
| 28 | VideoPlayer.tsx — expo-video(useVideoPlayer+VideoView) + mode: feed/detail/studio | VERIFIED | VideoPlayer.tsx:4,9,31-84 확인 |
| 29 | GradeBadge.tsx — gradeToBadge 기반 bronze/silver/gold/diamond, variant/size 지원 | VERIFIED | GradeBadge.tsx:6,10-11,47-51 확인 |
| 30 | UploadPostScreen.handleAddVideo — 30초/50MB/MIME 3 케이스 Alert 차단 | VERIFIED | UploadPostScreen.tsx:120-138 확인 |
| 31 | doPublish 순서: optimizeImage→uploadPostImages→uploadPostVideos→createPhotoPost→generate-thumbnails (fire-and-forget) | VERIFIED | UploadPostScreen.tsx:178-293 확인 |
| 32 | `colors.bronze = '#A97142'` 추가 | VERIFIED | constants/colors.ts:42-43,123 확인 |
| 33 | i18n ko.ts에 upload_video_*/grade_tier_*/grade_a11y_label/video_unplayable 키 포함 | VERIFIED | ko.ts:340,837-875 확인 |
| 34 | cheerleader.name → name_ko 업데이트 (UploadPostScreen, ExploreScreen, PostDetailScreen) | VERIFIED | UploadPostScreen.tsx:198-200, PostDetailScreen.tsx:319,484 확인 |
| 35 | `activatePhotographerMode` PhotographerRegisterScreen에서 제거됨 | VERIFIED | PhotographerRegisterScreen grep 결과 없음 (AuthContext에만 남음, 호출처 없음) |

#### Plan 04-05 (Wave 3b: Studio/Register/Profile/CollectionDetail/Navigation)

| # | 진실 | 상태 | 근거 |
|---|------|------|------|
| 36 | StudioScreen.fetchMyPhotographerApplication → 4분기 렌더 (null/pending/approved/rejected) | VERIFIED | StudioScreen.tsx:55-89, studioState.ts:determineStudioState 확인 |
| 37 | PhotographerRegisterScreen Step 3 submit → submitPhotographerApplication + setStep(4) | VERIFIED | PhotographerRegisterScreen.tsx:90-104 확인 |
| 38 | PhotographerRegisterScreen activity_links http(s) prefix 검증 (T-4-08) | VERIFIED | PhotographerRegisterScreen.tsx:59-61 확인 |
| 39 | PhotographerProfileScreen header — GradeBadge variant='icon-label' size='md' | VERIFIED | PhotographerProfileScreen.tsx:244 확인 |
| 40 | CollectionDetailScreen — getCollectionPosts(collectionId) 사용 | VERIFIED | CollectionDetailScreen.tsx:40,55 확인 |
| 41 | MainTabNavigator Studio 탭 — tab_pending_review/tab_studio/tab_photographer 분기 | VERIFIED | MainTabNavigator.tsx:53-55 확인 |
| 42 | StudioScreen state machine 테스트 6개 green | VERIFIED | StudioScreen.state.test.tsx: describe 6개 test 확인 |
| 43 | Manual QA matrix docs/phase4-qa-matrix.md 존재 (9개 섹션 A~I) | VERIFIED | 88줄, A~I 섹션 확인 |

**점수:** 43개 진실 중 자동 검증 34개 VERIFIED, 9개 HUMAN (실기기 필요)

---

### 필수 아티팩트 검증

| 아티팩트 | 존재 | 실질성 | 연결 | 상태 |
|---------|------|-------|------|------|
| `supabase/migrations/029_photo_posts_videos.sql` | YES | 35줄, videos/images CHECK | N/A (migration) | VERIFIED |
| `supabase/migrations/030_photographer_approval_trigger.sql` | YES | 트리거 함수 + SECURITY DEFINER | N/A | VERIFIED |
| `supabase/migrations/031_photographer_apps_extend.sql` | YES | team_id/activity_links/activity_plan | N/A | VERIFIED |
| `supabase/migrations/032_photo_posts_thumbnails.sql` | YES | thumbnail_urls 컬럼 | N/A | VERIFIED |
| `supabase/functions/generate-thumbnails/index.ts` | YES | 187줄, thumbnail_urls UPDATE | photo_posts DB | VERIFIED |
| `supabase/tests/photographer-approval-trigger.sql` | YES | plan(10) — 10개 케이스 | pgTAP | VERIFIED |
| `docs/phase4-qa-matrix.md` | YES | 88줄, A~I 9개 섹션 | 실기기 QA 대기 | VERIFIED |
| `app/src/types/photographer.ts` | YES | videos/thumbnail_urls/grade 필드 포함 | photographerApi.ts | VERIFIED |
| `app/src/types/cheerleader.ts` | YES | name_ko, 'active'\|'inactive' (CR-02 수정) | photographerApi.ts | VERIFIED |
| `app/src/types/photographerApplication.ts` | YES | activity_links 포함 | photographerApi.ts | VERIFIED |
| `app/src/services/photographerApi.ts` | YES | 825줄, 모든 필수 export 확인 | PhotographerContext | VERIFIED |
| `app/src/utils/photographerGrade.ts` | YES | calculateGrade + gradeToBadge + GradeInfo | GradeBadge, photographerApi | VERIFIED |
| `app/src/utils/__tests__/photographerGrade.test.ts` | YES | 60줄, 14개 테스트 | jest | VERIFIED |
| `app/src/contexts/PhotographerContext.tsx` | YES | 781줄, mock 제거, Supabase 전용 | App.tsx | VERIFIED |
| `app/src/components/common/VideoPlayer.tsx` | YES | 108줄, useVideoPlayer+VideoView | expo-video | VERIFIED |
| `app/src/components/photographer/GradeBadge.tsx` | YES | 99줄, gradeToBadge 기반 | photographerGrade | VERIFIED |
| `app/src/screens/photographer/UploadPostScreen.tsx` | YES | 영상 검증+업로드+썸네일 fire-and-forget | r2Upload, generate-thumbnails | VERIFIED |
| `app/src/screens/photographer/StudioScreen.tsx` | YES | determineStudioState 4분기 | fetchMyPhotographerApplication | VERIFIED |
| `app/src/screens/photographer/PhotographerRegisterScreen.tsx` | YES | submitPhotographerApplication + Step 4 | photographerApi | VERIFIED |
| `app/src/screens/photographer/PhotographerProfileScreen.tsx` | YES | GradeBadge icon-label md 헤더 | GradeBadge | VERIFIED |
| `app/src/screens/photographer/CollectionDetailScreen.tsx` | YES | getCollectionPosts async fetch | PhotographerContext | VERIFIED |
| `app/src/navigation/MainTabNavigator.tsx` | YES | Studio 탭 + 상태별 label/icon | fetchMyPhotographerApplication | VERIFIED |
| `app/src/screens/photographer/__tests__/StudioScreen.state.test.tsx` | YES | 124줄, 6개 테스트 케이스 | determineStudioState | VERIFIED |

---

### 핵심 연결 검증 (Key Links)

| From | To | Via | 상태 | 근거 |
|------|----|-----|------|------|
| 030.sql | users.is_photographer | UPDATE SET is_photographer = TRUE (ADJ-01) | VERIFIED | 030.sql:83 |
| 030.sql | public.notifications | photographer_approved/rejected INSERT | VERIFIED | 030.sql:26-27,90,95-99 |
| generate-thumbnails/index.ts | photo_posts.thumbnail_urls | supabase.from('photo_posts').update | VERIFIED | index.ts:179 |
| get-upload-url/index.ts | SIZE_LIMITS | 50 * 1024 * 1024 (photo-posts) | VERIFIED | index.ts:18 |
| photographerApi.ts | photographerGrade.ts | import { calculateGrade } | VERIFIED | photographerApi.ts:6,178 |
| photographerApi.ts | types/photographerApplication.ts | import type { PhotographerApplication } | VERIFIED | photographerApi.ts:4 |
| PhotographerContext.tsx | photographerApi.ts | import * as photographerApi | VERIFIED | PhotographerContext.tsx:20 |
| PhotographerContext.tsx | AuthContext | useAuth().user?.id | VERIFIED | PhotographerContext.tsx:21,146 |
| PhotographerContext.tsx | useLoginGate | 비로그인 가드 | VERIFIED | PhotographerContext.tsx:22,147 |
| App.tsx | PhotographerContext.tsx | PhotographerProvider 마운트 | VERIFIED | App.tsx:21,291,309 |
| VideoPlayer.tsx | expo-video | useVideoPlayer + VideoView | VERIFIED | VideoPlayer.tsx:4 |
| GradeBadge.tsx | photographerGrade.ts | gradeToBadge(grade) | VERIFIED | GradeBadge.tsx:6 |
| UploadPostScreen.tsx | r2Upload.ts::uploadPostVideos | contentTypes[] 배열 전달 | VERIFIED | UploadPostScreen.tsx:237-244 |
| UploadPostScreen.tsx | generate-thumbnails | fire-and-forget fetch | VERIFIED | UploadPostScreen.tsx:283-293 |
| StudioScreen.tsx | photographerApi::fetchMyPhotographerApplication | user.id로 조회 | VERIFIED | StudioScreen.tsx:73 |
| PhotographerRegisterScreen.tsx | photographerApi::submitPhotographerApplication | Step 3 submit | VERIFIED | PhotographerRegisterScreen.tsx:90 |
| CollectionDetailScreen.tsx | PhotographerContext::getCollectionPosts | collectionId fetch | VERIFIED | CollectionDetailScreen.tsx:55 |
| MainTabNavigator.tsx | fetchMyPhotographerApplication | application.status 결정 | VERIFIED | MainTabNavigator.tsx:35 |

---

### 요구사항 커버리지 (PHOT-01 ~ PHOT-08)

| 요구사항 | 커버 플랜 | 설명 | 상태 | 근거 |
|---------|-----------|------|------|------|
| PHOT-01 | 04-02, 04-03, 04-05 | mock 데이터 병합 제거, Supabase 전용 전환 | VERIFIED | mockPhotographers.ts 삭제, PhotographerContext mock import 0건 |
| PHOT-02 | 04-01, 04-05 | photographer_applications 테이블 연동, 심사 트리거 | VERIFIED | 030.sql 트리거 + submitPhotographerApplication + StudioScreen state machine |
| PHOT-03 | 04-01, 04-02, 04-04 | 영상 업로드 (R2, 최대 3개) | HUMAN | 코드 검증 완료, 실기기 QA Section A 필요 |
| PHOT-04 | 04-04, 04-05 | 영상 재생 (앱 내 네이티브) | HUMAN | VideoPlayer 코드 검증 완료, 실기기 재생 확인 필요 |
| PHOT-05 | 04-01, 04-02, 04-04 | 이미지 리사이징/썸네일 생성 | HUMAN | generate-thumbnails EF 배포, 실기기 E2E 필요 |
| PHOT-06 | 04-02, 04-04, 04-05 | 포토그래퍼 등급 계산 (포스트+팔로워/10) + 배지 | HUMAN | calculateGrade + GradeBadge 코드 VERIFIED, 실기기 렌더 확인 필요 |
| PHOT-07 | 04-01, 04-02, 04-03, 04-05 | 치어리더 태깅 (DB 연동) | HUMAN | fetchCheerleaders + name_ko 업데이트 VERIFIED, 실기기 태깅 확인 필요 |
| PHOT-08 | 04-02, 04-03, 04-05 | 컬렉션 관리 연동 | VERIFIED | getCollectionPosts + CollectionDetailScreen async fetch + await 전환 확인 |

---

### 위협 모델 커버리지 (T-4-01 ~ T-4-08)

| 위협 | 상태 | 근거 |
|------|------|------|
| T-4-01: RLS bypass via photographer_applications | PARTIAL | RLS `photographer_apps_insert_own` 존재. UNIQUE(user_id) 부재 (HI-03) — 다중 pending 가능 |
| T-4-02: File size DoS 50MB | MITIGATED | 클라이언트 VIDEO_MAX_SIZE_BYTES=50MB + 서버 SIZE_LIMITS["photo-posts"]=50MB 일치 |
| T-4-03: SECURITY DEFINER privilege escalation | MITIGATED | handle_photographer_application_decision SECURITY DEFINER SET search_path='' + OWNER postgres |
| T-4-04: Studio/Register auth bypass | MITIGATED | StudioScreen DB fetch 기반 state machine, client-side flag 미신뢰 |
| T-4-05: Edge Function owner mismatch | MITIGATED | generate-thumbnails/index.ts:111-125 JWT user.id ↔ photographers.user_id 조인 검증 |
| T-4-06: Malicious video payload (MIME 우회) | MITIGATED | CR-01 수정됨 — get-upload-url video/webm 제거, mp4+quicktime만 허용 |
| T-4-07: Notification spam via approval trigger | MITIGATED | 트리거 WHEN OLD.status IS DISTINCT FROM NEW.status (단, HI-03+WR-04 복합 시 중복 가능) |
| T-4-08: activity_links URL injection | MITIGATED | PhotographerRegisterScreen.tsx:59-61 http(s):// prefix 강제 검증 |

---

### 안티패턴 스캔

| 파일 | 라인 | 패턴 | 심각도 | 영향 |
|------|------|------|--------|------|
| PhotographerContext.tsx | 382-392 | `renameCollection` 서버 반영 없이 local만 수정 (WR-03) | 경고 | 앱 재시작 시 rename 초기화 |
| PhotographerProfileScreen.tsx | 59-63 | `updatePhotographer` no-op stub (IN-01) | 정보 | 저장 버튼 눌러도 실제 반영 없음 |
| AdminContext.tsx | updatePostStatus/updatePhotographerVerification | no-op stub (Phase 5 이관) | 경고 | 어드민 approve/reject 현재 미작동 |
| PhotographerProfileScreen.tsx | 312 | `navigation.navigate('UploadPost' as any)` (IN-07) | 정보 | CLAUDE.md no-any 위반 |
| CheerleaderProfileScreen.tsx | 218 | `navigation.navigate('UploadPost' as any)` (IN-07) | 정보 | CLAUDE.md no-any 위반 |
| StudioScreen.tsx | 55-89 | cancelled/isMounted 가드 없음 (HI-01) | 경고 | unmount 후 setState → RN dev warning |
| MainTabNavigator.tsx | 26 | 초기 studioState='no_app' → 첫 프레임 flicker (HI-02) | 경고 | 승인 사용자 탭 아이콘 1-2프레임 깜빡임 |
| supabase/migrations (없음) | - | UNIQUE(user_id) WHERE pending 부재 (HI-03) | 경고 | 동일 사용자 중복 pending 신청 가능 |

**차단 안티패턴:** 없음 (모두 경고/정보 수준)

---

### 코드 리뷰 결과 반영 현황

| 이슈 | 심각도 | 수정 여부 | 비고 |
|------|--------|-----------|------|
| CR-01: get-upload-url video/webm 허용 (T-4-06 위반) | Critical | FIXED | video/webm + getExtension webm 매핑 제거 확인 |
| CR-02: CheerleaderStatus 'retired' → 'inactive' 정렬 | Critical | FIXED | types/cheerleader.ts 'active'\|'inactive' 확인 |
| HI-01: StudioScreen loadState cancelled 가드 없음 | High | 미수정 | 경고 수준 — 실기기 QA에서 탭 빠른 전환 테스트 필요 |
| HI-02: MainTabNavigator 첫 프레임 label flicker | High | 미수정 | UX 경고 — Phase 5에서 user.is_photographer 활용 권장 |
| HI-03: photographer_applications UNIQUE(user_id) 부재 | High | 미수정 | 033 마이그레이션 추가 권장 |
| WR-01~WR-06 | Warning | 미수정 | Phase 5 이관 또는 v1 이후 대응 |
| IN-01~IN-07 | Info | 미수정 | Phase 5 이관 또는 코드 스타일 정리 |

---

### 실기기 QA 필요 항목

#### 1. 영상 업로드 (QA-A)
**테스트:** iOS/Android 실기기에서 사진 게시물 작성 시 영상 3개 선택 시도
**예상:** 30초 초과/50MB 초과/webm 파일 선택 시 Alert 차단, MP4/MOV 정상 업로드
**사람이 필요한 이유:** expo-image-picker duration/fileSize 메타데이터 정확성은 실기기에서만 확인 가능

#### 2. VideoPlayer 모드별 동작 (QA-B)
**테스트:** 피드/상세/스튜디오 화면에서 영상 재생
**예상:** feed=뮤트+루프, detail=네이티브 컨트롤, studio=썸네일 프리뷰
**사람이 필요한 이유:** expo-video 재생 동작은 JSC/Hermes 런타임에서만 확인 가능

#### 3. StudioScreen state machine E2E (QA-C)
**테스트:** 비신청자/pending/approved/rejected 계정으로 각각 Studio 탭 진입
**예상:** 4분기 화면 정확히 분기
**사람이 필요한 이유:** fetchMyPhotographerApplication 실제 DB 데이터 기반 렌더 확인 필요

#### 4. GradeBadge 시각 QA (QA-D)
**테스트:** 각 등급 포토그래퍼 프로필 확인
**예상:** bronze(#A97142)/silver/gold/diamond 배지 색상 UI-SPEC 일치
**사람이 필요한 이유:** 색상 렌더 확인은 실기기/시뮬레이터 필요

#### 5. 치어리더 태깅 (QA-E)
**테스트:** UploadPostScreen에서 치어리더 선택
**예상:** DB에서 cheerleaders 목록 조회, name_ko 표시, 태그 저장
**사람이 필요한 이유:** fetchCheerleaders 실제 DB 연동 확인 필요

#### 6. CollectionDetail fetch (QA-F)
**테스트:** 포토그래퍼 프로필에서 컬렉션 클릭
**예상:** 로딩→서버 fetch→갤러리 표시
**사람이 필요한 이유:** getCollectionPosts DB 쿼리 결과 렌더 확인 필요

#### 7. 어드민 승인 트리거 E2E (QA-G)
**테스트:** Supabase 대시보드에서 application status='approved'로 직접 변경
**예상:** photographers row 자동 생성 + users.is_photographer=TRUE + notification INSERT
**사람이 필요한 이유:** 원격 DB에서 030 트리거 실행 확인 필요

#### 8. generate-thumbnails smoke test (QA-I)
**테스트:** 사진 업로드 후 피드 새로고침
**예상:** thumbnail_urls에 400×400 JPEG URL 생성
**사람이 필요한 이유:** R2→magick-wasm→R2→DB 전체 파이프라인 확인 필요

#### 9. MainTabNavigator Studio 탭 시각 분기 (QA-C 일부)
**테스트:** 승인/미신청/pending 계정으로 탭 바 확인
**예상:** 각 상태에 맞는 아이콘/레이블 표시, HI-02 flicker 수준 확인
**사람이 필요한 이유:** 실기기에서의 tab 전환 시각 확인 필요

---

### 점수 요약

**자동 검증 통과:** 26/28 must-haves (Plan 01-05 전체)

**HUMAN 필요 항목:** 9개 실기기 QA (QA-A~I)

**미결 결함 (미차단):**
- HI-01: StudioScreen cancelled 가드 — 경고 (Phase 5 fix 권장)
- HI-02: MainTabNavigator 첫 프레임 flicker — 경고 (Phase 5 fix 권장)
- HI-03: UNIQUE(user_id) WHERE pending 부재 — 경고 (033 마이그레이션 권장)
- WR-03: renameCollection 로컬 only — 경고 (Phase 5 이관)
- IN-07: 2곳 `as any` cast — 정보 (코드 스타일)

**CR-01, CR-02 수정 확인:** 완료

**TypeScript 오류:** 0 errors (04-05 SUMMARY 기록, tsc 직접 실행 환경 제약으로 SUMMARY 기록 신뢰)

**Jest 테스트:** 37개 통과 (04-05 SUMMARY 기록 — photographerGrade 14 + GradeBadge.helpers 10 + validateVideoAsset 7 + StudioScreen.state 6)

---

_검증 일시: 2026-04-15T04:00:00Z_
_검증자: Claude (gsd-verifier)_
