---
gsd_plan_version: 1.0
quick_id: 260423-bld
slug: android-preview-build
title: Android preview APK 빌드 (내부 배포용)
created: 2026-04-23
mode: quick
---

# 260423-bld — Android Preview APK 빌드

## Description

사용자 요청: "이전 처럼 안드로이드 앱으로 다운받을 수 있게 빌드해줘".

이전 빌드(`a9ebd1e`, 2026-04-23 11:46 완료) 이후 머지된 최신 커밋(`62a34ea`)을 포함해 내부 테스트 배포용 Android APK를 다시 만든다. 별도 코드 변경은 없고 EAS Build 한 번 실행이 전부다.

## Approach

- 이전 빌드와 동일하게 `preview` 프로파일 사용 (`app/eas.json` 기준 `distribution: internal`, `android.buildType: apk`).
- 명령: `eas build --platform android --profile preview --non-interactive` (프로젝트 루트에서 실행 — eas-cli가 `app/` 내부의 `eas.json`을 자동 탐지).
- 원격 Android 자격증명 / 키스토어(`o7ZrKg_-zm`) 재사용.
- EAS 클라우드에서 빌드가 완료되면 `Application Archive URL` (APK 다운로드 링크)을 SUMMARY.md 에 기록.

## Included Changes Since Last Build

이전 APK 커밋 `a9ebd1e` → 이번 빌드 커밋 `62a34ea` 사이에 포함되는 변경:

- `62a34ea` docs(quick-260423-gz3): 안드로이드 영상 썸네일 네비게이션 수정 artifacts
- `28dd6d7` fix(video-player): pass touches to parent in feed/studio modes
- `d9b7744` feat(db): add migration 034 to strip 009 photographer seed on any env
- `2def9fe` chore(state): record 260423-glr commit sha in STATE.md
- `679ddb4` chore(data): remove seed mock data from remote supabase (260423-glr)

## Verification

- 빌드 상태가 `finished` 인지 확인 (`eas build:list --platform android --limit 1`).
- `Application Archive URL` 이 유효한 APK 링크인지 확인.
- 이전 빌드와 fingerprint 비교 (변경 없으면 경고, 변경이면 기대대로).

## Out of Scope

- iOS 빌드, production 프로파일 빌드, 스토어 제출.
- 코드 변경 / 버그 픽스 / 의존성 업그레이드.
