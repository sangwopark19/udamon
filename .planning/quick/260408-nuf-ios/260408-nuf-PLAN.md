---
phase: quick-260408-nuf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/src/contexts/AuthContext.tsx
autonomous: false
must_haves:
  truths:
    - "iOS에서 OAuth 로그인 시 Kakao 동의 화면의 한글이 정상 렌더링된다"
    - "Android에서 OAuth 로그인 플로우가 기존과 동일하게 작동한다"
    - "웹에서 OAuth 플로우가 기존과 동일하게 작동한다"
    - "iOS에서 OAuth 완료 후 세션이 정상적으로 설정된다"
  artifacts:
    - path: "app/src/contexts/AuthContext.tsx"
      provides: "플랫폼별 분기된 OAuth 브라우저 호출"
      contains: "openBrowserAsync"
  key_links:
    - from: "app/src/contexts/AuthContext.tsx (openBrowserAsync)"
      to: "Linking.addEventListener('url', ...)"
      via: "딥링크를 통한 OAuth 콜백 수신"
      pattern: "Linking.addEventListener.*url.*auth/callback"
---

<objective>
iOS 시뮬레이터(및 실기기)에서 OAuth 로그인 시 Kakao 동의 화면의 한글이 "?"로 표시되는 문제를 수정한다.

Purpose: ASWebAuthenticationSession(openAuthSessionAsync)이 iOS에서 CJK 폰트를 제대로 렌더링하지 못하는 알려진 제한이 있다. SFSafariViewController(openBrowserAsync)로 전환하면 앱 프로세스 내에서 렌더링하므로 전체 폰트 접근이 가능하다.
Output: iOS에서 openBrowserAsync를 사용하고, 기존 딥링크 리스너가 OAuth 콜백을 처리하는 수정된 AuthContext.tsx
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/src/contexts/AuthContext.tsx

<interfaces>
<!-- AuthContext.tsx의 OAuth 관련 핵심 코드 구조 -->

기존 OAuth 브라우저 호출 (line 340):
```typescript
const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
```

기존 딥링크 리스너 (lines 242-249) — 이미 OAuth 콜백 처리 인프라가 존재:
```typescript
const linkSubscription = Linking.addEventListener('url', ({ url }) => {
  console.log('[Deep Link] URL received:', url, 'pendingOAuth:', pendingOAuthProvider.current);
  if (url.includes('auth/callback') && pendingOAuthProvider.current) {
    extractAndSetSession(url);
    WebBrowser.dismissBrowser();
  }
});
```

import 문 (현재):
```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: iOS OAuth를 openBrowserAsync(SFSafariViewController)로 전환</name>
  <files>app/src/contexts/AuthContext.tsx</files>
  <action>
AuthContext.tsx의 네이티브 OAuth 브라우저 호출 부분(현재 line 339-351 근처)을 플랫폼별로 분기 처리한다.

**변경 내용:**

1. 기존 `openAuthSessionAsync` 호출을 `Platform.OS`에 따라 분기:

```typescript
if (Platform.OS === 'ios') {
  // SFSafariViewController — 앱 프로세스 내에서 렌더링하여 CJK 폰트 정상 표시
  // 콜백은 기존 Linking.addEventListener('url', ...) 딥링크 리스너가 처리
  console.log('[OAuth] iOS: opening SFSafariViewController');
  await WebBrowser.openBrowserAsync(data.url, {
    dismissButtonStyle: 'cancel',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
  // openBrowserAsync는 브라우저가 닫힐 때 resolve됨
  // 사용자가 수동으로 닫은 경우 — 딥링크 리스너가 처리하지 않았다면 정리
  if (pendingOAuthProvider.current) {
    pendingOAuthProvider.current = null;
  }
} else {
  // Android: openAuthSessionAsync 유지 (Chrome Custom Tabs, CJK 정상 작동)
  console.log('[OAuth] Android: opening Chrome Custom Tab');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  console.log('[OAuth] WebBrowser result:', result.type);
  if (result.type === 'success' && result.url && pendingOAuthProvider.current) {
    await extractAndSetSession(result.url);
  } else if (result.type === 'cancel') {
    pendingOAuthProvider.current = null;
  }
}
```

2. 기존 try/catch 블록은 그대로 유지 — 에러 처리 로직 변경 없음.

3. 기존 NOTE 주석(line 258-260)을 업데이트:
```typescript
// NOTE: iOS에서는 openBrowserAsync(SFSafariViewController)를 사용하여
// CJK 폰트 렌더링 이슈를 해결한다. 콜백은 딥링크 리스너가 처리.
// Android에서는 openAuthSessionAsync(Chrome Custom Tabs) 유지.
```

4. 플랫폼별 분기 로그는 위 코드에 이미 포함.

**변경하지 않을 것:**
- 웹 플랫폼 분기 (line 284-304) — 그대로 유지
- 딥링크 리스너 (line 242-249) — 이미 iOS openBrowserAsync의 콜백을 처리할 수 있는 구조
- extractAndSetSession 함수 — 변경 없음
- URL 유효성 검증 (line 323-337) — 그대로 유지
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon/app && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
- AuthContext.tsx에서 iOS는 openBrowserAsync, Android는 openAuthSessionAsync를 사용
- 타입 체크 통과
- 기존 딥링크 리스너가 iOS OAuth 콜백을 처리하는 구조 유지
- 웹 플랫폼 OAuth 플로우 변경 없음
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: iOS OAuth CJK 폰트 렌더링 수동 검증</name>
  <files>app/src/contexts/AuthContext.tsx</files>
  <action>
iOS 시뮬레이터에서 카카오 OAuth 로그인 플로우를 테스트하여 한글이 정상 렌더링되는지 확인한다.

확인 항목:
1. iOS 시뮬레이터에서 앱 실행: `cd app && npx expo start --ios`
2. 로그인 화면에서 카카오 로그인 버튼 탭
3. 카카오 동의 화면에서 한글이 "?" 대신 정상 표시되는지 확인
4. OAuth 로그인 완료 후 앱으로 정상 복귀 및 세션 설정 확인
5. (선택) 야구공 이모지가 앱 내에서 정상 렌더링되는지 확인
  </action>
  <verify>사용자가 iOS 시뮬레이터에서 직접 확인</verify>
  <done>"approved" 입력 시 완료, 문제 발견 시 수정 후 재검증</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| App -> OAuth Provider | OAuth URL을 외부 브라우저에서 열음 — URL 검증은 기존 코드 유지 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | OAuth redirect URL | mitigate | 기존 URL 유효성 검증(HTTPS 체크) 유지, redirectUrl은 Linking.createURL로 생성 |
| T-quick-02 | Information Disclosure | OAuth session in browser | accept | SFSafariViewController는 앱과 쿠키/세션 격리됨 — ASWebAuthenticationSession과 동일한 보안 수준 |
</threat_model>

<verification>
- TypeScript 컴파일 오류 없음
- iOS에서 Kakao OAuth 동의 화면 한글 정상 표시
- OAuth 완료 후 세션 정상 설정
- Android OAuth 플로우 기존과 동일하게 동작
</verification>

<success_criteria>
iOS 시뮬레이터 및 실기기에서 Kakao OAuth 로그인 화면의 한글 텍스트가 정상적으로 렌더링되고, 로그인 플로우가 완료되어 세션이 설정된다. Android와 웹 OAuth는 영향 없이 기존과 동일하게 동작한다.
</success_criteria>

<output>
After completion, create `.planning/quick/260408-nuf-ios/260408-nuf-SUMMARY.md`
</output>
