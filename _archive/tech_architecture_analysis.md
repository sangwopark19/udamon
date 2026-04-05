# DUGOUT 기술 스택 · 아키텍처 · 인프라 심층 분석

> 분석일: 2026-04-01

---

## 목차

1. [기술 스택 심층 분석](#1-기술-스택-심층-분석)
2. [모바일 앱 아키텍처](#2-모바일-앱-아키텍처)
3. [어드민 대시보드 아키텍처](#3-어드민-대시보드-아키텍처)
4. [데이터베이스 아키텍처](#4-데이터베이스-아키텍처)
5. [인증 · 세션 아키텍처](#5-인증--세션-아키텍처)
6. [데이터 흐름 · API 아키텍처](#6-데이터-흐름--api-아키텍처)
7. [이미지 파이프라인](#7-이미지-파이프라인)
8. [서버사이드 인프라 현황](#8-서버사이드-인프라-현황)
9. [배포 · CI/CD · 모니터링](#9-배포--cicd--모니터링)
10. [프로덕션 준비도 평가](#10-프로덕션-준비도-평가)

---

## 1. 기술 스택 심층 분석

### 1.1 모바일 앱 의존성

**위치:** `app/package.json`

#### 핵심 런타임 의존성

| 의존성 | 버전 | 평가 |
|--------|------|------|
| expo | ~54.0.0 | 최신 Stable SDK |
| react | 19.1.0 | 최신. React 19 + New Architecture 사용 |
| react-native | 0.81.5 | 최신 패치. 0.81은 bleeding edge — LTS(0.75)가 아님 |
| @supabase/supabase-js | ^2.100.0 | 최신 v2 |
| @react-navigation/native | ^7.x | React 19 호환 |
| i18next | ^25.10.4 | 최신 |
| @react-native-async-storage/async-storage | 2.2.0 | 정확 버전 고정(^없음) — 유연성 부족 |

**리스크:**
- React 19 + React Native 0.81은 2025년 말 출시된 조합으로 커뮤니티 안정성 검증 기간이 짧다
- Expo SDK 54에서 expo-notifications(~0.32.16)의 호환성 별도 검증 필요
- AsyncStorage 정확 버전 고정(`2.2.0`)은 Expo autolinking과 충돌 가능성

#### 누락된 의존성

| 카테고리 | 필요 라이브러리 | 현재 |
|----------|----------------|------|
| 에러 모니터링 | @sentry/react-native | 없음 |
| 이미지 캐싱 | expo-image 또는 react-native-fast-image | 없음 — Supabase CDN 의존 |
| 폼 검증 | react-hook-form + zod | 없음 — 인라인 검증 |
| HTTP 클라이언트 | 없음 필요(Supabase SDK 사용) | 적정 |
| 로깅 | 전용 로깅 라이브러리 | 없음 — console.log 직접 사용 |
| 상태 관리 | zustand 또는 jotai | 없음 — Context API 18개로 운영 |
| 테스트 | jest + @testing-library/react-native | 없음 |

#### DevDependencies

```json
{
  "@types/react": "~19.1.10",
  "typescript": "~5.9.2"
}
```

ESLint, Prettier, Jest 등 개발 도구가 전무하다.

---

### 1.2 어드민 의존성

**위치:** `admin/package.json`

| 의존성 | 버전 | 역할 |
|--------|------|------|
| react | ^18.3.1 | UI 프레임워크 |
| react-dom | ^18.3.1 | DOM 렌더링 |
| react-router-dom | ^6.28.0 | 클라이언트 라우팅 |
| lucide-react | ^0.468.0 | 아이콘 (480+종) |
| vite | ^6.0.1 | 번들러/개발서버 |
| tailwindcss | ^3.4.15 | 유틸리티 CSS |
| typescript | ~5.6.2 | 타입 체커 |

**누락:**
- Supabase 클라이언트 — API 연동 불가
- UI 컴포넌트 라이브러리 — 모든 UI 직접 구현
- 폼 라이브러리 — 검증 없음
- 데이터 페칭 — TanStack Query 등 캐싱 레이어 없음
- 테스트 — vitest, @testing-library/react 없음

---

### 1.3 빌드 설정

#### Expo (앱)

**위치:** `app/app.json`
```
번들 ID: com.dugoutfan.app (iOS/Android 동일)
딥링크 스킴: dugoutfan://
Universal Link: dugoutfan.com
플러그인: expo-localization, expo-notifications, expo-web-browser
알림 채널 색상: #1B2A4A (브랜드 네이비)
```

**위치:** `app/eas.json`
```
프로필 3개: development(개발), preview(미리보기), production(배포)
CLI 요구: >= 12.0.0
production: autoIncrement 활성화
```

**문제점:**
- EAS 프로필에 환경변수 주입 설정 없음 — Supabase 키를 어떻게 주입하는지 불명확
- preview 프로필에 `distribution` 미지정 — internal 배포 전략 없음
- `credentials` 관리 설정 없음 — EAS 기본 동작에 의존

#### Vite (어드민)

**위치:** `admin/vite.config.ts`
```typescript
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

최소 설정. 별칭(alias), 프록시, 환경변수, 번들 분할 설정 없음.

---

### 1.4 TypeScript 설정

| 항목 | 앱 (app/tsconfig.json) | 어드민 (admin/tsconfig.json) |
|------|------------------------|------------------------------|
| strict | true | true |
| target | Expo base (ES2022) | ES2020 |
| noUnusedLocals | 미설정(Expo 기본) | **false** — 미사용 코드 허용 |
| noUnusedParameters | 미설정 | **false** — 미사용 파라미터 허용 |
| 경로 별칭 | 없음 | 없음 |
| moduleResolution | Expo 기본(node) | bundler |

**공통 문제:**
- 경로 별칭 미설정으로 `../../../contexts/AuthContext` 같은 상대 경로 반복
- 어드민의 `noUnusedLocals: false`는 데드 코드를 허용

---

## 2. 모바일 앱 아키텍처

### 2.1 계층 구조

```
┌────────────────────────────────────────┐
│              Screens (49)              │  UI 계층
│  - 인증, 홈, 탐색, 커뮤니티, 설정 ...   │
├────────────────────────────────────────┤
│           Components (29)              │  재사용 UI
│  - PressableScale, Skeleton, Modal ... │
├────────────────────────────────────────┤
│        Context Providers (18)          │  상태 관리
│  - Auth, Community, Photographer ...   │
├────────────────────────────────────────┤
│          Custom Hooks (4)              │  로직 재사용
│  - useLoginGate, usePushDeepLink ...   │
├────────────────────────────────────────┤
│           Services (3)                 │  외부 통신
│  - supabase.ts, photographerApi.ts,    │
│    paymentApi.ts(목)                    │
├────────────────────────────────────────┤
│         Supabase Client                │  데이터 계층
│  - PostgreSQL + Auth + Storage         │
└────────────────────────────────────────┘
```

### 2.2 모듈 간 통신 패턴

| 경로 | 패턴 | 타입 안전 |
|------|------|-----------|
| Screen → Screen | navigation.navigate(name, params) | RootStackParamList 타입 체크 |
| Screen → Context | useAuth(), usePhotographer() 등 | Context 인터페이스 타입 체크 |
| Context → Service | photographerApi.fetch*() | ApiResult<T> 제네릭 |
| Service → Supabase | supabase.from().select() | 런타임 타입 매핑 (mapPhotoPost 등) |

**순환 의존성:** 없음 — 단방향 의존 그래프 유지 중

**문제점:**
- Screen이 Context를 직접 호출하며 중간 서비스 계층이 없다
- Context가 비즈니스 로직 + 상태 관리 + API 호출을 모두 담당 (SRP 위반)
- 서비스 계층이 사실상 photographerApi.ts 1개 파일(548줄)뿐

### 2.3 네비게이션 아키텍처

**위치:** `app/App.tsx:96-115`, `app/src/navigation/MainTabNavigator.tsx`

```
NavigationContainer (linking config)
├─ Stack.Navigator (screenOptions: headerShown false)
│  ├─ MainTabs (Bottom Tab Navigator)
│  │  ├─ Home → HomeScreen
│  │  ├─ Explore → ExploreScreen
│  │  ├─ Archive → ArchiveScreen
│  │  ├─ Community → CommunityMainScreen
│  │  └─ MyPage → MyPageScreen
│  ├─ Login (presentation: 'modal')
│  ├─ PostDetail (postId: string)
│  ├─ PhotographerProfile (photographerId: string)
│  ├─ ... (34개 스택 화면)
│  └─ Onboarding
```

**딥링크 설정:**
```typescript
// App.tsx:96-115
prefixes: [
  Linking.createURL('/'),          // expo://
  'https://dugoutfan.com',         // Universal Links
  'dugoutfan://',                  // Custom scheme
]
config: {
  screens: {
    PostDetail: 'post/:postId',
    PhotographerProfile: '@:photographerId',
    MainTabs: { Home: '', Explore: 'explore', Community: 'community' }
  }
}
```

**문제점:**
- Android `app.json`에 `/post/:postId`와 `/@:photographerId` 2개 경로만 등록 — iOS Universal Links와 비대칭
- OAuth 콜백 감지가 `url.includes('auth/callback')` 문자열 매칭 — URL 파싱 없음 (`AuthContext.tsx:225`)
- 웹 폴백 없음 — dugoutfan.com이 존재하지 않아 미설치 사용자는 404

### 2.4 상태 영속화

| 데이터 | 저장소 | 재시작 후 |
|--------|--------|-----------|
| Supabase 세션 | Supabase SDK (AsyncStorage) | 유지 |
| 테스트 계정 이메일 | AsyncStorage(`dugout_test_account`) | 유지 |
| 온보딩 완료 플래그 | AsyncStorage(`onboarding_complete`) | 유지 |
| 좋아요/팔로우 상태 | Context 메모리 | **초기화** |
| 커뮤니티 글/댓글 | Context 메모리 (목 데이터) | **초기화** |
| 알림 목록 | Context 메모리 (목 데이터) | **초기화** |
| 메시지 | Context 메모리 (목 데이터) | **초기화** |
| 검색 기록 | Context 메모리 | **초기화** |

앱 재시작 시 세션만 복원되고, 나머지 상태는 목 데이터로 초기화된다.

---

## 3. 어드민 대시보드 아키텍처

### 3.1 계층 구조

```
┌────────────────────────────────────────┐
│            Pages (22)                  │  라우트 페이지
├────────────────────────────────────────┤
│         Components (4)                 │  Layout, Sidebar, Modal, StatCard
├────────────────────────────────────────┤
│        Context (2)                     │  AuthContext, AdminContext(580줄)
├────────────────────────────────────────┤
│         Mock Data (1)                  │  mock.ts (853줄, 30+ 데이터셋)
├────────────────────────────────────────┤
│            (없음)                       │  API/서비스 계층 부재
└────────────────────────────────────────┘
```

### 3.2 라우팅 · 인증 가드

**위치:** `admin/src/App.tsx`

```typescript
function AuthGuard({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 라우트: 22개 페이지
<Route element={<AuthGuard><Layout /></AuthGuard>}>
  <Route index element={<DashboardPage />} />
  <Route path="/posts" element={<PostReviewPage />} />
  // ... 20개 더
</Route>
```

- AuthGuard는 `isAuthenticated` 불리언만 체크
- 역할(role) 기반 접근 제어 없음
- 모든 인증된 사용자가 모든 페이지 접근 가능

### 3.3 AdminContext 아키텍처

**위치:** `admin/src/contexts/AdminContext.tsx` (580줄)

단일 Context에 25개 도메인의 상태와 140+ 함수가 집중되어 있다:

```
AdminContext
├─ 포스트 관리 (posts, approvePost, rejectPost, toggleFeatured)
├─ 신고 관리 (reports, resolveReport)
├─ 제재 관리 (sanctions, sanctionUser, revokeSanction)
├─ 포토그래퍼 심사 (applications, approve/reject)
├─ 공지 (announcements, create/delete)
├─ 알림 (sentNotifications)
├─ 구단/선수/치어리더 CRUD
├─ 커뮤니티 (posts, comments, polls)
├─ 문의 (inquiries)
├─ DM 모니터링
├─ 수익 (tickets, settlements, packages)
├─ 광고 (placements, revenue)
├─ 등급/수상 (rankTiers, awards)
├─ 설정 (site, maintenance, version, terms)
├─ 분석 (visitors, keywords, follows)
├─ 감사 로그 (auditLogs)
└─ 차단/컬렉션/이벤트
```

**문제:** 어느 한 도메인의 상태 변경이 전체 Context value 재생성 → 모든 22개 페이지 리렌더링

### 3.4 번들 · 성능

| 항목 | 현재 |
|------|------|
| 코드 분할 | 없음 — 22개 페이지 단일 번들 |
| React.memo | 미사용 |
| Lazy loading | 미사용 |
| 에러 바운더리 | 없음 |
| Suspense | 미사용 |
| 예상 번들 크기 | ~150-200KB gzipped |

---

## 4. 데이터베이스 아키텍처

### 4.1 스키마 개요

**위치:** `supabase/migrations/` (9개 파일)

```
28 테이블 · 42 인덱스 · 13 함수 · 18 트리거 · 60 RLS 정책 · 1 Storage 버킷
```

### 4.2 마이그레이션 아키텍처

| 마이그레이션 | 테이블 | 함수 | 트리거 | 멱등성 |
|-------------|--------|------|--------|--------|
| 001_teams_players | 3 | 0 | 0 | ❌ |
| 002_community | 4 | 5 | 8 | ❌ |
| 003_polls | 3 | 2 | 3 | ❌ |
| 004_spam_filter | 4 | 1 | 1 | ❌ |
| 005_rls_policies | 0 | 0 | 0 | ❌ (CREATE POLICY 재실행 불가) |
| 006_seed_teams | 0 | 0 | 0 | ❌ |
| 007_photographer | 8+slug | 6 | 6 | ⚠️ 부분적 (IF NOT EXISTS 사용) |
| 008_photographer_rls | 0 | 0 | 0 | ❌ |
| 009_seed_photographer | 0 | 0 | 0 | ✅ (ON CONFLICT DO NOTHING) |

**실행 순서 의존성:** 엄격한 순차 실행 필요 (001→002→...→009)

**롤백 계획:** 없음. DOWN 마이그레이션 없이 복구 불가.

### 4.3 비정규화 전략

트리거 기반 카운트 필드 유지:

| 테이블 | 비정규화 컬럼 | 유지 트리거 |
|--------|-------------|------------|
| community_posts | like_count, comment_count, view_count | trg_like_count_*, trg_comment_count_* |
| community_poll_options | vote_count | trg_poll_vote_count_* |
| community_polls | total_votes | trg_poll_vote_count_* |
| photographers | post_count, follower_count | trg_photo_posts_count, trg_follows_count |
| photo_posts | like_count, comment_count, view_count | trg_likes_count, trg_comments_count |

모든 카운트 감소 시 `GREATEST(0, count - 1)` 패턴으로 음수 방지.

### 4.4 다형적 연관 패턴

```sql
-- community_likes, photo_likes, community_reports 에서 사용
target_type TEXT CHECK (target_type IN ('post', 'comment'))
target_id UUID  -- 다형적 참조 (FK 없음)
UNIQUE(user_id, target_type, target_id)
```

**장점:** 단일 테이블로 포스트/댓글 좋아요 관리
**단점:** target_id에 FK 없어 고아 레코드 가능. 대상 삭제 시 좋아요 유지됨.

### 4.5 RLS 정책 아키텍처

**커버리지:**
- 모든 28개 테이블에 RLS 활성화 ✅
- `spam_filter_words`: 의도적으로 정책 없음 (service_role 전용)
- 사용자 블록 반영: `community_posts` 조회 시 차단된 사용자 게시물 필터링

**보안 함수 패턴:**
```sql
-- 005_rls_policies.sql:37-45
CREATE POLICY "posts_public_read" ON community_posts
  FOR SELECT USING (
    is_blinded = FALSE
    AND user_id NOT IN (
      SELECT blocked_id FROM user_blocks WHERE blocker_id = auth.uid()
    )
  );
```

**차단 방향성 문제:** A가 B를 차단하면 A의 피드에서 B 게시물이 사라지지만, B는 여전히 A의 게시물을 볼 수 있다. 양방향 차단이 필요할 수 있음.

**관리자 접근:**
- 관리자용 RLS 바이패스 정책이 없다
- `user_restrictions`, `community_reports` 등 관리 테이블에 관리자 조회 정책 없음
- 현재 해결책: service_role 키 사용 (Edge Function 또는 어드민 백엔드)

### 4.6 누락 테이블 정리

| 테이블 | 앱 참조 | DB 존재 | 영향 |
|--------|---------|---------|------|
| users | AuthContext에서 CRUD | ❌ | 프로필 기능 불가 |
| cheerleaders | 화면 2개 + 타입 정의 | ❌ | FK 위반 |
| notifications | NotificationContext | ❌ | 알림 영속화 불가 |
| announcements | AdminContext | ❌ | 공지 영속화 불가 |
| messages/dm | MessageContext | ❌ | DM 기능 불가 |
| bookmarks | ArchiveContext | ❌ | 북마크 영속화 불가 |

---

## 5. 인증 · 세션 아키텍처

### 5.1 앱 인증 흐름도

```
┌─────────────────────────────────────────────────────┐
│                    앱 시작                            │
├─────────────────────────────────────────────────────┤
│ AsyncStorage에서 dugout_test_account 확인             │
│   ├─ 있음 → 테스트 계정 복원 (Supabase 건너뜀)        │
│   └─ 없음 → supabase.auth.getSession()              │
│              ├─ 세션 있음 → fetchUserProfile()        │
│              └─ 세션 없음 → 로그인/게스트 선택         │
├─────────────────────────────────────────────────────┤
│                  로그인 방법                          │
├──────────────┬──────────────┬───────────────────────┤
│ OAuth        │ Email        │ 테스트 계정            │
│ Google       │ signInWith   │ TEST_ACCOUNTS 맵       │
│ Apple        │ Password()   │ 에서 비밀번호 비교      │
│ Kakao        │              │ Supabase 완전 우회     │
│ (Naver TODO) │              │                       │
├──────────────┴──────────────┴───────────────────────┤
│ 세션 획득 후: users 테이블에서 프로필 로드              │
│ → user, isPhotographer, isAdmin 등 상태 설정          │
└─────────────────────────────────────────────────────┘
```

### 5.2 OAuth 딥링크 처리

**위치:** `app/src/contexts/AuthContext.tsx:240-270`

```
1. signInWithOAuth() → WebBrowser.openAuthSessionAsync(url)
2. Supabase OAuth 프로바이더 리디렉트
3. dugoutfan://auth/callback?code=xxx 수신
4. WebBrowser 자동 닫힘 OR Linking.addEventListener 폴백
5. extractAndSetSession(url) → exchangeCodeForSession(code)
6. 세션 설정 + 프로필 로드
```

**취약점:**
- `url.includes('auth/callback')` 단순 문자열 매칭 (라인 225)
- 콘솔에 OAuth 코드/토큰 출력 (라인 141, 153) — 민감 정보 노출

### 5.3 어드민 세션

```
localStorage:dugout_admin_session
├─ 저장: JSON.stringify(AdminUser 객체)
├─ 복원: 페이지 로드 시 JSON.parse
├─ 만료: 없음
├─ 갱신: 없음
└─ 암호화: 없음
```

실질적으로 `{ id, email, displayName, role }` 객체가 평문으로 브라우저에 저장된다.

---

## 6. 데이터 흐름 · API 아키텍처

### 6.1 서비스 계층 구조

```
app/src/services/
├─ supabase.ts          (21줄) — 클라이언트 싱글톤
├─ photographerApi.ts   (548줄) — 유일한 실질 API 계층
└─ paymentApi.ts        (목 데이터) — 결제 미연동
```

**supabase.ts 초기화:**
```typescript
export const supabase = createClient(
  SUPABASE_URL || DUMMY_URL,    // 환경변수 || 더미
  SUPABASE_ANON_KEY || DUMMY_KEY,
  { auth: { autoRefreshToken: isSupabaseConfigured, persistSession: isSupabaseConfigured } }
);
```

단일 인스턴스, 전체 앱에서 공유. 환경변수 미설정 시 더미 클라이언트 생성.

### 6.2 쿼리 패턴 분석

**photographerApi.ts의 일관된 패턴:**

```typescript
// 타입: { data: T | null, error: string | null }
type ApiResult<T> = { data: T | null; error: string | null };

// 조회: 항상 Eager Loading (조인 포함)
const { data, error } = await supabase
  .from('photo_posts')
  .select(`
    *,
    photographer:photographers(display_name, avatar_url, is_verified),
    team:teams(name_ko),
    player:players(name_ko, number)
  `)
  .order('created_at', { ascending: false });
// ❌ 페이지네이션 없음 — 전체 로드

// 매핑: 행 → 앱 타입
return (data ?? []).map(mapPhotoPost);
```

**문제점:**
1. **전체 로드** — `fetchPhotoPosts()`, `fetchAllComments()` 등 제한 없이 전체 조회
2. **Eager Loading 고정** — 모든 조회에 3개 관계 조인
3. **오류 반환값** — `catch (e: any) { return { data: null, error: e.message } }` — e가 Error가 아닌 경우 undefined
4. **userId 빈 문자열** — PhotographerContext에서 `photographerApi.togglePhotoLike('', 'post', postId)` 호출 — `WHERE user_id = ''` 쿼리 실행

### 6.3 팀 슬러그 캐시

**위치:** `app/src/services/photographerApi.ts:18-42`

```typescript
let _slugMap: Map<string, string> | null = null;

async function ensureSlugMaps(): Promise<void> {
  if (_slugMap && _uuidToSlugMap) return;
  const { data } = await supabase.from('teams').select('id, slug');
  _slugMap = new Map(data?.map(t => [t.slug, t.id]) ?? []);
  _uuidToSlugMap = new Map(data?.map(t => [t.id, t.slug]) ?? []);
}
```

모듈 레벨 캐시. 한 번 로드 후 앱 생명주기 동안 유지. 동시 호출 시 레이스 컨디션 가능.

### 6.4 Optimistic Update 패턴

```
사용자 액션 (좋아요 탭)
  ↓
로컬 상태 즉시 변경 (setPhotoLikedIds)
  ↓
isRemote 확인
  ├─ true → photographerApi.togglePhotoLike().catch(() => {})
  │         ⚠️ 실패 무시, 롤백 없음
  └─ false → 아무것도 안 함 (목 데이터 모드)
```

서버 에러, 네트워크 실패, 인증 만료 시 로컬 상태만 변경되고 서버와 동기화되지 않는다.

---

## 7. 이미지 파이프라인

### 7.1 현재 구현된 플로우

```
                    앱 (클라이언트)
┌─────────────────────────────────────────────┐
│ 1. ImagePicker (갤러리 선택)                  │
│    - mediaTypes: images                      │
│    - quality: 0.8                            │
│    - selectionLimit: 10                      │
│                                              │
│ 2. optimizeImage() — expo-image-manipulator  │
│    - resize: max 1920px 장변                 │
│    - compress: JPEG 80%                      │
│    - output: 로컬 캐시 URI                    │
│                                              │
│ 3. uploadPostImages() — 순차 업로드           │
│    for (uri of localUris) {                  │
│      fetch(uri) → blob                       │
│      supabase.storage.upload(blob)           │
│      getPublicUrl() → URL 수집               │
│    }                                         │
│                                              │
│ 4. createPhotoPost({ images: [urls] })       │
│    → supabase.from('photo_posts').insert()   │
└─────────────────────────────────────────────┘

                    서버 (Supabase)
┌─────────────────────────────────────────────┐
│ Storage: photo-posts 버킷                    │
│  - 공개: TRUE                                │
│  - 제한: 5MB (프로토콜: 30MB)                 │
│  - 허용: image/jpeg, image/png, image/webp   │
│  - 경로: {userId}/{timestamp}_{random}.jpg   │
│                                              │
│ ❌ 썸네일 생성 없음                           │
│ ❌ 다중 해상도 변환 없음                       │
│ ❌ WebP 변환 없음                             │
│ ❌ EXIF 메타데이터 제거 없음                   │
│ ❌ Progressive JPEG 없음                      │
│ ❌ CDN 캐시 헤더 설정 없음                    │
│ ❌ NSFW 필터 없음                             │
└─────────────────────────────────────────────┘
```

### 7.2 프로토콜 요구 vs 현실

| 항목 | 프로토콜 | 현재 |
|------|---------|------|
| 포토그래퍼 사진 최대 크기 | 30MB/장 | 5MB |
| 커뮤니티 사진 최대 크기 | 10MB/장 | 5MB |
| 지원 포맷 | JPEG, PNG, HEIC, RAW(DNG) | JPEG, PNG, WebP |
| 피드 썸네일 | 포토: 800px, 커뮤니티: 600px | 없음 (원본 1920px 그대로) |
| 원본 보존 | 포토그래퍼 사진 원본 보존 | 1920px로 축소 후 저장 |
| NSFW 필터 | AI 자동 검사 | 없음 |
| CDN | CDN 캐싱 | Supabase 기본 CDN |

### 7.3 업로드 성능 문제

- **순차 업로드**: `for` 루프로 10장을 순차 전송 — 10배 느림
- **이중 압축**: 클라이언트 0.8 → 서버 추가 처리 없음 (현재는 이중 아님, 향후 파이프라인 추가 시 주의)
- **메모리 풋프린트**: 모든 이미지를 Blob으로 메모리에 적재
- **부분 실패 미처리**: 3/10 업로드 후 실패 시 3개 고아 파일 잔류

---

## 8. 서버사이드 인프라 현황

### 8.1 존재하는 것

| 인프라 | 상태 |
|--------|------|
| Supabase PostgreSQL | ✅ 스키마 완성 (23 테이블) |
| Supabase Auth | ✅ OAuth + Email 연동 |
| Supabase Storage | ✅ photo-posts 버킷 |
| RLS 정책 | ✅ 60개 정책 |
| DB 트리거 | ✅ 18개 트리거 |

### 8.2 존재하지 않는 것

프로토콜(`dugout_protocol_v2_FINAL.md`)과 개발 스펙(`dugout_dev_spec.md`)에 명시되어 있으나 미구현:

#### Edge Functions (0/10 구현)

| 함수 | 목적 | 필요도 |
|------|------|--------|
| trending-update | 1시간 cron — 트렌딩 게시물 갱신 | 높음 |
| spam-check | DB 트리거 — 금칙어/도배/쿨다운 검사 | 높음 |
| notify-comment | DB 트리거 — 댓글 알림 발송 | 높음 |
| notify-like-milestone | DB 트리거 — 좋아요 10/50/100 알림 | 중간 |
| notify-poll-expired | cron — 투표 만료 알림 | 중간 |
| image-process | Storage 트리거 — 커뮤니티 이미지 리사이징/압축/썸네일 | 높음 |
| image-process-hq | Storage 트리거 — 포토그래퍼 이미지 썸네일 생성 | 높음 |
| nsfw-check | Storage 트리거 — AI NSFW 필터링 | 높음 (법적 리스크) |
| auto-blind | DB 트리거 — 5건 신고 누적 시 블라인드 + 사용자 제재 에스컬레이션 | 높음 |
| send-push | 범용 FCM 발송 | 높음 |

#### 외부 서비스 연동

| 서비스 | 용도 | 상태 |
|--------|------|------|
| Firebase Cloud Messaging | 푸시 알림 | ❌ 미연동. expo-notifications만 설치 |
| Google Cloud Vision API | NSFW 필터링 | ❌ 미연동 |
| Sentry | 에러 모니터링 | ❌ 미설치 |
| Sharp (이미지 처리) | 리사이징/압축/썸네일 | ❌ 미설치 |

#### 웹 인프라

| 항목 | 상태 |
|------|------|
| Next.js 웹 앱 (dugoutfan.com) | ❌ 디렉토리 자체 없음 |
| 랜딩 페이지 | ❌ |
| 딥링크 미리보기 (/post/[id]) | ❌ |
| OG 이미지 생성 | ❌ |
| 앱 설치 유도 배너 | ❌ |

#### 실시간 기능

| 기능 | 상태 |
|------|------|
| Supabase Realtime 구독 | ❌ 미사용. 클라이언트에서 폴링도 없음 |
| 실시간 댓글 피드 | ❌ |
| 실시간 투표 결과 | ❌ |
| 실시간 알림 | ❌ |

---

## 9. 배포 · CI/CD · 모니터링

### 9.1 현재 배포 설정

| 항목 | 앱 | 어드민 |
|------|-----|--------|
| 빌드 도구 | EAS Build | Vite |
| 빌드 프로필 | dev/preview/production | dev/build |
| 배포 설정 | eas.json만 존재 | 없음 (수동 빌드) |
| 환경변수 관리 | .env (git 미포함) | 없음 (VITE_ 미사용) |
| 배포 자동화 | ❌ | ❌ |

### 9.2 존재하지 않는 CI/CD

```
❌ .github/workflows/     — GitHub Actions 없음
❌ .eas/workflows/         — EAS Workflow 없음  
❌ vercel.json             — Vercel 배포 설정 없음
❌ Dockerfile              — 컨테이너 없음
❌ docker-compose.yml      — 로컬 개발 환경 없음
```

### 9.3 존재하지 않는 모니터링

| 카테고리 | 도구 | 상태 |
|----------|------|------|
| 에러 추적 | Sentry | ❌ |
| 성능 모니터링 | Sentry Performance | ❌ |
| 사용자 분석 | PostHog/Mixpanel/Amplitude | ❌ |
| 서버 모니터링 | Supabase Dashboard | 기본만 |
| 앱 크래시 리포트 | Firebase Crashlytics | ❌ |
| 로그 수집 | 전용 시스템 없음 | ❌ console.log만 |

### 9.4 환경변수 관리

**앱:**
```
EXPO_PUBLIC_SUPABASE_URL      — .env 파일 (git 미포함)
EXPO_PUBLIC_SUPABASE_ANON_KEY — .env 파일 (git 미포함)
(기타 키 미확인)
```

**어드민:**
```
VITE_* 환경변수를 사용하는 코드가 전혀 없음
모든 설정이 하드코딩
```

**누락된 환경변수 (.env.example 없음):**
```
# 앱
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SENTRY_DSN=

# 어드민
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=    # 또는 SERVICE_KEY (서버사이드)
VITE_SENTRY_DSN=

# Edge Functions
SUPABASE_SERVICE_ROLE_KEY=
FCM_SERVER_KEY=
NSFW_API_KEY=
```

---

## 10. 프로덕션 준비도 평가

### 10.1 종합 점수표

| 영역 | 점수 | 평가 |
|------|------|------|
| 모바일 앱 UI/UX | 8/10 | 49 화면, 29 컴포넌트, 한국어 완벽 |
| 어드민 UI | 7/10 | 22 페이지, 포괄적 기능 |
| DB 스키마 설계 | 7/10 | 정규화 양호, RLS 포괄적, 누락 테이블 5개 |
| 인증 시스템 | 4/10 | OAuth 작동, 테스트 계정 분리 안 됨 |
| API 계층 | 3/10 | 포토그래퍼만 연동, 커뮤니티 미연동 |
| 서버사이드 로직 | 1/10 | Edge Functions 0개 |
| 이미지 처리 | 2/10 | 기본 업로드만, 썸네일/NSFW 없음 |
| 푸시 알림 | 1/10 | SDK만 설치, 서버 미연동 |
| 웹 인프라 | 0/10 | 없음 |
| 배포/CI/CD | 1/10 | EAS 프로필만 존재 |
| 모니터링 | 0/10 | 없음 |
| 테스트 | 0/10 | 없음 |
| 보안 | 3/10 | RLS 양호, 하드코딩 크레덴셜 |

### 10.2 런칭까지 필수 작업

```
[1단계 — DB 완성]
 □ users 테이블 + auth.users 트리거
 □ cheerleaders 테이블
 □ photo_posts 누락 컬럼 (status, rejection_reason, cheerleader_id)
 □ notifications, announcements 테이블
 □ players 시드 데이터 (150-200명)
 □ 관리자 RLS 정책

[2단계 — API 연동]
 □ communityApi.ts 서비스 파일
 □ CommunityContext Supabase 연동
 □ 어드민 Supabase 클라이언트 추가
 □ 어드민 Auth를 Supabase Auth로 전환

[3단계 — 보안]
 □ 테스트 계정 프로덕션 분리
 □ 어드민 접근 제어
 □ OAuth 토큰 콘솔 출력 제거
 □ .env.example 파일 생성

[4단계 — 서버사이드]
 □ Edge Function: spam-check
 □ Edge Function: image-process (썸네일)
 □ Edge Function: nsfw-check
 □ FCM 연동 + send-push
 □ trending-update cron

[5단계 — 인프라]
 □ Sentry 설치 (앱 + 어드민)
 □ CI/CD 파이프라인 (GitHub Actions)
 □ EAS Build 자동화
 □ 어드민 Vercel 배포
 □ Storage 파일 크기 30MB로 조정
```

### 10.3 아키텍처 개선 권장사항

| 영역 | 현재 | 권장 |
|------|------|------|
| 앱 상태관리 | Context 18개 중첩 | Zustand 또는 Context 분할 |
| 앱 서비스 계층 | 1개 파일 (548줄) | 도메인별 분리 (communityApi, authApi 등) |
| 어드민 상태관리 | AdminContext 1개 (580줄) | 도메인별 Context 분리 또는 TanStack Query |
| 어드민 코드 분할 | 단일 번들 | React.lazy + Suspense |
| 이미지 캐싱 | 없음 | expo-image (빌트인 캐싱) |
| 데이터 페칭 | 전체 로드 + useState | 페이지네이션 + SWR/TanStack Query |
| 에러 처리 | .catch(() => {}) | 롤백 + 사용자 알림 |
| 환경변수 | .env + 하드코딩 혼재 | .env.example + 빌드 시 주입 |

---

> 이 문서는 코드베이스의 기술적 현실을 객관적으로 분석한 것이며, 2026-04-01 시점의 코드 기준이다.
