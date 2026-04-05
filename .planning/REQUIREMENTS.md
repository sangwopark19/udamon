# Requirements: UDAMON

**Defined:** 2026-04-05
**Core Value:** KBO 팬이 구단별 커뮤니티에서 소통하고, 팬 포토그래퍼가 경기 사진/영상을 공유할 수 있는 완성된 앱

## v1 Requirements

### Database Foundation

- [ ] **DB-01**: public.users 테이블 생성 (role, nickname, avatar_url, my_team_id, nickname_changed_at, is_deleted, deleted_at)
- [ ] **DB-02**: auth.users INSERT 시 public.users 자동 생성 트리거
- [ ] **DB-03**: notifications 테이블 생성 (type, user_id, title, body, data JSON, is_read)
- [ ] **DB-04**: announcements 테이블 생성 (title, content, is_pinned, created_by)
- [ ] **DB-05**: inquiries 테이블 생성 (user_id, category, title, content, status, answer)
- [ ] **DB-06**: photographer_applications 테이블 생성 (user_id, portfolio_url, bio, status, reviewed_by)
- [ ] **DB-07**: cheerleaders 테이블 생성 (team_id, name_ko, name_en, position, status)
- [ ] **DB-08**: audit_logs 테이블 생성 (admin_id, action, target_type, target_id, details JSON)
- [ ] **DB-09**: site_settings 테이블 생성 (key, value JSON, updated_by)
- [ ] **DB-10**: photo_posts에 status/rejection_reason 컬럼 추가
- [ ] **DB-11**: photo_posts에 cheerleader_id 컬럼 추가
- [ ] **DB-12**: community_reports 자동 블라인드 트리거 제거
- [ ] **DB-13**: 모든 신규 테이블에 RLS 정책 적용
- [ ] **DB-14**: 어드민 RLS 정책 (public.users.role = 'admin' 기반)

### Authentication

- [ ] **AUTH-01**: Google OAuth 설정 및 Supabase 연동
- [ ] **AUTH-02**: Apple Sign In 설정 및 Supabase 연동 (DUNS 완료 시)
- [ ] **AUTH-03**: Kakao OAuth 설정 및 Supabase 연동
- [ ] **AUTH-04**: Naver OAuth Edge Function 프록시 구현
- [ ] **AUTH-05**: 이메일/비밀번호 로그인 Supabase Auth 연동
- [ ] **AUTH-06**: 비밀번호 찾기 (resetPasswordForEmail)
- [ ] **AUTH-07**: AuthContext → Supabase Auth 완전 전환
- [ ] **AUTH-08**: users 테이블 연동 (프로필 로드, 닉네임 30일 변경 제한, 고유성)
- [ ] **AUTH-09**: 회원 탈퇴 (soft delete — 콘텐츠 유지, "탈퇴한 사용자" 표시)
- [ ] **AUTH-10**: 사용자 차단 기능 (차단한 사용자 글 숨김)

### Security

- [ ] **SEC-01**: 테스트 계정 3개 제거 또는 __DEV__ 게이트 처리
- [ ] **SEC-02**: 환경변수 정리 (.env 생성, 더미 키/fallback 제거)
- [ ] **SEC-03**: 어드민 하드코딩 비밀번호 제거 → Supabase Auth 전환
- [ ] **SEC-04**: console.log 13곳 프로덕션 빌드 시 제거
- [ ] **SEC-05**: Edge Function CORS origin 제한 (udamonfan.com)

### Community

- [ ] **COMM-01**: communityApi.ts 서비스 레이어 생성
- [ ] **COMM-02**: CommunityContext → Supabase 전환
- [ ] **COMM-03**: 게시글 CRUD 연동 (제목 1~30자, 본문 1~1000자)
- [ ] **COMM-04**: 댓글/대댓글 연동 (1-depth, 300자, soft delete)
- [ ] **COMM-05**: 좋아요 연동 (게시글/댓글, 중복 방지)
- [ ] **COMM-06**: 투표 연동 (단일/복수 선택, 2~6개 선택지, 만료 시간)
- [ ] **COMM-07**: 신고 연동 (관리자 수동 처리)
- [ ] **COMM-08**: 이미지 업로드 (R2 community-posts prefix, 최대 10장)
- [ ] **COMM-09**: 검색 기능 (DB 기반 — 선수명, 게시글 제목/내용)
- [ ] **COMM-10**: 최근 검색어 저장 (사용자당 최대 10개)
- [ ] **COMM-11**: 트렌딩 계산 (24시간 윈도우, 좋아요 + 댓글 합산)
- [ ] **COMM-12**: Optimistic Update + 실패 핸들링

### Photographer

- [ ] **PHOT-01**: 포토그래퍼 Supabase 연동 완성 (mock 데이터 병합 제거)
- [ ] **PHOT-02**: 포토그래퍼 심사 프로세스 (applications 테이블 연동)
- [ ] **PHOT-03**: 영상 업로드 기능 (R2, 최대 3개)
- [ ] **PHOT-04**: 영상 재생 기능 (앱 내 네이티브)
- [ ] **PHOT-05**: 이미지 리사이징/썸네일 생성
- [ ] **PHOT-06**: 포토그래퍼 등급 계산 (포스트 수 + 팔로워/10)
- [ ] **PHOT-07**: 치어리더 태깅 (cheerleaders 테이블 연동)
- [ ] **PHOT-08**: 컬렉션 관리 연동

### Admin Web

- [ ] **ADM-01**: 어드민 인증 → Supabase Auth 전환
- [ ] **ADM-02**: adminApi.ts 서비스 레이어 생성
- [ ] **ADM-03**: 대시보드 실제 통계 연동 (DAU/WAU/MAU, 가입 추이)
- [ ] **ADM-04**: 사용자 관리 연동 (조회, 제재, 차단)
- [ ] **ADM-05**: 커뮤니티 관리/게시글 검수 연동
- [ ] **ADM-06**: 신고 관리 연동
- [ ] **ADM-07**: 포토그래퍼 관리/심사 연동
- [ ] **ADM-08**: 선수/구단/치어리더 관리 연동 (CRUD)
- [ ] **ADM-09**: 공지사항/문의 관리 연동
- [ ] **ADM-10**: 기타 페이지 연동 (이벤트, 컬렉션, 광고, 알림, 랭크, 시스템 설정)
- [ ] **ADM-11**: Vercel 배포 연결

### Notifications

- [ ] **NOTF-01**: 인앱 알림 시스템 구현 (notifications 테이블 기반)
- [ ] **NOTF-02**: NotificationContext → Supabase 전환
- [ ] **NOTF-03**: FCM 푸시 알림 구현 (Firebase 설정 후)
- [ ] **NOTF-04**: Expo Push Token 등록 및 관리

### Monitoring & Polish

- [ ] **MON-01**: Sentry 에러 모니터링 설치
- [ ] **MON-02**: 에러 상태 UI 제작 (기존 스타일 기반)
- [ ] **MON-03**: 앱 내 어드민 화면 6개 제거
- [ ] **MON-04**: 홈 피드 (포토 5 : 커뮤니티 1 혼합)
- [ ] **MON-05**: Context Provider 최적화 (메모이제이션)
- [ ] **MON-06**: EAS 빌드 (development 프로필)

## v2 Requirements

### Real-time & Social

- **RT-01**: Supabase Realtime 연동 (실시간 업데이트)
- **RT-02**: DM 메시지 시스템
- **RT-03**: 다크 모드

### Automation

- **AUTO-01**: 자동 모더레이션 (스팸 필터, NSFW 감지)
- **AUTO-02**: 도배 방지 / 동일 내용 차단
- **AUTO-03**: 가입 후 쿨다운

### Monetization

- **PAY-01**: 티켓 충전/결제 (Paddle/Toss)
- **PAY-02**: 서포트/후원/선물
- **PAY-03**: 수익 관리/정산

### Platform

- **PLAT-01**: Next.js 웹 (udamonfan.com)
- **PLAT-02**: 네이티브 공유 (카카오톡/트위터/인스타)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 실시간 채팅 / 라이브 게임 채팅 | 6주 타임라인에 부적합, KakaoTalk 오픈채팅이 대안 |
| DM 1:1 메시지 | 모더레이션 부담, 실시간 인프라 필요 |
| 자동 블라인드 (5건 누적) | 제거 확정 -> 관리자 수동 |
| 금칙어/스팸 필터 | 초기 사용자 적음, 수동 관리 충분 |
| NSFW 자동 필터 | 관리자 수동 대체 |
| 티켓/결제/정산 | v1 비활성화 확정 |
| 다크 모드 | UI 안정화 후 v2 |
| Next.js 웹 | v2 이후 |
| 팔로워 기반 소셜 그래프 (일반 유저) | 커뮤니티는 게시판 기반, 포토그래퍼 팔로우만 v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Pending |
| DB-02 | Phase 1 | Pending |
| DB-03 | Phase 1 | Pending |
| DB-04 | Phase 1 | Pending |
| DB-05 | Phase 1 | Pending |
| DB-06 | Phase 1 | Pending |
| DB-07 | Phase 1 | Pending |
| DB-08 | Phase 1 | Pending |
| DB-09 | Phase 1 | Pending |
| DB-10 | Phase 1 | Pending |
| DB-11 | Phase 1 | Pending |
| DB-12 | Phase 1 | Pending |
| DB-13 | Phase 1 | Pending |
| DB-14 | Phase 1 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| AUTH-06 | Phase 2 | Pending |
| AUTH-07 | Phase 2 | Pending |
| AUTH-08 | Phase 2 | Pending |
| AUTH-09 | Phase 2 | Pending |
| AUTH-10 | Phase 2 | Pending |
| COMM-01 | Phase 3 | Pending |
| COMM-02 | Phase 3 | Pending |
| COMM-03 | Phase 3 | Pending |
| COMM-04 | Phase 3 | Pending |
| COMM-05 | Phase 3 | Pending |
| COMM-06 | Phase 3 | Pending |
| COMM-07 | Phase 3 | Pending |
| COMM-08 | Phase 3 | Pending |
| COMM-09 | Phase 3 | Pending |
| COMM-10 | Phase 3 | Pending |
| COMM-11 | Phase 3 | Pending |
| COMM-12 | Phase 3 | Pending |
| PHOT-01 | Phase 4 | Pending |
| PHOT-02 | Phase 4 | Pending |
| PHOT-03 | Phase 4 | Pending |
| PHOT-04 | Phase 4 | Pending |
| PHOT-05 | Phase 4 | Pending |
| PHOT-06 | Phase 4 | Pending |
| PHOT-07 | Phase 4 | Pending |
| PHOT-08 | Phase 4 | Pending |
| ADM-01 | Phase 5 | Pending |
| ADM-02 | Phase 5 | Pending |
| ADM-03 | Phase 5 | Pending |
| ADM-04 | Phase 5 | Pending |
| ADM-05 | Phase 5 | Pending |
| ADM-06 | Phase 5 | Pending |
| ADM-07 | Phase 5 | Pending |
| ADM-08 | Phase 5 | Pending |
| ADM-09 | Phase 5 | Pending |
| ADM-10 | Phase 5 | Pending |
| ADM-11 | Phase 5 | Pending |
| NOTF-01 | Phase 6 | Pending |
| NOTF-02 | Phase 6 | Pending |
| NOTF-03 | Phase 6 | Pending |
| NOTF-04 | Phase 6 | Pending |
| MON-01 | Phase 6 | Pending |
| MON-02 | Phase 6 | Pending |
| MON-03 | Phase 6 | Pending |
| MON-04 | Phase 6 | Pending |
| MON-05 | Phase 6 | Pending |
| MON-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 70 total
- Mapped to phases: 70
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
