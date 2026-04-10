---
phase: quick-260408-jny
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/src/contexts/AuthContext.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "OAuth 콜백이 두 번 처리되지 않는다 (WebBrowser + Deep Link 중복 방지)"
    - "이미 사용된 code로 exchangeCodeForSession 재시도하지 않는다"
    - "소셜 로그인 실패 시 에러 토스트가 한 번만 표시된다"
    - "웹 OAuth 콜백 후 URL이 정리된다"
  artifacts:
    - path: "app/src/contexts/AuthContext.tsx"
      provides: "OAuth 콜백 중복 처리 방지 로직"
      contains: "isProcessingCallback"
  key_links:
    - from: "extractAndSetSession"
      to: "isProcessingCallback ref"
      via: "early return guard"
      pattern: "isProcessingCallback\\.current"
    - from: "Linking.addEventListener callback"
      to: "pendingOAuthProvider ref"
      via: "guard check before extractAndSetSession"
      pattern: "pendingOAuthProvider\\.current.*extractAndSetSession"
---

<objective>
소셜 로그인(Google/Kakao) OAuth 콜백이 중복 처리되어 "로그인에 실패했습니다" 에러 토스트가 무한 반복되는 버그를 수정한다.

Purpose: WebBrowser.openAuthSessionAsync 콜백과 Linking.addEventListener가 동일한 OAuth redirect URL을 각각 처리하면서 이미 소비된 authorization code를 재사용하려 해 에러가 발생하는 구조적 문제 해결.
Output: 중복 콜백 방지 가드가 적용된 AuthContext.tsx
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/src/contexts/AuthContext.tsx

버그 원인 3가지:
1. WebBrowser 콜백(line 261-273)과 Deep Link 리스너(line 184-189)가 동일 URL을 각각 처리 -- 이미 소비된 code로 exchangeCodeForSession 재시도 시 에러 토스트
2. extractAndSetSession에 재진입 방지 없음 -- 동시 호출 가능
3. 웹에서 OAuth 콜백 후 URL이 /auth/callback에 머물러 재파싱 가능성

기존 코드 구조:
- line 76: pendingOAuthProvider = useRef<LoginProvider | null>(null)
- line 91-137: extractAndSetSession(url) -- URL 파싱 후 code exchange 또는 setSession, 에러 시 showToast
- line 184-189: Deep link listener -- auth/callback URL이면 extractAndSetSession 호출, pendingOAuthProvider 가드 없음
- line 259-273: WebBrowser 콜백 -- pendingOAuthProvider.current 체크 후 extractAndSetSession 호출
</context>

<tasks>

<task type="auto">
  <name>Task 1: OAuth 콜백 중복 처리 방지 가드 추가</name>
  <files>app/src/contexts/AuthContext.tsx</files>
  <action>
AuthContext.tsx에서 다음 변경을 수행한다.

1. `pendingOAuthProvider` ref 선언부(line 76) 아래에 `isProcessingCallback` ref를 추가한다:
   ```
   const isProcessingCallback = useRef(false);
   ```

2. `extractAndSetSession` 함수(line 91) 시작 부분에 재진입 방지 가드를 추가한다:
   - 함수 최상단(URL 유효성 검증 전)에 `if (isProcessingCallback.current) { console.log('[OAuth] Skipping duplicate callback'); return; }` 추가
   - 가드 통과 직후 `isProcessingCallback.current = true;` 설정
   - 함수 끝(기존 `pendingOAuthProvider.current = null;` 바로 아래)에 `isProcessingCallback.current = false;` 추가
   - 주의: early return 경로(line 93-97의 URL 유효성 검증 실패)에서도 `isProcessingCallback.current = false;` 를 설정해야 한다. 가드 설정을 URL 유효성 검증 이후로 옮기거나, try/finally 패턴을 사용한다. try/finally가 더 안전하므로 권장:
     ```
     if (isProcessingCallback.current) { return; }
     isProcessingCallback.current = true;
     try {
       // 기존 extractAndSetSession 로직 전체
     } finally {
       isProcessingCallback.current = false;
     }
     ```

3. Deep link 리스너(line 184-189)에 `pendingOAuthProvider.current` 가드를 추가한다:
   - 기존: `if (url.includes('auth/callback')) { extractAndSetSession(url); ... }`
   - 변경: `if (url.includes('auth/callback') && pendingOAuthProvider.current) { extractAndSetSession(url); ... }`
   - 이렇게 하면 OAuth 플로우가 진행 중일 때만 deep link 리스너가 콜백을 처리한다. WebBrowser 콜백이 이미 처리했으면 pendingOAuthProvider.current가 null이므로 deep link 리스너는 무시한다.

4. 웹 플랫폼 OAuth 콜백 후 URL 정리 -- `extractAndSetSession` 내에서 세션 설정 성공 후(code exchange 또는 setSession 성공 분기) 웹 환경이면 URL을 정리한다:
   - code exchange 성공 분기(현재 line 118-120 부근)와 setSession 성공 분기(현재 line 129-131 부근) 각각에 추가:
     ```
     if (Platform.OS === 'web' && typeof window !== 'undefined') {
       window.history.replaceState({}, '', '/');
     }
     ```
   - Platform은 이미 import되어 있다(line 2).

코드 스타일 준수:
- `useRef` 는 이미 import되어 있음 (line 1)
- 로그 프리픽스 `[OAuth]` 사용 (기존 컨벤션)
- 한국어 인라인 주석 허용
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon/app && npx tsc --noEmit --pretty 2>&1 | head -30</automated>
  </verify>
  <done>
- isProcessingCallback ref가 extractAndSetSession의 재진입을 방지한다
- Deep link 리스너가 pendingOAuthProvider.current 가드를 통해 OAuth 플로우 진행 중일 때만 콜백을 처리한다
- 웹 환경에서 OAuth 성공 후 /auth/callback URL이 /로 교체된다
- TypeScript 컴파일 에러 없음
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| OAuth redirect URL | 외부 IdP에서 돌아오는 콜백 URL -- 코드/토큰 포함 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | extractAndSetSession | accept | URL 파싱은 기존 로직 유지, Supabase SDK가 code/token 검증 담당 |
| T-quick-02 | Denial of Service | isProcessingCallback | mitigate | try/finally로 ref가 반드시 해제되도록 보장 -- 데드락 방지 |
</threat_model>

<verification>
1. TypeScript 컴파일 성공 (tsc --noEmit)
2. 코드 리뷰: extractAndSetSession 진입 시 isProcessingCallback 가드 확인
3. 코드 리뷰: deep link 리스너에 pendingOAuthProvider.current 가드 확인
4. 코드 리뷰: 웹 환경 URL 정리 로직 확인
</verification>

<success_criteria>
- OAuth 콜백이 한 번만 처리된다 (isProcessingCallback 가드)
- Deep link 리스너가 OAuth 플로우 미진행 시 콜백을 무시한다 (pendingOAuthProvider 가드)
- 에러 토스트가 중복 표시되지 않는다
- 웹에서 OAuth 성공 후 URL이 정리된다
- TypeScript 컴파일 에러 없음
</success_criteria>

<output>
After completion, create `.planning/quick/260408-jny-social-login-alert-loop-fix/260408-jny-SUMMARY.md`
</output>
