---
gsd_summary_version: 1.0
quick_id: 260423-bld
slug: android-preview-build
title: Android preview APK 빌드 (내부 배포용)
status: complete
commit: 62a34ea3c58aa5eafc35461bee90a4a641013bc5
completed: 2026-04-23T12:29:50+09:00
---

# 260423-bld — Android Preview APK 빌드 (SUMMARY)

## Outcome

EAS 클라우드에서 내부 배포용 Android APK 빌드를 성공적으로 완료했다. 이전 빌드(`a9ebd1e`, 11:46 완료) 이후의 변경(`62a34ea` 커밋까지)이 모두 포함된 새 APK가 내부 설치용 링크로 제공된다.

## Build Details

| 항목 | 값 |
|---|---|
| Build ID | `f0f87fe7-14b9-4709-95fe-bb8d51e9b0fd` |
| Platform | Android |
| Profile | preview (distribution: internal) |
| SDK | Expo 54.0.0 |
| Version / versionCode | 1.0.0 / 1 |
| Commit | `62a34ea3c58aa5eafc35461bee90a4a641013bc5` |
| Fingerprint | `272e60db0fab1d70c3b5d98dedf3e9ac2807c60e` (이전 빌드와 동일 — 네이티브 변경 없음) |
| Status | finished |
| Started | 2026-04-23 12:24:08 KST |
| Finished | 2026-04-23 12:29:50 KST |
| Duration | ~5분 42초 |

## Install Links

- **설치 페이지 (QR 스캔 / Android에서 바로 열기):**
  https://expo.dev/accounts/sangwopark19icons/projects/udamon/builds/f0f87fe7-14b9-4709-95fe-bb8d51e9b0fd
- **APK 직접 다운로드:**
  https://expo.dev/artifacts/eas/vKRu9ou3pxJgHBQJJeComM.apk
- **빌드 로그:**
  https://expo.dev/accounts/sangwopark19icons/projects/udamon/builds/f0f87fe7-14b9-4709-95fe-bb8d51e9b0fd

## Commands Executed

```bash
eas build --platform android --profile preview --non-interactive
```

(실행 위치: 프로젝트 루트 — eas-cli가 `app/eas.json`을 자동 탐지)

## Notes

- 원격 Android 키스토어(`o7ZrKg_-zm`) 재사용, 새 자격증명 발급 없음.
- `preview` 환경변수(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_SECRET_SUPABASE_KEY`, R2 키) 로드 확인.
- 경고: `cli.appVersionSource` 미설정 (향후 필수화 예정) — 이번 빌드에는 영향 없음. 후속 작업으로 `eas.json` 에 명시 권장.
- Fingerprint가 이전 빌드와 동일하므로 native 모듈/의존성 변경은 없었음. 포함된 것은 JS 레이어 변경만:
  - `62a34ea` docs(quick-260423-gz3): 안드로이드 영상 썸네일 네비게이션 수정 artifacts
  - `28dd6d7` fix(video-player): pass touches to parent in feed/studio modes
  - `d9b7744` feat(db): add migration 034 to strip 009 photographer seed on any env
  - `2def9fe` chore(state): record 260423-glr commit sha in STATE.md
  - `679ddb4` chore(data): remove seed mock data from remote supabase (260423-glr)
