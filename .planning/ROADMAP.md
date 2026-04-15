# Roadmap: UDAMON

## Overview

Udamon은 UI 프로토타입 단계의 브라운필드 프로젝트를 실제 동작하는 앱으로 완성하는 여정이다. 모든 기능의 기반이 되는 public.users 테이블과 DB 스키마를 먼저 구축하고, 인증을 연결한 뒤, 커뮤니티와 포토그래퍼 핵심 기능을 순차 연동한다. 어드민 패널로 운영 도구를 갖추고, 알림과 폴리시로 마무리하여 2026년 5월 중순 v1을 런칭한다.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation & Security** - 모든 신규 테이블 생성, RLS 정책 적용, 보안 취약점 제거
- [x] **Phase 2: Authentication** - OAuth 4종 연동, AuthContext Supabase 전환, 사용자 프로필 시스템
- [x] **Phase 3: Community** - 커뮤니티 게시판 전체 Supabase 연동 (CRUD, 검색, 트렌딩, R2 이미지 업로드)
- [ ] **Phase 4: Photographer** - 포토그래퍼 갤러리 완성 (심사, 영상, 이미지 처리, 등급)
- [ ] **Phase 5: Admin** - 어드민 웹 20페이지 Supabase 연동 및 배포
- [ ] **Phase 6: Notifications & Polish** - 인앱/푸시 알림, 에러 모니터링, 최종 마무리

## Phase Details

### Phase 1: Database Foundation & Security
**Goal**: 앱의 모든 기능이 의존하는 DB 스키마가 완성되고, 모든 테이블에 RLS가 적용되며, 프로덕션 보안 취약점이 제거된 상태
**Depends on**: Nothing (first phase)
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06, DB-07, DB-08, DB-09, DB-10, DB-11, DB-12, DB-13, DB-14, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05
**Success Criteria** (what must be TRUE):
  1. public.users 테이블이 존재하고, Supabase 대시보드에서 auth.users에 테스트 사용자 생성 시 public.users에 자동으로 행이 생성된다
  2. notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings 테이블이 모두 존재하고 쿼리 가능하다
  3. 비인증 사용자가 Supabase 클라이언트 SDK로 보호된 테이블 데이터를 조회하면 빈 결과가 반환된다 (RLS 동작 확인)
  4. 코드베이스에 하드코딩된 테스트 계정, 더미 키, console.log가 프로덕션 빌드에 포함되지 않는다
  5. 환경변수가 .env 파일로 관리되고, 앱이 .env 없이 실행하면 명확한 에러 메시지를 표시한다
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- public.users 테이블 + 7개 신규 테이블 생성 + photo_posts ALTER + cheerleaders 시드
- [x] 01-02-PLAN.md -- RLS 헬퍼 함수 + 전체 RLS 정책 적용 + spam_filter DROP + anon 정책 제거
- [x] 01-03-PLAN.md -- 보안 정리 (테스트 계정, console.log, 환경변수, 어드민 비밀번호, CORS)

### Phase 2: Authentication
**Goal**: 사용자가 Google/Apple/Kakao/Naver 중 하나로 가입하고, 로그인 상태를 유지하며, 프로필을 관리할 수 있는 상태
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10
**Success Criteria** (what must be TRUE):
  1. 사용자가 Google 또는 Kakao로 로그인하면 홈 화면이 표시되고, 앱을 종료 후 재실행해도 로그인 상태가 유지된다
  2. 로그인한 사용자의 닉네임, 아바타, 응원 구단이 프로필 화면에 표시되고, 닉네임 변경 시 30일 제한이 적용된다
  3. 사용자가 로그아웃하면 로그인 화면으로 돌아가고, 회원 탈퇴하면 해당 사용자의 콘텐츠에 "탈퇴한 사용자"로 표시된다
  4. 사용자가 다른 사용자를 차단하면 차단한 사용자의 게시글이 피드에서 보이지 않는다
  5. Naver OAuth가 Edge Function 프록시를 통해 동작하고, Apple Sign In은 DUNS 완료 시 활성화된다
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Community
**Goal**: 사용자가 구단별 게시판에서 게시글 작성, 댓글, 좋아요, 투표, 검색을 실제 DB 데이터로 이용할 수 있는 상태
**Depends on**: Phase 2
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, COMM-07, COMM-08, COMM-09, COMM-10, COMM-11, COMM-12
**Success Criteria** (what must be TRUE):
  1. 사용자가 게시글을 작성하면 즉시 게시판에 표시되고, 수정/삭제가 본인 글에서만 가능하다
  2. 댓글과 대댓글을 작성할 수 있고, 삭제 시 "삭제된 댓글입니다"로 표시된다 (soft delete)
  3. 게시글에 이미지를 최대 10장 첨부할 수 있고, 업로드 후 게시글에서 이미지가 표시된다
  4. 선수명이나 게시글 제목/내용으로 검색하면 관련 결과가 표시되고, 최근 검색어가 저장된다
  5. 트렌딩 탭에서 최근 24시간 내 좋아요+댓글이 많은 게시글이 상위에 노출된다
**Plans**: 5 plans
**UI hint**: yes

Plans:
- [x] 03-00-PLAN.md — Wave 0: 024_community_phase3.sql migration (FK repoint + pg_cron + increment_post_view RPC + update_trending_posts + anon RLS D-19) + phase3-smoke.sql + supabase db push checkpoint
- [x] 03-01-PLAN.md — Wave 1: communityApi.ts service layer (photographerApi mirror, ApiResult<T>, post/comment/like/poll/report/search/recent_searches CRUD, 2-query poll fetch, error narrowing, search sanitization)
- [x] 03-02-PLAN.md — Wave 2: CommunityContext.tsx Supabase migration (remove mocks, remove client trending, optimistic likes with rollback, pagination append, BlockContext version counter for D-15 refresh)
- [x] 03-03-PLAN.md — Wave 3: Screens integration (Main list async pagination + skeleton + error retry, Search async + DB recents, Detail RPC view increment + D-13 expired poll UI, CommunityPostCard D-03 fallback, ko.ts new i18n keys, manual QA checkpoint)
- [x] 03-04-PLAN.md — Wave 4: CommunityWriteScreen D-09 R2-first upload flow + D-18 Alert retain-form, mockCommunity.ts deletion, R2 infra provisioned (bucket + CORS + secrets + edge function + compat fix), final Phase 3 E2E QA matrix checkpoint approved

### Phase 4: Photographer
**Goal**: 팬 포토그래퍼가 사진/영상을 업로드하고, 심사를 받고, 등급에 따라 활동할 수 있는 완성된 갤러리 시스템
**Depends on**: Phase 2
**Requirements**: PHOT-01, PHOT-02, PHOT-03, PHOT-04, PHOT-05, PHOT-06, PHOT-07, PHOT-08
**Success Criteria** (what must be TRUE):
  1. 승인된 포토그래퍼가 사진을 업로드하면 썸네일이 자동 생성되고, 갤러리에 최적화된 크기로 표시된다
  2. 포토그래퍼 신청을 제출하면 어드민 심사 대기 상태가 되고, 승인/거절 결과가 반영된다
  3. 영상을 최대 3개 업로드할 수 있고, 앱 내에서 네이티브 재생이 가능하다
  4. 포토그래퍼 프로필에 등급(포스트 수 + 팔로워 기반)이 표시되고, 치어리더 태깅이 동작한다
**Plans**: 7 plans (5 initial + 2 gap closure)
**UI hint**: yes

Plans:
- [x] 04-01-PLAN.md — Wave 0: 029~032 마이그레이션 + get-upload-url SIZE_LIMIT 50MB + generate-thumbnails EF (magick-wasm) + pgTAP 5 파일 + expo-video 설치 + [BLOCKING] supabase db push & functions deploy
- [x] 04-02-PLAN.md — Wave 1: types 확장 (PhotoPost videos/thumbnail_urls, Photographer grade, Cheerleader DB schema, PhotographerApplication) + photographerApi 신규 4종 (submit/fetchMyApp/fetchCheerleaders/fetchCollectionPosts) + 페이지네이션 + photographerGrade util + r2Upload contentTypes[]
- [x] 04-03-PLAN.md — Wave 2: PhotographerContext Supabase 전면 전환 (mock 제거, togglePhotoLike/toggleFollow userId 주입, 컬렉션 await, loadMorePhotoPosts) + mockPhotographers/mockCheerleaders 삭제
- [x] 04-04-PLAN.md — Wave 3a: VideoPlayer (expo-video) + GradeBadge + PhotographerCard 통합 + UploadPostScreen 영상 검증/업로드/썸네일 fire-and-forget + i18n 33 keys + bronze 토큰
- [x] 04-05-PLAN.md — Wave 3b: StudioScreen state machine (null/pending/approved/rejected) + PhotographerRegisterScreen Step 4 재설계 + PhotographerProfileScreen 헤더 GradeBadge + CollectionDetailScreen async fetch + MainTabNavigator 탭 분기 + [BLOCKING] Manual QA matrix 완주
- [x] 04-06-PLAN.md — Wave 4 (gap closure): HI-01 StudioScreen cancelled guard + HI-02 MainTabNavigator is_photographer-first bootstrap + HI-03 033 partial unique index (pending per user) + pgTAP + [BLOCKING] supabase db push
- [ ] 04-07-PLAN.md — Wave 5 (gap closure): expo-video native module blocker 해소 — EAS dev build 재생성 + 시뮬레이터 install + fresh start 검증 [BLOCKING user checkpoint] + docs/dev-environment-setup.md native-rebuild 프로토콜 + phase4-qa-matrix.md / 04-HUMAN-UAT.md 사전 준비 체크리스트 보강

### Phase 5: Admin
**Goal**: 관리자가 어드민 웹에서 사용자, 커뮤니티, 포토그래퍼, 공지사항을 실제 데이터로 관리할 수 있는 상태
**Depends on**: Phase 3, Phase 4
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, ADM-10, ADM-11
**Success Criteria** (what must be TRUE):
  1. 관리자가 Supabase Auth로 로그인하면 대시보드에 실제 DAU/WAU/MAU 통계가 표시된다
  2. 관리자가 신고된 게시글을 검토하고 삭제/블라인드 처리할 수 있다
  3. 포토그래퍼 신청 목록을 확인하고 승인/거절할 수 있으며, 결과가 앱에 즉시 반영된다
  4. 공지사항을 작성/수정하면 앱에서 확인 가능하고, 문의에 답변하면 사용자가 답변을 확인할 수 있다
  5. 어드민 웹이 Vercel에 배포되어 외부에서 접속 가능하다
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Notifications & Polish
**Goal**: 사용자가 인앱/푸시 알림을 받고, 앱 전반의 에러 처리와 성능이 프로덕션 수준으로 완성된 상태
**Depends on**: Phase 5
**Requirements**: NOTF-01, NOTF-02, NOTF-03, NOTF-04, MON-01, MON-02, MON-03, MON-04, MON-05, MON-06
**Success Criteria** (what must be TRUE):
  1. 사용자의 게시글에 댓글이 달리면 알림 탭에 새 알림이 표시되고, 탭하면 해당 게시글로 이동한다
  2. 앱이 백그라운드일 때 푸시 알림이 도착하고, 탭하면 앱이 열리며 해당 콘텐츠로 이동한다 (Firebase 설정 완료 시)
  3. 네트워크 에러나 서버 에러 발생 시 사용자에게 의미있는 에러 UI가 표시되고, Sentry에 에러가 기록된다
  4. 홈 피드에서 포토 5 : 커뮤니티 1 비율로 혼합 피드가 표시된다
  5. EAS development 빌드가 성공하고 실기기에서 설치/실행 가능하다
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation & Security | 3/3 | Complete | 2026-04-06 |
| 2. Authentication | 5/5 | Complete | 2026-04-10 |
| 3. Community | 5/5 | Complete | 2026-04-12 |
| 4. Photographer | 0/5 | Not started | - |
| 5. Admin | 0/3 | Not started | - |
| 6. Notifications & Polish | 0/3 | Not started | - |
