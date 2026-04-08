---
phase: quick-260408-eai
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/App.tsx
  - app/app.json
  - app/src/contexts/AuthContext.tsx
autonomous: true
requirements: [AUTH-01]
user_setup:
  - service: supabase-auth
    why: "OAuth redirect URL을 Supabase Dashboard에 등록해야 소셜 로그인이 동작함"
    env_vars: []
    dashboard_config:
      - task: "Supabase Auth redirect URL 등록"
        location: "Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs"
        detail: |
          아래 URL들을 모두 추가:
          - udamon://auth/callback (프로덕션 빌드용)
          - exp://127.0.0.1:8081/--/auth/callback (Expo Go 로컬 개발용, IP/포트는 환경에 맞게 조정)
          - https://udamonfan.com/auth/callback (유니버설 링크, 도메인 확보 후)
      - task: "Google OAuth Console redirect URI 설정"
        location: "Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client IDs"
        detail: |
          Authorized redirect URIs에 Supabase의 callback URL 추가:
          https://<supabase-project-ref>.supabase.co/auth/v1/callback
      - task: "Kakao Developers redirect URI 설정"
        location: "Kakao Developers -> 내 애플리케이션 -> 카카오 로그인 -> Redirect URI"
        detail: |
          Redirect URI에 Supabase의 callback URL 추가:
          https://<supabase-project-ref>.supabase.co/auth/v1/callback

must_haves:
  truths:
    - "OAuth 콜백 URL이 React Navigation linking config에 등록되어 deep link로 수신 가능하다"
    - "Android 빌드 앱에서 udamon:// 스킴으로 OAuth 콜백을 수신할 수 있다"
    - "AuthContext의 OAuth 흐름이 PKCE code exchange를 올바르게 처리한다"
  artifacts:
    - path: "app/App.tsx"
      provides: "OAuth 콜백 경로가 포함된 linking config"
      contains: "auth/callback"
    - path: "app/app.json"
      provides: "Android에서 udamon:// 스킴 수신을 위한 intentFilter"
      contains: "udamon"
    - path: "app/src/contexts/AuthContext.tsx"
      provides: "Naver provider 타입 안전성 및 OAuth 흐름 견고성 개선"
  key_links:
    - from: "app/src/contexts/AuthContext.tsx"
      to: "app/App.tsx linking config"
      via: "Linking.createURL('auth/callback') -> linking.config.screens에서 매칭"
      pattern: "auth/callback"
    - from: "app/app.json intentFilters"
      to: "app/src/contexts/AuthContext.tsx deep link listener"
      via: "OS가 udamon://auth/callback 수신 -> Linking.addEventListener"
      pattern: "udamon.*auth/callback"
---

<objective>
소셜 로그인(Google/Kakao) OAuth 흐름에서 발견된 설정/코드 문제 3가지를 수정하여 OAuth 콜백이 정상 라우팅되도록 한다.

Purpose: 현재 OAuth 로그인 시도 시 콜백 URL이 앱에 도달하지 못하거나, React Navigation이 해당 경로를 인식하지 못해 로그인이 완료되지 않는 문제를 해결한다.
Output: OAuth 콜백이 정상적으로 앱에 도달하고 세션이 설정되는 코드 수정 완료.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/App.tsx
@app/app.json
@app/src/contexts/AuthContext.tsx
@app/src/services/supabase.ts
@app/src/types/navigation.ts
@app/src/constants/config.ts

<interfaces>
<!-- AuthContext에서 사용하는 OAuth 관련 API -->

From app/src/contexts/AuthContext.tsx:
```typescript
export type LoginProvider = 'google' | 'apple' | 'kakao' | 'naver' | 'email';

// login() 함수 내부:
// Linking.createURL('auth/callback') -> 'udamon://auth/callback' 또는 'exp://...'
// supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } })
// WebBrowser.openAuthSessionAsync(data.url, redirectUrl)  -- iOS
// Linking.openURL(data.url)  -- Android
```

From app/App.tsx linking config:
```typescript
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    `https://${DEEP_LINK.host}`,   // https://udamonfan.com
    `${DEEP_LINK.scheme}://`,       // udamon://
  ],
  config: {
    screens: {
      PostDetail: 'post/:postId',
      PhotographerProfile: 'photographer/:photographerId',
      MainTabs: { screens: { Home: '', Explore: 'explore', Community: 'community' } },
      // ❌ auth/callback 경로 없음!
    },
  },
};
```

From app/app.json (Android):
```json
"intentFilters": [{
  "action": "VIEW", "autoVerify": true,
  "data": [
    { "scheme": "https", "host": "udamonfan.com", "pathPrefix": "/post" },
    { "scheme": "https", "host": "udamonfan.com", "pathPrefix": "/@" }
  ]
  // ❌ udamon:// 커스텀 스킴 intent filter 없음!
}]
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: App.tsx linking config에 auth/callback 경로 추가 및 app.json Android intentFilter 보강</name>
  <files>app/App.tsx, app/app.json, app/src/types/navigation.ts</files>
  <action>
**1) app/src/types/navigation.ts -- AuthCallback 라우트 추가:**

RootStackParamList에 `AuthCallback` 라우트를 추가한다. 이 라우트는 OAuth 콜백 전용이며, React Navigation이 deep link를 인식하기 위해 필요하다:
```typescript
AuthCallback: { code?: string; access_token?: string; refresh_token?: string } | undefined;
```

**2) app/App.tsx -- linking config에 auth/callback 경로 등록:**

`linking.config.screens`에 AuthCallback 경로를 추가한다:
```typescript
config: {
  screens: {
    AuthCallback: 'auth/callback',    // ← 추가
    PostDetail: 'post/:postId',
    // ... 기존 코드 유지
  },
},
```

또한 AppNavigator 내부의 `canBrowse`와 `!canBrowse` 양쪽 분기 모두에 AuthCallback 스크린을 등록한다. OAuth 콜백은 로그인 전 상태(`!canBrowse`)에서도 수신되어야 하므로 반드시 양쪽에 추가해야 한다. 스크린 컴포넌트는 별도 파일 없이 빈 View를 반환하는 인라인 컴포넌트를 사용한다 (실제 처리는 AuthContext의 Linking.addEventListener가 담당):

```typescript
// AppNavigator 함수 내부, RootStack.Navigator 안에 양쪽 분기 모두:
<RootStack.Screen
  name="AuthCallback"
  component={() => null}
  options={{ headerShown: false }}
/>
```

주의: `component={() => null}`은 매 렌더마다 새 컴포넌트를 생성하므로, AppNavigator 함수 바깥(파일 최상위)에 `function AuthCallbackScreen() { return null; }`을 정의하고 이를 참조한다.

**3) app.json -- Android intentFilters에 udamon:// 커스텀 스킴 추가:**

기존 intentFilters 배열에 새 intent filter 항목을 추가한다. `scheme: "udamon"` 설정이 Expo 빌드 시 기본 intent filter를 생성하지만, `auth/callback` 경로에 대한 명시적 처리를 위해 별도 항목을 추가한다:

```json
{
  "action": "VIEW",
  "data": [
    {
      "scheme": "udamon",
      "host": "auth",
      "pathPrefix": "/callback"
    }
  ],
  "category": ["BROWSABLE", "DEFAULT"]
}
```

주의: 기존의 https://udamonfan.com intent filter는 그대로 유지한다. `autoVerify`는 커스텀 스킴에 불필요하므로 생략한다.
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon/app && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - RootStackParamList에 AuthCallback 타입이 존재한다
    - linking.config.screens에 'auth/callback' 경로가 매핑되어 있다
    - AppNavigator의 canBrowse/!canBrowse 양쪽에 AuthCallback 스크린이 등록되어 있다
    - app.json의 android.intentFilters에 udamon://auth/callback 용 항목이 추가되어 있다
    - TypeScript 컴파일 에러가 없다
  </done>
</task>

<task type="auto">
  <name>Task 2: AuthContext OAuth 흐름 견고성 개선 -- Naver 타입 캐스팅 수정 및 에러 처리 강화</name>
  <files>app/src/contexts/AuthContext.tsx</files>
  <action>
**1) Naver provider 타입 캐스팅 문제 수정:**

현재 `providerMap`에서 naver를 `'custom:naver'`로 매핑한 뒤 `as 'google' | 'apple' | 'kakao'`로 캐스팅하고 있다. Supabase JS v2에서 커스텀 OIDC provider를 사용할 때는 provider 필드에 문자열을 그대로 전달할 수 있으나, TypeScript 타입 시그니처에 맞지 않는다.

Naver는 Supabase에서 기본 지원하지 않는 커스텀 provider이므로, 현재 단계에서는 Naver 로그인 시도 시 early return하고 "준비 중" 토스트를 표시한다 (Apple과 동일한 패턴). 향후 Supabase에 Naver OIDC가 설정되면 활성화한다:

```typescript
// login() 함수 시작 부분에 추가
if (provider === 'naver') {
  // Naver OIDC 커스텀 provider — Supabase 설정 완료 후 활성화
  showToast(t('oauth_naver_preparing'), 'info');
  return;
}
```

`providerMap`에서 naver 항목을 제거하고, 타입 캐스팅을 `as 'google' | 'apple' | 'kakao'`에서 Supabase의 `Provider` 타입으로 변경한다. `@supabase/supabase-js`에서 `Provider` 타입을 import type으로 가져온다:

```typescript
import type { Session, User, Provider } from '@supabase/supabase-js';
```

providerMap을 다음으로 교체:
```typescript
const providerMap: Record<string, Provider> = {
  google: 'google',
  apple: 'apple',
  kakao: 'kakao',
};
```

**2) extractAndSetSession에 URL 유효성 검증 추가:**

`extractAndSetSession` 함수 시작 부분에 URL이 실제로 auth/callback 경로를 포함하는지 확인하는 방어 코드를 추가한다:

```typescript
if (!url || !url.includes('auth/callback')) {
  console.warn('[OAuth] Unexpected callback URL format:', url);
  pendingOAuthProvider.current = null;
  return;
}
```

**3) Android 분기에서 OAuth 타임아웃/실패 시 pendingOAuthProvider 정리:**

현재 Android 분기(`Linking.openURL`)에서는 시스템 브라우저로 열고 deep link를 기다리지만, 사용자가 브라우저를 닫거나 타임아웃 시 `pendingOAuthProvider`가 정리되지 않는다. AppState 변경을 감지하여 정리하는 로직을 추가한다:

login() 함수의 Android 분기 `await Linking.openURL(data.url);` 다음에 cleanup 로직 추가는 불필요 (AppState 리스너는 이미 supabase.ts에 있고, deep link 리스너가 처리). 대신, 이미 있는 `linkSubscription`의 handler가 30초 후에도 콜백이 없으면 `pendingOAuthProvider.current = null`로 리셋하도록 간단한 타임아웃을 추가한다:

login() 함수의 Android 분기를 다음으로 교체:
```typescript
if (Platform.OS === 'android') {
  await Linking.openURL(data.url);
  // Android: 시스템 브라우저로 열고 deep link 리스너가 콜백을 처리.
  // 60초 내 콜백이 없으면 pending state를 정리한다.
  setTimeout(() => {
    if (pendingOAuthProvider.current === provider) {
      console.warn('[OAuth] Android callback timeout — clearing pending provider');
      pendingOAuthProvider.current = null;
    }
  }, 60_000);
}
```
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon/app && npx tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>
    - Naver 로그인 시도 시 early return하고 "준비 중" 토스트가 표시된다
    - providerMap에서 naver가 제거되고 타입이 Provider로 안전하게 캐스팅된다
    - extractAndSetSession에 URL 유효성 검증이 있다
    - Android OAuth에 60초 타임아웃 cleanup이 있다
    - TypeScript 컴파일 에러가 없다
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| OAuth redirect URL -> 앱 | 외부 브라우저에서 커스텀 스킴으로 리디렉트되는 URL에 악의적 파라미터 삽입 가능 |
| Supabase auth code exchange | authorization code를 세션 토큰으로 교환하는 과정 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Spoofing | OAuth redirect URL | mitigate | extractAndSetSession에서 URL 형식 검증 추가 (auth/callback 포함 확인), Supabase PKCE가 code verifier로 코드 교환 보호 |
| T-quick-02 | Tampering | access_token in URL hash | accept | Supabase PKCE 흐름 사용 시 token이 URL에 노출되지 않음 (code만 전달). implicit flow 폴백은 Supabase 서버 설정에 의존 |
| T-quick-03 | Info Disclosure | OAuth callback logging | mitigate | console.log에서 전체 URL 대신 code 존재 여부만 로깅 (이미 구현됨: accessToken은 !!accessToken으로 마스킹) |
</threat_model>

<verification>
1. `cd app && npx tsc --noEmit` -- TypeScript 컴파일 에러 없음
2. `grep -n "auth/callback" app/App.tsx` -- linking config에 경로가 존재함
3. `grep -n "udamon" app/app.json` -- Android intentFilters에 udamon 스킴이 존재함
4. `grep -n "naver" app/src/contexts/AuthContext.tsx` -- Naver가 early return으로 처리됨
</verification>

<success_criteria>
- App.tsx의 linking.config.screens에 AuthCallback: 'auth/callback' 경로가 등록되어 있다
- RootStack.Navigator의 양쪽 분기(canBrowse/!canBrowse)에 AuthCallback 스크린이 존재한다
- app.json의 android.intentFilters에 udamon://auth/callback 용 항목이 추가되어 있다
- AuthContext에서 Naver 로그인은 graceful하게 "준비 중"으로 처리된다
- providerMap 타입 캐스팅이 Supabase의 Provider 타입을 사용한다
- TypeScript 컴파일이 성공한다
</success_criteria>

<output>
After completion, create `.planning/quick/260408-eai-oauth/260408-eai-SUMMARY.md`
</output>
