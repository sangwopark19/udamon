# Quick Task 260408-nuf: Summary

## Task
iOS 시뮬레이터에서 한글 텍스트가 ?로 표시되는 폰트 렌더링 버그 수정

## Changes

### app/src/contexts/AuthContext.tsx
- iOS OAuth를 `openAuthSessionAsync` (ASWebAuthenticationSession)에서 `openBrowserAsync` (SFSafariViewController)로 전환
- ASWebAuthenticationSession은 iOS 시뮬레이터에서 CJK 폰트 렌더링 제한이 있음
- SFSafariViewController는 앱 프로세스 내에서 WebKit을 실행하여 CJK 폰트 정상 렌더링
- Android는 기존 `openAuthSessionAsync` (Chrome Custom Tabs) 유지
- 기존 딥링크 리스너(`Linking.addEventListener`)가 iOS OAuth 콜백을 처리

## Commits
- 524dae5: fix(quick-260408-nuf): iOS OAuth를 openBrowserAsync(SFSafariViewController)로 전환
