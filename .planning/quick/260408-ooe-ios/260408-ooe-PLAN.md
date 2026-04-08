---
id: 260408-ooe
type: quick
scope: iOS icon font rendering + Kakao OAuth deep investigation
files_modified:
  - app/App.tsx
  - app/app.json
  - app/src/screens/onboarding/OnboardingScreen.tsx
  - app/src/screens/onboarding/ProfileSetupScreen.tsx
  - app/src/screens/explore/PostDetailScreen.tsx
  - app/src/contexts/AuthContext.tsx
---

<objective>
iOS에서 야구공 아이콘(Ionicons `baseball`)이 ?로 깨지는 문제와 카카오톡 로그인 이슈를 심층 조사하고 수정한다.

**Issue 1 — 아이콘 폰트 깨짐:**
Ionicons 글리프맵에 `baseball`(코드 61816)과 `baseball-outline`(코드 61817)은 존재하지만, iOS에서 ?로 렌더링된다.
현재 `App.tsx`에서 `useFonts({ ...Ionicons.font })`로 런타임 로딩 중이며, `app.json`에 `expo-font` 플러그인은 등록되어 있지만 빌드타임 임베딩 설정은 없다.

근본 원인 후보:
1. `expo-font` config plugin에 Ionicons TTF를 명시적으로 빌드타임 임베딩하지 않아 iOS에서 폰트 로딩 타이밍 이슈 발생
2. `useFonts` 키가 iOS의 내부 Full Name 메타데이터와 불일치
3. Expo Go vs development build 환경 차이로 인한 폰트 로딩 방식 차이

**Issue 2 — 카카오톡 로그인:**
iOS에서 `openBrowserAsync` (SFSafariViewController)로 전환 완료된 상태.
SFSafariViewController는 `openAuthSessionAsync`와 달리 콜백 URL을 자동 반환하지 않으므로
`Linking.addEventListener`로 딥링크를 수신해야 한다.
현재 딥링크 리스너는 구현되어 있으나, SFSafariViewController가 OAuth 완료 후
자동으로 닫히지 않는 문제와 딥링크 수신 실패 가능성을 조사해야 한다.

Purpose: iOS에서 핵심 UX 요소(아이콘, 소셜 로그인)가 정상 동작하도록 보장
Output: iOS에서 야구공 아이콘 정상 렌더링 + 카카오 로그인 플로우 정상 동작
</objective>

<context>
@.planning/STATE.md
@app/App.tsx
@app/app.json
@app/src/contexts/AuthContext.tsx
@app/src/screens/onboarding/OnboardingScreen.tsx
@app/src/screens/onboarding/ProfileSetupScreen.tsx
@app/src/screens/auth/LoginScreen.tsx
@app/src/components/shared/BottomTabBar.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: iOS 아이콘 폰트 깨짐 원인 조사 및 수정</name>
  <files>app/App.tsx, app/app.json, app/src/screens/onboarding/OnboardingScreen.tsx, app/src/screens/onboarding/ProfileSetupScreen.tsx, app/src/screens/explore/PostDetailScreen.tsx</files>
  <action>
**1단계 — 폰트 내부 이름 확인:**
TTF 파일의 내부 Full Name 메타데이터를 확인한다. iOS는 파일명이 아닌 내부 이름으로 폰트를 식별한다.
```bash
# Ionicons.ttf의 내부 Full Name 확인
fc-scan --format "%{fullname}\n" app/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf
# 또는 python으로:
python3 -c "from fontTools.ttLib import TTFont; t=TTFont('app/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'); print([r.string for r in t['name'].names if r.nameID==4])"
```

`useFonts` 호출 시 전달하는 키(`Ionicons.font`의 키값)가 이 내부 이름과 정확히 일치하는지 검증한다.

**2단계 — expo-font config plugin에 빌드타임 임베딩 설정:**
현재 `app.json`의 `plugins`에 `"expo-font"`가 단순 문자열로만 등록되어 있다.
iOS 네이티브 빌드에서 폰트를 안정적으로 사용하려면 config plugin에 fonts 배열을 명시해야 한다.

`app.json`에서 `"expo-font"` 항목을 다음으로 변경:
```json
["expo-font", {
  "fonts": [
    "./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"
  ]
}]
```

이렇게 하면 iOS 네이티브 빌드 시 Ionicons.ttf가 앱 번들에 직접 포함되어, 런타임 `useFonts` 로딩 전에도 폰트가 사용 가능해진다.

**3단계 — useFonts 호출에 방어 코드 추가:**
`App.tsx`의 `useFonts` 호출에서 `fontsLoaded`가 false일 때 SplashScreen을 보여주는 로직은 이미 있다.
추가로 `fontsError` 상태도 확인하여 폰트 로딩 실패 시 로그를 남기도록 한다:

```typescript
const [fontsLoaded, fontsError] = useFonts({
  ...Ionicons.font,
});

useEffect(() => {
  if (fontsError) {
    console.error('[Font] Failed to load Ionicons:', fontsError);
  }
}, [fontsError]);

if (!fontsLoaded && !fontsError) return <SplashScreen />;
```

**4단계 — 확인 및 대체 아이콘 전략(필요 시):**
위 수정 후에도 `baseball` 아이콘이 iOS에서 깨지면, 해당 아이콘이 Ionicons iOS 폰트 서브셋에서 누락된 것일 수 있다.
이 경우 `baseball` 사용처 3곳을 유니코드 이모지 `⚾`로 대체한다:
- `OnboardingScreen.tsx` line 50: `icon: 'baseball'` → Text 기반 이모지 렌더링으로 전환
- `ProfileSetupScreen.tsx` line 231: `name="baseball"` → Text 기반 이모지 렌더링으로 전환
- `PostDetailScreen.tsx` line 450: `name="baseball-outline"` → Text 기반 이모지 렌더링으로 전환

대체 시 Ionicons 컴포넌트 대신 `<Text style={{ fontSize: N }}>⚾</Text>`를 사용한다.
이모지 대체는 `expo-font` 빌드타임 임베딩으로도 해결되지 않는 경우에만 적용한다.
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon/app && npx tsc --noEmit 2>&1 | head -20</automated>
    expo-font config plugin에 Ionicons.ttf 경로가 포함되었는지 확인:
    node -e "const c=require('./app/app.json'); const fp=c.expo.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-font'); console.log('expo-font config:', JSON.stringify(fp)); process.exit(fp && fp[1]?.fonts?.length > 0 ? 0 : 1)"
  </verify>
  <done>
    - app.json의 expo-font 플러그인에 Ionicons.ttf 빌드타임 임베딩 설정 완료
    - App.tsx에 fontsError 로깅 추가
    - iOS에서 baseball 아이콘이 정상 렌더링되거나, 이모지 대체가 적용됨
    - TypeScript 컴파일 에러 없음
  </done>
</task>

<task type="auto">
  <name>Task 2: iOS 카카오 로그인 딥링크 콜백 조사 및 수정</name>
  <files>app/src/contexts/AuthContext.tsx, app/app.json</files>
  <action>
**현재 상태 분석:**
iOS에서 `openBrowserAsync` (SFSafariViewController)를 사용하여 카카오 OAuth 페이지를 연다.
SFSafariViewController는 `openAuthSessionAsync`와 달리:
- 콜백 URL을 result로 반환하지 않는다 (항상 `{ type: 'dismiss' }`)
- 앱의 커스텀 스킴(`udamon://auth/callback`)으로 리디렉트되면 OS가 딥링크로 앱에 전달
- `Linking.addEventListener('url', ...)` 리스너가 이를 수신해야 한다

**1단계 — 딥링크 수신 흐름 검증:**
`AuthContext.tsx`의 기존 딥링크 리스너(line 223-229)가 정상 동작하는지 검증한다.
핵심 체크포인트:
- `Linking.addEventListener` 등록 시점이 `openBrowserAsync` 호출보다 선행하는지 (useEffect mount 단계에서 등록하므로 OK)
- `pendingOAuthProvider.current`가 `openBrowserAsync` 호출 시점에 설정되는지 (line 262에서 설정)
- 딥링크 URL에 `auth/callback`이 포함되는지 (Supabase redirectTo에 `Linking.createURL('auth/callback')` 사용)

**2단계 — SFSafariViewController 자동 닫힘 문제 해결:**
현재 코드에서 `openBrowserAsync` 완료 후(브라우저 닫힘) `pendingOAuthProvider`를 null로 초기화하는 로직이 있다(line 330-332).
문제: OAuth 성공 시 딥링크가 먼저 도착하여 `extractAndSetSession`이 호출되고, 그 후 SFSafariViewController가 닫히면서 `pendingOAuthProvider`가 null이 되는 타이밍 이슈는 없는지 확인한다.

실제로는 딥링크 리스너에서 `WebBrowser.dismissBrowser()`를 호출하고(line 227), 이후 `openBrowserAsync`가 resolve되면서 `pendingOAuthProvider`를 null로 설정한다. 이 시점에서 세션은 이미 설정되었으므로 문제없다.

**3단계 — iOS에서 SFSafariViewController가 딥링크를 트리거하지 않는 경우 대응:**
SFSafariViewController에서 커스텀 스킴(`udamon://...`)으로의 리디렉트가 작동하지 않을 수 있다.
iOS의 SFSafariViewController는 커스텀 스킴 딥링크를 지원하지만, 일부 조건에서 실패할 수 있다:
- `app.json`에 `scheme: "udamon"`이 이미 설정됨 (OK)
- 리디렉트 URL이 `udamon://auth/callback`인지 확인

`Linking.createURL('auth/callback')`의 출력을 iOS에서 로그로 확인한다.
Development build에서는 `exp+udamon://expo-development-client/...` 형태가 될 수 있어 Supabase redirect URL과 불일치할 수 있다.

수정: `redirectUrl` 생성 로직에 development build 감지를 추가하고, 필요시 명시적으로 `udamon://auth/callback`을 사용한다:
```typescript
// Expo dev build에서 Linking.createURL은 exp+scheme:// 형태를 반환할 수 있다
// Production에서는 udamon://auth/callback이 된다
const redirectUrl = Linking.createURL('auth/callback');
console.log('[OAuth] redirectUrl:', redirectUrl);
// Dev build 환경에서 scheme이 다를 경우를 위한 로그 강화
console.log('[OAuth] Expected scheme: udamon://, got:', redirectUrl.split('://')[0] + '://');
```

**4단계 — 카카오 OAuth 특이사항 대응:**
카카오 OAuth는 Supabase에서 OIDC provider로 등록되어야 한다.
Supabase Dashboard > Authentication > Providers에서 Kakao가 활성화되어 있고,
Client ID와 Client Secret이 올바르게 설정되어 있어야 한다.
코드에서는 `provider: 'kakao'`로 호출하므로 Supabase 측 설정이 핵심이다.

이 태스크에서는 코드 레벨에서 할 수 있는 진단 로그를 강화한다:
- `signInWithOAuth` 응답의 `data.url`을 완전히 로깅 (현재 이미 하고 있음)
- `data.url`이 카카오 도메인(`kauth.kakao.com`)을 포함하는지 검증하는 로그 추가
- 딥링크 수신 시 전체 URL 파라미터를 로깅하여 code/token 수신 여부 확인

```typescript
// login() 함수 내, data.url 검증 후:
if (provider === 'kakao' && data?.url) {
  console.log('[OAuth] Kakao auth URL domain check:', new URL(data.url).hostname);
}

// 딥링크 리스너 내:
Linking.addEventListener('url', ({ url }) => {
  console.log('[Deep Link] Full URL:', url);
  console.log('[Deep Link] Params:', url.split('?')[1] || 'none');
  console.log('[Deep Link] Hash:', url.split('#')[1] || 'none');
  // ... 기존 로직
});
```
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon/app && npx tsc --noEmit 2>&1 | head -20</automated>
    AuthContext.tsx에 강화된 로그가 포함되었는지 확인:
    grep -c "\[OAuth\]" app/src/contexts/AuthContext.tsx (기존보다 증가해야 함)
  </verify>
  <done>
    - iOS 카카오 로그인 딥링크 수신 흐름 검증 완료
    - 진단 로그 강화로 OAuth 콜백 디버깅 가능
    - SFSafariViewController + Linking.addEventListener 조합의 타이밍 이슈 해결 또는 문서화
    - Development build vs Production 스킴 차이 로깅 추가
    - TypeScript 컴파일 에러 없음
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    1. iOS 아이콘 폰트 수정: expo-font 빌드타임 임베딩 + fontsError 로깅
    2. 카카오 로그인 진단 로그 강화
  </what-built>
  <how-to-verify>
    1. iOS 시뮬레이터에서 `npx expo start --ios` 실행
    2. 온보딩 화면 3번째 페이지에서 야구공 아이콘이 ?가 아닌 정상 아이콘으로 표시되는지 확인
    3. 프로필 설정 화면에서 팀 선택 시 야구공 아이콘 정상 표시 확인
    4. 로그인 화면에서 카카오 버튼 탭 -> SFSafariViewController에서 카카오 페이지 로드 확인
    5. Expo 콘솔 로그에서 [OAuth] redirectUrl, [Deep Link] 관련 로그 확인
    6. 카카오 로그인 완료 후 앱으로 돌아오는지 확인 (Supabase Dashboard에 카카오 provider 설정 필요)
  </how-to-verify>
  <resume-signal>"approved" 입력 또는 발견한 이슈 설명</resume-signal>
</task>

</tasks>

<verification>
1. `cd app && npx tsc --noEmit` — TypeScript 컴파일 에러 없음
2. `app.json`의 expo-font 플러그인에 Ionicons.ttf 경로 포함 확인
3. iOS 시뮬레이터에서 아이콘 렌더링 육안 확인
4. 카카오 로그인 시 콘솔 로그로 OAuth 흐름 추적 가능
</verification>

<success_criteria>
- iOS에서 Ionicons `baseball` / `baseball-outline` 아이콘이 ?가 아닌 정상 아이콘으로 표시됨 (또는 이모지 대체 적용)
- 카카오 로그인 시 OAuth 흐름의 각 단계가 콘솔에 로깅되어 디버깅 가능
- SFSafariViewController -> 딥링크 -> extractAndSetSession 플로우가 코드 레벨에서 검증됨
- TypeScript 컴파일 에러 없음
</success_criteria>
