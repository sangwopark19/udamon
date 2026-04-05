# UDAMON PRD v1.0

> 작성일: 2026-04-05
> 기준: 화상미팅(2026-04-03) 확인 사항 + codebase 분석 + 기능명세서 + 서비스정의서
> 목표: v1 런칭 (2026년 5월 중순 이전)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | UDAMON (우다몬) |
| 도메인 | udamonfan.com (미구입 — 클라이언트 구입 필요) |
| 대상 | KBO 팬 + 팬 포토그래퍼 |
| 법인 | 헤이디 |
| 앱 플랫폼 | iOS / Android (React Native Expo SDK 54) |
| 어드민 | Web (React 18 + Vite 6 + Tailwind CSS 3) |
| 백엔드 | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| 언어 | TypeScript (strict) |
| 상태관리 | Context API |
| v1 목표 런칭 | 2026년 5월 중순 이전 |

---

## 2. 작업 범위

**전체 백엔드 + 프론트엔드 연동** — 인증부터 어드민까지 모든 영역을 포함합니다.

| 영역 | 포함 | 설명 |
|------|------|------|
| 인증 (OAuth) | O | Google/Apple/Kakao/Naver 4종 키 발급부터 연동까지 |
| 커뮤니티 Supabase 연동 | O | 게시글/댓글/투표/좋아요/신고 전체 |
| 포토그래퍼 연동 완성 | O | 부분 연동 → 완전 연동 (영상 포함) |
| 어드민 웹 Supabase 연동 | O | 전체 20페이지 |
| DB 스키마 신규/수정 | O | users, notifications 등 누락 테이블 전체 |
| Edge Functions | O | 이미지 처리, 트렌딩, 알림 등 |
| 앱 프론트엔드 수정 | O | Context → Supabase 전환, 에러 UI 등 |
| 어드민 프론트엔드 수정 | O | 목 데이터 → Supabase 전환 |
| 보안 정리 | O | 테스트 계정 제거, 환경변수, 어드민 Auth |
| EAS 빌드 | O | development 프로필 빌드, 스토어 제출은 클라이언트 |

---

## 3. v1 기능 범위

### 3.1 포함 기능

#### 3.1.1 인증

| 기능 | 상세 |
|------|------|
| Google OAuth | Cloud Console 설정 + Supabase provider 활성화 |
| Apple Sign In | Apple Developer 등록 완료 후 (현재 DUNS 대기 — **블로커**) |
| Kakao 로그인 | Kakao Developers 앱 등록 + Supabase Custom OIDC |
| Naver 로그인 | Naver Developers 앱 등록 + Supabase Custom OIDC |
| 이메일/비밀번호 | Supabase Auth 기본 제공 |
| 비밀번호 찾기 | Supabase `resetPasswordForEmail` |
| 테스트 계정 제거 | 보안 — 프로덕션 빌드에서 완전 제거 |
| 어드민 인증 전환 | 하드코딩(admin@udamon.com/admin1234) → Supabase Auth |

#### 3.1.2 커뮤니티

| 기능 | 상세 |
|------|------|
| 게시판 | 구단별(10개) + 전체 게시판 |
| 게시글 CRUD | 제목 1~30자, 본문 1~1000자 |
| 이미지 첨부 | 최대 10장, **영상 미지원** |
| 댓글/대댓글 | 1-depth 대댓글, 300자, soft delete |
| 좋아요 | 게시글/댓글 대상, 중복 방지 |
| 투표 | 단일/복수 선택, 선택지 2~6개, 만료 시간(24시간/3일/7일) |
| 신고 | **관리자 수동 처리** (자동 블라인드 제거) |
| 트렌딩 | 24시간 윈도우, 좋아요 + 댓글 합산 |
| 검색 | DB 기반 — 선수명, 게시글 제목/내용 |
| 최근 검색어 | 사용자당 최대 10개 |

#### 3.1.3 포토그래퍼

| 기능 | 상세 |
|------|------|
| 프로필 | 팔로우, 검증 배지, 포토그래퍼 전환 |
| 게시물 | **이미지 최대 7장 + 영상 최대 3개** = 총 10개 |
| 컬렉션 | 포토그래퍼별 컬렉션 관리 |
| 타임라인 | 경기 이벤트별 사진 모음 |
| 심사 | 관리자 수동 승인/반려 (photographer_applications 테이블) |
| 등급 | 현재 로직 유지 — 포스트 수 + 팔로워/10 |

#### 3.1.4 알림

| 기능 | 상세 |
|------|------|
| 인앱 알림 | notifications 테이블 기반 알림 시스템 |
| FCM 푸시 | Firebase 프로젝트 설정 후 구현 (클라이언트 확인 필요) |

#### 3.1.5 이미지/미디어 처리

| 기능 | 상세 |
|------|------|
| 이미지 리사이징 | Edge Function으로 리사이징/최적화 |
| 썸네일 생성 | 피드 성능 개선 |
| 영상 업로드 | Supabase Storage |
| 영상 재생 | 앱 내 네이티브 재생 |
| 파일 크기 제한 | **TBD** — 클라이언트("도하님") 결정 대기 |

#### 3.1.6 사용자 정책

| 항목 | 결정 |
|------|------|
| 닉네임 변경 | 30일 제한 |
| 닉네임 고유성 | 중복 불가 (UNIQUE 제약) |
| 가입 후 쿨다운 | 없음 |
| 회원 탈퇴 | soft delete — 콘텐츠 유지, "탈퇴한 사용자" 표시 |
| 사용자 차단 | 차단한 사용자 글 숨김 |
| 도배 방지 | v1 미적용 |
| 동일 내용 반복 | v1 미적용 |

#### 3.1.7 어드민 웹 (전체 20페이지 Supabase 연동)

| 페이지 | v1 연동 | 비고 |
|--------|---------|------|
| 대시보드 | **실제 데이터** | DAU/WAU/MAU, 가입 추이 등 |
| 사용자 관리 | O | 조회, 제재, 차단 |
| 커뮤니티 관리 | O | 게시글 검수, 블라인드 수동 처리 |
| 게시글 검수 | O | |
| 신고 관리 | O | |
| 포토그래퍼 관리 | O | 심사 승인/반려 |
| 선수 관리 | O | CRUD — 어드민에서 직접 관리 |
| 구단 관리 | O | |
| 치어리더 관리 | O | 선수와 동일 개념, CRUD |
| 공지사항 관리 | O | |
| 문의 관리 | O | |
| 차단/제재 관리 | O | |
| 이벤트 관리 | O | |
| 컬렉션 관리 | O | |
| 광고 관리 | O | |
| 알림 관리 | O | |
| 랭크/어워드 관리 | O | |
| 수익 관리 | UI만 | 결제 비활성화 |
| DM 모니터링 | UI만 | DM 비활성화 |
| 분석 | O | 실제 데이터 |
| 시스템 설정 | O | |

- **어드민 인증**: Supabase Auth (1~2명, 역할 구분 불필요)
- **접근 제한**: 계정 기반 권한만 (IP 화이트리스트 없음)

#### 3.1.8 기타

| 기능 | 상세 |
|------|------|
| Sentry | 에러 모니터링 설치 |
| 네이티브 공유 | 카카오톡/트위터/인스타 — 기간 내 가능하면, 불가 시 후순위 |
| 에러 상태 UI | 기존 앱 스타일에 맞춰 자체 제작 |
| 로딩/빈 상태 UI | 기존 구현 유지 |
| 앱 내 어드민 | **6개 화면 제거** — 웹 어드민만 사용 |
| 홈 피드 | 포토 5 : 커뮤니티 1 혼합 |
| 온보딩 | 기존 유지 + 마이팀 설정 |
| 다국어 | 한국어 (기존 유지) |

### 3.2 제외 기능 (v2 이후)

| 기능 | 이유 |
|------|------|
| 티켓 충전/결제 (Paddle) | 비활성화 확정 |
| 서포트/후원/선물 | 비활성화 확정 |
| 수익 관리/정산 실동작 | 비활성화 확정 |
| DM 메시지 | 비활성화 확정 |
| 다크 모드 | v2 |
| Supabase Realtime | v1 불포함 확정 |
| 스팸/금칙어 필터 | 완전 제거 |
| 자동 블라인드 (5건 누적) | 제거 → 관리자 수동 |
| 도배 방지 / 동일 내용 차단 | v1 미적용 |
| 가입 후 10분 쿨다운 | 미적용 |
| NSFW 자동 필터 | 관리자 수동 관리로 대체 |
| Next.js 웹 (udamonfan.com) | v2 |

---

## 4. 데이터베이스

### 4.1 기존 테이블 (23개 — 마이그레이션 001~009)

| 카테고리 | 테이블 |
|---------|--------|
| 구단/선수 | teams, players, user_my_team |
| 커뮤니티 | community_posts, community_comments, community_likes, community_reports |
| 투표 | community_polls, community_poll_options, community_poll_votes |
| 스팸/제재 | spam_filter_words *(v1 미사용)*, user_restrictions, user_blocks, recent_searches |
| 포토그래퍼 | photographers, photo_posts, photo_likes, photographer_follows, photo_comments, photo_collections, photo_collection_posts |
| 타임라인 | timeline_events, timeline_event_teams |

### 4.2 신규 생성 테이블

| 테이블 | 설명 | 우선순위 |
|--------|------|----------|
| **users** (public) | 프로필 확장 — role(user/photographer/admin), nickname, avatar_url, nickname_changed_at, is_deleted, deleted_at 등. auth.users와 1:1 연결 | 최우선 |
| **notifications** | type, user_id, title, body, data(JSON), is_read, created_at | 높음 |
| **announcements** | title, content, is_pinned, created_at, created_by | 높음 |
| **inquiries** | user_id, category, title, content, status(pending/answered/closed), answer, answered_at | 높음 |
| **photographer_applications** | user_id, portfolio_url, bio, status(pending/approved/rejected), reviewed_by, reviewed_at | 높음 |
| **cheerleaders** | team_id, name_ko, name_en, position, status — 선수(players)와 동일 구조 | 높음 |
| **audit_logs** | admin_id, action, target_type, target_id, details(JSON), created_at | 중간 |
| **site_settings** | key, value(JSON), updated_by, updated_at | 중간 |

### 4.3 기존 테이블 수정

| 테이블 | 수정 내용 |
|--------|----------|
| photo_posts | `status` (pending/approved/rejected), `rejection_reason` 컬럼 추가 |
| community_reports | 자동 블라인드 트리거(5건 누적) 제거 |
| spam_filter_words | v1에서 미사용 (테이블 유지, 기능 비활성화) |

### 4.4 RLS 정책

- 모든 신규 테이블에 RLS 활성화
- 어드민 접근: `public.users.role = 'admin'` 기반 정책
- 기존 RLS 유지 (005, 008 마이그레이션)

### 4.5 인프라 현황

| 항목 | 상태 |
|------|------|
| Supabase 리전 | **한국** |
| Supabase 플랜 | TBD (확인 필요) |
| 기존 데이터 | 없음 (빈 상태) |
| 마이그레이션 적용 여부 | 직접 확인 필요 |
| Storage 버킷 | 확인 필요 |
| 환경변수 (.env) | 새로 생성 |

---

## 5. 외부 서비스 현황

| 서비스 | 현재 상태 | 필요 작업 | 블로커 |
|--------|----------|----------|--------|
| Supabase | 프로젝트 있음, 접근 가능 | 키 공유, CLI 설정 | - |
| Google OAuth | 미발급 | Cloud Console 설정 + Supabase provider | - |
| Apple Sign In | **미발급, Developer 등록 미완료** | DUNS + Developer 등록 + Service ID/Key | **블로커** |
| Kakao OAuth | 미발급 | Developers 앱 등록 + Custom OIDC | - |
| Naver OAuth | 미발급 | Developers 앱 등록 + Custom OIDC | - |
| Firebase (FCM) | 미설정 | 프로젝트 생성 + 키 설정 (클라이언트 확인 후) | - |
| Vercel | 미연결 | 어드민 웹 프로젝트 연결 | - |
| 도메인 | **미구입** | udamonfan.com 구매 (클라이언트) | **블로커** |
| Expo (EAS) | 있음 | 계정 접근 권한 요청 완료 | - |
| Sentry | 미설치 | 프로젝트 생성 + SDK 설치 | - |

---

## 6. 보안 요구사항

| 항목 | 현재 상태 | 조치 |
|------|----------|------|
| 테스트 계정 3개 | 프로덕션 빌드에 포함 (test@udamon.com 등) | `__DEV__` 분리 또는 완전 제거 |
| 어드민 비밀번호 | 클라이언트 코드에 하드코딩 | Supabase Auth로 전환 |
| Supabase 더미 키 | 코드 내 fallback 존재 | 환경변수 이동, fallback 제거 |
| RLS | 기존 테이블 적용됨 | 신규 테이블 전부 적용 |
| console.log | 13곳 존재 | 프로덕션 빌드 시 제거 |
| 환경 분리 | 없음 | v1에서는 단일, 이후 분리 |

---

## 7. 개발 Phase 계획

### Phase 1: 인증 + DB 기초 (~16시간)

1. `public.users` 테이블 생성 (role, nickname, avatar 등)
2. 누락 테이블 전체 생성 (notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings)
3. 기존 테이블 수정 (photo_posts 컬럼 추가, 자동 블라인드 트리거 제거)
4. RLS 정책 추가 (신규 테이블)
5. 환경변수 정리 (.env 생성, 더미 키/fallback 제거)
6. 테스트 계정 제거/분리
7. Google OAuth 설정 + Supabase 연동
8. Kakao OAuth (Custom OIDC) 설정
9. Naver OAuth (Custom OIDC) 설정
10. Apple Sign In (Developer 등록 완료 시)
11. 앱 AuthContext → Supabase Auth 완전 연동
12. users 테이블 연동 (프로필, 닉네임 변경 30일 제한, 고유성)

### Phase 2: 커뮤니티 Supabase 연동 (~12시간)

1. `communityApi.ts` 서비스 레이어 생성
2. `CommunityContext.tsx` → Supabase 전환
3. 게시글 CRUD 연동
4. 댓글/대댓글 연동
5. 좋아요 연동
6. 투표 연동
7. 신고 연동 (관리자 수동 처리)
8. 이미지 업로드 (community-posts Storage 버킷)
9. 검색 기능 (DB 기반 — 선수명, 게시글)
10. 트렌딩 계산 (24시간 윈도우)
11. Optimistic Update + 실패 핸들링

### Phase 3: 포토그래퍼 완성 + 미디어 처리 (~10시간)

1. 포토그래퍼 연동 완성 (부분 → 완전)
2. 영상 업로드 기능 (Supabase Storage)
3. 영상 재생 기능 (앱 내)
4. 이미지 리사이징 Edge Function
5. 썸네일 생성
6. 포토그래퍼 심사 프로세스 (applications 테이블 연동)
7. 포토그래퍼 등급 계산

### Phase 4: 어드민 웹 Supabase 연동 (~12시간)

1. 어드민 인증 → Supabase Auth 전환
2. `adminApi.ts` 서비스 레이어 생성
3. 대시보드 실제 통계 연동 (DAU/WAU/MAU)
4. 사용자 관리 연동
5. 커뮤니티 관리 / 게시글 검수 연동
6. 신고 관리 연동
7. 포토그래퍼 관리 / 심사 연동
8. 선수 / 구단 / 치어리더 관리 연동
9. 공지사항 / 문의 관리 연동
10. 기타 페이지 연동 (이벤트, 컬렉션, 광고, 알림, 랭크, 시스템 설정)
11. 어드민 RLS 정책 추가
12. Vercel 배포 연결

### Phase 5: 알림 + 모니터링 + 마무리 (~8시간)

1. 인앱 알림 시스템 구현
2. FCM 푸시 알림 (Firebase 설정 후)
3. Sentry 에러 모니터링 설치
4. 에러 상태 UI 제작 (기존 스타일 기반)
5. 앱 내 어드민 화면 6개 제거
6. 네이티브 공유 기능 (기간 내 가능하면)
7. console.log 정리
8. Context Provider 최적화 (메모이제이션)
9. 최종 테스트 + EAS 빌드 (development)

**총 예상: ~58시간**

---

## 8. 미결정 사항 (TBD)

| 항목 | 상태 | 영향 |
|------|------|------|
| 파일 크기 제한 (포토/커뮤니티) | 클라이언트("도하님") 결정 대기 | 이미지/영상 업로드 validation |
| Apple Developer 등록 | DUNS 대기 중 | Apple Sign In + iOS 앱 배포 **블로커** |
| Firebase 프로젝트 | 클라이언트 확인 후 | FCM 푸시 알림 |
| Supabase 플랜 (Free/Pro) | 미확인 | Storage 용량, Edge Functions 제한 |
| 도메인 (udamonfan.com) | 미구입 | OAuth 콜백 URL, 어드민 배포 URL |
| 미성년자 가입 제한 | 미확인 | 법적 이슈 가능 |
| 이용약관/개인정보처리방침 | 법률 검토 미확인 | 런칭 시 법적 리스크 |
| 마케팅 수신 동의 | 미확인 | 정보통신망법 |

---

## 9. 배포 환경

| 항목 | 설정 |
|------|------|
| 앱 빌드 | EAS Build — development 프로필 |
| 앱 스토어 제출 | 클라이언트 직접 (필요 시 도움) |
| 어드민 배포 | Vercel |
| 어드민 접근 제한 | 계정 기반 권한 (IP 화이트리스트 없음) |
| 환경 분리 | v1에서는 단일 Supabase 프로젝트, 이후 dev/prod 분리 |
| Git | 개발자 본인 GitHub에서 작업 |

---

## 10. 검증 계획

| 시나리오 | E2E 테스트 경로 |
|---------|----------------|
| 인증 | OAuth 로그인 → public.users 프로필 생성 → 마이팀 설정 |
| 커뮤니티 | 가입 → 글쓰기(이미지) → 댓글 → 좋아요 → 투표 → 신고 |
| 포토그래퍼 | 심사 신청 → 어드민 승인 → 게시물(이미지+영상) → 컬렉션 |
| 어드민 | 로그인 → 대시보드 통계 → 게시글 검수 → 신고 처리 → 유저 제재 |
| 알림 | 댓글/좋아요 발생 → 인앱 알림 → 푸시 수신 |
| 에러 | 네트워크 끊김 → 에러 UI → Sentry 기록 |

---

## 부록: 비즈니스 로직 결정 사항 요약

| 항목 | 결정 |
|------|------|
| 닉네임 변경 제한 | 30일 |
| 닉네임 고유성 | 중복 불가 (UNIQUE) |
| 회원 탈퇴 | soft delete |
| 자동 블라인드 | 제거 → 관리자 수동 |
| 금칙어 필터 | 제거 |
| 커뮤니티 이미지 | 최대 10장, 영상 미지원 |
| 포토그래퍼 미디어 | 이미지 7 + 영상 3 (총 10개) |
| 포토그래퍼 심사 | 관리자 수동 승인/반려 |
| 포토그래퍼 등급 | 포스트 수 + 팔로워/10 (현행) |
| 트렌딩 윈도우 | 24시간 |
| NSFW | 관리자 수동 관리 |
| 선수/치어리더 데이터 | 어드민에서 관리 |
| 어드민 역할 | 단일 (1~2명) |
| 어드민 통계 | 실제 데이터 |
