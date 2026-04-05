# UDAMON (우다몬)

## What This Is

KBO 팬과 팬 포토그래퍼를 위한 모바일 커뮤니티 앱. React Native Expo 모바일 앱 + React/Vite 어드민 웹으로 구성되며, Supabase를 백엔드로 사용한다. 현재 UI 프로토타입 단계에서 실제 Supabase 연동을 완성하여 2026년 5월 중순 v1 런칭이 목표다.

## Core Value

KBO 팬이 구단별 커뮤니티에서 소통하고, 팬 포토그래퍼가 경기 사진/영상을 공유할 수 있는 공간 — 인증부터 어드민까지 실제 동작하는 완성된 앱.

## Requirements

### Validated

- ✓ React Native Expo 모바일 앱 기본 구조 (네비게이션, 컴포넌트, 타입) — existing
- ✓ React/Vite 어드민 웹 UI 프로토타입 (20개 페이지) — existing
- ✓ Supabase DB 스키마 23개 테이블 (마이그레이션 001~010) — existing
- ✓ RLS 정책 (커뮤니티, 포토그래퍼 테이블) — existing
- ✓ Cloudflare R2 업로드 인프라 (Edge Function + presigned URL) — existing
- ✓ 포토그래퍼 API 서비스 레이어 (Supabase CRUD) — existing
- ✓ PhotographerContext Supabase 조건부 연동 — existing
- ✓ OAuth 딥링크 구조 (udamon://auth/callback) — existing
- ✓ i18n 한국어 설정 — existing
- ✓ Expo Push Notification 딥링크 핸들러 — existing

### Active

- [ ] public.users 테이블 생성 및 프로필 시스템 구축
- [ ] 신규 테이블 생성 (notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings)
- [ ] 기존 테이블 수정 (photo_posts에 status/rejection_reason 추가, 자동 블라인드 트리거 제거)
- [ ] 환경변수 정리 (.env 생성, 더미 키/fallback 제거)
- [ ] 테스트 계정 제거/분리 (__DEV__ 게이트)
- [ ] Google/Apple/Kakao/Naver OAuth 설정 및 Supabase 연동
- [ ] AuthContext → Supabase Auth 완전 연동
- [ ] CommunityContext → Supabase 전환 (게시글/댓글/좋아요/투표/신고)
- [ ] 커뮤니티 이미지 업로드 (R2 community-posts prefix)
- [ ] 검색 기능 (DB 기반)
- [ ] 트렌딩 계산 (24시간 윈도우)
- [ ] 포토그래퍼 연동 완성 (영상 업로드, 심사 프로세스, 등급 계산)
- [ ] 이미지 리사이징/썸네일 Edge Function
- [ ] 어드민 인증 → Supabase Auth 전환
- [ ] 어드민 웹 전체 20페이지 Supabase 연동
- [ ] 인앱 알림 시스템 (notifications 테이블)
- [ ] FCM 푸시 알림 (Firebase 설정 후)
- [ ] Sentry 에러 모니터링 설치
- [ ] 에러/로딩 상태 UI 정비
- [ ] 앱 내 어드민 화면 6개 제거
- [ ] console.log 정리
- [ ] EAS 빌드 (development 프로필)

### Out of Scope

- 티켓 충전/결제 (Paddle) — v1 비활성화 확정
- 서포트/후원/선물 기능 — v1 비활성화 확정
- DM 메시지 — v1 비활성화 확정
- 다크 모드 — v2
- Supabase Realtime — v1 불포함 확정
- 스팸/금칙어 필터 — 완전 제거
- 자동 블라인드 (5건 누적) — 제거, 관리자 수동
- NSFW 자동 필터 — 관리자 수동 관리로 대체
- Next.js 웹 (udamonfan.com) — v2
- 네이티브 공유 — 기간 내 가능하면 포함, 후순위
- 도배 방지/동일 내용 차단 — v1 미적용

## Context

**현재 코드베이스 상태:**
- 모바일 앱: UI 완성, 포토그래퍼만 부분 Supabase 연동, 나머지 전부 mock 데이터
- 어드민 웹: UI 완성 (20페이지), 전부 mock 데이터, 인증 하드코딩
- DB: 23개 테이블 마이그레이션 존재, 핵심 테이블 (users, notifications 등) 누락
- 보안: 테스트 계정 3개 하드코딩, 어드민 비밀번호 하드코딩, console.log 13곳

**외부 의존성 블로커:**
- Apple Developer 등록: DUNS 대기 중 → Apple Sign In 및 iOS 배포 블로커
- 도메인 (udamonfan.com): 미구입 → OAuth 콜백 URL, 어드민 배포 URL 블로커
- Firebase: 미설정 → FCM 푸시 알림 블로커
- 파일 크기 제한: 클라이언트 결정 대기

**기술 환경:**
- 법인: 헤이디
- 앱: iOS/Android (React Native Expo SDK 54)
- 어드민: React 18 + Vite 6 + Tailwind CSS 3
- 백엔드: Supabase (PostgreSQL + Auth + Edge Functions)
- 스토리지: Cloudflare R2 (udamon-media 버킷)
- 언어: TypeScript (strict)
- 상태관리: Context API (18개 Provider)

## Constraints

- **Timeline**: 2026년 5월 중순 v1 런칭 — 약 6주
- **Tech stack**: 기존 스택 유지 (Expo SDK 54, Supabase, R2, Vite)
- **Dependencies**: Apple Developer, 도메인, Firebase는 클라이언트 측 진행 필요
- **Auth**: Supabase Auth 사용 (Google/Apple/Kakao/Naver 4종)
- **Admin**: 1~2명, 역할 구분 불필요
- **Environment**: v1에서는 단일 Supabase 프로젝트 (dev/prod 분리 없음)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth 사용 (자체 인증 X) | 이미 구축된 인프라 활용, OAuth 간편 연동 | — Pending |
| Cloudflare R2 스토리지 (Supabase Storage 대체) | presigned URL 패턴 이미 구현됨, 비용 효율적 | ✓ Good |
| Context API 유지 (Redux/Zustand 전환 X) | 기존 18개 Provider 유지, v1 범위 내 전환 비효율 | — Pending |
| 관리자 수동 관리 (자동 필터 제거) | 초기 사용자 적음, 과도한 자동화 불필요 | — Pending |
| 어드민 웹 전용 (앱 내 어드민 제거) | 중복 기능 제거, 웹에서 통합 관리 | — Pending |
| 영상은 포토그래퍼만 (커뮤니티 X) | 스토리지/대역폭 비용 관리 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*
