# Phase 2: Authentication - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

OAuth 4종(Google/Apple/Kakao/Naver) 연동, AuthContext Supabase 전환, 사용자 프로필 온보딩 시스템, 회원 탈퇴(soft delete), 사용자 차단 기능. Phase 1에서 구축한 DB 스키마(public.users, RLS)를 기반으로 동작한다.

</domain>

<decisions>
## Implementation Decisions

### 로그인 화면 구성
- **D-01:** 소셜 로그인 버튼 순서를 카카오 → 네이버 → Google → Apple로 배치 (한국 사용자 전환율 최적화)
- **D-02:** Apple DUNS 미완료 시 버튼을 회색 비활성화 + '준비 중' 텍스트 표시 (사용자가 기능 존재를 인지하되 혼란 방지)
- **D-03:** 게스트 모드(비로그인 브라우징) 유지 — 탐색은 자유, 글쓰기/좋아요 등 액션 시 로그인 유도 모달
- **D-04:** 이메일/비밀번호 로그인은 소셜 버튼 아래 하단 접기 방식 (현재 LoginScreen 구조 유지)

### 프로필 온보딩 흐름
- **D-05:** 최초 가입 직후 별도 온보딩 화면으로 이동 (로그인 → 닉네임+구단 선택 → 홈)
- **D-06:** 온보딩 필수 정보: 닉네임 + 응원 구단 (아바타는 선택, 기본 아바타 제공)
- **D-07:** 닉네임 규칙: 2~12자, 한글/영문/숫자만 허용, 특수문자 불가, 고유성 필수, 30일 변경 제한

### 회원 탈퇴/차단 UX
- **D-08:** 탈퇴 과정: 설정 > 탈퇴 → 경고 문구(콘텐츠 유지, 재가입 시 복구 불가) → '탈퇴하기' 확인 버튼 (2단계)
- **D-09:** 사용자 차단 접근: 프로필 화면 '차단' 버튼 + 게시글/댓글 ... 메뉴에서 '차단' 옵션 (양쪽 모두)
- **D-10:** 차단 목록 관리: 설정 > 차단 관리 화면에서 차단 해제 가능

### 에러/엣지케이스 처리
- **D-11:** OAuth 실패 시 하단 토스트 메시지로 안내 (기존 showToast 패턴 활용), 사용자 취소는 무시
- **D-12:** 세션 만료 시 Supabase autoRefreshToken이 자동 갱신, 실패 시 로그인 화면으로 이동 + 토스트 안내
- **D-13:** 닉네임 중복 체크는 실시간 debounce(500ms)로 사용 가능/불가 즉시 표시

### Claude's Discretion
- 온보딩 화면 레이아웃/디자인 (구단 선택 UI: 리스트 vs 그리드)
- 토스트 메시지 정확한 문구
- 차단 확인 모달 디자인
- Naver OAuth Edge Function 프록시 구현 방식 세부 사항
- 비밀번호 찾기(resetPasswordForEmail) 화면 디자인

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — AUTH-01~AUTH-10 요구사항 상세
- `.planning/ROADMAP.md` §Phase 2 — Goal, Success Criteria, Dependencies

### Existing Auth Code
- `app/src/contexts/AuthContext.tsx` — 현재 OAuth 흐름, UserProfile 인터페이스, 세션 관리, 테스트 계정 구조
- `app/src/screens/auth/LoginScreen.tsx` — 현재 로그인 UI (SNS 버튼 구조, 이메일 폼, 게스트 모드)
- `app/src/screens/auth/SignupScreen.tsx` — 회원가입 화면
- `app/src/screens/auth/ForgotPasswordScreen.tsx` — 비밀번호 찾기 화면
- `app/src/services/supabase.ts` — Supabase 클라이언트 싱글톤, isSupabaseConfigured 플래그

### Navigation & Types
- `app/src/types/navigation.ts` — RootStackParamList (온보딩 화면 추가 필요)
- `app/App.tsx` — 네비게이션 구조, AuthContext 기반 초기 라우팅

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthContext.tsx`: OAuth 흐름 구조 (signInWithOAuth, extractAndSetSession, onAuthStateChange) — 리팩토링 대상이지만 구조 참고 가능
- `LoginScreen.tsx`: SNS_BUTTONS 배열 패턴 — Naver 추가 및 순서 변경으로 확장
- `showToast` 패턴: 기존 토스트 알림 시스템 — OAuth 에러 피드백에 활용
- `useLoginGate` 훅: 게스트 모드에서 로그인 유도 시 활용 가능
- `expo-web-browser`: OAuth 인앱 브라우저 세션 이미 설정됨

### Established Patterns
- Context-as-store: 모든 상태를 Context Provider로 관리, Redux/Zustand 사용 안 함
- Mock-first: `isSupabaseConfigured` 플래그로 mock/실제 데이터 분기 — Phase 2에서 실제 Auth로 전환
- Service layer: `supabase.ts`에서 클라이언트 싱글톤 제공, Context에서 호출
- `{ success: boolean; error?: string }` 반환 패턴: Auth 함수들의 통일된 에러 반환

### Integration Points
- `App.tsx` 네비게이션: AuthContext.isAuthenticated 기반 라우팅 → 온보딩 화면 분기 추가 필요
- `MainTabNavigator`: 인증된 사용자 전용 탭 네비게이션
- Deep link `udamon://auth/callback`: OAuth 콜백 처리 이미 구현
- `AsyncStorage`: 세션 지속, 테스트 계정 키 관리
- 설정 화면: 탈퇴/차단 관리 메뉴 추가 필요

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-04-06*
