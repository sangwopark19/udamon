# Supabase Auth OAuth 연동 조사 - Google / Kakao / Naver

**작성일:** 2026-04-07
**도메인:** Supabase Auth + React Native Expo OAuth 소셜 로그인
**신뢰도:** HIGH (공식 문서 기반)

---

## 1. 개요

이 문서는 UDAMON 앱에서 Google, Kakao, Naver 3종 소셜 로그인을 Supabase Auth와 연동하기 위한 설정 가이드를 정리한다.

**핵심 결론:**

| Provider | Supabase 기본 지원 | 설정 방식 | 난이도 |
|----------|-------------------|-----------|--------|
| Google | YES (빌트인) | Dashboard에서 활성화 | 중 (플랫폼별 Client ID 필요) |
| Kakao | YES (빌트인) | Dashboard에서 활성화 | 하 (REST API Key만 필요) |
| Naver | NO (빌트인 아님) | Custom OAuth2 Provider | 중 (엔드포인트 수동 설정) |

**프로젝트 현황:**
- `app/app.json`의 scheme: `udamon`
- `expo-web-browser` ~15.0.10 이미 설치됨
- `AuthContext.tsx`에 OAuth 플로우 골격이 이미 구현됨 (`signInWithOAuth` + `extractAndSetSession`)
- 현재 redirect URL: `Linking.createURL('auth/callback')` -- Expo scheme 기반

**Google OAuth 접근법 관련 중요 결정:**

Expo SDK 53+ 부터 Expo 팀이 browser 기반 Google Auth를 더 이상 유지보수하지 않는다는 점이 확인되었다. [CITED: docs.expo.dev/guides/google-authentication/] 그러나 현재 UDAMON의 AuthContext는 이미 `expo-web-browser` + `signInWithOAuth` 패턴으로 구현되어 있고, 이 방식은 Supabase가 OAuth 플로우를 서버사이드에서 처리하므로 `expo-auth-session`과는 별개다. Supabase의 `signInWithOAuth` + `WebBrowser.openAuthSessionAsync`는 여전히 동작하며, Kakao와 Naver도 동일한 패턴을 사용할 수 있어 일관성이 유지된다.

대안인 native `@react-native-google-signin/google-signin` + `signInWithIdToken` 방식은 더 나은 UX를 제공하지만:
- Expo Go에서 테스트 불가 (development build 필요) [CITED: docs.expo.dev/guides/google-authentication/]
- iOS에서 nonce 이슈가 있어 Supabase Dashboard에서 "Skip nonce check" 활성화 필요 [CITED: github.com/react-native-google-signin/google-signin/issues/1176]
- Kakao/Naver는 native SDK가 없어 결국 browser 방식을 병행해야 함

**권장:** v1 런칭 시점에서는 3개 provider 모두 통일된 `signInWithOAuth` + `WebBrowser.openAuthSessionAsync` 방식을 사용하고, v2에서 Google native sign-in 마이그레이션을 고려한다.

---

## 2. Google OAuth 설정 가이드

### 2.1 Google Cloud Console 설정

**[CITED: supabase.com/docs/guides/auth/social-login/auth-google]**

#### Step 1: Google Auth Platform 접근

1. [Google Cloud Console](https://console.cloud.google.com/home/dashboard) 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택
3. [Google Auth Platform](https://console.cloud.google.com/auth/overview) 으로 이동

#### Step 2: OAuth 동의 화면 설정

1. **Audience** 설정: [Audience settings](https://console.cloud.google.com/auth/audience) 에서 대상 사용자 설정
   - 개발 중: "External" 선택
   - 테스트 사용자 추가 (검수 전 100명 제한)
2. **Scopes** 설정: [Scopes interface](https://console.cloud.google.com/auth/scopes) 에서 권한 설정
   - `openid` (수동 추가 필요)
   - `.../auth/userinfo.email` (기본 포함)
   - `.../auth/userinfo.profile` (기본 포함)
3. **Branding**: 앱 이름, 로고, 도메인 설정
   - 커스텀 도메인 사용 권장 (`auth.udamonfan.com` 등) -- 사용자 신뢰도 향상

#### Step 3: OAuth 2.0 Client ID 생성

[Clients creation page](https://console.cloud.google.com/auth/clients/create) 에서 생성.

**Web Application용 (필수 -- Supabase 서버가 사용):**

1. Application type: "Web application" 선택
2. Name: "UDAMON Web" (식별용)
3. Authorized redirect URIs에 추가:
   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   (`<PROJECT_REF>`는 Supabase 프로젝트 레퍼런스 ID)
4. Client ID와 Client Secret 저장

**iOS용 (선택 -- native sign-in 사용 시):**

1. Application type: "iOS" 선택
2. Bundle ID: `com.udamonfan.app`
3. App Store ID, Team ID (출시 후 추가)

**Android용 (선택 -- native sign-in 사용 시):**

1. Application type: "Android" 선택
2. Package name: `com.udamonfan.app`
3. SHA-1 certificate fingerprint:
   - 개발: EAS Build에서 추출
     ```bash
     eas credentials -p android
     ```
   - 프로덕션: Google Play Console > App integrity > SHA-1

### 2.2 Supabase Dashboard 설정

**경로:** Supabase Dashboard > Authentication > Providers > Google

1. **Google** provider를 찾아 토글 ON
2. **Client ID**: Web Application Client ID 입력
3. **Client Secret**: Web Application Client Secret 입력
4. **Skip nonce check**: 
   - v1 (web browser 방식): OFF 유지
   - native sign-in 사용 시: iOS를 위해 ON 필요
5. 표시된 **Callback URL** 확인: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - 이 URL이 Google Cloud Console의 Authorized redirect URIs에 등록되어 있어야 함

### 2.3 Redirect URL 설정

**Supabase Dashboard > Authentication > URL Configuration:**

"Additional Redirect URLs"에 다음 추가:
```
udamon://auth/callback
```
(app.json의 `scheme: "udamon"`에 대응)

### 2.4 구현 코드

현재 `AuthContext.tsx`의 `login` 함수가 이미 이 패턴을 사용 중:

```typescript
// app/src/contexts/AuthContext.tsx (기존 코드와 동일 패턴)
const login = async (provider: LoginProvider) => {
  const redirectUrl = Linking.createURL('auth/callback');
  // redirectUrl 결과: "udamon://auth/callback" (standalone) 또는 "exp://...+auth/callback" (Expo Go)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === 'success' && result.url) {
      await extractAndSetSession(result.url);
    }
  }
};
```

### 2.5 로컬 개발 설정

`supabase/config.toml` 파일 생성 (로컬 Supabase CLI 사용 시):

```toml
[auth.external.google]
enabled = true
client_id = "your-web-client-id.apps.googleusercontent.com"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
```

`.env` (로컬 Supabase CLI용):
```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 3. Kakao OAuth 설정 가이드

### 3.1 Kakao 기본 지원 확인

**Kakao는 Supabase에서 빌트인 provider로 지원된다.** [VERIFIED: supabase.com/docs/guides/auth/social-login/auth-kakao]

`signInWithOAuth({ provider: 'kakao' })`로 바로 사용 가능하며, Custom Provider 설정이 필요 없다.

### 3.2 Kakao Developers 설정

**[CITED: developers.kakao.com/docs/latest/en/kakaologin/rest-api]**

#### Step 1: 앱 등록

1. [Kakao Developers](https://developers.kakao.com/) 접속 및 로그인
2. 상단 **내 애플리케이션** > **애플리케이션 추가하기**
3. 앱 정보 입력:
   - 앱 아이콘
   - 앱 이름: "우다몬" 또는 "UDAMON"
   - 사업자명
   - 카테고리 선택

#### Step 2: REST API Key 확인

**경로:** 내 애플리케이션 > 앱 설정 > 앱 키

- **REST API 키** 확인 -- 이것이 Supabase의 `Client ID`로 사용됨

#### Step 3: Client Secret 생성

**경로:** 내 애플리케이션 > 제품 설정 > 카카오 로그인 > 보안

1. "Client Secret" 코드 발급
2. **활성화 상태**: "사용함"으로 변경 (중요!)

#### Step 4: 카카오 로그인 활성화

**경로:** 내 애플리케이션 > 제품 설정 > 카카오 로그인 > 활성화 설정

1. "카카오 로그인" **활성화** ON

#### Step 5: Redirect URI 등록

**경로:** 내 애플리케이션 > 제품 설정 > 카카오 로그인 > Redirect URI

추가할 URI:
```
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

로컬 개발 시 추가:
```
http://localhost:54321/auth/v1/callback
```

#### Step 6: 동의 항목 설정

**경로:** 내 애플리케이션 > 제품 설정 > 카카오 로그인 > 동의항목

필수 설정:
| 항목 | 동의 수준 | 필수 여부 |
|------|----------|-----------|
| `profile_nickname` | 필수 동의 | 필수 |
| `profile_image` | 선택 동의 | 권장 |
| `account_email` | 선택 동의 | 권장 |

**주의:** `account_email` 사용을 위해서는 **비즈 앱** 등록이 필요하다.
- **경로:** 내 애플리케이션 > 앱 설정 > 비즈니스 > 비즈 앱으로 전환

#### Step 7: 플랫폼 등록 (선택)

**경로:** 내 애플리케이션 > 앱 설정 > 플랫폼

- Web: 사이트 도메인에 `https://<PROJECT_REF>.supabase.co` 추가
- iOS: Bundle ID `com.udamonfan.app`
- Android: Package name `com.udamonfan.app`, 키 해시 등록

### 3.3 Supabase Dashboard 설정

**경로:** Supabase Dashboard > Authentication > Providers > Kakao

1. **Kakao** provider 토글 ON
2. **Client ID**: REST API 키 입력
3. **Client Secret**: 발급받은 Client Secret 입력
4. (선택) `account_email`을 사용하지 않는 경우: "Allow users without an email" 활성화

### 3.4 구현 코드

```typescript
// signInWithOAuth에서 provider만 변경
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: {
    redirectTo: redirectUrl,
    skipBrowserRedirect: true,
  },
});
```

현재 AuthContext.tsx의 `providerMap`에 이미 `kakao: 'kakao'`로 매핑되어 있어, 코드 변경 없이 Supabase Dashboard 설정만으로 동작한다.

### 3.5 Kakao OAuth 엔드포인트 (참고용)

| 용도 | URL |
|------|-----|
| Authorization | `https://kauth.kakao.com/oauth/authorize` |
| Token | `https://kauth.kakao.com/oauth/token` |
| User Info | `https://kapi.kakao.com/v2/user/me` |

Supabase가 빌트인으로 처리하므로 이 엔드포인트를 직접 호출할 필요 없다.

---

## 4. Naver OAuth 설정 가이드

### 4.1 Naver는 Custom Provider로 설정 필요

**Naver는 Supabase에서 빌트인 provider로 지원되지 않는다.** [VERIFIED: github.com/orgs/supabase/discussions/35631]

Supabase의 Custom OAuth2 Provider 기능을 사용하여 수동으로 설정해야 한다. 프로젝트당 최대 3개의 Custom Provider를 추가할 수 있다. [CITED: supabase.com/docs/guides/auth/custom-oauth-providers]

### 4.2 Naver Developers 설정

**[CITED: developers.naver.com via authjs.dev/reference/core/providers/naver]**

#### Step 1: 애플리케이션 등록

1. [Naver Developers](https://developers.naver.com/) 접속 및 로그인
2. **Application** > **애플리케이션 등록** 클릭
3. 최초 등록 시: 약관 동의 + 휴대폰 인증 필요

#### Step 2: 애플리케이션 정보 입력

1. **애플리케이션 이름**: "우다몬" 또는 "UDAMON"
2. **사용 API**: "네이버 로그인" 선택
3. **제공 정보 선택**:
   - 회원이름 (필수)
   - 이메일 (필수)
   - 프로필 사진 (선택)
   - 별명 (선택)
4. **로그인 오픈 API 서비스 환경**: "WEB" 선택
5. **서비스 URL**: `https://<PROJECT_REF>.supabase.co`
6. **Callback URL**: Supabase에서 생성된 Custom Provider Callback URL 입력 (Step 4.3에서 확인)

#### Step 3: Client ID / Secret 확인

**경로:** Application > 내 애플리케이션 > 앱 선택 > 개요

- **Client ID** 확인
- **Client Secret** 확인

**참고:** 앱은 기본적으로 "개발 중" 상태로 등록된다. 실서비스 배포 전에 **검수 요청**이 필요하다. [CITED: support.cafe24.com 네이버 클라이언트 발급 가이드]

### 4.3 Supabase Custom OAuth2 Provider 설정

**경로:** Supabase Dashboard > Authentication > Providers > New Provider > Manual configuration

#### 설정 필드:

| 필드 | 값 |
|------|-----|
| **Provider Type** | OAuth2 (Manual configuration) |
| **Identifier** | `custom:naver` |
| **Name** | Naver |
| **Client ID** | Naver Developers에서 발급받은 Client ID |
| **Client Secret** | Naver Developers에서 발급받은 Client Secret |
| **Authorization URL** | `https://nid.naver.com/oauth2.0/authorize` |
| **Token URL** | `https://nid.naver.com/oauth2.0/token` |
| **UserInfo URL** | `https://openapi.naver.com/v1/nid/me` |
| **Scopes** | (비워둠 -- Naver는 앱 등록 시 선택한 정보만 제공) |

[VERIFIED: logto.io/oauth-providers-explorer/naver, github.com/naver/naver-openapi-guide]

#### 설정 후 확인:

1. **Callback URL** (읽기 전용)이 표시됨: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
2. 이 URL을 Naver Developers의 Callback URL에 등록

### 4.4 Naver 사용자 정보 응답 형식

**[CITED: authjs.dev/reference/core/providers/naver]**

Naver의 UserInfo 응답은 다른 provider와 다른 구조를 가진다:

```json
{
  "resultcode": "00",
  "message": "success",
  "response": {
    "id": "고유 식별자",
    "name": "사용자 이름",
    "nickname": "별명",
    "email": "user@example.com",
    "gender": "M",
    "age": "30-39",
    "birthday": "01-01",
    "birthyear": "1990",
    "mobile": "010-1234-5678",
    "profile_image": "https://phinf.pstatic.net/..."
  }
}
```

**주의:** Naver 응답은 `response` 객체 안에 사용자 정보가 중첩되어 있다. Supabase Custom OAuth2 Provider가 이 구조를 자동으로 파싱할 수 있는지 확인이 필요하다. 표준 OAuth2 UserInfo 응답(flat JSON)과 다르기 때문에, Supabase가 중첩 구조의 email/name 필드를 올바르게 매핑하지 못할 가능성이 있다. [ASSUMED]

### 4.5 구현 코드

```typescript
// Custom provider는 'custom:naver' 형식으로 호출
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'custom:naver' as any, // TypeScript 타입에 custom: 접두사가 없을 수 있음
  options: {
    redirectTo: redirectUrl,
    skipBrowserRedirect: true,
  },
});
```

**TypeScript 타입 문제:** `@supabase/supabase-js`의 `Provider` 타입은 빌트인 provider만 포함한다. `custom:naver`는 `as any` 또는 타입 단언이 필요할 수 있다. [ASSUMED]

현재 AuthContext.tsx의 `providerMap`을 업데이트해야 한다:

```typescript
const providerMap: Record<string, string> = {
  google: 'google',
  apple: 'apple',
  kakao: 'kakao',
  naver: 'custom:naver',  // Custom provider 접두사 필요
};

// signInWithOAuth 호출 시:
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: providerMap[provider] as any,
  options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
});
```

기존 AuthContext.tsx에 이미 `naver: 'custom:naver'` 매핑이 구현되어 있다 (line 201).

### 4.6 Naver OAuth 엔드포인트 요약

| 용도 | URL | Method |
|------|-----|--------|
| Authorization | `https://nid.naver.com/oauth2.0/authorize` | GET/POST |
| Token | `https://nid.naver.com/oauth2.0/token` | GET/POST |
| UserInfo (Profile) | `https://openapi.naver.com/v1/nid/me` | GET |

[VERIFIED: github.com/naver/naver-openapi-guide, logto.io/oauth-providers-explorer/naver]

### 4.7 Naver 검수 프로세스

- 앱 등록 후 기본 상태: **개발 중** (본인 계정만 테스트 가능)
- 실서비스 배포 전: **검수 요청** 필요
- 검수 항목: 서비스 URL, 실제 로그인 동작 확인
- 검수 기간: 보통 수 영업일 소요

---

## 5. Expo + Supabase Auth 통합 코드 패턴

### 5.1 전체 OAuth 플로우

**[CITED: supabase.com/docs/guides/auth/native-mobile-deep-linking]**

```
[사용자] -> [로그인 버튼 탭]
   -> supabase.auth.signInWithOAuth({ provider, skipBrowserRedirect: true })
   -> Supabase가 provider의 authorization URL 반환
   -> WebBrowser.openAuthSessionAsync(url, redirectUrl)
   -> 사용자가 provider에서 인증
   -> Provider가 Supabase callback으로 redirect
   -> Supabase가 code exchange 처리 후 앱의 redirectUrl로 redirect
   -> 앱이 URL에서 code 또는 tokens 추출
   -> supabase.auth.exchangeCodeForSession(code) 또는 setSession()
   -> onAuthStateChange로 SIGNED_IN 이벤트 수신
   -> 프로필 조회 및 상태 업데이트
```

### 5.2 핵심 코드 패턴 (공식 문서 기반)

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

// 반드시 호출 -- 인증 팝업 자동 닫기
WebBrowser.maybeCompleteAuthSession();

// Redirect URL 생성
const redirectUrl = Linking.createURL('auth/callback');
// Standalone app: "udamon://auth/callback"
// Expo Go: "exp://192.168.x.x:8081/--/auth/callback"

// OAuth 시작
const performOAuth = async (provider: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as any,
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true, // 브라우저 자동 리다이렉트 방지 -- 앱에서 직접 처리
    },
  });

  if (error || !data?.url) return;

  // iOS: WebBrowser.openAuthSessionAsync (in-app browser)
  // Android: Linking.openURL (시스템 브라우저) -- Custom Tabs 이슈 회피
  if (Platform.OS === 'android') {
    await Linking.openURL(data.url);
  } else {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (result.type === 'success' && result.url) {
      await extractAndSetSession(result.url);
    }
  }
};
```

### 5.3 세션 추출 패턴

```typescript
const extractAndSetSession = async (url: string) => {
  // URL에서 query params와 hash fragment 파싱
  const qs = url.split('?')[1]?.split('#')[0] ?? '';
  const hash = url.split('#')[1] ?? '';
  const qp = new URLSearchParams(qs);
  const hp = new URLSearchParams(hash);

  const code = qp.get('code') || hp.get('code');
  const accessToken = hp.get('access_token') || qp.get('access_token');
  const refreshToken = hp.get('refresh_token') || qp.get('refresh_token');

  if (code) {
    // PKCE flow -- authorization code를 session으로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error('[OAuth] Code exchange error:', error);
  } else if (accessToken && refreshToken) {
    // Implicit flow fallback
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) console.error('[OAuth] Set session error:', error);
  }
};
```

### 5.4 Deep Link 리스너 (Android 대응)

Android에서 시스템 브라우저를 사용하면 `openAuthSessionAsync`의 `result`로 URL이 돌아오지 않는다. Deep link 리스너로 처리해야 한다:

```typescript
// App.tsx 또는 AuthContext.tsx의 useEffect 안
const linkSubscription = Linking.addEventListener('url', ({ url }) => {
  if (url.includes('auth/callback')) {
    extractAndSetSession(url);
    WebBrowser.dismissBrowser();
  }
});
```

현재 AuthContext.tsx (line 176-183)에 이미 구현되어 있다.

### 5.5 세션 복원 및 토큰 리프레시

현재 `supabase.ts`에 이미 구현되어 있다:

```typescript
// app/src/services/supabase.ts
export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,        // 세션을 AsyncStorage에 저장
    autoRefreshToken: true,       // 토큰 자동 갱신
    persistSession: true,         // 앱 재시작 시 세션 복원
    detectSessionInUrl: false,    // RN에서는 URL 감지 비활성화
  },
});

// AppState 변경 시 자동 갱신 시작/중단
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
```

### 5.6 PKCE vs Implicit Flow

**[CITED: supabase.com/docs/guides/auth/sessions/pkce-flow]**

| 특성 | PKCE Flow | Implicit Flow |
|------|-----------|---------------|
| 보안 | 높음 (code verifier/challenge) | 낮음 (토큰이 URL에 노출) |
| 모바일 적합성 | 높음 (권장) | 낮음 (deep link에서 fragment 유실 가능) |
| 동작 방식 | code -> exchangeCodeForSession | URL fragment에서 토큰 직접 추출 |
| Supabase 기본값 | PKCE (Custom Provider 포함) | - |

Supabase의 Custom OAuth Provider는 기본적으로 PKCE가 활성화되어 있다 (`pkce_enabled: true`). 이는 서버 사이드에서 자동 처리되므로 클라이언트에서 별도 PKCE 로직이 필요 없다. [CITED: supabase.com/docs/guides/auth/custom-oauth-providers]

**중요:** Code exchange는 플로우가 시작된 동일한 브라우저/디바이스에서 이루어져야 한다. Code의 유효기간은 5분이며, 한 번만 교환할 수 있다. [CITED: supabase.com/docs/guides/auth/sessions/pkce-flow]

---

## 6. 환경별 Redirect URL 설정

### 6.1 Supabase Dashboard 설정

**경로:** Supabase Dashboard > Authentication > URL Configuration

#### Site URL:
```
udamon://auth/callback
```
(또는 프로덕션 웹 URL이 있다면 해당 URL)

#### Additional Redirect URLs (모두 추가):

```
udamon://auth/callback
udamon://auth/**
exp://192.168.*.*:8081/--/auth/callback
exp://localhost:8081/--/auth/callback
http://localhost:54321/auth/v1/callback
```

**와일드카드 패턴 지원:** [CITED: supabase.com/docs/guides/auth/redirect-urls]
- `*` -- 단일 경로 세그먼트 매치
- `**` -- 모든 깊이 매치
- `exp://192.168.*.*:8081/**` -- 로컬 네트워크 대역 전체

### 6.2 각 Provider의 Redirect/Callback URI 설정

| Provider | 등록해야 할 Callback URL | 등록 위치 |
|----------|------------------------|-----------|
| Google | `https://<REF>.supabase.co/auth/v1/callback` | Google Cloud Console > OAuth Client > Authorized redirect URIs |
| Kakao | `https://<REF>.supabase.co/auth/v1/callback` | Kakao Developers > 카카오 로그인 > Redirect URI |
| Naver | `https://<REF>.supabase.co/auth/v1/callback` | Naver Developers > 내 애플리케이션 > Callback URL |

**핵심:** 각 Provider에 등록하는 것은 **Supabase의 callback URL** (서버)이다. 앱의 custom scheme URL (`udamon://auth/callback`)은 **Supabase Dashboard의 Redirect URLs**에만 등록한다.

### 6.3 URL 플로우 다이어그램

```
[앱] --signInWithOAuth--> [Supabase 서버]
  Supabase가 provider authorization URL 생성
  (redirect_uri = https://<REF>.supabase.co/auth/v1/callback)

[앱] --openAuthSessionAsync--> [Provider 로그인 페이지]
  사용자 인증 후

[Provider] --redirect--> [Supabase 서버: /auth/v1/callback]
  Supabase가 code exchange 처리

[Supabase] --redirect--> [앱: udamon://auth/callback?code=xxx]
  (redirectTo 파라미터에 지정한 URL)

[앱] --extractAndSetSession--> code를 session으로 교환
```

---

## 7. 보안 체크리스트

### 7.1 필수 사항

- [ ] **PKCE 활성화 확인**: Supabase Custom Provider 기본값 -- 별도 설정 불필요
- [ ] **Redirect URL 화이트리스트**: Supabase Dashboard에 허용 URL만 등록
- [ ] **localhost URL 제거**: 프로덕션 배포 전 개발용 redirect URL 정리
- [ ] **Client Secret 보안**: `.env`에만 저장, git에 커밋하지 않음
- [ ] **HTTPS 전용**: 프로덕션 redirect URL은 반드시 HTTPS (custom scheme 제외)

### 7.2 PKCE 보안

[CITED: supabase.com/docs/guides/auth/custom-oauth-providers]

- Supabase가 code_verifier와 code_challenge를 서버 사이드에서 자동 생성
- 클라이언트에서 PKCE 로직 구현 불필요
- Authorization code interception 공격 방지
- Custom Provider(Naver 포함)에도 기본 적용

### 7.3 State Parameter

- Supabase가 CSRF 방지를 위해 `state` 파라미터를 자동 관리
- 클라이언트에서 별도 처리 불필요

### 7.4 토큰 저장

- `AsyncStorage`를 사용 (현재 구현)
- 프로덕션에서는 `expo-secure-store` 사용 권장 (암호화된 저장소) [CITED: docs.expo.dev/guides/authentication/]
- 그러나 Supabase JS 클라이언트의 storage adapter를 변경해야 하므로 v1에서는 AsyncStorage 유지도 합리적

### 7.5 CORS 설정

- Supabase Auth는 서버 사이드에서 OAuth를 처리하므로 **CORS 문제가 없다**
- 앱은 Supabase의 callback URL로 리다이렉트되고, Supabase가 앱으로 다시 리다이렉트
- 직접 provider API를 호출하지 않으므로 CORS 걱정 불필요

### 7.6 에러 핸들링 패턴

```typescript
// 현재 AuthContext.tsx에서 사용 중인 패턴
const login = async (provider: LoginProvider) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({...});
    if (error) {
      console.error('[OAuth] signInWithOAuth error:', error);
      showToast(t('oauth_error'), 'error');
      return;
    }
    // ... browser flow
  } catch (err: unknown) {
    console.error('[OAuth] WebBrowser error:', err);
    showToast(t('oauth_error'), 'error');
  }
};
```

에러 시나리오별 처리:
| 시나리오 | 원인 | 처리 |
|----------|------|------|
| `signInWithOAuth` 에러 | Provider가 Supabase에 미설정 | 토스트 메시지 표시 |
| 사용자 취소 | `result.type === 'cancel'` | 무시 (현재 구현) |
| Code exchange 실패 | Code 만료 (5분) 또는 중복 사용 | 토스트 에러 |
| 네트워크 에러 | 오프라인 | try/catch에서 포착 |

---

## 8. 참고 문서 링크 모음

### Supabase 공식 문서
- [Social Login 개요](https://supabase.com/docs/guides/auth/social-login)
- [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Login with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [PKCE Flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Redirect URLs 설정](https://supabase.com/docs/guides/auth/redirect-urls)
- [React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [signInWithOAuth API Reference](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)

### Google OAuth
- [Google Auth Platform Console](https://console.cloud.google.com/auth/overview)
- [OAuth Client 생성](https://console.cloud.google.com/auth/clients/create)
- [Google Scopes 설정](https://console.cloud.google.com/auth/scopes)

### Kakao
- [Kakao Developers](https://developers.kakao.com/)
- [Kakao Login REST API](https://developers.kakao.com/docs/latest/en/kakaologin/rest-api)
- [Kakao 동의항목 가이드](https://developers.kakao.com/docs/latest/ko/kakaologin/prerequisite)

### Naver
- [Naver Developers](https://developers.naver.com/)
- [Naver Login API](https://developers.naver.com/docs/login/api/api.md)
- [Naver Login 개발 가이드](https://developers.naver.com/docs/login/devguide/devguide.md)
- [Naver OAuth 엔드포인트 참고 (Logto)](https://logto.io/oauth-providers-explorer/naver)
- [Naver Provider 프로필 구조 (Auth.js)](https://authjs.dev/reference/core/providers/naver)

### Expo
- [Expo Google Authentication](https://docs.expo.dev/guides/google-authentication/)
- [Expo Authentication (OAuth/OpenID)](https://docs.expo.dev/guides/authentication/)
- [Expo Using Supabase](https://docs.expo.dev/guides/using-supabase/)
- [expo-web-browser API](https://docs.expo.dev/versions/latest/sdk/web-browser/)

### 참고 블로그/가이드
- [Native vs Browser OAuth in Expo (Clerk)](https://clerk.com/articles/native-vs-browser-oauth-in-expo-a-decision-guide-for-social-login)
- [Supabase Naver Provider 요청 Discussion](https://github.com/orgs/supabase/discussions/35631)
- [Google Sign-In Nonce 이슈](https://github.com/react-native-google-signin/google-signin/issues/1176)

---

## 9. Assumptions Log

| # | 가정 내용 | 섹션 | 틀릴 경우 영향 |
|---|----------|------|--------------|
| A1 | Naver의 중첩 응답 구조(`response.email`)를 Supabase Custom OAuth2가 올바르게 파싱할 수 있다 | 4.4 | Naver 로그인 시 이메일/이름 미매핑 -- Edge Function으로 proxy 필요할 수 있음 |
| A2 | `supabase.auth.signInWithOAuth({ provider: 'custom:naver' as any })`가 런타임에서 정상 동작한다 | 4.5 | 타입 에러 또는 API 거부 -- supabase-js 소스 확인 필요 |
| A3 | Expo SDK 54에서 `WebBrowser.openAuthSessionAsync` + Supabase OAuth 조합이 여전히 안정적으로 동작한다 | 5.2 | Expo 팀의 browser auth deprecation이 이 패턴에도 영향을 줄 수 있음 |
| A4 | Naver "개발 중" 상태에서 팀원 계정으로 테스트 가능하다 | 4.7 | 본인 계정만 테스트 가능할 수 있음 -- 검수 완료 전까지 제한적 |

---

## 10. Open Questions

1. **Naver UserInfo 응답 매핑**
   - 알려진 것: Naver는 `{ response: { email, name, ... } }` 형태의 중첩 응답을 반환
   - 불확실한 것: Supabase Custom OAuth2 Provider가 이 중첩 구조에서 email/name을 자동으로 추출할 수 있는지
   - 권장: Supabase에 Naver 등록 후 실제 로그인 테스트로 확인. 매핑 실패 시 Supabase Edge Function으로 UserInfo proxy 구현

2. **Google native sign-in 마이그레이션 시점**
   - 알려진 것: Apple App Store 리뷰에서 browser 기반 로그인 거부 사례가 있음
   - 불확실한 것: UDAMON의 현재 browser 방식이 실제 심사에서 문제가 되는지
   - 권장: v1 출시 후 심사 결과를 보고 판단. 거부 시 Google만 native로 전환

3. **Kakao 비즈 앱 등록**
   - 알려진 것: `account_email` scope 사용에는 비즈 앱 등록 필요
   - 불확실한 것: 사업자등록증 없이 개인 개발자로 비즈 앱 등록 가능한지
   - 권장: 사전에 Kakao Developers에서 비즈 앱 전환 시도 후 확인
