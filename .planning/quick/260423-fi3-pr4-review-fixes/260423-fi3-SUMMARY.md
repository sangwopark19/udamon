---
phase: quick
plan: 260423-fi3
subsystem: photographer+home+upload
tags: [pr-review, bug-fix, i18n, consistency]
tech-stack:
  added: []
  patterns:
    - "DB CHECK 제약(photo_posts_images_check 1~7)과 클라이언트 상수(MAX_PHOTOS) 정합성"
    - "Context refresh 의 public/user-scoped 분리 (관심사 분리, 이중 페치 방지)"
    - "UI 문자열 리터럴 → i18n 키 전환 (향후 다국어 확장 대비)"
key-files:
  created: []
  modified:
    - app/src/screens/photographer/UploadPostScreen.tsx
    - app/src/contexts/PhotographerContext.tsx
    - app/src/screens/home/HomeScreen.tsx
    - app/src/i18n/locales/ko.ts
decisions:
  - "refreshData 를 public data 전용으로 축소 + refreshUserScoped 신규 분리 (대안: prevUserIdRef 로 setLoading skip — 비선호, 로직 얽힘 + 네트워크 비효율 유지)"
  - "media_badge_video / media_badge_photo 초기 값은 기존 영문 라벨(VIDEO/PHOTO)을 유지 (로케일 추가 시점에 번역 교체)"
metrics:
  duration: "~12 min"
  completed: "2026-04-23"
  commits: 3
  files_modified: 4
  tests_passed: "7/7 (UploadPostScreen.validateVideoAsset)"
requirements:
  - PR#4-review-01-max-photos
  - PR#4-review-02-refresh-data-double-fetch
  - PR#4-review-03-media-badge-i18n
---

# Quick Task 260423-fi3: PR #4 Review Fixes Summary

PR #4 코드리뷰 3건을 atomic 단위 3개 커밋으로 수정 — DB 제약-클라이언트 상수 정합, 로그인 이중 페치/UI 블랭크 제거, VIDEO/PHOTO 하드코딩 i18n 전환.

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | `9a4c4a7` | fix(04): UploadPostScreen MAX_PHOTOS 10 → 7 to match photo_posts CHECK (1~7) |
| 2 | `8e76648` | fix(04): split refreshData from user-scoped likes/follows to prevent double-fetch on login |
| 3 | `1a9e911` | fix(04): replace hardcoded VIDEO/PHOTO badge with i18n keys on HomeScreen |

All commits use `fix(04):` conventional prefix, no `Co-Authored-By` trailer (per global CLAUDE.md rule).

## Before / After

### Issue 1: UploadPostScreen MAX_PHOTOS 불일치

**Before:**
```ts
// app/src/screens/photographer/UploadPostScreen.tsx:47
const MAX_PHOTOS = 10;
```
UI 는 최대 10장 선택을 허용하지만 Supabase `photo_posts_images_check` CHECK 제약(`array_length(images, 1) BETWEEN 1 AND 7`)이 8장 이상 업로드를 거부 → 사용자 관점 silent failure.

**After:**
```ts
const MAX_PHOTOS = 7;
```
파일 내 `t('upload_max_photos_desc', { max: MAX_PHOTOS })`, `.slice(0, MAX_PHOTOS)`, Alert 라벨 등이 이미 `{max}` 매개변수화되어 있어 상수 값만 변경하면 UI 전체가 일관되게 7장 제한으로 반영된다. i18n 템플릿(`{{max}}`) 자체는 수정 불필요.

### Issue 2: PhotographerContext refreshData 이중 페치

**Before:**
```ts
// app/src/contexts/PhotographerContext.tsx
const refreshData = useCallback(async () => {
  setLoading(true);
  try {
    // public data (photographers/photoPosts/players/...) 페치
    const results = await Promise.all([...7 API calls...]);
    // ... set public state

    // 로그인 사용자의 좋아요/팔로우 복원 (D-22) — 같은 함수 내부
    if (userId) {
      const [likesRes, followsRes] = await Promise.all([...]);
      // ... set user-scoped state
    } else {
      setPhotoLikedIds(new Set());
      setFollowedPgIds(new Set());
    }
  } finally { setLoading(false); }
}, [userId]);   // ← userId 의존성

useEffect(() => { void refreshData(); }, [refreshData]);
```
비로그인 → 로그인 전환 시 userId 변경 → refreshData 재생성 → useEffect 재실행 → `setLoading(true)` 재발화 + 7개 public API 재페치 → HomeScreen 등이 로딩/블랭크로 깜빡임.

**After:**
```ts
// refreshData: public data 전용, deps=[]
const refreshData = useCallback(async () => {
  setLoading(true);
  try {
    const results = await Promise.all([...7 public API calls...]);
    // ... set public state only
  } catch (e) {
    console.error('[PhotographerContext] refreshData unhandled', e);
  } finally { setLoading(false); }
}, []);   // ← userId 제거, mount 시 1회만 실행

useEffect(() => { void refreshData(); }, [refreshData]);

// refreshUserScoped: likes/follows 복원 전용, setLoading 호출 안 함
const refreshUserScoped = useCallback(async () => {
  if (!userId) {
    setPhotoLikedIds(new Set());
    setFollowedPgIds(new Set());
    return;
  }
  try {
    const [likesRes, followsRes] = await Promise.all([
      photographerApi.fetchUserPhotoLikes(userId),
      photographerApi.fetchUserFollows(userId),
    ]);
    // ... set user-scoped state
  } catch (e) {
    console.error('[PhotographerContext] refreshUserScoped unhandled', e);
  }
}, [userId]);

useEffect(() => { void refreshUserScoped(); }, [refreshUserScoped]);
```
결과: 로그인 시 public data 재페치 없음, `setLoading(true)` 재발화 없음, UI 블랭크 없음. 좋아요/팔로우는 백그라운드에서 부드럽게 복원.

### Issue 3: HomeScreen VIDEO/PHOTO 하드코딩

**Before:**
```tsx
// app/src/screens/home/HomeScreen.tsx:466
<Text style={styles.formatText}>{hasVideo ? 'VIDEO' : 'PHOTO'}</Text>
```

**After:**
```tsx
<Text style={styles.formatText}>
  {t(hasVideo ? 'media_badge_video' : 'media_badge_photo')}
</Text>
```

```ts
// app/src/i18n/locales/ko.ts (Home 섹션 직후 추가)
// Media badges (사진/영상 형식 표기)
media_badge_video: 'VIDEO',
media_badge_photo: 'PHOTO',
```
`useTranslation()` 은 이미 파일 상단에서 바인딩되어 있어 import 변경 없음. 초기 값은 기존 영문 라벨 유지 — 향후 en/다국어 추가 시 번역 포인트만 교체하면 됨.

## Verification

### Automated

- `cd app && npx tsc --noEmit` — PASS (zero errors), 각 task 커밋 직후 / 최종 1회 실행.
- `npx jest --testPathPattern=UploadPostScreen` — PASS 7/7 (`validateVideoAsset` 테스트 세트, MAX_PHOTOS 변경과 무관하지만 회귀 확인).
- `grep -nE "setLoading\(true\)" src/contexts/PhotographerContext.tsx` — 1 match (refreshData 내부, line 201) + 1 comment reference. ✅
- `grep "media_badge_" app/src/i18n/locales/ko.ts app/src/screens/home/HomeScreen.tsx` — 키 2개 + `t()` 호출 1개 확인. ✅
- `grep "'VIDEO' : 'PHOTO'" app/src/screens/home/HomeScreen.tsx` — 0 match (하드코딩 제거 확인). ✅
- `git log --oneline -3` — 3개 `fix(04):` 커밋 존재, Co-Authored-By trailer 0건. ✅
- `git diff HEAD~3 --stat` — 의도한 4개 파일만 수정 (+46 / -23). ✅

### Manual (suggested smoke; 실기기/시뮬레이터)

- 업로드 화면 → 사진 피커에서 8장 이상 선택 시도 → 7장에서 차단 + "최대 7장" Alert.
- 앱 재시작(비로그인) → Home 렌더 → 로그인 → 로그인 직후 Home 전체 스피너/블랭크 없음, 좋아요/팔로우만 백그라운드 복원. 네트워크 인스펙터에서 photographers/photo_posts 재요청 0건.
- Home 최근 게시물 카드의 VIDEO / PHOTO 배지 정상 렌더.

## Deviations from Plan

None — plan executed exactly as written.

- Task 1: 상수 값 변경만 (plan 지시대로).
- Task 2: 권장안 (refreshData public 전용 + refreshUserScoped 분리) 적용. 대안(`prevUserIdRef` skip)은 채택하지 않음. 에러 로그 prefix 분리(`refreshData unhandled` / `refreshUserScoped unhandled`)도 plan 주석대로 처리. refreshUserScoped 는 context value 에 노출하지 않음 (내부 effect 전용). `refreshMyApplication` 은 기존 로직 유지 (plan 범위 밖).
- Task 3: ko.ts 에 "Media badges" 섹션을 Home 섹션 직후 / Explore 섹션 직전에 삽입. HomeScreen 내 다른 하드코딩 `'VIDEO'`/`'PHOTO'` 없음 (grep 확인 완료) — 466 라인 1곳만 교체.

## Self-Check: PASSED

- `app/src/screens/photographer/UploadPostScreen.tsx` — FOUND
- `app/src/contexts/PhotographerContext.tsx` — FOUND
- `app/src/screens/home/HomeScreen.tsx` — FOUND
- `app/src/i18n/locales/ko.ts` — FOUND
- Commit `9a4c4a7` — FOUND
- Commit `8e76648` — FOUND
- Commit `1a9e911` — FOUND
- `MAX_PHOTOS = 7` present at UploadPostScreen.tsx:47 — verified
- `refreshUserScoped` + deps `[userId]` present at PhotographerContext.tsx:264/286 — verified
- `refreshData` deps `[]` at PhotographerContext.tsx:255 — verified
- `media_badge_video` / `media_badge_photo` keys at ko.ts:49-50 — verified
- `t(hasVideo ? 'media_badge_video' : 'media_badge_photo')` at HomeScreen.tsx:467 — verified
- Typecheck: PASS (zero errors)
- Tests: PASS (7/7)
- No `Co-Authored-By` trailers in any of the 3 commits — verified via `git log -3 --format="%H%n%s%n%b"`
