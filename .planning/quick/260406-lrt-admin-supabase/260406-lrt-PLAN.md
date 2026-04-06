---
phase: quick
plan: 260406-lrt
type: execute
wave: 1
depends_on: []
files_modified:
  - admin/src/contexts/AuthContext.tsx
  - app/.env.example
  - admin/.env.example
  - CLAUDE.md
  - .planning/codebase/STACK.md
  - .planning/codebase/INTEGRATIONS.md
  - .planning/codebase/ARCHITECTURE.md
autonomous: true
must_haves:
  truths:
    - "Admin app throws at startup when VITE_ADMIN_EMAIL or VITE_ADMIN_PASSWORD env vars are missing"
    - "login('', '') no longer grants super_admin access"
    - "All active docs reference EXPO_PUBLIC_SUPABASE_KEY (not the old ANON_KEY name)"
    - "app/.env.example and admin/.env.example exist with correct variable names"
  artifacts:
    - path: "admin/src/contexts/AuthContext.tsx"
      provides: "Admin auth with fail-closed credential validation"
      contains: "throw new Error"
    - path: "app/.env.example"
      provides: "Mobile app env template with correct var names"
      contains: "EXPO_PUBLIC_SUPABASE_KEY"
    - path: "admin/.env.example"
      provides: "Admin web env template"
      contains: "VITE_ADMIN_EMAIL"
  key_links:
    - from: "admin/src/contexts/AuthContext.tsx"
      to: "admin/.env"
      via: "import.meta.env.VITE_ADMIN_*"
      pattern: "throw new Error.*VITE_ADMIN"
---

<objective>
Admin 빈 자격증명 보안 취약점을 수정하고, Supabase 환경변수명 불일치를 정리한다.

Purpose: (1) env 미설정 시 빈 문자열로 로그인 가능한 심각한 보안 취약점 제거, (2) 코드와 문서 간 환경변수명 불일치 해소로 온보딩 혼란 방지
Output: 보안 패치된 AuthContext, 올바른 env var 이름의 문서, .env.example 템플릿 파일
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@admin/src/contexts/AuthContext.tsx
@app/src/services/supabase.ts
@CLAUDE.md
@.planning/codebase/STACK.md
@.planning/codebase/INTEGRATIONS.md
@.planning/codebase/ARCHITECTURE.md

<interfaces>
<!-- 현재 admin AuthContext의 문제 패턴 (수정 대상) -->
From admin/src/contexts/AuthContext.tsx:
```typescript
// 문제: || '' 로 빈 문자열 폴백 -> login('', '') 가능
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
```

<!-- 참고: app/src/services/supabase.ts 의 올바른 패턴 -->
From app/src/services/supabase.ts:
```typescript
// 올바른 패턴: 미설정 시 throw로 실행 중단
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY. ' +
    'Copy app/.env.example to app/.env and fill in your Supabase project credentials.'
  );
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Admin 빈 자격증명 보안 취약점 수정 및 .env.example 생성</name>
  <files>admin/src/contexts/AuthContext.tsx, app/.env.example, admin/.env.example</files>
  <action>
1. `admin/src/contexts/AuthContext.tsx` 수정:
   - Line 20-21: `|| ''` 폴백을 제거한다. `import.meta.env.VITE_ADMIN_EMAIL`과 `import.meta.env.VITE_ADMIN_PASSWORD`를 그대로 읽되, string 타입 단언 없이 `string | undefined`로 유지한다.
   - Line 22-27: `console.error` 경고를 `throw new Error()`로 교체한다. 메시지는 `'Missing required environment variables: VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD. Copy admin/.env.example to admin/.env and set your admin credentials.'`으로 한다.
   - Line 29-39: `ADMIN_ACCOUNTS` 객체에서 `[ADMIN_EMAIL]` 키를 사용하는 것은 유지하되, 위의 throw 분기 이후이므로 ADMIN_EMAIL과 ADMIN_PASSWORD는 non-empty string이 보장된다. `if (!ADMIN_EMAIL || !ADMIN_PASSWORD)` guard 이후 코드이므로 TypeScript에게 string 타입을 알려주기 위해 guard 아래에서 `const email: string = ADMIN_EMAIL;` `const password: string = ADMIN_PASSWORD;` 로 재할당하고, ADMIN_ACCOUNTS에서 `[email]`과 `password`를 사용한다.
   - `login` 함수 내에 추가 방어: `if (!email || !password) return false;` 를 `const account = ADMIN_ACCOUNTS[email]` 전에 추가한다. 이렇게 하면 빈 문자열 로그인 시도도 차단된다.

2. `app/.env.example` 생성:
   ```
   # Supabase
   EXPO_PUBLIC_SUPABASE_URL=
   EXPO_PUBLIC_SUPABASE_KEY=
   ```

3. `admin/.env.example` 생성:
   ```
   # Admin credentials
   VITE_ADMIN_EMAIL=
   VITE_ADMIN_PASSWORD=
   ```

주의: `app/.env`는 이미 존재하며 .gitignore 대상이므로 건드리지 않는다. `.env.example`만 생성한다.
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon && npx tsc -b admin/tsconfig.json --noEmit 2>&1 | head -20; echo "---"; cat app/.env.example; echo "---"; cat admin/.env.example</automated>
  </verify>
  <done>
    - admin AuthContext가 env 미설정 시 throw Error로 실행을 중단한다 (console.error만 하고 넘어가지 않는다)
    - ADMIN_EMAIL/ADMIN_PASSWORD에 || '' 폴백이 없다
    - login 함수에 빈 문자열 방어가 있다
    - app/.env.example이 EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_KEY를 포함한다
    - admin/.env.example이 VITE_ADMIN_EMAIL, VITE_ADMIN_PASSWORD를 포함한다
  </done>
</task>

<task type="auto">
  <name>Task 2: 활성 문서에서 환경변수명 불일치 수정</name>
  <files>CLAUDE.md, .planning/codebase/STACK.md, .planning/codebase/INTEGRATIONS.md, .planning/codebase/ARCHITECTURE.md</files>
  <action>
아래 4개 활성 문서에서 `EXPO_PUBLIC_SUPABASE_ANON_KEY`를 `EXPO_PUBLIC_SUPABASE_KEY`로 교체한다.
또한 supabase.ts의 동작 설명이 현재 코드와 일치하도록 수정한다.

1. **CLAUDE.md** (line 270):
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` -> `EXPO_PUBLIC_SUPABASE_KEY`

2. **.planning/codebase/STACK.md** (line 104, 105):
   - Line 104: `EXPO_PUBLIC_SUPABASE_ANON_KEY` -> `EXPO_PUBLIC_SUPABASE_KEY`
   - Line 104: 설명도 `Supabase anon/public key` -> `Supabase publishable key`로 변경
   - Line 105: `graceful fallback to dummy values when env vars are absent` -> `throws Error when env vars are absent (fail-closed)`로 변경

3. **.planning/codebase/INTEGRATIONS.md** (line 10, 12):
   - Line 10: `EXPO_PUBLIC_SUPABASE_ANON_KEY` -> `EXPO_PUBLIC_SUPABASE_KEY`
   - Line 12: `Graceful degradation: falls back to dummy URL/key when env vars absent (prevents crash in dev without .env)` -> `Fail-closed: throws Error when env vars absent (requires app/.env to be configured)`로 변경

4. **.planning/codebase/ARCHITECTURE.md** (line 162):
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` -> `EXPO_PUBLIC_SUPABASE_KEY`
   - 같은 줄의 설명도 현재 동작에 맞게: `Boolean derived from presence of` 부분을 `Throws Error if either is missing; used as branch condition in contexts` 등으로 변경

주의: `.planning/phases/01-*`, `_archive/`, `.planning/research/` 파일은 역사적 기록이므로 수정하지 않는다.
주의: `docs/PHASE1-TEST-GUIDE.md`는 이미 올바른 이름(`EXPO_PUBLIC_SUPABASE_KEY`)을 사용하고 있으므로 수정 불필요.
주의: `.planning/quick/260406-f50-1/260406-f50-PLAN.md`은 이전 quick task 기록이므로 수정하지 않는다.
  </action>
  <verify>
    <automated>cd /Users/sangwopark19/workspace/udamon && echo "=== Old name references (should be 0 in active docs) ===" && grep -rn "EXPO_PUBLIC_SUPABASE_ANON_KEY" CLAUDE.md .planning/codebase/ 2>/dev/null | wc -l && echo "=== New name references ===" && grep -rn "EXPO_PUBLIC_SUPABASE_KEY" CLAUDE.md .planning/codebase/ 2>/dev/null | head -10</automated>
  </verify>
  <done>
    - CLAUDE.md에서 EXPO_PUBLIC_SUPABASE_ANON_KEY 참조가 0개이다
    - .planning/codebase/ 내 활성 문서에서 EXPO_PUBLIC_SUPABASE_ANON_KEY 참조가 0개이다
    - 모든 활성 문서가 EXPO_PUBLIC_SUPABASE_KEY를 사용한다
    - supabase.ts 동작 설명이 "fail-closed (throws Error)"로 정확하게 반영되어 있다
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> admin AuthContext | 사용자 입력 email/password가 환경변수 기반 자격증명과 비교됨 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Spoofing | admin/AuthContext login() | mitigate | env 미설정 시 throw Error로 실행 중단, login()에 빈 문자열 방어 추가 |
| T-quick-02 | Elevation of Privilege | admin/AuthContext ADMIN_ACCOUNTS | mitigate | || '' 폴백 제거 — 빈 자격증명 super_admin 승격 경로 차단 |
</threat_model>

<verification>
1. `admin/src/contexts/AuthContext.tsx`에서 `|| ''` 패턴이 없는지 확인
2. `throw new Error`가 env 미설정 가드에 존재하는지 확인
3. `grep -rn "EXPO_PUBLIC_SUPABASE_ANON_KEY" CLAUDE.md .planning/codebase/` 결과가 0건인지 확인
4. `app/.env.example`과 `admin/.env.example`이 존재하는지 확인
</verification>

<success_criteria>
- admin 앱이 VITE_ADMIN_EMAIL/VITE_ADMIN_PASSWORD 없이 실행 시 throw Error로 즉시 중단
- login('', '')이 false를 반환 (super_admin 접근 불가)
- 활성 문서 전체에서 환경변수명이 코드와 일치 (EXPO_PUBLIC_SUPABASE_KEY)
- .env.example 템플릿이 양쪽 패키지에 존재
</success_criteria>

<output>
After completion, create `.planning/quick/260406-lrt-admin-supabase/260406-lrt-SUMMARY.md`
</output>
