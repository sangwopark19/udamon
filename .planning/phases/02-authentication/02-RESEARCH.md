# Phase 2: Authentication - Research

**Researched:** 2026-04-07
**Domain:** Supabase Auth + Expo React Native OAuth + 프로필/차단/탈퇴
**Confidence:** HIGH

## Summary

Phase 2는 기존 mock/test 기반 AuthContext를 실제 Supabase Auth로 전환하고, Google/Apple/Kakao/Naver 4종 소셜 로그인, 이메일/비밀번호 인증, 프로필 온보딩, 회원 탈퇴(soft delete), 사용자 차단 기능을 구현하는 단계이다.

기존 코드베이스에는 이미 `AuthContext.tsx`에 OAuth 흐름 구조(`signInWithOAuth` + `extractAndSetSession` + `onAuthStateChange`)가 구현되어 있고, `LoginScreen.tsx`에 SNS 버튼 배열 패턴이 있으며, `BlockContext.tsx`에 인메모리 차단 로직이 존재한다. `user_blocks` 테이블과 RLS 정책도 이미 마이그레이션에 정의되어 있다. 따라서 Phase 2의 핵심은 **기존 구조를 유지하면서 mock 데이터를 실제 Supabase 호출로 교체**하는 것이다.

**Primary recommendation:** Supabase의 built-in OAuth provider(Google, Apple, Kakao)와 Custom OAuth Provider(Naver)를 활용하되, 네이티브 토큰 방식(`signInWithIdToken`)보다 웹 기반 OAuth(`signInWithOAuth` + `expo-web-browser`)를 우선 구현하라. 기존 AuthContext의 `extractAndSetSession` 패턴이 이미 이 방식을 따르고 있어 변경 최소화에 유리하다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 소셜 로그인 버튼 순서를 카카오 -> 네이버 -> Google -> Apple로 배치 (한국 사용자 전환율 최적화)
- **D-02:** Apple DUNS 미완료 시 버튼을 회색 비활성화 + '준비 중' 텍스트 표시 (사용자가 기능 존재를 인지하되 혼란 방지)
- **D-03:** 게스트 모드(비로그인 브라우징) 유지 -- 탐색은 자유, 글쓰기/좋아요 등 액션 시 로그인 유도 모달
- **D-04:** 이메일/비밀번호 로그인은 소셜 버튼 아래 하단 접기 방식 (현재 LoginScreen 구조 유지)
- **D-05:** 최초 가입 직후 별도 온보딩 화면으로 이동 (로그인 -> 닉네임+구단 선택 -> 홈)
- **D-06:** 온보딩 필수 정보: 닉네임 + 응원 구단 (아바타는 선택, 기본 아바타 제공)
- **D-07:** 닉네임 규칙: 2~12자, 한글/영문/숫자만 허용, 특수문자 불가, 고유성 필수, 30일 변경 제한
- **D-08:** 탈퇴 과정: 설정 > 탈퇴 -> 경고 문구(콘텐츠 유지, 재가입 시 복구 불가) -> '탈퇴하기' 확인 버튼 (2단계)
- **D-09:** 사용자 차단 접근: 프로필 화면 '차단' 버튼 + 게시글/댓글 ... 메뉴에서 '차단' 옵션 (양쪽 모두)
- **D-10:** 차단 목록 관리: 설정 > 차단 관리 화면에서 차단 해제 가능
- **D-11:** OAuth 실패 시 하단 토스트 메시지로 안내 (기존 showToast 패턴 활용), 사용자 취소는 무시
- **D-12:** 세션 만료 시 Supabase autoRefreshToken이 자동 갱신, 실패 시 로그인 화면으로 이동 + 토스트 안내
- **D-13:** 닉네임 중복 체크는 실시간 debounce(500ms)로 사용 가능/불가 즉시 표시

### Claude's Discretion
- 온보딩 화면 레이아웃/디자인 (구단 선택 UI: 리스트 vs 그리드)
- 토스트 메시지 정확한 문구
- 차단 확인 모달 디자인
- Naver OAuth Edge Function 프록시 구현 방식 세부 사항
- 비밀번호 찾기(resetPasswordForEmail) 화면 디자인

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Google OAuth 설정 및 Supabase 연동 | Supabase built-in Google provider, `signInWithOAuth` 웹 기반 흐름. 기존 AuthContext.login()에서 google 케이스 이미 구현 |
| AUTH-02 | Apple Sign In 설정 및 Supabase 연동 (DUNS 완료 시) | Supabase built-in Apple provider + 비활성화 플래그 구현. D-02에 따라 `APPLE_SIGNIN_ENABLED` 상수 사용 |
| AUTH-03 | Kakao OAuth 설정 및 Supabase 연동 | Supabase built-in Kakao provider. Dashboard에서 REST API Key + Client Secret 설정 필요 |
| AUTH-04 | Naver OAuth Edge Function 프록시 구현 | Supabase Custom OAuth Provider(`custom:naver`) 또는 Edge Function proxy 방식. Naver는 OIDC 미지원으로 OAuth2 수동 설정 필요 |
| AUTH-05 | 이메일/비밀번호 로그인 Supabase Auth 연동 | 기존 `signInWithPassword` + `signUp` 이미 구현. 테스트 계정 분기 제거가 핵심 |
| AUTH-06 | 비밀번호 찾기 (resetPasswordForEmail) | 기존 `resetPassword` 함수 이미 구현. Deep link `auth/reset` 콜백 처리 보강 필요 |
| AUTH-07 | AuthContext -> Supabase Auth 완전 전환 | TEST_ACCOUNTS 제거, mock 분기 제거, AsyncStorage 기반 Supabase 세션 관리로 전환 |
| AUTH-08 | users 테이블 연동 (프로필 로드, 닉네임 30일 제한, 고유성) | Phase 1의 public.users 테이블 활용. 온보딩 화면에서 닉네임/구단 설정, fetchUserProfile 강화 |
| AUTH-09 | 회원 탈퇴 (soft delete) | public.users의 is_deleted/deleted_at 컬럼 UPDATE + Supabase Admin API 연동(Edge Function 경유) |
| AUTH-10 | 사용자 차단 기능 | 기존 user_blocks 테이블 + RLS 활용. BlockContext를 Supabase 연동으로 전환 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.100.1 (installed) | Auth client, DB queries | 프로젝트 기존 스택 [VERIFIED: npm ls] |
| expo-web-browser | ~15.0.10 (installed) | OAuth 인앱 브라우저 | 기존 OAuth 흐름에 사용 중 [VERIFIED: npm ls] |
| expo-linking | ~8.0.11 (installed) | Deep link / OAuth callback | 기존 구현에 사용 중 [VERIFIED: npm ls] |
| @react-native-async-storage/async-storage | 2.2.0 (installed) | 세션 persistence | Supabase RN 공식 권장 [CITED: supabase.com/docs/guides/auth/quickstarts/react-native] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-apple-authentication | (SDK 54 compatible) | Apple native sign-in | AUTH-02: Apple Sign In 네이티브 구현 시 (DUNS 완료 후) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| signInWithOAuth (웹 기반) | signInWithIdToken (네이티브) | 네이티브가 UX 우수하나 추가 라이브러리(@react-native-google-signin) 필요. v1은 웹 기반으로 충분 |
| Custom OAuth Provider (Naver) | Edge Function 전체 프록시 | Custom OAuth Provider가 Supabase 2025 공식 기능. Edge Function은 fallback |
| expo-auth-session | expo-web-browser 직접 사용 | 기존 코드가 이미 expo-web-browser 패턴 사용 중, 변경 불필요 |

**Installation:**
```bash
# 추가 설치 불필요 -- 모든 핵심 패키지 이미 설치됨
# Apple Sign In 활성화 시에만:
npx expo install expo-apple-authentication
```

**Version verification:**
- @supabase/supabase-js: 2.100.1 installed, 2.101.1 latest [VERIFIED: npm registry 2026-04-07]
- expo-web-browser: 15.0.10 installed [VERIFIED: npm ls]
- expo-linking: 8.0.11 installed [VERIFIED: npm ls]
- async-storage: 2.2.0 installed [VERIFIED: npm ls]

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── contexts/
│   ├── AuthContext.tsx          # 리팩토링: Supabase Auth 완전 전환
│   └── BlockContext.tsx         # 리팩토링: Supabase user_blocks 연동
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx     # 수정: SNS 버튼 순서 변경 + Naver 추가
│   │   ├── SignupScreen.tsx    # 수정: 온보딩 분리, 이메일 가입만 담당
│   │   └── ForgotPasswordScreen.tsx  # 수정: deep link 콜백 처리
│   ├── onboarding/
│   │   └── ProfileSetupScreen.tsx    # 신규: 닉네임+구단 온보딩
│   └── settings/
│       ├── AccountManagementScreen.tsx  # 수정: 실제 soft delete 연동
│       └── BlockedUsersScreen.tsx       # 수정: Supabase 연동
├── services/
│   └── supabase.ts             # 수정: AsyncStorage 통합, AppState 관리
├── constants/
│   └── config.ts               # 수정: APPLE_SIGNIN_ENABLED 플래그 추가
└── types/
    └── navigation.ts           # 수정: ProfileSetup 라우트 추가
```

### Pattern 1: Supabase Auth Client 초기화 (React Native)
**What:** Supabase 클라이언트를 AsyncStorage + AppState auto-refresh로 설정
**When to use:** 앱 전체에서 사용하는 단일 인스턴스
**Example:**
```typescript
// Source: supabase.com/docs/guides/auth/quickstarts/react-native
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// AppState 기반 auto-refresh 관리
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

### Pattern 2: OAuth 흐름 (Web-based, 기존 패턴 유지)
**What:** signInWithOAuth + expo-web-browser + deep link callback
**When to use:** Google, Kakao, Naver 소셜 로그인
**Example:**
```typescript
// Source: 기존 AuthContext.tsx 패턴 기반
const login = async (provider: LoginProvider) => {
  const providerMap: Record<string, string> = {
    google: 'google',
    apple: 'apple',
    kakao: 'kakao',
    naver: 'custom:naver', // Supabase Custom OAuth Provider
  };

  const redirectUrl = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: providerMap[provider],
    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
  });

  if (error) {
    showToast(t('oauth_error'), 'error'); // D-11
    return;
  }

  if (data?.url) {
    // Platform-specific browser handling (기존 패턴)
    if (Platform.OS === 'android') {
      await Linking.openURL(data.url);
    } else {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        await extractAndSetSession(result.url);
      }
      // result.type === 'cancel' -> D-11: 사용자 취소 시 무시
    }
  }
};
```

### Pattern 3: 온보딩 분기 (최초 가입 판별)
**What:** public.users의 nickname 유무로 온보딩 완료 여부 판별
**When to use:** 로그인 직후 라우팅 결정
**Example:**
```typescript
// AppNavigator에서 onboarding 판별
const { isAuthenticated, user } = useAuth();
const needsOnboarding = isAuthenticated && user && !user.nickname;

// initialRouteName 결정
canBrowse && needsOnboarding ? 'ProfileSetup' :
canBrowse ? 'MainTabs' :
'Login'
```

### Pattern 4: 닉네임 실시간 중복 체크 (Debounce)
**What:** 500ms debounce로 닉네임 고유성 체크
**When to use:** 온보딩/프로필 수정 화면
**Example:**
```typescript
// D-13: 500ms debounce 닉네임 중복 체크
const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
const debounceRef = useRef<ReturnType<typeof setTimeout>>();

const checkNickname = useCallback((value: string) => {
  if (debounceRef.current) clearTimeout(debounceRef.current);
  if (value.length < 2) { setNicknameStatus('idle'); return; }
  setNicknameStatus('checking');

  debounceRef.current = setTimeout(async () => {
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', value)
      .maybeSingle();
    setNicknameStatus(data ? 'taken' : 'available');
  }, 500);
}, []);
```

### Pattern 5: Soft Delete (회원 탈퇴)
**What:** public.users is_deleted=true 설정 + auth.users soft delete
**When to use:** 회원 탈퇴 요청 시
**Example:**
```typescript
// Edge Function에서 처리 (service_role 필요)
// 1. public.users.is_deleted = true, deleted_at = NOW()
// 2. supabase.auth.admin.deleteUser(userId, { shouldSoftDelete: true })
// 3. 클라이언트에서 signOut 호출
```

### Anti-Patterns to Avoid
- **테스트 계정 분기를 유지하면 안 됨:** Phase 2 완료 시 `TEST_ACCOUNTS`, `TEST_ACCOUNT_KEY` 완전 제거. SEC-01 요구사항
- **AsyncStorage에 세션을 직접 관리하면 안 됨:** Supabase의 `storage: AsyncStorage` 옵션으로 세션 관리를 위임
- **onAuthStateChange에서 fetchUserProfile을 매번 호출하면 안 됨:** TOKEN_REFRESHED 이벤트에서는 프로필 재조회 불필요, SIGNED_IN일 때만 조회
- **auth.users를 직접 쿼리하면 안 됨:** 항상 public.users를 통해 프로필 데이터 접근

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth 흐름 | 직접 authorization code exchange | `supabase.auth.signInWithOAuth` | 토큰 교환, PKCE, state 파라미터 등 보안 처리가 복잡 |
| 세션 갱신 | setTimeout으로 토큰 갱신 | `autoRefreshToken: true` + `startAutoRefresh()` | 만료 시점 계산, 경쟁 상태 등 엣지케이스 다수 |
| 세션 저장 | AsyncStorage에 직접 토큰 저장 | Supabase `storage: AsyncStorage` 옵션 | 암호화, 갱신, 무효화 로직 내장 |
| 비밀번호 해싱 | bcrypt 직접 사용 | `supabase.auth.signUp` | Supabase가 서버 사이드에서 안전하게 처리 |
| 회원 탈퇴 | auth.users 직접 삭제 | Edge Function + `auth.admin.deleteUser` | service_role 키가 필요하며 클라이언트에 노출 불가 |
| 닉네임 고유성 | 클라이언트 검증만 | DB UNIQUE 제약 + 클라이언트 debounce | 동시성 문제를 DB가 최종 보장 |

**Key insight:** Supabase Auth는 OAuth, 세션, 토큰 갱신을 모두 내장하고 있으므로 직접 구현할 필요가 없다. 프로젝트에서 해야 할 것은 **Supabase API를 올바르게 호출**하고, **public.users 테이블과 동기화**하는 것이다.

## Common Pitfalls

### Pitfall 1: Android에서 OAuth 콜백 누락
**What goes wrong:** Android Custom Tabs에서 Expo Go로의 scheme redirect가 실패
**Why it happens:** Android Custom Tabs는 커스텀 스키마(`udamon://`) 리다이렉트를 안정적으로 처리하지 못함 (Expo Go 환경)
**How to avoid:** 기존 코드의 패턴 유지 -- Android에서는 `Linking.openURL(data.url)`로 시스템 브라우저를 열고 deep link listener가 콜백을 처리. Development build에서는 Custom Tabs 동작이 개선됨
**Warning signs:** OAuth 후 앱으로 돌아오지 않거나 `extractAndSetSession`이 호출되지 않음

### Pitfall 2: onAuthStateChange의 중복 이벤트
**What goes wrong:** 로그인 시 SIGNED_IN 이벤트가 여러 번 발생하여 fetchUserProfile이 중복 호출됨
**Why it happens:** Supabase Auth가 세션 복원, 토큰 갱신 시마다 이벤트를 발생시킴
**How to avoid:** 이벤트 타입을 체크하여 SIGNED_IN일 때만 프로필을 로드하고, TOKEN_REFRESHED에서는 세션만 업데이트. `useRef`로 진행 중인 프로필 로드를 추적하여 중복 방지
**Warning signs:** 로그인 직후 프로필 API가 3-4회 호출되는 것이 로그에 보임

### Pitfall 3: 테스트 계정 제거 시 기존 기능 깨짐
**What goes wrong:** TEST_ACCOUNTS 제거 후 다른 Context들이 test user에 의존하던 부분이 동작하지 않음
**Why it happens:** PhotographerContext, AdminContext 등이 test user의 하드코딩된 ID나 플래그에 의존
**How to avoid:** TEST_ACCOUNTS 제거 전에 영향 범위를 grep으로 확인. `isSupabaseConfigured` 플래그 분기를 함께 제거하되 Context별로 개별 검증
**Warning signs:** `test-user-001`, `admin-001` 등의 하드코딩된 ID를 참조하는 코드

### Pitfall 4: Apple Sign In에서 사용자 이름 소실
**What goes wrong:** Apple은 최초 로그인에서만 full_name을 제공하며, 이후에는 null 반환
**Why it happens:** Apple의 보안 정책상 first sign-in에서만 이름 공유
**How to avoid:** Apple 최초 로그인 시 `credential.fullName`을 즉시 `public.users`에 저장. 온보딩에서 닉네임을 별도 입력받는 구조이므로 Apple 이름 의존도 낮음 [CITED: supabase.com/docs/guides/auth/social-login/auth-apple]
**Warning signs:** Apple로 로그인한 사용자의 display_name이 null

### Pitfall 5: Naver OAuth의 OIDC 비호환
**What goes wrong:** Supabase Custom OIDC Provider로 Naver를 설정하면 discovery URL이 없어 실패
**Why it happens:** Naver는 표준 OIDC를 지원하지 않고 OAuth2만 지원
**How to avoid:** Custom OAuth Provider의 **OAuth2 모드**를 사용하여 authorization, token, userinfo 엔드포인트를 수동 지정. 또는 Edge Function proxy로 토큰 교환 후 `signInWithIdToken` 호출 [CITED: supabase.com/docs/guides/auth/custom-oauth-providers]
**Warning signs:** `/.well-known/openid-configuration` 요청 실패 에러

### Pitfall 6: 닉네임 변경 30일 제한의 시간대 처리
**What goes wrong:** 서버 시간과 클라이언트 시간의 차이로 30일 제한 검증이 부정확
**Why it happens:** `nickname_changed_at` 컬럼을 클라이언트에서 비교할 때 시간대(timezone) 불일치
**How to avoid:** 서버 사이드에서 30일 제한을 검증 -- RLS policy 또는 DB function에서 `NOW() - nickname_changed_at < interval '30 days'` 체크
**Warning signs:** 사용자가 30일이 지나지 않았는데 닉네임 변경이 되거나, 반대로 30일이 지났는데 변경이 안 됨

## Code Examples

### Supabase 클라이언트 설정 (현재 -> 목표)
```typescript
// Source: supabase.com/docs/guides/auth/quickstarts/react-native
// 현재: app/src/services/supabase.ts
// 변경 사항: storage 옵션 추가, AppState 연동

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,       // 추가: RN용 저장소
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 추가: AppState 기반 auto-refresh
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

### Naver Custom OAuth Provider 설정 (Supabase Dashboard)
```
// Source: supabase.com/docs/guides/auth/custom-oauth-providers
// Supabase Dashboard > Auth > Providers > New Provider > OAuth2

Identifier: custom:naver
Client ID: [Naver Developer Console에서 발급]
Client Secret: [Naver Developer Console에서 발급]
Authorization URL: https://nid.naver.com/oauth2.0/authorize
Token URL: https://nid.naver.com/oauth2.0/token
User Info URL: https://openapi.naver.com/v1/nid/me
Scopes: (기본값 사용)
```

### 회원 탈퇴 Edge Function 패턴
```typescript
// Source: supabase.com/docs/reference/javascript/auth-admin-deleteuser
// supabase/functions/delete-account/index.ts

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // 1. JWT에서 사용자 인증
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  // 2. public.users soft delete
  await supabase
    .from('users')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', user.id);

  // 3. auth.users soft delete (service_role 필요)
  await supabase.auth.admin.deleteUser(user.id, true); // shouldSoftDelete=true

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### 차단 기능 Supabase 연동
```typescript
// BlockContext에서 Supabase user_blocks 테이블 연동
const blockUser = useCallback(async (blockedId: string) => {
  if (!currentUserId) return;

  const { error } = await supabase
    .from('user_blocks')
    .insert({ blocker_id: currentUserId, blocked_id: blockedId });

  if (error) {
    showToast(t('block_error'), 'error');
    return;
  }

  // 로컬 상태 업데이트 (optimistic)
  setBlockedUserIds((prev) => new Set(prev).add(blockedId));
  showToast(t('block_success'), 'success');
}, [currentUserId, showToast]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-react` | `@supabase/supabase-js` 내장 auth | 2024 | 별도 auth helper 패키지 불필요 |
| 수동 토큰 갱신 | `startAutoRefresh()`/`stopAutoRefresh()` | supabase-js 2.x | AppState 연동만 하면 자동 관리 |
| 개별 OAuth 프로바이더만 지원 | Custom OAuth/OIDC Provider | 2025 | Naver 같은 비표준 프로바이더도 대시보드에서 설정 가능 |
| `expo-auth-session` 사용 | `expo-web-browser` 직접 사용 | Expo SDK 50+ | expo-auth-session 없이도 OAuth 구현 가능, 더 심플 |

**Deprecated/outdated:**
- `expo-auth-session`: 여전히 작동하지만 프로젝트에서 사용하지 않음. `expo-web-browser` 직접 사용 패턴이 더 단순
- `@supabase/auth-helpers-*`: 더 이상 권장되지 않음. supabase-js v2에 모든 기능 내장

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Naver OAuth가 Supabase Custom OAuth Provider (OAuth2 모드)로 동작함 | Architecture Patterns / Pitfall 5 | Naver API 응답 형식이 Supabase 기대와 불일치 시 Edge Function proxy 필요. 대안 방식 존재하므로 리스크 중간 |
| A2 | Phase 1에서 public.users 테이블에 nickname, nickname_changed_at, is_deleted, deleted_at 컬럼이 생성됨 | Phase Requirements AUTH-08, AUTH-09 | Phase 1 미완료 시 마이그레이션 추가 필요 |
| A3 | Supabase Dashboard에서 Google, Apple, Kakao provider 활성화가 가능한 상태 | Standard Stack | API 키 발급이 사전에 완료되어야 함. 외부 의존성 |
| A4 | expo-apple-authentication이 Expo SDK 54와 호환됨 | Standard Stack | Expo Go에서는 작동하지 않을 수 있음. Development build 필요 가능성 |

## Open Questions

1. **Supabase 프로젝트 환경 설정 완료 여부** -- RESOLVED
   - What we know: `.env` 파일이 존재하지만 내용 미확인, `isSupabaseConfigured` 플래그로 분기 중
   - What's unclear: Google/Kakao/Naver API 키가 발급되었는지, Supabase Dashboard에서 provider가 활성화되었는지
   - Recommendation: 플래너가 "OAuth Provider 대시보드 설정" 태스크를 Wave 0으로 배치하여 선행 작업으로 처리
   - Resolution: 02-04-PLAN.md의 user_setup 섹션에서 OAuth provider 대시보드 설정을 checkpoint로 처리. 실행 시 사용자가 직접 설정.

2. **Naver Custom OAuth Provider의 userinfo 응답 매핑** -- RESOLVED
   - What we know: Naver userinfo 엔드포인트는 `https://openapi.naver.com/v1/nid/me`, Supabase Custom OAuth는 OAuth2 모드 지원
   - What's unclear: Naver의 userinfo JSON 응답 구조가 Supabase가 기대하는 형식과 맞는지 (email, name 등 필드 매핑)
   - Recommendation: Naver API 응답이 `{ response: { id, email, name, ... } }` 래핑 구조를 사용하므로 Custom Provider의 userinfo 파싱이 정상 동작하는지 실제 테스트 필요. 실패 시 Edge Function proxy로 응답 변환
   - Resolution: 02-01-PLAN.md에서 custom:naver provider로 signInWithOAuth 구현. 04-PLAN.md human-verify에서 실제 Naver 로그인 테스트. 실패 시 Edge Function proxy로 전환 (Claude discretion).

3. **Phase 1 완료 의존성** -- RESOLVED
   - What we know: Phase 2는 Phase 1 (DB Foundation)에 의존. public.users 테이블, RLS 정책 등이 전제 조건
   - What's unclear: Phase 1이 완료되었는지 (STATE.md에 "Phase 1 Ready to plan"으로 표시)
   - Recommendation: Phase 2 계획에 Phase 1 의존성을 명시적으로 기록. Wave 0에서 DB 스키마 존재 여부를 확인하는 검증 단계 포함
   - Resolution: ROADMAP.md에 Phase 2 depends_on Phase 1 명시. 02-04-PLAN.md Task 1에서 supabase db push로 스키마 동기화 확인.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | DB migration 테스트 | ✓ | 2.85.0 | -- |
| Node.js | Expo dev server | ✓ | (dev tooling) | -- |
| expo-web-browser | OAuth 브라우저 | ✓ | 15.0.10 | -- |
| @supabase/supabase-js | Auth client | ✓ | 2.100.1 | -- |
| Supabase Dashboard | OAuth provider 설정 | 미확인 | -- | CLI로 config 설정 가능 |
| Google OAuth Client ID | AUTH-01 | 미확인 | -- | 설정 태스크 필요 |
| Kakao REST API Key | AUTH-03 | 미확인 | -- | 설정 태스크 필요 |
| Naver Client ID/Secret | AUTH-04 | 미확인 | -- | 설정 태스크 필요 |
| Apple Developer Account | AUTH-02 | DUNS 미완료 | -- | 비활성화 플래그 (D-02) |

**Missing dependencies with no fallback:**
- 없음. Apple Sign In은 DUNS 완료 전까지 비활성화 처리로 해결 (D-02)

**Missing dependencies with fallback:**
- Google/Kakao/Naver API 키: 개발자 콘솔에서 발급 필요. 태스크로 포함

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 미감지 -- app/에 jest/vitest 설정 없음 |
| Config file | none -- Wave 0에서 설정 필요 |
| Quick run command | `npx jest --testPathPattern=auth --bail` (설정 후) |
| Full suite command | `npx jest` (설정 후) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Google OAuth 호출 시 signInWithOAuth 실행 | unit (mock) | `npx jest tests/auth/googleOAuth.test.ts` | ❌ Wave 0 |
| AUTH-03 | Kakao OAuth 호출 시 signInWithOAuth 실행 | unit (mock) | `npx jest tests/auth/kakaoOAuth.test.ts` | ❌ Wave 0 |
| AUTH-05 | 이메일 로그인 시 signInWithPassword 호출 | unit (mock) | `npx jest tests/auth/emailAuth.test.ts` | ❌ Wave 0 |
| AUTH-07 | AuthContext가 TEST_ACCOUNTS 없이 동작 | unit | `npx jest tests/auth/authContext.test.ts` | ❌ Wave 0 |
| AUTH-08 | 닉네임 2~12자, 한글/영문/숫자만, 30일 제한 | unit | `npx jest tests/auth/nickname.test.ts` | ❌ Wave 0 |
| AUTH-09 | Soft delete가 is_deleted 플래그 설정 | integration | manual -- Edge Function 배포 후 테스트 | ❌ |
| AUTH-10 | 차단 시 user_blocks에 INSERT | unit (mock) | `npx jest tests/auth/block.test.ts` | ❌ Wave 0 |
| AUTH-02 | Apple Sign In (DUNS 완료 시) | manual-only | DUNS 미완료로 자동화 불가 | ❌ |
| AUTH-04 | Naver OAuth 프록시 | integration | manual -- Custom Provider 설정 후 테스트 | ❌ |
| AUTH-06 | resetPasswordForEmail 호출 | unit (mock) | `npx jest tests/auth/resetPassword.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern=auth --bail`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green + 수동 OAuth 로그인 테스트 (Google, Kakao)

### Wave 0 Gaps
- [ ] Jest 또는 Vitest 프레임워크 설치 및 설정 (`jest.config.ts` or `vitest.config.ts`)
- [ ] React Native 테스트 환경 설정 (`jest-expo` 프리셋)
- [ ] Supabase client mock 유틸리티 (`tests/mocks/supabase.ts`)
- [ ] 공통 fixtures (`tests/fixtures/users.ts` -- 테스트용 프로필 데이터)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (OAuth 2.0 PKCE, bcrypt password hashing) |
| V3 Session Management | yes | Supabase JWT + refresh token, autoRefreshToken, AppState 연동 |
| V4 Access Control | yes | RLS 정책 (auth.uid() 기반), service_role 분리 |
| V5 Input Validation | yes | 닉네임: regex + 길이 제한 (2~12자), DB CHECK 제약 |
| V6 Cryptography | no | Supabase가 서버 사이드 암호화 처리, 앱에서 직접 암호화 불필요 |

### Known Threat Patterns for Expo + Supabase Auth

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| OAuth redirect 가로채기 | Spoofing | PKCE (Supabase 기본 활성화), state 파라미터, 등록된 redirect URL만 허용 |
| 토큰 탈취 (AsyncStorage) | Information Disclosure | Expo SecureStore 고려 가능하나 v1은 AsyncStorage + autoRefreshToken으로 충분 |
| 닉네임 인젝션 | Tampering | 클라이언트 regex + DB CHECK 제약 + RLS |
| service_role 키 노출 | Elevation of Privilege | Edge Function에서만 사용, 클라이언트 코드에 절대 포함 불가 |
| 회원 탈퇴 우회 | Tampering | Edge Function에서 JWT 검증 후 본인 계정만 삭제 가능 |
| 차단 우회 (API 직접 호출) | Tampering | RLS 정책이 blocker_id = auth.uid() 강제 |

## Sources

### Primary (HIGH confidence)
- [supabase.com/docs/guides/auth/quickstarts/react-native] - React Native Auth 설정, AsyncStorage, AppState 패턴
- [supabase.com/docs/guides/auth/social-login/auth-kakao] - Kakao OAuth 설정 가이드
- [supabase.com/docs/guides/auth/social-login/auth-google] - Google OAuth, signInWithIdToken vs signInWithOAuth 비교
- [supabase.com/docs/guides/auth/social-login/auth-apple] - Apple Sign In 설정, fullName 최초 제공 주의사항
- [supabase.com/docs/guides/auth/custom-oauth-providers] - Custom OAuth/OIDC Provider 설정 (Naver용)
- [supabase.com/docs/reference/javascript/auth-admin-deleteuser] - 사용자 삭제 API, shouldSoftDelete 파라미터
- [supabase.com/docs/guides/auth/native-mobile-deep-linking] - Expo deep link 설정, OAuth callback 처리

### Secondary (MEDIUM confidence)
- [logto.io/oauth-providers-explorer/naver] - Naver OAuth2 엔드포인트 정보 (authorization, token, userinfo URL)
- [npm registry] - @supabase/supabase-js 2.101.1 latest, 2.100.1 installed

### Tertiary (LOW confidence)
- Naver userinfo 응답 구조 (`{ response: { id, email, name } }` 래핑) -- 공식 Naver Developer 문서 직접 확인 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- 모든 라이브러리 이미 설치됨, 버전 검증 완료
- Architecture: HIGH -- 기존 코드 패턴 분석 + Supabase 공식 문서 교차 검증
- Pitfalls: HIGH -- Supabase 커뮤니티 논의 + 공식 문서에서 확인된 알려진 이슈
- Naver OAuth: MEDIUM -- Custom OAuth Provider 설정 가능하나 실제 Naver API 응답 매핑은 테스트 필요

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (Supabase Auth는 안정적 API, 30일 유효)
