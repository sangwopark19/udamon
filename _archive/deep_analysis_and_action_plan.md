# DUGOUT 심층 분석 및 작업 계획서

> **[NOTE - 2026-04-05]** 이미지/영상 스토리지가 Supabase Storage에서 Cloudflare R2로 전환됨.
> 아래 문서 내 Supabase Storage 버킷, RLS 정책, 업로드 플로우 관련 내용은 더 이상 유효하지 않음.
> 현행 구현: Edge Function(`get-upload-url`) → presigned URL → R2 직접 업로드.

> 작성일: 2026-04-03
> 기준: codebase_analysis_report.md + 실제 코드 검증
> 작업 기준: Claude Code 활용 (자동화 가능한 작업 기준 시간 산정)

---

## 목차

1. [종합 현황 요약](#1-종합-현황-요약)
2. [인증 시스템 (로그인) 분석 및 작업](#2-인증-시스템-로그인-분석-및-작업)
3. [백엔드 작업 (Supabase 연동)](#3-백엔드-작업-supabase-연동)
4. [프로토콜 vs 구현 갭 해소 계획](#4-프로토콜-vs-구현-갭-해소-계획)
5. [잠재적 이슈 및 기술 부채 해결](#5-잠재적-이슈-및-기술-부채-해결)
6. [보고서에서 누락된 추가 발견 사항](#6-보고서에서-누락된-추가-발견-사항)
7. [작업 우선순위 및 로드맵](#7-작업-우선순위-및-로드맵)
8. [총 작업 시간 요약](#8-총-작업-시간-요약)

---

## 1. 종합 현황 요약

### 프로덕션 준비도: ~25%

| 영역 | 완성도 | 블로커 여부 |
|------|--------|------------|
| 모바일 앱 UI/UX | 90% | - |
| 어드민 UI/UX | 95% | - |
| DB 스키마 (기존 기능) | 65% | **런칭 블로커** |
| 커뮤니티 → Supabase 연동 | 0% | **런칭 블로커** |
| 어드민 → Supabase 연동 | 0% | **운영 블로커** |
| 인증/보안 | 20% | **런칭 블로커** |
| Edge Functions (서버 로직) | 0% | **런칭 블로커** |
| 테스트 / CI/CD | 0% | 높음 |
| 환경변수/설정 관리 | 20% | 중간 |

### 데이터 소스 현황 (핵심 문제)

```
실제 Supabase 연동:  포토그래퍼(사진/댓글/좋아요/팔로우), 인증
목 데이터만:          커뮤니티, 알림, 메시지, 어드민 전체
DB 테이블 없음:       DM, 알림, 문의, 티켓, 정산, 수상, 포토그래퍼 승인
```

---

## 2. 인증 시스템 (로그인) 분석 및 작업

### 2.1 현재 상태

#### 모바일 앱 (AuthContext.tsx)

| 항목 | 상태 | 문제점 |
|------|------|--------|
| Google OAuth | 구현됨 | Supabase 설정 필요 확인 |
| Apple OAuth | 구현됨 | Supabase 설정 필요 확인 |
| Kakao OAuth | 구현됨 | Supabase 설정 필요 확인 |
| Naver OAuth | **미구현** | `if (provider === 'naver') return;` — 무시됨 |
| 이메일/비밀번호 | 구현됨 | Supabase Auth 사용 |
| 테스트 계정 3개 | 하드코딩 | `test@dugout.com`, `test2@dugout.com`, `admin@dugout.com` |
| 게스트 모드 | 구현됨 | 정상 |
| 세션 영속화 | 구현됨 | AsyncStorage (테스트계정도 영속화) |
| 딥링크 콜백 | 구현됨 | `dugoutfan://auth/callback` |

#### 어드민 (admin AuthContext.tsx)

| 항목 | 상태 | 문제점 |
|------|------|--------|
| 인증 방식 | 하드코딩 | `admin@dugout.com` / `admin1234` |
| 세션 저장 | localStorage | 만료 없음, 토큰 없음 |
| RBAC | 미구현 | super_admin만 존재, 역할별 접근제어 없음 |
| Supabase Auth 연동 | 없음 | 완전히 프론트엔드 전용 |

### 2.2 보안 위험 (긴급)

```
[심각] 테스트 계정이 프로덕션 빌드에 포함됨
  - test@dugout.com / test1234
  - test2@dugout.com / test1234
  - admin@dugout.com / admin1234
  → APK/IPA 디컴파일로 노출 가능

[심각] 어드민 비밀번호 클라이언트 사이드 하드코딩
  → 브라우저 소스에서 즉시 확인 가능

[중간] Supabase 더미 키 코드 내 존재
  → supabase.ts에 DUMMY_KEY fallback
  → 환경변수 없으면 무시되지만, 코드에 남아있음

[중간] 세션 만료 없음 (어드민)
  → localStorage 세션이 영구 지속
```

### 2.3 해결 작업

#### 작업 A1: 테스트 계정 환경 분리 (~30분)

```
해결 방법:
1. __DEV__ 플래그로 테스트 계정을 개발 빌드에서만 활성화
2. app/src/contexts/AuthContext.tsx에서 TEST_ACCOUNTS를 조건부로 로드
3. 프로덕션 빌드에서는 테스트 계정 코드 자체가 번들에 포함되지 않도록 처리

변경 파일:
- app/src/contexts/AuthContext.tsx (TEST_ACCOUNTS 조건부 분리)
- app/src/constants/config.ts (IS_DEV 플래그 추가)
```

#### 작업 A2: 네이버 OAuth 구현 (~1시간)

```
해결 방법:
1. Supabase OAuth provider에 네이버 추가 설정 필요 (Supabase 대시보드)
2. AuthContext.tsx에서 naver provider 핸들링 구현
3. 네이버 개발자 센터에서 앱 등록 + 콜백 URL 설정 필요

변경 파일:
- app/src/contexts/AuthContext.tsx (loginWithOAuth 함수의 naver 분기)

선행 조건: 네이버 개발자 앱 등록, Supabase 네이버 OAuth 설정
```

#### 작업 A3: 어드민 인증을 Supabase Auth로 전환 (~2시간)

```
해결 방법:
1. admin/src/contexts/AuthContext.tsx를 Supabase Auth 기반으로 재작성
2. 하드코딩 계정 제거
3. Supabase에서 admin 사용자의 is_admin, admin_role 확인
4. 세션 만료/갱신 로직 추가
5. RBAC 기본 구조 도입 (super_admin, moderator 분리)

변경 파일:
- admin/src/contexts/AuthContext.tsx (전면 재작성)
- admin/src/services/supabase.ts (신규: Supabase 클라이언트)
- admin/package.json (@supabase/supabase-js 의존성 추가)

구현 순서:
  1) Supabase 클라이언트 초기화 (admin용)
  2) 로그인 → supabase.auth.signInWithPassword()
  3) 세션 후 users 테이블에서 is_admin + admin_role 확인
  4) admin이 아니면 로그인 거부
  5) AuthGuard에 역할 기반 접근 제어 추가
```

#### 작업 A4: users 테이블 컬럼 확인/추가 (~20분)

```
현재 AuthContext에서 참조하는 users 테이블 컬럼:
  id, email, username, display_name, avatar_url, bio,
  is_photographer, is_admin, admin_role, ticket_balance,
  my_team_id, created_at

확인 필요: users 테이블이 마이그레이션에 없음 (Supabase Auth 기본 테이블 + 커스텀 확장)
→ users 테이블 스키마를 마이그레이션으로 명시적 관리 필요

변경 파일:
- supabase/migrations/010_users_profile.sql (신규)
```

#### 작업 A5: 닉네임 변경 30일 제한 구현 (~30분)

```
해결 방법:
1. users 테이블에 nickname_changed_at 컬럼 추가
2. 닉네임 변경 시 30일 이내면 거부하는 RLS 정책 또는 Edge Function
3. 앱 프로필 편집 화면에서 제한 UI 표시

변경 파일:
- supabase/migrations/010_users_profile.sql
- app/src/screens/EditProfile 관련 (UI에 제한 표시)
```

**인증 관련 총 작업 시간: ~4시간 20분**

---

## 3. 백엔드 작업 (Supabase 연동)

### 3.1 누락 DB 테이블 생성

현재 23개 테이블이 있으나, 어드민과 앱에서 참조하는 기능 대비 **최소 8개 테이블이 추가 필요**하다.

#### 작업 B1: 누락 테이블 마이그레이션 (~2시간)

| 테이블 | 용도 | 우선순위 |
|--------|------|----------|
| `users` (확장) | 프로필 확장 (nickname_changed_at, deleted_at 등) | 필수 |
| `notifications` | 알림 시스템 | 필수 |
| `direct_messages` + `dm_conversations` | DM 시스템 | v1 보류 가능 |
| `inquiries` | 문의 시스템 | 필수 |
| `announcements` | 공지사항 | 필수 |
| `photographer_applications` | 포토그래퍼 승인 신청 | 필수 |
| `audit_logs` | 어드민 감사 로그 | 필수 |
| `site_settings` | 사이트 설정 (유지보수 모드 등) | 필수 |

```
변경 파일:
- supabase/migrations/010_users_profile.sql
- supabase/migrations/011_notifications.sql
- supabase/migrations/012_inquiries_announcements.sql
- supabase/migrations/013_photographer_applications.sql
- supabase/migrations/014_admin_system.sql (audit_logs, site_settings)
- supabase/migrations/015_rls_new_tables.sql

각 테이블:
  - CREATE TABLE + 인덱스
  - RLS 정책 (공개 읽기 / 본인 쓰기 / admin 전체 접근)
  - 필요한 트리거 (updated_at 자동 갱신 등)
```

### 3.2 커뮤니티 Supabase 연동 (v1 런칭 블로커)

DB 스키마(002, 003, 004)는 이미 준비되어 있으나, 앱의 CommunityContext가 100% 목 데이터이다.

#### 작업 B2: communityApi.ts 서비스 레이어 생성 (~3시간)

```
신규 파일: app/src/services/communityApi.ts

구현할 함수:
  - fetchPosts(teamId?, sort, page, limit) → community_posts + user join
  - fetchPostById(postId) → 단일 게시글 + 댓글 + 투표
  - createPost({ title, content, images, teamId, poll? })
  - updatePost(postId, { title, content })
  - deletePost(postId)
  - fetchComments(postId) → community_comments (parent_comment_id 포함)
  - createComment(postId, { content, parentId? })
  - deleteComment(commentId)
  - toggleLike(userId, targetType, targetId) → community_likes
  - reportContent(targetType, targetId, reason) → community_reports
  - fetchPoll(postId) → community_polls + options + 본인 투표 여부
  - votePoll(pollId, optionIds[])
  - fetchTrendingPosts() → 트렌딩 점수 기반 조회

패턴: photographerApi.ts와 동일한 ApiResult<T> 반환 패턴 사용
```

#### 작업 B3: CommunityContext.tsx Supabase 전환 (~3시간)

```
변경 파일: app/src/contexts/CommunityContext.tsx

작업 내용:
1. MOCK_POSTS, MOCK_COMMENTS 의존 제거
2. isSupabaseConfigured 체크 → mock fallback 유지 (개발 편의)
3. 초기화 시 communityApi.fetchPosts() 호출
4. 페이지네이션 구현 (현재 없음 → 무한 스크롤)
5. Optimistic Update + 실패 시 롤백 패턴 적용
6. Supabase Realtime 구독 (새 글/댓글 실시간 반영)
7. 트렌딩 계산을 서버 사이드로 이동 (Edge Function)
8. 이미지 업로드 → Supabase Storage (community-posts 버킷 추가)

주의사항:
- 현재 CURRENT_USER_ID가 'u1'로 하드코딩 → AuthContext.user.id 사용
- 현재 team_id가 slug → DB는 UUID → slug 매핑 필요 (photographerApi 패턴 참조)
```

#### 작업 B4: 커뮤니티 이미지 스토리지 버킷 (~20분)

```
현재 photo-posts 버킷만 존재.
커뮤니티 이미지용 별도 버킷 또는 같은 버킷 내 경로 분리 필요.

변경 파일:
- supabase/migrations/016_community_storage.sql
  - community-posts 버킷 생성
  - RLS: 인증 사용자 업로드, 본인 폴더만, 5MB 제한
  - 공개 읽기 허용
```

### 3.3 어드민 Supabase 연동 (운영 블로커)

#### 작업 B5: adminApi.ts 서비스 레이어 생성 (~4시간)

```
신규 파일: admin/src/services/adminApi.ts

카테고리별 함수:

[포스트 관리]
  - fetchPendingPosts() → photo_posts WHERE status='pending'
  - approvePost(postId) / rejectPost(postId, reason)

[신고 관리]
  - fetchReports(status?) → community_reports + 대상 콘텐츠 join
  - resolveReport(reportId, action) → 처리 + audit_log

[사용자 관리]
  - fetchUsers(page, search?) → users 테이블
  - sanctionUser(userId, type, duration, reason) → user_restrictions INSERT
  - unsanctionUser(userId) → user_restrictions DELETE

[포토그래퍼 심사]
  - fetchApplications(status?) → photographer_applications
  - approveApplication(appId) → photographers INSERT + 알림
  - rejectApplication(appId, reason)

[커뮤니티 관리]
  - fetchCommunityPosts(filter?) → community_posts
  - blindPost(postId) / unblindPost(postId)
  - fetchCommunityComments(filter?)
  - deleteComment(commentId)

[공지/알림]
  - fetchAnnouncements() → announcements
  - createAnnouncement(data) / updateAnnouncement(id, data)
  - sendNotification(targetUsers[], message)

[데이터 관리]
  - CRUD for teams, players (이미 DB에 있음)
  - fetchAuditLogs(page, filter?)

[통계/분석]
  - getDashboardStats() → 각 테이블 count 집계
  - getRecentActivity() → audit_logs 최근 항목
```

#### 작업 B6: AdminContext.tsx 리팩토링 + Supabase 전환 (~5시간)

```
현재 문제: 580줄짜리 단일 Context에 31개 mock 상태 + 80개 함수

해결 전략: 관심사별 Context 분리 + API 연동

분리 구조:
  admin/src/contexts/
    ├── AdminAuthContext.tsx    (인증, RBAC)
    ├── PostManageContext.tsx   (포스트 승인/거절)
    ├── UserManageContext.tsx   (사용자/제재/차단)
    ├── CommunityManageContext.tsx (커뮤니티 관리)
    ├── ContentManageContext.tsx   (공지/알림/문의)
    ├── DataManageContext.tsx   (팀/선수/치어리더)
    └── DashboardContext.tsx    (통계/감사로그)

각 Context:
  1) 초기 데이터 → adminApi 함수 호출로 로드
  2) 변경 작업 → adminApi 함수 호출 + 로컬 상태 업데이트
  3) 에러 핸들링 + 토스트 알림
  4) 감사 로그 자동 기록 (audit_logs INSERT)
```

### 3.4 Edge Functions 구현

#### 작업 B7: 핵심 Edge Functions (~4시간)

```
supabase/functions/ 디렉토리가 완전히 비어있음.
최소한 다음 함수들이 필요:

1. spam-filter/index.ts (~45분)
   - 글/댓글 작성 시 호출
   - spam_filter_words 테이블에서 금칙어 매칭
   - 매칭 시 작성 거부 + 사유 반환
   - 도배 방지: 1분 내 2개 이상 작성 시 거부
   - 동일 내용 반복 차단

2. trending-calculator/index.ts (~30분)
   - cron job으로 1시간마다 실행
   - community_posts의 트렌딩 점수 계산
   - is_trending 플래그 업데이트
   - 프로토콜: 24시간 윈도우 (현재 48시간 → 수정)

3. image-processor/index.ts (~1시간)
   - Storage에 이미지 업로드 트리거
   - 썸네일 생성 (400x400)
   - 중간 사이즈 (800px 너비)
   - WebP 변환으로 용량 최적화
   - 원본 보존

4. notification-sender/index.ts (~45분)
   - 새 댓글, 좋아요, 팔로우 시 알림 생성
   - notifications 테이블 INSERT
   - (v2) FCM 푸시 발송 연동

5. signup-cooldown/index.ts (~30분)
   - 가입 후 10분 쿨다운 체크
   - 글 작성 API에서 호출
   - users.created_at + 10분 비교

6. auto-moderation/index.ts (~30분)
   - 신고 5건 누적 → 자동 블라인드 (트리거는 있으나 앱 연동 필요)
   - 신고 후 어드민 알림 생성
```

### 3.5 Supabase Realtime 설정

#### 작업 B8: 실시간 기능 (~1시간 30분)

```
커뮤니티와 알림에 실시간 업데이트가 필요:

1. 커뮤니티 실시간 (~45분)
   - community_posts INSERT → 새 글 피드 반영
   - community_comments INSERT → 댓글 실시간
   - community_likes INSERT/DELETE → 좋아요 수 실시간

2. 알림 실시간 (~45분)
   - notifications INSERT → 앱 알림 뱃지 + 목록 갱신
   - Supabase Realtime channel 구독
   - 앱 포그라운드/백그라운드 분기
```

**백엔드 관련 총 작업 시간: ~19시간 20분**

---

## 4. 프로토콜 vs 구현 갭 해소 계획

### 4.1 수치/로직 차이 수정

#### 작업 C1: 프로토콜 스펙 정렬 (~1시간 30분)

| 항목 | 프로토콜 | 현재 구현 | 수정 방법 |
|------|---------|----------|----------|
| 파일 크기 제한 | 포토 30MB, 커뮤니티 10MB | 5MB 동일 | Storage 정책 수정: 포토→30MB, 커뮤니티→10MB |
| 트렌딩 윈도우 | 24시간 | 48시간 | TRENDING_WINDOW_MS 수정 |
| 트렌딩 갱신 | 서버 cron 1시간 | 클라이언트 실시간 | Edge Function + cron으로 이동 (B7에 포함) |
| 포토그래퍼 등급 | 복합 기준 (포스트+팔로워) | 단순 점수 | v2 예정이므로 현재 유지, 프로토콜 기준 코멘트 추가 |

```
변경 파일:
- supabase/migrations/007_photographer.sql 또는 신규 migration (Storage 정책)
- app/src/contexts/CommunityContext.tsx (TRENDING_WINDOW_MS)
```

### 4.2 미구현 프로토콜 기능 구현

#### 작업 C2: 도배/스팸 방지 체계 (~1시간)

```
프로토콜 요구사항:
  - 가입 후 10분 쿨다운
  - 1분 내 2개 이상 글 작성 금지
  - 동일 내용 반복 차단
  - 금칙어 필터

구현 방법:
  Edge Function (B7의 spam-filter, signup-cooldown)에서 처리
  + 앱에서 작성 전 클라이언트 사이드 1차 필터링 (UX 개선)

변경 파일:
- app/src/services/communityApi.ts (작성 전 쿨다운 체크 호출)
- app/src/contexts/CommunityContext.tsx (에러 메시지 표시)
```

#### 작업 C3: 닉네임 고유성 검증 (~30분)

```
프로토콜: 닉네임 중복 불가
현재: DB 제약 없음

구현:
1. users 테이블에 username UNIQUE 제약 추가
2. 프로필 편집에서 실시간 중복 체크 API 호출
3. 회원가입/온보딩에서도 체크

변경 파일:
- supabase/migrations/010_users_profile.sql (UNIQUE 제약)
- app/src/screens 관련 (중복 체크 UI)
```

#### 작업 C4: 탈퇴 시 "탈퇴한 사용자" 처리 (~45분)

```
프로토콜: 탈퇴 시 콘텐츠는 유지하되 작성자를 "탈퇴한 사용자"로 표시
현재: 로직 없음

구현:
1. users 테이블에 deleted_at, is_deleted 컬럼 추가
2. 탈퇴 → soft delete (is_deleted=true, display_name='탈퇴한 사용자')
3. 앱에서 탈퇴 사용자의 프로필/댓글 표시 처리
4. RLS에서 탈퇴 사용자 데이터 보호

변경 파일:
- supabase/migrations/010_users_profile.sql
- app/src/screens/AccountManagement (탈퇴 로직)
- app/src/components/CommunityPostCard 등 (표시 처리)
```

#### 작업 C5: 네이티브 공유 기능 (~1시간)

```
프로토콜: 카카오톡, 트위터, 인스타 공유
현재: 미구현

구현:
1. expo-sharing 또는 react-native-share 패키지 활용
2. 딥링크 URL 생성 (dugoutfan.com/post/:id)
3. 공유 시트 (iOS/Android 네이티브) 호출
4. 포토 공유 시 이미지 포함

변경 파일:
- app/package.json (패키지 추가)
- app/src/components/ShareSheet.tsx (신규)
- 각 Detail 화면에 공유 버튼 연결
```

#### 작업 C6: 선수 시드 데이터 (~1시간)

```
프로토콜: 150~200명의 KBO 선수 데이터
현재: 시드에 선수 없음, 구단만 있음

구현:
1. KBO 10개 구단의 주요 선수 데이터 수집
2. 시드 SQL 작성 (이름, 등번호, 포지션, 구단 FK)
3. 마이그레이션으로 관리

변경 파일:
- supabase/migrations/017_seed_players.sql
```

**프로토콜 갭 해소 총 작업 시간: ~5시간 45분**

---

## 5. 잠재적 이슈 및 기술 부채 해결

### 5.1 아키텍처 이슈

#### 작업 D1: Context Provider 최적화 (~2시간)

```
현재: 18개 Context 중첩 → 리렌더링 cascade 위험

해결 전략:
  1단계 (즉시): useMemo/useCallback으로 Context value 메모이제이션
    - 각 Context의 value를 useMemo로 감싸기
    - 핸들러 함수를 useCallback으로 감싸기
    → 불필요한 리렌더링 대폭 감소

  2단계 (v2): Zustand 등 상태관리 라이브러리 전환 검토
    - 18개 Context → 3~5개 store로 통합 가능
    - 선택적 구독 (selector 패턴)으로 리렌더링 최소화

변경 파일 (1단계):
- app/src/contexts/*.tsx (각 Context의 Provider value를 useMemo로)
```

#### 작업 D2: Optimistic Update 실패 핸들링 (~1시간)

```
현재 문제: .catch(() => {}) 패턴 → 원격 실패 무시
PhotographerContext.tsx에서 fire-and-forget으로 API 호출

해결 방법:
1. API 실패 시 로컬 상태 롤백
2. 토스트 에러 메시지 표시
3. 재시도 가능한 큐 패턴 도입 (선택)

변경 파일:
- app/src/contexts/PhotographerContext.tsx (catch 블록에 롤백 + 토스트)
- app/src/contexts/CommunityContext.tsx (B3에서 처음부터 올바르게 구현)
```

#### 작업 D3: 목 데이터와 원격 데이터 병합 로직 정리 (~1시간)

```
현재: PhotographerContext에서 Supabase 데이터 + mock 데이터를 ID 기반으로 병합
문제: 구조 불일치, mock 데이터가 프로덕션에서도 표시될 수 있음

해결 방법:
1. isSupabaseConfigured가 true이면 mock 병합 완전 비활성화
2. mock 데이터는 개발 환경에서만 사용
3. __DEV__ 플래그로 분기

변경 파일:
- app/src/contexts/PhotographerContext.tsx
- app/src/data/mockPhotographers.ts (__DEV__ 가드)
```

### 5.2 보안 이슈

#### 작업 D4: 환경 변수 관리 체계 구축 (~30분)

```
현재: .env 파일 존재 여부 불확실, .env.example 없음, .gitignore 미확인

해결:
1. .env.example 파일 생성 (필요 변수 목록)
2. .gitignore에 .env*, credentials 패턴 추가 확인
3. Supabase 더미 키 코드에서 제거

변경 파일:
- .gitignore (루트, app/, admin/)
- app/.env.example (신규)
- admin/.env.example (신규)
- app/src/services/supabase.ts (DUMMY_KEY 제거)
```

#### 작업 D5: NSFW/이미지 필터링 기초 (~1시간 30분)

```
프로토콜: 이미지 업로드에 콘텐츠 필터링
현재: 전혀 없음

구현 방법 (v1 최소):
1. Edge Function에서 이미지 업로드 후 외부 API 호출 (Google Vision API 등)
2. 위반 감지 시 → 상태를 'review_required'로 변경
3. 어드민에서 수동 확인 후 승인/거절

대안 (비용 절감):
- v1에서는 모든 사진을 수동 승인으로 처리 (이미 포스트 승인 시스템 있음)
- NSFW 자동 감지는 v2로 미루기

변경 파일 (v1 최소):
- supabase/functions/image-processor/index.ts에 NSFW 체크 훅 자리 마련
```

### 5.3 데이터 일관성

#### 작업 D6: Storage 파일 크기 정책 수정 (~20분)

```
현재: photo-posts 버킷 5MB 제한
프로토콜: 포토그래퍼 30MB, 커뮤니티 10MB

해결:
- photo-posts 버킷 → 30MB
- community-posts 버킷(신규) → 10MB
- 클라이언트에서도 업로드 전 크기 체크

변경 파일:
- supabase/migrations (Storage 정책 수정)
- app/src/services/photographerApi.ts (업로드 전 30MB 체크)
- app/src/services/communityApi.ts (업로드 전 10MB 체크)
```

**기술 부채 해결 총 작업 시간: ~6시간 20분**

---

## 6. 보고서에서 누락된 추가 발견 사항

기존 분석 보고서에서 다루지 않았으나 코드 검증 중 발견된 이슈들:

### 6.1 앱/어드민 간 타입 불일치

```
문제:
  - app/src/types/와 admin/src/types/가 독립적으로 관리됨
  - 같은 엔티티(PhotoPost, User 등)의 타입 정의가 다를 수 있음
  - 공유 타입 패키지 없음

영향: 앱과 어드민이 같은 DB를 바라볼 때 필드 불일치 가능

해결 (작업 E1, ~1시간):
  - shared/types/ 디렉토리 생성
  - 공통 인터페이스 추출 (User, PhotoPost, Community 등)
  - app과 admin에서 import
  - 또는 Supabase CLI의 타입 자동 생성 활용: supabase gen types typescript
```

### 6.2 모노레포 구조 부재

```
문제:
  - app/과 admin/이 독립 프로젝트로 존재
  - 루트 package.json 없음
  - 공유 의존성/스크립트 관리 불가

영향: 개발 효율성 저하, 일관성 유지 어려움

해결 (작업 E2, ~1시간):
  - 루트 package.json 추가 (workspaces 설정)
  - 공통 스크립트: lint, typecheck, test
  - 또는 turborepo/nx 도입 검토
```

### 6.3 에러 모니터링 부재

```
문제:
  - Sentry 미설치 (보고서에 언급됨)
  - 앱 크래시/에러 추적 불가
  - ErrorBoundary는 있으나 외부 리포팅 없음

해결 (작업 E3, ~45분):
  - expo-sentry (Sentry SDK for Expo) 설치
  - ErrorBoundary에서 Sentry.captureException() 호출
  - 환경별 DSN 설정

변경 파일:
  - app/package.json
  - app/App.tsx (Sentry.init)
  - app/src/components/ErrorBoundary.tsx (Sentry 연동)
```

### 6.4 푸시 알림 서버사이드 부재

```
문제:
  - expo-notifications는 설치되어 있음
  - 클라이언트에서 토큰 획득 코드는 있을 수 있음
  - 하지만 서버에서 푸시를 보내는 로직이 전혀 없음
  - FCM 설정 없음

해결 (작업 E4, ~2시간):
  1. FCM 프로젝트 설정 (수동, Claude Code 외부 작업)
  2. 앱에서 FCM 토큰 획득 → users 테이블에 저장
  3. Edge Function: notification-push/index.ts
     - notifications 테이블 INSERT 트리거
     - Expo Push API 또는 FCM HTTP v1 API로 발송
  4. app.json에 FCM 설정 추가

변경 파일:
  - supabase/functions/notification-push/index.ts (신규)
  - app/src/contexts/NotificationContext.tsx (토큰 등록)
  - supabase/migrations/010_users_profile.sql (fcm_token 컬럼)
```

### 6.5 검색 기능 백엔드 부재

```
문제:
  - recent_searches 테이블은 있음
  - 하지만 실제 검색 API(전문 검색)가 없음
  - 앱 ExploreScreen에서 검색 시 어떤 데이터를 조회하는지 불명확

해결 (작업 E5, ~1시간):
  1. PostgreSQL Full-Text Search 설정
  2. community_posts, photo_posts에 tsvector 컬럼 + GIN 인덱스
  3. searchApi.ts 서비스 함수: 통합 검색 (포스트 + 포토 + 사용자)
  4. recent_searches 연동 (저장/조회/삭제)

변경 파일:
  - supabase/migrations/018_search_index.sql (FTS 설정)
  - app/src/services/searchApi.ts (신규)
```

### 6.6 이미지 최적화 파이프라인 부재

```
문제:
  - 원본 이미지만 업로드, 리사이징/압축 없음
  - 홈 피드에서 원본 이미지 로딩 → 네트워크/성능 문제

해결 (작업 E6, ~1시간 30분):
  - Edge Function (B7의 image-processor)에서 처리
  - 업로드 후 3가지 사이즈 생성: thumb(200), medium(800), original
  - photo_posts 테이블에 image_variants JSONB 컬럼 추가
  - 피드에서는 medium, 상세에서는 original 사용
  - ProgressiveImage 컴포넌트 활용 (이미 있음)

변경 파일:
  - supabase/functions/image-processor/index.ts
  - supabase/migrations (image_variants 컬럼)
  - app/src/components/ProgressiveImage.tsx (variant 지원)
```

### 6.7 Rate Limiting 없음

```
문제:
  - API 호출에 대한 제한이 전혀 없음
  - Supabase의 기본 Rate Limiting에만 의존
  - 악성 클라이언트가 대량 요청 가능

해결 (작업 E7, ~30분):
  - Supabase RLS + Edge Function 조합으로 제한
  - 글 작성: user당 분당 2개
  - 댓글: user당 분당 5개
  - 좋아요: user당 분당 30개
  - Edge Function에서 user_restrictions 또는 별도 rate_limits 테이블 체크
```

### 6.8 앱 내 어드민 화면과 웹 어드민 중복

```
문제:
  - 앱 내에 AdminDashboard, AdminPostReview 등 6개 화면 존재
  - 별도 admin/ 웹 앱도 존재
  - 기능 중복 + 유지보수 비용 증가

해결 (작업 E8, ~30분):
  - v1에서는 앱 내 어드민 화면을 비활성화 또는 웹 어드민으로 리디렉트
  - 앱 내 어드민은 간단한 통계 뷰어 정도만 유지
  - 또는 WebView로 admin 웹앱 로드

변경 파일:
  - app/src/screens/Admin* (비활성화 또는 WebView 전환)
  - app/src/navigation/ (어드민 라우트 조건부 표시)
```

**추가 발견 사항 총 작업 시간: ~8시간 15분**

---

## 7. 작업 우선순위 및 로드맵

### Phase 1: 런칭 블로커 해소 (~16시간)

v1 런칭을 위해 반드시 필요한 작업들.

| 순서 | 작업 | 시간 | 의존성 |
|------|------|------|--------|
| 1 | A1: 테스트 계정 환경 분리 | 30분 | - |
| 2 | A4: users 테이블 마이그레이션 | 20분 | - |
| 3 | D4: 환경 변수 관리 (.gitignore, .env.example) | 30분 | - |
| 4 | B1: 누락 DB 테이블 생성 | 2시간 | A4 |
| 5 | B2: communityApi.ts 서비스 레이어 | 3시간 | B1 |
| 6 | B3: CommunityContext Supabase 전환 | 3시간 | B2 |
| 7 | B4: 커뮤니티 이미지 스토리지 | 20분 | B1 |
| 8 | B7-1: spam-filter Edge Function | 45분 | B1 |
| 9 | B7-2: trending-calculator Edge Function | 30분 | B1 |
| 10 | C1: 프로토콜 수치 정렬 | 1시간 30분 | B3 |
| 11 | C2: 도배/스팸 방지 | 1시간 | B7-1 |
| 12 | C3: 닉네임 고유성 | 30분 | A4 |
| 13 | C6: 선수 시드 데이터 | 1시간 | - |
| 14 | D3: mock/remote 데이터 병합 정리 | 1시간 | B3 |

### Phase 2: 운영 준비 (~12시간)

서비스 운영에 필요한 어드민 연동과 보안.

| 순서 | 작업 | 시간 | 의존성 |
|------|------|------|--------|
| 1 | A3: 어드민 Supabase Auth 전환 | 2시간 | B1 |
| 2 | B5: adminApi.ts 서비스 레이어 | 4시간 | B1 |
| 3 | B6: AdminContext 분리 + 연동 | 5시간 | B5 |
| 4 | D2: Optimistic Update 실패 핸들링 | 1시간 | B3 |

### Phase 3: 품질/안정성 (~8시간)

서비스 품질 향상과 안정성 확보.

| 순서 | 작업 | 시간 | 의존성 |
|------|------|------|--------|
| 1 | B7-3: image-processor Edge Function | 1시간 | - |
| 2 | B7-4: notification-sender Edge Function | 45분 | B1 |
| 3 | B8: Realtime 기능 | 1시간 30분 | B3 |
| 4 | E3: Sentry 에러 모니터링 | 45분 | - |
| 5 | D1: Context Provider 최적화 | 2시간 | - |
| 6 | E5: 검색 기능 백엔드 | 1시간 | B1 |
| 7 | C4: 탈퇴 처리 | 45분 | A4 |

### Phase 4: 확장 기능 (~8시간)

v1 이후 또는 여유 시 진행.

| 순서 | 작업 | 시간 | 의존성 |
|------|------|------|--------|
| 1 | A2: 네이버 OAuth | 1시간 | 외부 설정 필요 |
| 2 | A5: 닉네임 변경 30일 제한 | 30분 | A4 |
| 3 | C5: 네이티브 공유 | 1시간 | - |
| 4 | E1: 공유 타입 패키지 | 1시간 | - |
| 5 | E2: 모노레포 구조 | 1시간 | - |
| 6 | E4: 푸시 알림 서버 | 2시간 | B7-4, 외부 설정 필요 |
| 7 | D5: NSFW 필터링 | 1시간 30분 | B7-3 |
| 8 | E6: 이미지 최적화 파이프라인 | (B7-3에 포함) | - |

---

## 8. 총 작업 시간 요약

| 카테고리 | 작업 시간 |
|----------|----------|
| 인증 시스템 (A1~A5) | 4시간 20분 |
| 백엔드/Supabase (B1~B8) | 19시간 20분 |
| 프로토콜 갭 (C1~C6) | 5시간 45분 |
| 기술 부채 (D1~D6) | 6시간 20분 |
| 추가 발견 (E1~E8) | 8시간 15분 |
| **총계** | **~44시간** |

### Phase별 요약

| Phase | 범위 | 시간 | 중요도 |
|-------|------|------|--------|
| Phase 1: 런칭 블로커 | 커뮤니티 연동 + 보안 기초 + DB | ~16시간 | **필수** |
| Phase 2: 운영 준비 | 어드민 연동 + 안정성 | ~12시간 | **필수** |
| Phase 3: 품질/안정성 | 이미지, 실시간, 모니터링 | ~8시간 | 권장 |
| Phase 4: 확장 기능 | OAuth, 공유, 푸시, 구조 개선 | ~8시간 | 선택 |

### 참고사항

- 시간은 **Claude Code로 코드 작성하는 시간**만 산정. 실제 테스트/디버깅 시간은 별도.
- Supabase 대시보드 설정 (OAuth provider, Storage, FCM 등)은 **수동 작업**으로 별도 필요.
- 선수 데이터 수집 (C6)은 데이터 소싱에 따라 시간 변동 가능.
- Phase 1~2가 완료되면 **v1 런칭 가능 상태**.

---

> 이 문서는 codebase_analysis_report.md를 기반으로, 실제 코드를 검증하여 작성한 실행 계획서이다.
> 각 작업의 변경 파일과 구현 방법은 실제 코드 구조를 기준으로 한다.
