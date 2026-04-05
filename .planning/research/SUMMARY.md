# Project Research Summary

**Project:** Udamon — KBO Fan Community + Fan Photographer App
**Domain:** Korean sports community app (brownfield completion, Expo SDK 54 + Supabase)
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

Udamon은 KBO 팬 커뮤니티와 팬 포토그래퍼 갤러리를 하나의 모바일 앱으로 통합하는 브라운필드 프로젝트다. 모바일 앱(Expo SDK 54), 어드민 웹(React + Vite), Cloudflare R2 스토리지, Supabase 백엔드가 이미 구축되어 있으나, 대부분의 데이터 연동은 목(mock) 데이터에 의존한다. 완성 목표는 2026년 5월 중순(6주 타임라인)이며, 핵심 작업은 기존 UI와 목 로직을 실제 Supabase DB에 연결하는 것이다.

가장 큰 기술적 리스크는 두 가지다. 첫째, `public.users` 테이블이 전혀 존재하지 않는 상태로, 이 테이블 없이는 OAuth, 커뮤니티, 포토그래퍼, 알림 등 사실상 모든 기능이 작동하지 않는다. 둘째, Apple Developer 조직 등록(DUNS) 지연으로 iOS 배포 전체가 막힐 수 있다. 이 두 가지는 코드 작업 시작 전에 즉시 해소해야 할 선행 조건이다.

경쟁 분석 결과, 기존 국내 KBO 커뮤니티(네이버 스포츠, DC 인사이드, FM 코리아) 중 팬 포토그래퍼를 위한 전용 구조화 갤러리를 제공하는 서비스는 없다. 이것이 Udamon의 실질적 차별점이다. 실시간 채팅은 카카오톡/네이버 오픈톡이 이미 지배하고 있으므로 v1에서 경쟁은 불필요하며, 팀별 게시판 + 포토그래퍼 갤러리 + 어드민 패널 완성에 집중하는 것이 최적 전략이다.

## Key Findings

### Recommended Stack

핵심 스택은 이미 확정되어 있으며 신규 패키지가 일부 추가된다. Google/Apple 로그인은 브라우저 리다이렉트 대신 네이티브 SDK(`@react-native-google-signin/google-signin`, `expo-apple-authentication`)를 사용해 UX를 개선한다. Kakao는 Supabase 기본 지원 OAuth로 연동하고, Naver는 OIDC를 지원하지 않으므로 Edge Function 프록시 패턴이 필수다. 이미지 처리는 Supabase Edge Function(WASM 기반 `magick-wasm`)이 5MB 이하에 한해 사용 가능하지만, 서빙 시 리사이징은 Cloudflare Image Resizing(유료 플랜 필요)이 훨씬 안정적이다. 에러 모니터링은 `@sentry/react-native` ^8.x를 사용한다(`sentry-expo`는 deprecated).

**Core technologies:**
- `@react-native-google-signin/google-signin` ^16.1.2: 네이티브 Google 로그인 — 브라우저 없는 signInWithIdToken 방식
- `expo-apple-authentication` ~7.2.4: 네이티브 Apple 로그인 — App Store 정책상 필수
- `expo-notifications` ~0.32.16: 푸시 알림 — 이미 설치됨, FCM/APNs 통합
- `@sentry/react-native` ^8.7.0: 크래시 리포팅 — Expo config plugin 자동 설정
- `@supabase/supabase-js` ^2.101.1: 어드민 웹 Supabase 클라이언트 — 동일 SDK
- `magick-wasm` 0.0.3: Edge Function 내 이미지 리사이즈 — Sharp 대체 (Deno WASM 전용)

**외부 서비스 블로커 (코드 외 의존성):**
- Apple Developer DUNS 등록 (즉시 확인 필요)
- Firebase 프로젝트 생성 (FCM 설정)
- Kakao/Naver Developer 콘솔 앱 등록
- 도메인 구매 (udamonfan.com)

### Expected Features

**Must have (table stakes — P0/P1):**
- Kakao + Google OAuth — 한국 앱 기본 요건 (Kakao가 최우선)
- `public.users` 테이블 + 프로필 시스템 — 모든 기능의 선행 의존성
- 팀별 커뮤니티 게시판 CRUD (Supabase 연동) — UI는 완성, DB 연결만 필요
- 좋아요 / 댓글 / 신고 DB 연동
- 검색 (PostgreSQL ILIKE 또는 to_tsvector)
- 트렌딩 포스트 (view_count 증가 포함)
- 포토그래퍼 사진 업로드 + 리뷰 워크플로우
- 어드민 패널 Supabase 연동 (post review, report, user management 우선)
- 어드민 인증 Supabase 교체 (현재 하드코딩 admin1234)

**Should have (경쟁 우위 — P2):**
- Apple OAuth (DUNS 해소 후)
- Naver OAuth (Edge Function 프록시 방식)
- 인앱 알림 피드
- FCM 푸시 알림 (Firebase 준비 후)
- 치어리더 태깅 (`cheerleaders` 테이블 신규 생성)
- 포토그래퍼 인증 티어 + 신청 워크플로우

**Defer (v2+):**
- 실시간 채팅 (WebSocket 인프라 불필요)
- DM / 1:1 메시지 (프로젝트에 이미 명시적 제외)
- 결제/수익화 (토스페이먼츠 등)
- 다크 모드 (ThemeContext @ts-nocheck 상태)
- AI 자동 모더레이션 (DAU 5,000 미만에서는 불필요)
- Next.js 웹 (SEO/공유용, 별도 단계)

### Architecture Approach

Mobile App → Context Layer → Service Layer → PostgREST(anon key, RLS) 또는 Edge Functions → PostgreSQL로 이어지는 계층화 구조다. 이미 `photographerApi.ts`에서 `ApiResult<T>` 패턴이 검증된 상태이며, 이를 community, auth, notification 도메인에 그대로 복제한다. 어드민 웹은 절대 `service_role` 키를 브라우저에 노출해서는 안 되며, 특권 작업은 모두 JWT 검증 후 `service_role`을 사용하는 `admin-proxy` Edge Function을 통해 처리한다. `public.users` 테이블은 Supabase Auth의 `auth.users`와 앱 로직을 연결하는 핵심 브리지다.

**Major components:**
1. **Mobile Service Layer** (`communityApi.ts`, `authApi.ts`, `notificationApi.ts`) — anon key + JWT, RLS 강제
2. **Admin Edge Function Proxy** (`admin-proxy`) — JWT 검증 + is_admin 확인 + service_role로 RLS 우회
3. **Push Notification Pipeline** (`notifications` 테이블 INSERT → DB Webhook → `push-notification` Edge Function → FCM)
4. **Image Processing** (업로드 시: magick-wasm Edge Function; 서빙 시: Cloudflare Image Resizing)
5. **`public.users` 테이블** — 모든 테이블의 외래키 대상, auth trigger로 자동 생성

### Critical Pitfalls

1. **`public.users` 트리거 실패로 모든 신규 가입 차단** — `SECURITY DEFINER` + `SET search_path = public` 필수. 모든 컬럼은 nullable 또는 default 값 보유. Supabase 대시보드 테스트 사용자 생성으로 검증 후 배포.

2. **Naver Login은 OIDC 비지원 — Supabase Custom OIDC로 연동 불가** — Naver는 OAuth 2.0 전용. `/.well-known/openid-configuration` 없음. Edge Function 프록시 패턴 필수 (code → access_token → user profile → Supabase admin.createUser).

3. **Android OAuth 콜백이 앱 종료 시 무음 실패** — `Linking.addEventListener`는 앱이 살아 있을 때만 동작. `getInitialURL()`로 콜드 스타트 처리 필요. `WebBrowser.openAuthSessionAsync` 전환 권장.

4. **신규 테이블 RLS 미설정 = 전체 데이터 공개** — `CREATE TABLE` 마이그레이션에 반드시 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 포함. SQL Editor가 아닌 클라이언트 SDK로 비관리자 쿼리 검증 필수.

5. **어드민 패널 mock 데이터 혼재** — 어드민 20개 페이지를 한꺼번에 마이그레이션하기 불가능. 핵심 4개 플로우(post review, user reports, photographer applications, announcements)를 먼저 실연동하고, 나머지는 "Demo Data" 배너 표시 또는 v2 플레이스홀더로 처리.

6. **FCM 두 가지 크레덴셜 파일 혼동** — `google-services.json`(앱 바이너리 삽입)과 Service Account Key JSON(EAS 업로드)은 완전히 다르다. SDK 54에서 Expo Go는 Android 푸시 불가 — 개발 빌드 필수.

## Implications for Roadmap

ARCHITECTURE.md에서 도출한 빌드 순서를 기반으로 6단계 페이즈를 제안한다.

### Phase 0: 전제 조건 해소 (Pre-Code)
**Rationale:** 코드 작업 전에 반드시 해소해야 할 외부 블로커 처리
**Delivers:** 이후 모든 페이즈의 언블로킹
**Addresses:** Apple DUNS 확인, Firebase 프로젝트 생성, Kakao/Naver 앱 등록, 도메인 구매
**Avoids:** Apple Developer 등록 지연으로 인한 iOS 런칭 리스크 (Pitfall 6)

### Phase 1: Foundation — DB 스키마 + 인증
**Rationale:** `public.users`는 모든 테이블의 외래키 대상. Auth 없이는 RLS가 의미없고, RLS 없이는 어떤 데이터도 신뢰할 수 없다.
**Delivers:** `public.users` 테이블 + auth trigger, 신규 테이블 마이그레이션(notifications, announcements 등), Supabase Auth 연동(Google + Kakao), 어드민 하드코딩 인증 교체
**Uses:** `@react-native-google-signin/google-signin`, `expo-web-browser`, `expo-crypto`
**Implements:** Auth Flow 아키텍처, `public.users` 브리지 패턴
**Avoids:** Pitfall 1(트리거 실패), Pitfall 3(Android OAuth 콜백), Pitfall 4(RLS 누락), 하드코딩 admin1234 보안 이슈

### Phase 2: Core Community — 커뮤니티 Supabase 연동
**Rationale:** Auth가 완성되어야 실제 user_id로 게시글을 작성할 수 있다. 커뮤니티는 앱의 주 사용 플로우.
**Delivers:** `communityApi.ts` 서비스 레이어, CommunityContext Supabase 연동(게시글/댓글/좋아요/투표), R2 community-posts 이미지 업로드, 검색, 트렌딩(view_count 증가 + pg_cron)
**Implements:** Domain Service Layer(ApiResult<T>) 패턴, 낙관적 업데이트, 페이지네이션
**Avoids:** Pitfall — mock 데이터 프로덕션 노출, trending 클라이언트 계산 문제

### Phase 3: Admin Integration — 어드민 패널 연동
**Rationale:** 커뮤니티 데이터가 존재해야 어드민이 실제로 관리할 내용이 생긴다. 서비스 오픈 전 콘텐츠 모더레이션 준비가 필수.
**Delivers:** `admin-proxy` Edge Function, `adminApi.ts` 서비스 레이어, 핵심 4개 플로우 Supabase 연동(post review, user reports, photographer applications, announcements)
**Implements:** Admin Edge Function Proxy 패턴(service_role 격리), Admin RLS 정책
**Avoids:** Pitfall 7(어드민 mock 혼재), service_role 브라우저 노출 Anti-Pattern

### Phase 4: Photographer Completion — 포토그래퍼 갤러리 완성
**Rationale:** Phase 2-3와 병렬 작업 가능한 독립 도메인. 포토그래퍼 기능은 핵심 차별점.
**Delivers:** 사진/영상 업로드 + 심사 워크플로우(`status`/`rejection_reason` 컬럼), 포토그래퍼 신청 플로우(`photographer_applications` 테이블), 치어리더 태깅(`cheerleaders` 테이블 + 마이그레이션), 추천 컬렉션 큐레이션
**Implements:** 이미지 처리 아키텍처(magick-wasm 또는 Cloudflare Image Resizing 의사결정)
**Avoids:** Pitfall 5(Edge Function 이미지 처리 CPU 한계)

### Phase 5: Notifications + Polish — 알림 + 마무리
**Rationale:** 알림은 다른 모든 데이터 플로우가 먼저 확립되어야 의미있는 이벤트를 생성할 수 있다.
**Delivers:** `notifications` 테이블 + DB Webhook, 인앱 알림 피드 UI, FCM 푸시(Firebase 준비 시), Sentry 에러 모니터링 적용, 로딩/에러 상태 UI 전체 정리, CORS wildcard 도메인으로 교체
**Uses:** `expo-notifications`, `expo-device`, `expo-constants`, `@sentry/react-native`
**Implements:** Push Notification Pipeline(DB Webhook → Edge Function → FCM)
**Avoids:** Pitfall 8(FCM 크레덴셜 혼동), CORS wildcard 보안 이슈

### Phase Ordering Rationale

- **Phase 0 → Phase 1:** 외부 서비스 없이 OAuth 테스트 불가. 특히 Apple DUNS는 최대 30일 소요 가능
- **Phase 1 → Phase 2:** `public.users` 없이 커뮤니티 게시글에 user_id 외래키 연결 불가
- **Phase 2 → Phase 3:** 어드민이 관리할 실제 커뮤니티 데이터가 먼저 존재해야 함
- **Phase 4 병렬 가능:** Phase 2-3와 독립적인 포토그래퍼 도메인 — 팀이 있다면 동시 진행 가능
- **Phase 5 마지막:** 알림은 모든 이벤트 소스(커뮤니티, 포토그래퍼, 어드민)가 먼저 완성되어야 실용적

### Research Flags

깊이 있는 페이즈별 리서치가 필요한 영역:
- **Phase 1 (Naver OAuth):** Edge Function 프록시 구현 패턴 — Naver의 OAuth 2.0 응답 포맷과 Supabase admin.createUser 통합 방법 검증 필요
- **Phase 4 (Image Processing):** Cloudflare Image Resizing 플랜 확인 및 현재 R2 설정과의 통합 — magick-wasm vs Cloudflare Worker 최종 결정 필요
- **Phase 5 (FCM v1):** Service Account JWT 발급 흐름 — Expo FCM v1 크레덴셜 EAS 업로드 실습 검증 필요

잘 문서화된 표준 패턴 (별도 리서치 불필요):
- **Phase 1 (Google/Kakao OAuth):** Supabase 공식 문서에 상세히 기술됨
- **Phase 2 (Community CRUD):** photographerApi.ts 패턴을 그대로 복제하면 됨
- **Phase 3 (Admin Proxy):** ARCHITECTURE.md에 완전한 코드 예시 포함됨

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 공식 문서(Supabase, Expo, Sentry, Cloudflare) 직접 검증. npm 버전 2026-04-05 기준 확인. magick-wasm(0.0.3)만 MEDIUM — 초기 버전으로 실제 메모리 한계 검증 필요 |
| Features | MEDIUM-HIGH | 국내 경쟁 서비스 직접 관찰 + 공식 앱 스토어 리스팅. 일부 fan engagement 통계는 LOW confidence 소스 |
| Architecture | HIGH | Supabase 공식 아키텍처 가이드 기반. photographerApi.ts 패턴 이미 실전 검증. 권장 빌드 순서는 의존성 분석에서 도출 |
| Pitfalls | HIGH | Supabase 공식 트러블슈팅 문서, GitHub discussions, 실제 코드베이스(AuthContext.tsx 라인 번호 포함)에서 직접 확인 |

**Overall confidence:** HIGH

### Gaps to Address

- **Naver OAuth 구체 구현:** Edge Function 프록시 패턴이 정답이지만, Naver API 응답 포맷 → Supabase 유저 생성 정확한 플로우는 Phase 1에서 시제품으로 검증 필요
- **magick-wasm 실제 메모리 한계:** 버전 0.0.3은 매우 초기. Phase 4 시작 전에 실제 사진 업로드(5-15MB 범위)로 Edge Function 메모리 한계 사전 테스트 필요. 실패 시 Cloudflare Image Resizing으로 전환
- **Cloudflare Image Resizing 플랜 비용:** 현재 프리 플랜 사용 중인지 유료 플랜 사용 중인지 확인 필요. $5/월 Image Resizing 구독 여부가 Phase 4 이미지 처리 아키텍처 결정에 영향
- **view_count 증가 방법:** 현재 코드에서 view_count가 어디서도 증가되지 않음. 중복 집계 방지 전략(사용자별 디바운스, IP 기반 등) 플래닝 시 결정 필요
- **Apple 개인 계정 vs 조직 계정 전환:** DUNS 지연 시 개인 계정으로 TestFlight 배포 후 조직 계정으로 앱 이전 — 이전 프로세스 복잡도 사전 파악 필요

## Sources

### Primary (HIGH confidence)
- [Supabase Kakao Auth](https://supabase.com/docs/guides/auth/social-login/auth-kakao) — Kakao OAuth 네이티브 지원
- [Supabase Custom OAuth Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) — 커스텀 프로바이더 제한(3개) 및 OIDC 요구사항
- [Supabase User Management / Triggers](https://supabase.com/docs/guides/auth/managing-user-data) — auth trigger SECURITY DEFINER 패턴
- [Supabase Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications) — DB Webhook → Edge Function → FCM 아키텍처
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) — 2초 CPU 한계, Sharp 미지원
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS 정책 패턴
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — SDK 54 개발 빌드 요구사항
- [Expo FCM v1 Credentials Guide](https://docs.expo.dev/push-notifications/fcm-credentials/) — google-services.json vs Service Account Key
- [Sentry Expo Manual Setup](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) — @sentry/react-native config plugin
- [Cloudflare Image Resizing + R2](https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/) — R2 이미지 최적화 아키텍처
- npm registry — 버전 호환성 2026-04-05 기준 직접 확인

### Secondary (MEDIUM confidence)
- [Auth.js Naver Provider](https://authjs.dev/reference/core/providers/naver) — Naver OAuth 2.0 전용, OIDC 미지원 확인
- [Naver OAuth Endpoints](https://logto.io/oauth-providers-explorer/naver) — authorization/token/userinfo URL (써드파티 집계)
- [Pro Baseball LIVE app features](https://apps.apple.com/kr/app/%ED%94%84%EB%A1%9C%EC%95%BC%EA%B5%AC-live/id515155553) — 경쟁사 기능 분석
- [Naver Sports KBO 커버리지](https://v.daum.net/v/20260403174703485) — 경쟁 서비스 현황
- [FM Korea baseball section](https://www.fmkorea.com/baseball) — 직접 관찰

### Tertiary (LOW confidence)
- Fan engagement best practices (Infobip/Arena) — 일반 업계 통계, KBO 특화 아님
- [Supabase MVP Architecture 2026 - Valtorian](https://www.valtorian.com/blog/supabase-mvp-architecture) — 써드파티 블로그

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
