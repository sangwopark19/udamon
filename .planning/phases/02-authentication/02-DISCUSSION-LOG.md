# Phase 2: Authentication - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 02-authentication
**Areas discussed:** 로그인 화면 구성, 프로필 온보딩 흐름, 회원 탈퇴/차단 UX, 에러/엣지케이스 처리

---

## 로그인 화면 구성

### 소셜 로그인 버튼 순서

| Option | Description | Selected |
|--------|-------------|----------|
| 한국 우선 | 카카오 → 네이버 → Google → Apple — 한국 사용자 전환율 최적화 | ✓ |
| 플랫폼 우선 | iOS: Apple → 카카오 → Google → 네이버 / Android: Google → 카카오 → 네이버 — OS별 다르게 | |
| 현재 유지 + 네이버 추가 | Google → Apple → Kakao → Naver — 글로벌한 느낌, 현재 UI 변경 최소화 | |

**User's choice:** 한국 우선
**Notes:** 없음

### Apple DUNS 미완료 시 대응

| Option | Description | Selected |
|--------|-------------|----------|
| 비활성 표시 | 버튼을 회색으로 비활성화하고 '준비 중' 표시 | ✓ |
| 숨기기 | DUNS 완료 전까지 Apple 버튼 자체를 숨김 | |
| 탭하면 안내 알림 | 버튼은 정상 표시하되 탭 시 알림 | |

**User's choice:** 비활성 표시
**Notes:** 없음

### 게스트 모드 유지 여부

| Option | Description | Selected |
|--------|-------------|----------|
| 유지 | 비로그인으로 탐색 가능, 글쓰기/좋아요 등 액션 시 로그인 유도 | ✓ |
| 제거 | 로그인 필수 — 커뮤니티 특성상 가입 장벽 낮추는 것보다 사용자 품질 우선 | |

**User's choice:** 유지
**Notes:** 없음

### 이메일 로그인 노출 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 하단 접기 | 소셜 버튼 아래 '이메일로 로그인' 텍스트 탭 시 폼 펼침 | ✓ |
| 동등 버튼 | 소셜 버튼과 동일한 크기로 이메일 버튼 배치 | |
| 별도 화면 | 이메일 로그인/회원가입을 별도 화면으로 분리 | |

**User's choice:** 하단 접기
**Notes:** 없음

---

## 프로필 온보딩 흐름

### 가입 후 프로필 설정 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 가입 직후 온보딩 | 로그인 성공 → 닉네임+구단 선택 화면 → 홈 | ✓ |
| 나중에 설정 | 로그인 → 바로 홈, 프로필이 불완전하면 설정 배너 표시 | |
| 하이브리드 | 로그인 → 홈, 글쓰기 첫 시도 시 닉네임 설정 강제 | |

**User's choice:** 가입 직후 온보딩
**Notes:** 없음

### 온보딩 필수 정보

| Option | Description | Selected |
|--------|-------------|----------|
| 닉네임 + 구단 | 닉네임과 응원 구단 둘 다 필수 | ✓ |
| 닉네임만 필수 | 닉네임만 필수, 구단은 선택 | |
| 닉네임 + 구단 + 아바타 | 세 가지 모두 필수 | |

**User's choice:** 닉네임 + 구단
**Notes:** 없음

### 닉네임 규칙

| Option | Description | Selected |
|--------|-------------|----------|
| 2~12자 한글/영문/숫자 | 특수문자 불가, 고유성 필수 | ✓ |
| 2~20자 자유 형식 | 길이 제한만, 특수문자/이모지 허용 | |
| 2~8자 엄격 | 짧고 깨끗한 닉네임 강제 | |

**User's choice:** 2~12자 한글/영문/숫자
**Notes:** 없음

---

## 회원 탈퇴/차단 UX

### 탈퇴 확인 과정

| Option | Description | Selected |
|--------|-------------|----------|
| 경고 + 확인 | 설정 > 탈퇴 → 경고 문구 → '탈퇴하기' 버튼 (2단계) | ✓ |
| 비밀번호/텍스트 재입력 | 설정 > 탈퇴 → 경고 → '탈퇴' 텍스트 직접 입력 → 완료 (3단계) | |
| 간단 확인만 | 설정 > 탈퇴 → '정말 탈퇴?' Alert → 완료 (1단계) | |

**User's choice:** 경고 + 확인
**Notes:** 없음

### 차단 접근 경로

| Option | Description | Selected |
|--------|-------------|----------|
| 프로필 + 게시글 양쪽 | 프로필 '차단' 버튼 + 게시글/댓글 ... 메뉴 (접근성 최대) | ✓ |
| 프로필에서만 | 프로필 화면에서만 차단 | |
| 신고 흐름에 통합 | 신고 시 차단 옵션 함께 제공 | |

**User's choice:** 프로필 + 게시글 양쪽
**Notes:** 없음

### 차단 목록 관리

| Option | Description | Selected |
|--------|-------------|----------|
| 설정 > 차단 목록 | 설정 화면에 '차단 관리' 메뉴, 차단 해제 가능 | ✓ |
| 프로필 > 차단 목록 | 내 프로필 화면에서 차단 목록 접근 | |

**User's choice:** 설정 > 차단 목록
**Notes:** 없음

---

## 에러/엣지케이스 처리

### OAuth 실패 안내 방식

| Option | Description | Selected |
|--------|-------------|----------|
| 토스트 메시지 | 하단 토스트로 안내, 사용자 취소는 무시 (기존 showToast 패턴) | ✓ |
| 알림 팝업 | Alert.alert로 에러 원인 설명 + 다시 시도 | |
| 인라인 에러 | 로그인 버튼 아래에 빨간 에러 텍스트 표시 | |

**User's choice:** 토스트 메시지
**Notes:** 없음

### 세션 만료 처리

| Option | Description | Selected |
|--------|-------------|----------|
| Silent refresh + 실패 시 로그인 | autoRefreshToken 자동 갱신, 실패 시 로그인 화면 이동 + 토스트 | ✓ |
| 만료 전 경고 | 만료 5분 전 알림 표시 | |

**User's choice:** Silent refresh + 실패 시 로그인
**Notes:** 없음

### 닉네임 중복 체크 시점

| Option | Description | Selected |
|--------|-------------|----------|
| 실시간 체크 | 타이핑 중 debounce(500ms)로 중복 확인, 사용 가능/불가 즉시 표시 | ✓ |
| 제출 시 체크 | 온보딩 완료 버튼 탭 시 중복 확인 | |

**User's choice:** 실시간 체크
**Notes:** 없음

---

## Claude's Discretion

- 온보딩 화면 레이아웃/디자인 (구단 선택 UI)
- 토스트 메시지 정확한 문구
- 차단 확인 모달 디자인
- Naver OAuth Edge Function 프록시 세부 구현
- 비밀번호 찾기 화면 디자인

## Deferred Ideas

None — discussion stayed within phase scope
