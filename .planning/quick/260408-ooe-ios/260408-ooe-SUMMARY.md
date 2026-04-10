# Quick Task 260408-ooe: iOS 아이콘 폰트 깨짐 및 카카오 로그인 이슈 심층 조사 및 수정

**Date:** 2026-04-08
**Status:** Complete (pending human verification)

## Changes

### Task 1: iOS 아이콘 폰트 깨짐 수정 (c29a36a)

**문제:** iOS에서 Ionicons `baseball` / `baseball-outline` 아이콘이 `?`로 렌더링됨

**근본 원인 분석:**
- iOS는 파일명이 아닌 폰트 내부 Full Name 메타데이터로 폰트를 식별
- `app.json`의 `expo-font` 플러그인이 단순 문자열로만 등록되어 빌드타임 임베딩 미설정
- 런타임 `useFonts`만으로는 iOS에서 폰트 로딩 타이밍 이슈 발생 가능

**수정 내용:**
1. `app.json`: `expo-font` 플러그인에 Ionicons.ttf 빌드타임 임베딩 설정 추가
   ```json
   ["expo-font", {
     "fonts": ["./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"]
   }]
   ```
2. `App.tsx`: `useFonts` 호출에서 `fontsError` 상태 추가 및 에러 로깅
3. `App.tsx`: SplashScreen 조건에 `fontsError` 방어 코드 추가

**파일:** `app/App.tsx`, `app/app.json`

### Task 2: iOS 카카오 로그인 딥링크 진단 로그 강화 (9f9446f)

**문제:** iOS에서 카카오톡 OAuth 로그인 후 앱으로 돌아오지 않는 문제 디버깅 필요

**수정 내용:**
1. `AuthContext.tsx`: redirectUrl 스킴 검증 로그 추가
2. `AuthContext.tsx`: 카카오 도메인(`kauth.kakao.com`) 검증 로그 추가
3. `AuthContext.tsx`: 딥링크 수신 시 전체 URL, 파라미터, 해시 상세 로깅
4. Development build vs Production 스킴 차이 감지 로그

**파일:** `app/src/contexts/AuthContext.tsx`

## Commits

| Hash | Message |
|------|---------|
| c29a36a | fix(260408-ooe): iOS Ionicons 폰트 빌드타임 임베딩 및 런타임 로딩 보장 |
| 9f9446f | fix(260408-ooe): iOS 카카오 로그인 딥링크 진단 로그 강화 |

## Verification

- [x] TypeScript 컴파일 에러 없음
- [x] expo-font config plugin에 Ionicons.ttf 경로 포함
- [x] fontsError 로깅 추가됨
- [x] OAuth 진단 로그 강화됨
- [ ] iOS 시뮬레이터에서 아이콘 렌더링 육안 확인 (human-verify)
- [ ] 카카오 로그인 플로우 테스트 (human-verify)
