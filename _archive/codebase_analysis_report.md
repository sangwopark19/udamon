# DUGOUT 코드베이스 종합 분석 보고서

> 분석일: 2026-04-01
> 대상: `/dugout` 전체 코드베이스 (app, admin, supabase, docs)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [모바일 앱 (app/)](#4-모바일-앱-app)
5. [어드민 대시보드 (admin/)](#5-어드민-대시보드-admin)
6. [데이터베이스 스키마 (supabase/)](#6-데이터베이스-스키마-supabase)
7. [프로토콜 vs 구현 차이 분석](#7-프로토콜-vs-구현-차이-분석)
8. [데이터 흐름 분석](#8-데이터-흐름-분석)
9. [잠재적 이슈 및 기술 부채](#9-잠재적-이슈-및-기술-부채)
10. [통계 요약](#10-통계-요약)

---

## 1. 프로젝트 개요

DUGOUT(더그아웃)은 KBO(한국프로야구) 팬 커뮤니티 + 포토그래퍼 플랫폼이다.

| 항목 | 내용 |
|------|------|
| 서비스명 | dugout (더그아웃) |
| 도메인 | dugoutfan.com |
| 대상 | KBO 팬 + 팬 포토그래퍼 |
| 법인 | 헤이디 (한국) |
| 디자인 | 라이트 모드 기본 |
| 앱 스킴 | `dugoutfan://` |
| 번들 ID | `com.dugoutfan.app` (iOS/Android) |

### 핵심 기능 2축
- **커뮤니티**: 구단별 게시판, 팬 토론, 투표 (v1 핵심)
- **포토그래퍼**: 경기장 사진 업로드, 프로필, 컬렉션 (v1 기본 기능)

### v1 런칭 방향
- 커뮤니티를 핵심으로 먼저 런칭
- 후원/정산은 UI만 유지하고 비활성화 상태
- 포토그래퍼 등급 시스템은 v2에서 활성화 예정

---

## 2. 기술 스택

### 모바일 앱 (app/)
| 레이어 | 기술 | 버전 |
|--------|------|------|
| 프레임워크 | React Native (Expo) | SDK 54, RN 0.81.5 |
| 언어 | TypeScript | strict mode |
| 네비게이션 | React Navigation | @react-navigation/native 7.x |
| 상태관리 | React Context API | 18개 Context Provider |
| 백엔드 | Supabase | @supabase/supabase-js 2.x |
| 국제화 | react-i18next | 한국어 |
| 스토리지 | AsyncStorage | 세션 영속화 |

### 어드민 (admin/)
| 레이어 | 기술 | 버전 |
|--------|------|------|
| 프레임워크 | React | 18.3.1 |
| 번들러 | Vite | 6.0.1 |
| 라우팅 | React Router DOM | 6.28.0 |
| 스타일링 | Tailwind CSS | 3.x |
| 아이콘 | Lucide React | - |

### 공통 인프라
| 항목 | 기술 |
|------|------|
| DB/Auth/Storage | Supabase (PostgreSQL) |
| 인증 | OAuth (Google, Apple, Kakao, Naver) + Email |
| 파일 저장 | Supabase Storage (`photo-posts` 버킷) |

---

## 3. 디렉토리 구조

```
dugout/
├── app/                          # React Native(Expo) 모바일 앱
│   ├── src/
│   │   ├── navigation/           # 네비게이션 설정 (1 파일)
│   │   ├── screens/              # 화면 컴포넌트 (49개)
│   │   ├── components/           # 재사용 컴포넌트 (29개)
│   │   ├── contexts/             # Context Provider (18개)
│   │   ├── hooks/                # 커스텀 훅 (4개)
│   │   ├── services/             # API/Supabase 클라이언트 (3개)
│   │   ├── types/                # TypeScript 타입 (7개)
│   │   ├── constants/            # 상수 (3개)
│   │   ├── styles/               # 테마 (1개)
│   │   ├── data/                 # 목 데이터 (3개)
│   │   └── i18n/                 # 국제화 (2개)
│   ├── App.tsx                   # 앱 엔트리 포인트
│   ├── app.json                  # Expo 설정
│   ├── eas.json                  # EAS 빌드 설정
│   └── package.json
│
├── admin/                        # React+Vite 어드민 대시보드
│   ├── src/
│   │   ├── pages/                # 어드민 페이지 (22개)
│   │   ├── components/           # 공통 컴포넌트 (4개)
│   │   ├── contexts/             # Context (2개)
│   │   ├── types/                # 타입 정의 (1개)
│   │   └── data/                 # 목 데이터 (1개)
│   ├── App.tsx                   # 라우팅 + 레이아웃
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── supabase/
│   └── migrations/               # DB 마이그레이션 (9개 SQL)
│       ├── 001_teams_players.sql
│       ├── 002_community.sql
│       ├── 003_polls.sql
│       ├── 004_spam_filter.sql
│       ├── 005_rls_policies.sql
│       ├── 006_seed_teams.sql
│       ├── 007_photographer.sql
│       ├── 008_photographer_rls.sql
│       └── 009_seed_photographer.sql
│
└── docs/
    ├── dugout_protocol_v2_FINAL.md   # 서비스 프로토콜 (비즈니스 기획)
    └── dugout_dev_spec.md            # 개발 스펙 (기술 명세)
```

---

## 4. 모바일 앱 (app/)

### 4.1 네비게이션 구조

**하단 탭 (5개):**
| 탭 | 아이콘 | 화면 |
|----|--------|------|
| 홈 | Home | HomeScreen — 포토+커뮤니티 혼합 피드 |
| 탐색 | Search | ExploreScreen — 구단/선수별 브라우징 |
| 아카이브 | Bookmark | ArchiveScreen — 저장된 콘텐츠 |
| 커뮤니티 | Users | CommunityMainScreen — 게시판/토론 |
| 마이 | User | MyPageScreen — 프로필/설정 |

**스택 라우트 (40+):**
- 인증: Login, Signup, ForgotPassword, Onboarding
- 콘텐츠: PostDetail, CommunityPostDetail, CollectionDetail
- 프로필: PhotographerProfile, TeamDetail, PlayerDetail, CheerleaderProfile
- 작성: CommunityWrite, UploadPost, PhotographerRegister
- 소셜: MessageList, MessageDetail, FollowingList, Notifications
- 설정: AccountManagement, BlockedUsers, Terms, Privacy 등 9개
- 어드민(인앱): AdminDashboard, AdminPostReview 등 6개
- 기타: Studio, RevenueManagement, TicketShop, PurchaseHistory

### 4.2 Context Provider 구조 (18개)

App.tsx에서 다음 순서로 중첩된다:

```
AuthProvider
  └─ ToastProvider
      └─ ComingSoonProvider
          └─ BlockProvider
              └─ ReportProvider
                  └─ CommunityProvider
                      └─ PhotographerProvider
                          └─ RankProvider
                              └─ AwardsProvider
                                  └─ ArchiveProvider
                                      └─ ThankYouWallProvider
                                          └─ InquiryProvider
                                              └─ NotificationProvider
                                                  └─ MessageProvider
                                                      └─ AdminProvider
                                                          └─ TicketProvider
```

각 Context의 역할:

| Context | 역할 | 데이터 소스 |
|---------|------|-------------|
| AuthContext | 인증, 세션, 프로필 | Supabase Auth + 테스트 계정 |
| ToastContext | 토스트 알림 UI | 로컬 |
| ComingSoonContext | 미출시 기능 플래그 | 로컬 |
| BlockContext | 사용자 차단 | 로컬 |
| ReportContext | 신고 시스템 | 로컬 |
| CommunityContext | 게시글/댓글/투표/트렌딩 | **목 데이터** |
| PhotographerContext | 사진 포스트/포토그래퍼 | Supabase + 목 데이터 병합 |
| RankContext | 포토그래퍼 등급 | 로컬 계산 |
| AwardsContext | 수상 뱃지 | 로컬 |
| ArchiveContext | 저장 콘텐츠 | 로컬 |
| ThankYouWallContext | 감사 메시지 벽 | 로컬 |
| InquiryContext | 문의 시스템 | 로컬 |
| NotificationContext | 알림 | **목 데이터** |
| MessageContext | 다이렉트 메시지 | **목 데이터** |
| AdminContext | 관리 기능 | **목 데이터** |
| TicketContext | 티켓 구매 | 로컬 |

### 4.3 인증 플로우

```
┌─ OAuth (Google/Apple/Kakao/Naver)
│   supabase.auth.signInWithOAuth()
│   → WebBrowser 열림
│   → dugoutfan://auth/callback 리디렉트
│   → exchangeCodeForSession(code)
│
├─ Email/Password
│   supabase.auth.signInWithPassword()
│   supabase.auth.signUp()
│
├─ 테스트 계정 (개발용)
│   하드코딩: test@dugout.com, test2@dugout.com, admin@dugout.com
│   AsyncStorage에 dugout_test_account 키로 영속화
│   실제 Supabase 세션 우회
│
└─ 게스트 모드
    loginAsGuest() — 로그인 없이 브라우징
    액션(좋아요/댓글 등) 시 로그인 유도
```

### 4.4 데이터 페칭 패턴

**PhotographerContext — Supabase 연동됨:**
```
초기화 시:
1. Supabase에서 photographers, photo_posts, players, events, comments, collections 조회
2. 목 데이터와 병합 (원격 ID 중복 제거 후 합침)
3. isRemote 플래그로 원격 데이터 로드 여부 추적

좋아요/팔로우 등:
1. 로컬 상태 즉시 변경 (Optimistic Update)
2. isRemote일 때만 Supabase API 호출 (fire-and-forget)
```

**CommunityContext — 목 데이터 전용:**
```
MOCK_POSTS (20개) + MOCK_COMMENTS (30개)를 useState로 관리
모든 CRUD는 로컬 상태에서만 동작
Supabase 연동 없음
```

**photographerApi.ts 주요 함수:**
- `fetchPhotographers()` — 전체 포토그래퍼 조회
- `fetchPhotoPosts()` — 사진 포스트 조회 (관계 포함)
- `fetchPhotoComments(postId)` — 댓글 조회
- `fetchPhotoCollections(photographerId)` — 컬렉션 조회
- `createPhotoPost()` — 포스트 생성
- `deletePhotoPost(postId)` — 포스트 삭제
- `togglePhotoLike(userId, type, targetId)` — 좋아요 토글
- `toggleFollow(userId, photographerId)` — 팔로우 토글
- `uploadPostImages(userId, uris)` — 이미지 업로드 (Supabase Storage)

### 4.5 주요 알고리즘

**홈 피드 혼합 (5:1 비율):**
```
- 승인된 사진 포스트 5개 + 인기 커뮤니티 글 1개
- 교대 패턴으로 페이지네이션 (20개 단위)
- 포토 콘텐츠 부족 시 비율 무시, 있는 대로 혼합
```

**트렌딩 알고리즘:**
```
점수 = (좋아요 × 2 + 댓글 × 3 + 조회수 × 0.1) × 신선도 가중치
- 48시간 윈도우
- 최소 임계값: 30점
- 최대 5개 트렌딩 포스트
- 글 변경 시 자동 재계산
```

**포토그래퍼 랭크 (현재 구현):**
```
점수 = post_count + floor(follower_count / 10)

Rookie (🌱) → 0+
Amateur (📷) → 10+
Pro (⭐) → 30+
Elite (🏆) → 70+
Legend (👑) → 150+
```

### 4.6 컴포넌트 목록 (29개)

**공통 UI (19개):**
- AnimatedCounter, ConfirmDialog, DeleteAccountModal, EmptyState
- ErrorBoundary, FadeInView, ImageEditorModal, LoadingSpinner
- PressableScale, ProgressiveImage, RankBadge, RankProgressBar
- RankUpModal, ReportSheet, Skeleton, SupportSheet
- SupportSuccessModal, TeamFilterBar, TeamSelectSheet

**커뮤니티 (2개):**
- CommunityPostCard — 하이브리드 글 카드
- TeamTabBar — 구단 수평 스크롤 탭

**포토그래퍼 (4개):**
- AwardsList, ThankYouWall, ThankYouWallFullModal, ThankYouWriteModal

**공유 레이아웃 (3개):**
- BottomSheet, BottomTabBar, HeaderBar

**어드민 (1개):**
- AdminStatCard

### 4.7 타입 시스템

주요 인터페이스:

```typescript
// UserProfile
{ id, email, username, display_name, avatar_url, bio,
  is_photographer, is_admin, admin_role, ticket_balance,
  my_team_id, created_at }

// PhotoPost
{ id, photographer_id, team_id, player_id, cheerleader_id,
  title, description, images[], like_count, comment_count,
  view_count, is_featured, status, created_at, updated_at,
  photographer, team, player, cheerleader }

// CommunityPostWithAuthor
{ id, user_id, team_id, title, content, images[],
  has_poll, like_count, comment_count, view_count,
  is_trending, is_edited, is_blinded, created_at, updated_at,
  user, team }
```

### 4.8 상수 및 설정

**KBO 10개 구단:**
SSG 랜더스, 키움 히어로즈, LG 트윈스, KT 위즈, KIA 타이거즈, NC 다이노스, 삼성 라이온즈, 롯데 자이언츠, 두산 베어스, 한화 이글스

**컬러 시스템 (라이트 모드):**
- Primary: `#1B2A4A` (딥 네이비)
- Background: `#FFFFFF`
- Surface: `#F5F7FA`
- Border: `#E5E7EB`
- Text Primary: `#1A1A2E`
- Error: `#EF4444`
- Success: `#22C55E`

---

## 5. 어드민 대시보드 (admin/)

### 5.1 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/login` | LoginPage | 관리자 로그인 |
| `/` | DashboardPage | 대시보드 (통계/감사로그) |
| `/posts` | PostReviewPage | 사진 포스트 승인/거절 |
| `/reports` | ReportPage | 신고 관리 |
| `/users` | UserPage | 사용자 관리/제재 |
| `/photographers` | PhotographerPage | 포토그래퍼 심사 |
| `/community` | CommunityManagePage | 커뮤니티 관리 |
| `/inquiries` | InquiryPage | 문의 관리 |
| `/announcements` | AnnouncementPage | 공지 관리 |
| `/notifications` | NotificationPage | 알림 전송 |
| `/revenue` | TicketRevenuePage | 수익 관리 |
| `/rank-awards` | RankAwardsPage | 등급/수상 관리 |
| `/featured` | FeaturedCollectionPage | 추천 컬렉션 |
| `/analytics` | AnalyticsPage | 분석 |
| `/events` | EventManagePage | 이벤트 관리 |
| `/ads` | AdManagementPage | 광고 관리 |
| `/teams` | TeamPage | 구단 관리 |
| `/players` | PlayerPage | 선수 관리 |
| `/cheerleaders` | CheerleaderPage | 치어리더 관리 |
| `/settings` | SystemSettingsPage | 시스템 설정 |
| `/dm-monitor` | DMMonitorPage | DM 모니터링 |
| `/blocks` | BlockManagePage | 차단 관리 |

### 5.2 인증

```javascript
// 하드코딩된 테스트 계정
'admin@dugout.com': {
  password: 'admin1234',
  user: {
    id: 'admin-001',
    email: 'admin@dugout.com',
    displayName: '관리자',
    role: 'super_admin'
  }
}
```

- localStorage에 `dugout_admin_session`으로 세션 영속화
- AuthGuard 컴포넌트로 `/login` 외 전체 라우트 보호
- 역할: `super_admin` | `moderator` (현재 super_admin만 존재)
- **RBAC(역할 기반 접근 제어) 미구현** — 모든 페이지 접근 가능

### 5.3 상태 관리

**AdminContext (580줄)** — 모든 어드민 비즈니스 로직 집중:

| 카테고리 | 상태 |
|----------|------|
| 포스트 | posts, reports, sanctions, applications, announcements, auditLogs |
| 사용자 | users (읽기 전용) |
| 야구 데이터 | teams, players, cheerleaders |
| 커뮤니티 | communityPosts, communityComments, polls, inquiries, dmConversations |
| 수익화 | adPlacements, adRevenue, ticketTransactions, ticketPackages, settlements |
| 게임화 | rankTiers, awards, blocks, collections |
| 설정 | termsDocuments, siteSettings, maintenance, appVersion |
| 분석 | visitorStats, searchKeywords, followStats |

**모든 CRUD 작업 패턴:**
1. 관련 상태 배열 업데이트
2. `addLog()` 호출 — 감사 로그 기록
3. 필요시 `addNotification()` — 자동 알림 생성

### 5.4 데이터 소스

**모든 데이터가 목(mock) 데이터이다.**
- `admin/src/data/mock.ts`에서 모든 초기 데이터 제공
- Supabase 연동 없음
- 페이지 새로고침 시 모든 변경사항 초기화

### 5.5 주요 기능

| 기능 | 상세 |
|------|------|
| 포스트 승인 | pending → approved/rejected, 거절 사유 입력 |
| 신고 처리 | delete_content, warn_user, suspend_user, dismiss |
| 사용자 제재 | warning, 7일 정지, 30일 정지, 영구 차단 |
| 포토그래퍼 심사 | 지원서 승인/거절 |
| 커뮤니티 관리 | 글/댓글 블라인드, 투표 종료, 삭제 |
| 공지 | 작성/핀/삭제 (notice/event/maintenance) |
| 야구 데이터 | 구단/선수/치어리더 CRUD |
| 수익 | 티켓 거래/정산/패키지 관리 |
| 설정 | 사이트 설정, 유지보수 모드, 앱 버전, 약관 |

---

## 6. 데이터베이스 스키마 (supabase/)

### 6.1 테이블 목록 (23개)

| # | 테이블 | 목적 | 마이그레이션 |
|---|--------|------|-------------|
| 1 | teams | KBO 10개 구단 | 001 |
| 2 | players | 선수 정보 | 001 |
| 3 | user_my_team | 사용자 마이팀 (1:1) | 001 |
| 4 | community_posts | 커뮤니티 게시글 | 002 |
| 5 | community_comments | 댓글/대댓글 (1-depth) | 002 |
| 6 | community_likes | 좋아요 (다형적) | 002 |
| 7 | community_reports | 신고 | 002 |
| 8 | community_polls | 투표 (게시글 1:1) | 003 |
| 9 | community_poll_options | 투표 선택지 | 003 |
| 10 | community_poll_votes | 투표 참여 | 003 |
| 11 | spam_filter_words | 금칙어 사전 | 004 |
| 12 | user_restrictions | 사용자 제재 | 004 |
| 13 | user_blocks | 사용자 차단 | 004 |
| 14 | recent_searches | 최근 검색어 (최대 10개) | 004 |
| 15 | photographers | 포토그래퍼 프로필 | 007 |
| 16 | photo_posts | 사진 포스트 | 007 |
| 17 | photo_likes | 사진 좋아요 (다형적) | 007 |
| 18 | photographer_follows | 팔로우 관계 | 007 |
| 19 | photo_comments | 사진 댓글 | 007 |
| 20 | photo_collections | 포토그래퍼 컬렉션 | 007 |
| 21 | photo_collection_posts | 컬렉션-포스트 연결 (M:N) | 007 |
| 22 | timeline_events | 타임라인 이벤트 | 007 |
| 23 | timeline_event_teams | 이벤트-팀 연결 (M:N) | 007 |

### 6.2 핵심 관계도

```
auth.users (Supabase Auth)
├── user_my_team (1:1) → teams
├── community_posts (1:N)
│   ├── community_comments (1:N, self-ref 1-depth)
│   ├── community_likes (polymorphic: post/comment)
│   ├── community_reports (polymorphic: post/comment)
│   └── community_polls (1:1)
│       ├── community_poll_options (1:N)
│       └── community_poll_votes (N:M)
├── user_blocks (N:N, self)
├── user_restrictions (1:N)
├── recent_searches (1:N)
├── photographers (1:1)
│   ├── photo_posts (1:N) → teams, players
│   │   ├── photo_comments (1:N)
│   │   └── photo_likes (polymorphic)
│   ├── photographer_follows (N:M with users)
│   └── photo_collections (1:N)
│       └── photo_collection_posts (M:N with photo_posts)
│
teams
├── players (1:N)
└── timeline_event_teams (M:N with timeline_events)
```

### 6.3 트리거 (20개)

| 트리거 | 기능 |
|--------|------|
| trg_community_posts_updated | updated_at 자동 갱신 |
| trg_comment_count_insert/delete | 게시글 comment_count 증감 |
| trg_like_count_insert/delete | 대상의 like_count 증감 (다형적) |
| trg_community_comments_updated | updated_at 자동 갱신 |
| trg_prevent_self_report | 자기 콘텐츠 신고 방지 |
| trg_auto_blind | 신고 5건 누적 시 자동 블라인드 |
| trg_check_poll_vote | 투표 유효성 검증 |
| trg_poll_vote_count_insert/delete | 투표 수 증감 |
| trg_limit_recent_searches | 사용자당 최근 검색 10개 제한 |
| trg_photographers_updated | updated_at 자동 갱신 |
| trg_photo_posts_updated | updated_at 자동 갱신 |
| trg_photo_posts_count | 포토그래퍼 post_count 증감 |
| trg_likes_count | photo_likes 대상 like_count 증감 |
| trg_follows_count | 포토그래퍼 follower_count 증감 |
| trg_comments_count | photo_posts comment_count 증감 |

### 6.4 RLS 정책 요약

모든 테이블에 RLS가 활성화되어 있다.

| 패턴 | 적용 테이블 |
|------|------------|
| 공개 읽기 | teams, players, photo_posts, photographers, photo_likes, photographer_follows, photo_comments, photo_collections, timeline_events |
| 본인만 읽기 | user_my_team, user_restrictions, user_blocks, recent_searches |
| 차단 사용자 필터링 포함 읽기 | community_posts, community_comments |
| 익명 읽기 허용 | community_posts(비블라인드만), community_comments |
| 본인만 쓰기/수정/삭제 | 대부분의 테이블 |
| 서비스 키 전용 | spam_filter_words |

### 6.5 스토리지

```
버킷: photo-posts
├── 공개: TRUE
├── 파일 크기 제한: 5MB
├── 허용 타입: image/jpeg, image/png, image/webp
├── 업로드: 인증 사용자, 본인 폴더(auth.uid())에만
└── 삭제: 본인 폴더만
```

### 6.6 시드 데이터

- **구단**: KBO 10개 팀 (006_seed_teams.sql)
- **포토그래퍼**: 5명의 더미 프로필 + 25개 사진 포스트 (009_seed_photographer.sql)

---

## 7. 프로토콜 vs 구현 차이 분석

프로토콜(`dugout_protocol_v2_FINAL.md`)과 개발 스펙(`dugout_dev_spec.md`)에 명시된 기획과 실제 구현 간의 차이를 정리한다.

### 7.1 구현 완료

| 기획 항목 | 구현 상태 |
|-----------|----------|
| 하단 5탭 네비게이션 | ✅ 완료 |
| 커뮤니티 게시판 (구단별 탭) | ✅ 완료 (목 데이터) |
| 커뮤니티 글 작성/수정/삭제 | ✅ 완료 (목 데이터) |
| 댓글/대댓글 (1-depth) | ✅ 완료 |
| 투표 기능 (단일/복수) | ✅ 완료 |
| 포토그래퍼 프로필/포스트 | ✅ 완료 (Supabase 연동) |
| 이미지 업로드 (Supabase Storage) | ✅ 완료 |
| OAuth 인증 (Google/Apple/Kakao) | ✅ 완료 |
| 비로그인 브라우징 (게스트 모드) | ✅ 완료 |
| 신고/차단 시스템 | ✅ 완료 |
| DB 스키마 (23 테이블, RLS) | ✅ 완료 |
| 어드민 대시보드 전체 UI | ✅ 완료 (목 데이터) |
| 홈 피드 혼합 알고리즘 (5:1) | ✅ 완료 |
| 트렌딩 알고리즘 | ✅ 완료 (클라이언트 사이드) |
| 마이팀 설정 | ✅ 완료 |
| 온보딩 화면 | ✅ 완료 |
| 딥링크 설정 | ✅ 완료 |
| 푸시 알림 설정 | ✅ 완료 (expo-notifications) |
| 후원 UI (비활성화 상태) | ✅ 완료 |
| 한국어 로컬라이징 | ✅ 완료 |

### 7.2 부분 구현 (기획 대비 누락 있음)

| 기획 항목 | 현재 상태 | 누락 사항 |
|-----------|----------|-----------|
| 커뮤니티 Supabase 연동 | ❌ 목 데이터만 | DB 스키마는 완성, 앱 연동 미완 |
| 네이버 로그인 | ⚠️ 코드 참조 있으나 | 실제 OAuth 프로바이더 설정 미확인 |
| 스팸/금칙어 필터 | ⚠️ DB 테이블만 존재 | Edge Function 미구현, 클라이언트 필터 없음 |
| 이미지 처리 파이프라인 | ⚠️ 원본 업로드만 | 리사이징/썸네일/압축 미구현 |
| NSFW 필터링 | ❌ 미구현 | DB/Edge Function 없음 |
| 자동 블라인드 (5건 신고) | ⚠️ DB 트리거만 | 앱에서 신고→Supabase 연동 미완 |
| 알림 시스템 | ⚠️ 목 데이터 | FCM 연동 없음, 서버 발송 없음 |
| DM(쪽지) 시스템 | ⚠️ 목 데이터 | DB 테이블 없음, 백엔드 미구현 |
| 닉네임 변경 30일 제한 | ❌ 미구현 | 자유 변경 가능 상태 |
| 가입 후 쿨다운 (10분) | ❌ 미구현 | |
| 도배 방지 (1분 내 2개) | ❌ 미구현 | |
| 동일 내용 반복 차단 | ❌ 미구현 | |

### 7.3 미구현

| 기획 항목 | 비고 |
|-----------|------|
| Next.js 웹 (dugoutfan.com) | 디렉토리 자체 없음 |
| Supabase Edge Functions | functions/ 디렉토리 비어있음 |
| 트렌딩 cron job (1시간) | 서버사이드 갱신 없음 |
| OG 이미지/공유 미리보기 | 웹 없으므로 미구현 |
| 카카오톡/트위터/인스타 공유 | 네이티브 공유 미구현 |
| FCM 푸시 알림 서버 | 클라이언트 설정만 존재 |
| Sentry 모니터링 | 미설치 |
| 선수 초기 데이터 (150~200명) | 시드 데이터에 선수 없음 |
| 닉네임 고유성 검증 | DB 제약조건 없음 |
| 탈퇴 시 "탈퇴한 사용자" 처리 | 로직 미구현 |
| 모더레이터 시스템 | v2 예정이나 기반 없음 |

### 7.4 프로토콜과 구현의 수치 차이

| 항목 | 프로토콜 스펙 | 실제 구현 |
|------|-------------|----------|
| 포토그래퍼 등급 기준 | Rookie→Regular(30+포스트,300+팔로워)→Pro→Master→Legend | Rookie(0)→Amateur(10)→Pro(30)→Elite(70)→Legend(150) — 점수 기반으로 단순화 |
| 사진 파일 크기 | 포토그래퍼: 30MB, 커뮤니티: 10MB | Storage 정책: 5MB 동일 |
| 트렌딩 갱신 | 서버 cron 1시간 | 클라이언트 사이드 실시간 계산 |
| 트렌딩 기준 | 최근 24시간 | 48시간 윈도우 |
| 커뮤니티 제목 제한 | 30자 | DB CHECK 30자 ✓ |
| 커뮤니티 본문 제한 | 1000자 | DB CHECK 1000자 ✓ |
| 댓글 제한 | 300자 | DB CHECK 300자 ✓ |

---

## 8. 데이터 흐름 분석

### 8.1 포토그래퍼 콘텐츠 (Supabase 연동됨)

```
[사진 업로드]
UploadPostScreen
  → photographerApi.uploadPostImages(userId, imageUris)
    → fetch(uri) → blob → supabase.storage.upload('photo-posts/{userId}/...')
    → getPublicUrl() → 공개 URL 반환
  → photographerApi.createPhotoPost({ ..., images: [urls] })
    → supabase.from('photo_posts').insert()
  → PhotographerContext.refreshData()

[피드 조회]
HomeScreen / ExploreScreen
  → PhotographerContext.photoPosts (초기화 시 로드됨)
  → Supabase에서 가져온 데이터 + 목 데이터 병합
  → PostDetail → 댓글/좋아요 (Supabase API)
```

### 8.2 커뮤니티 콘텐츠 (목 데이터만)

```
[글 작성]
CommunityWriteScreen
  → CommunityContext.createPost({ title, content, images, teamId })
  → useState 배열에 추가 (로컬만)
  → 앱 재시작 시 초기화됨

[글 조회]
CommunityMainScreen
  → CommunityContext.posts (MOCK_POSTS 기반)
  → 팀 필터, 정렬 (최신/인기/트렌딩) 적용
  → CommunityPostDetailScreen → 댓글/좋아요 (로컬만)
```

### 8.3 인증 데이터 흐름

```
[로그인 성공]
AuthContext.login()
  → Supabase 세션 획득
  → supabase.from('users').select().eq('id', session.user.id)
  → UserProfile 상태 업데이트
  → AsyncStorage에 세션 영속화

[앱 재시작]
AuthContext 초기화
  → AsyncStorage에서 test account 체크
  → Supabase onAuthStateChange 리스너
  → 세션 있으면 프로필 로드
```

### 8.4 어드민 데이터 흐름

```
[어드민 로그인]
LoginPage
  → AuthContext.login(email, password)
  → ADMIN_ACCOUNTS 하드코딩 매칭
  → localStorage에 세션 저장

[관리 작업]
AdminContext.approvePost(postId)
  → posts 상태 업데이트 (status: 'approved')
  → addLog('post_approve', postId) → auditLogs에 추가
  → addNotification('포스트가 승인되었습니다') → 알림 상태에 추가
  → 페이지 새로고침 시 모두 초기화
```

---

## 9. 잠재적 이슈 및 기술 부채

### 9.1 아키텍처 이슈

| 이슈 | 심각도 | 설명 |
|------|--------|------|
| Context 과다 (18개) | 중 | 18개 Context Provider 중첩은 리렌더링 성능 문제 가능성. 관련 없는 상태 변경에도 전체 트리 리렌더링 우려 |
| 커뮤니티 목 데이터 의존 | 상 | v1 핵심 기능인 커뮤니티가 Supabase 미연동. DB 스키마는 준비되어 있으나 앱 서비스 레이어 없음 |
| 어드민 전체 목 데이터 | 상 | 어드민 패널이 완전히 목 데이터 기반. 실제 운영 불가 |
| 단일 AdminContext (580줄) | 중 | 모든 어드민 로직이 하나의 Context에 집중. 관심사 분리 필요 |
| 앱 내 어드민 화면 | 하 | 앱에 어드민 화면이 있지만, 별도 웹 어드민도 존재. 역할 중복 |

### 9.2 보안 이슈

| 이슈 | 심각도 | 설명 |
|------|--------|------|
| 어드민 하드코딩 비밀번호 | 상 | `admin1234` 하드코딩. Supabase Auth로 전환 필요 |
| 테스트 계정 프로덕션 포함 가능성 | 상 | 테스트 계정이 코드에 하드코딩되어 있어 프로덕션 빌드에 포함될 수 있음 |
| Supabase 키 하드코딩 | 중 | dummy fallback 키가 코드에 존재. 환경 변수 관리 필요 |
| 스팸 방어 미구현 | 중 | 프로토콜에 명시된 도배/쿨다운/금칙어 필터가 전혀 구현되지 않음 |
| NSFW 필터 미구현 | 중 | 이미지 업로드에 콘텐츠 필터링 없음 |

### 9.3 데이터 일관성 이슈

| 이슈 | 심각도 | 설명 |
|------|--------|------|
| Optimistic Update 실패 무시 | 중 | `.catch(() => {})` 패턴으로 원격 실패 시 로컬/원격 불일치 |
| 목 데이터와 원격 데이터 병합 | 중 | ID 기반 중복 제거이나 구조 불일치 가능성 |
| 포토그래퍼 랭크 프로토콜 불일치 | 하 | 구현된 랭크 시스템이 프로토콜 스펙과 다름 (v2 예정이므로 당장은 무관) |
| Storage 파일 크기 제한 불일치 | 중 | 프로토콜 30MB vs 실제 5MB. 고화질 사진 업로드 제한 |

### 9.4 미완성 기능

| 기능 | 상태 | 영향 |
|------|------|------|
| 커뮤니티 → Supabase 연동 | DB 준비, 앱 미연동 | v1 런칭 블로커 |
| 어드민 → Supabase 연동 | 전혀 없음 | 운영 블로커 |
| Edge Functions | 디렉토리 비어있음 | 서버사이드 로직 없음 |
| 웹 (Next.js) | 디렉토리 없음 | 딥링크 미리보기 불가 |
| 선수 시드 데이터 | 없음 | 탐색 기능 비어있음 |

### 9.5 코드 품질

| 항목 | 관찰 |
|------|------|
| TypeScript strict | ✅ 활성화 |
| 타입 정의 | ✅ 주요 엔티티 모두 타입화 |
| 에러 바운더리 | ✅ ErrorBoundary 컴포넌트 존재 |
| 스켈레톤 로딩 | ✅ Skeleton 컴포넌트 존재 |
| 국제화 | ✅ i18next 설정 완료 |
| 테스트 코드 | ❌ 테스트 없음 |
| 린트 설정 | ❌ ESLint 설정 미확인 |
| CI/CD | ❌ 없음 |

---

## 10. 통계 요약

### 파일 수

| 카테고리 | 수 |
|----------|-----|
| 앱 화면 | 49 |
| 앱 컴포넌트 | 29 |
| 앱 Context | 18 |
| 앱 커스텀 훅 | 4 |
| 앱 서비스 | 3 |
| 앱 타입 파일 | 7 |
| 어드민 페이지 | 22 |
| 어드민 컴포넌트 | 4 |
| DB 마이그레이션 | 9 |
| DB 테이블 | 23 |
| DB 트리거 | 20 |
| RLS 정책 | ~40 |
| 문서 | 2 (기존) |

### 데이터 소스 현황

| 기능 영역 | 데이터 소스 |
|-----------|------------|
| 포토그래퍼 포스트 | Supabase + 목 병합 |
| 포토그래퍼 프로필 | Supabase + 목 병합 |
| 인증 | Supabase Auth (+ 테스트 계정) |
| 커뮤니티 전체 | 목 데이터만 |
| 알림 | 목 데이터만 |
| 메시지 | 목 데이터만 |
| 어드민 전체 | 목 데이터만 |
| 랭크/수상 | 클라이언트 로컬 계산 |
| 아카이브 | 클라이언트 로컬 |
| 차단/신고 | 클라이언트 로컬 |

### 의존성 요약

**앱 주요 의존성:**
- expo: 54.0.0
- react-native: 0.81.5
- @react-navigation/native: 7.x
- @supabase/supabase-js: 2.x
- react-i18next
- expo-image-picker, expo-notifications, expo-web-browser

**어드민 주요 의존성:**
- react: 18.3.1
- react-router-dom: 6.28.0
- vite: 6.0.1
- tailwindcss: 3.x
- lucide-react

---

> 이 보고서는 코드베이스를 객관적으로 분석한 결과이며, 프로토콜 문서와의 차이점을 포함한다. 구현 판단이나 권장 사항은 포함하지 않았다.
