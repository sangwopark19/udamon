---
phase: 04-photographer
reviewed: 2026-04-15T12:30:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - app/src/types/photographer.ts
  - app/src/types/cheerleader.ts
  - app/src/types/photographerApplication.ts
  - app/src/types/navigation.ts
  - app/src/contexts/PhotographerContext.tsx
  - app/src/contexts/AdminContext.tsx
  - app/src/services/photographerApi.ts
  - app/src/services/r2Upload.ts
  - app/src/utils/photographerGrade.ts
  - app/src/utils/videoValidation.ts
  - app/src/components/common/VideoPlayer.tsx
  - app/src/components/photographer/GradeBadge.tsx
  - app/src/components/shared/BottomTabBar.tsx
  - app/src/constants/colors.ts
  - app/src/navigation/MainTabNavigator.tsx
  - app/src/screens/photographer/UploadPostScreen.tsx
  - app/src/screens/photographer/StudioScreen.tsx
  - app/src/screens/photographer/studioState.ts
  - app/src/screens/photographer/PhotographerRegisterScreen.tsx
  - app/src/screens/photographer/PhotographerProfileScreen.tsx
  - app/src/screens/photographer/CollectionDetailScreen.tsx
  - app/src/screens/home/PopularPhotographersScreen.tsx
  - app/src/screens/cheerleader/CheerleaderProfileScreen.tsx
  - app/src/screens/cheerleader/CheerleadersAllScreen.tsx
  - app/src/screens/explore/ExploreScreen.tsx
  - app/src/screens/explore/PostDetailScreen.tsx
  - app/src/screens/social/FollowingListScreen.tsx
  - supabase/migrations/029_photo_posts_videos.sql
  - supabase/migrations/030_photographer_approval_trigger.sql
  - supabase/migrations/031_photographer_apps_extend.sql
  - supabase/migrations/032_photo_posts_thumbnails.sql
  - supabase/functions/get-upload-url/index.ts
  - supabase/functions/generate-thumbnails/index.ts
  - supabase/config.toml
findings:
  critical: 2
  high: 3
  warning: 6
  info: 7
  total: 18
status: issues_found
---

# Phase 04-photographer: Code Review Report

**Reviewed:** 2026-04-15T12:30:00Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

Phase 4 는 포토그래퍼 신청/승인/업로드 파이프라인을 Supabase + R2 + Edge Functions 위에 실제로 구현한 큰 변경이다. 전반적으로 CLAUDE.md 의 strict-typed / discriminated union 패턴이 잘 지켜지고 있고, `validateVideoAsset` 와 `determineStudioState` 를 순수 함수로 분리해 jest-friendly 하게 설계한 점, `generate-thumbnails` Edge Function 이 T-4-05 owner 검증을 올바르게 수행하는 점은 특히 좋다.

다만 **핵심 보안/정합성 결함이 2건, 주요 bug 3건** 발견되었다:

- **CR-01 (Critical):** `get-upload-url` 의 `photo-posts` ALLOWED_TYPES 가 `video/webm` 을 여전히 허용 — Phase 4 threat T-4-06 (video MIME whitelist = mp4 + quicktime) 을 위반한다. 클라이언트 `validateVideoAsset` 는 webm 을 거부하지만 서버 gateway 가 webm presigned URL 을 발급하면 우회 가능.
- **CR-02 (Critical):** `cheerleaders` DB schema 의 `status CHECK` 는 `('active','inactive')` 인데 TypeScript `CheerleaderStatus` 는 `'active' | 'retired'` — fetch 시 타입 거짓말. 런타임에 `'inactive'` row 가 들어오면 switch 분기에서 조용히 fallthrough.
- **HI-01 (High):** `StudioScreen.loadState` 비동기 체인이 unmount 후 `setState` 호출 가능 — `cancelled` / `isMounted` 가드 없음.
- **HI-02 (High):** `MainTabNavigator` 가 `user.id` 변경 시마다 Supabase API 를 호출하는데 `BottomTabBar` 라벨/아이콘이 첫 프레임에 `'tab_photographer'` (camera) 로 깜빡인 후 교체 — 승인된 사용자 라벨 flicker 이슈.
- **HI-03 (High):** `photographer_applications` 테이블에 `UNIQUE(user_id)` 가 없어 같은 사용자가 pending 상태로 여러 번 INSERT 가능 — 재신청 UX 시 이전 pending 이 그대로 남아 `fetchMyPhotographerApplication` 의 `order by created_at desc limit 1` 결과에만 의존.

나머지는 warning/info 수준이며 대부분 Phase 5 admin 이관 대상으로 코멘트되어 있다 (updatePhotographer/updatePostStatus 를 no-op 로 둠). 이 stubs 들은 코멘트가 명시적이지만 `AdminContext` 의 approvePost/rejectPost 가 현 상태에서는 DB 반영 없이 로그만 남기기 때문에 Admin 흐름은 완전히 깨진 상태임을 인지해야 한다.

---

## Threat Coverage (Phase 4 PLAN Threat Model)

| Threat | Status | Notes |
|---|---|---|
| T-4-01 RLS bypass via photographer_applications | PARTIAL | 023 RLS `photographer_apps_insert_own WITH CHECK (auth.uid() = user_id)` 만 확인됨. **UNIQUE(user_id) 부재로 다중 pending 신청 가능** (HI-03). |
| T-4-02 File size DoS 50MB | MITIGATED | 클라이언트 `VIDEO_MAX_SIZE_BYTES = 50MB` + 서버 `SIZE_LIMITS["photo-posts"] = 50MB` 일치. 주석이 알려주듯 presigned URL 에는 실제 Content-Length binding 이 없어 R2 bucket lifecycle rule 이 최종 방어선 — 이 부분은 v1 operational risk 로 명시되어 있음. |
| T-4-03 SECURITY DEFINER privilege escalation | MITIGATED | `handle_photographer_application_decision` 에 `SECURITY DEFINER SET search_path = ''` 정확히 적용됨 (migrations/030:38). OWNER 를 postgres 로 명시 (030:102). |
| T-4-04 Studio/Register auth bypass | MITIGATED | `StudioScreen` 은 DB 에서 fetch 한 status + photographer row 기반 state machine 사용 — client-side `isPhotographer` flag 만 신뢰하지 않음. `UploadPostScreen.doPublish` 도 `getPhotographer(user.id)` 확인. |
| T-4-05 Edge Function owner mismatch | MITIGATED | `generate-thumbnails/index.ts:111-125` 가 JWT user.id ↔ photographers.user_id 조인으로 403 반환 — 올바름. |
| T-4-06 Malicious video payload | **VIOLATED** | **CR-01**: `get-upload-url` 의 `photo-posts` ALLOWED_TYPES 에 `video/webm` 남아있음 — PLAN 은 mp4 + quicktime whitelist 지정. |
| T-4-07 Notification spam via approval trigger | MITIGATED | 트리거 WHEN 절 `OLD.status IS DISTINCT FROM NEW.status` 로 상태 변경 시에만 발화. 재승인도 `ON CONFLICT DO NOTHING` 으로 사용자 측 notification 만 중복 가능 (WR-04 참조). |

---

## Critical Issues

### CR-01: `get-upload-url` video MIME whitelist 가 T-4-06 과 불일치 (webm 허용)

**File:** `supabase/functions/get-upload-url/index.ts:5-16`
**Threat:** T-4-06 (Malicious video payload)
**Issue:**
PLAN 은 video whitelist 를 `video/mp4` + `video/quicktime` 두 가지로 한정한다. 클라이언트 `validateVideoAsset` 는 올바르게 두 mime 만 허용 (`ALLOWED_VIDEO_MIME` 배열 + test `MIME webm 거부 → unsupported_format`). 하지만 서버 Edge Function 은 여전히 `video/webm` 을 ALLOWED_TYPES 에 포함하고 있다:

```ts
const ALLOWED_TYPES: Record<string, string[]> = {
  "photo-posts": [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",              // ← T-4-06 위반
  ],
  ...
};
```

`getExtension` 헬퍼도 `"video/webm": "webm"` 매핑을 갖고 있어 presigned URL 이 `.webm` 파일명으로 정상 발급된다. 공격자가 모바일 client 를 우회해 직접 `fetch(UPLOAD_FUNCTION_URL, { body: { prefix:"photo-posts", contentType:"video/webm", count:1 } })` 호출 시 성공한다. Defense-in-depth 의 서버 layer 가 뚫린 상태.

**Fix:**
```ts
const ALLOWED_TYPES: Record<string, string[]> = {
  "photo-posts": [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    // webm 제거 — Phase 4 T-4-06 whitelist 기준
  ],
  "community-posts": ["image/jpeg", "image/png", "image/webp"],
  avatars: ["image/jpeg", "image/png", "image/webp"],
};

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    // "video/webm" 제거
  };
  return map[contentType] ?? "bin";
}
```

이 변경은 `validateVideoAsset` 유닛 테스트 `MIME webm 거부` 과 일관된다. 배포 전 기존 webm R2 object 가 있는지도 (있다면) 수동 cleanup 필요.

---

### CR-02: `cheerleaders.status` DB CHECK 과 TypeScript 타입 불일치

**File:** `app/src/types/cheerleader.ts:4` / `supabase/migrations/017_cheerleaders.sql:12` / `app/src/services/photographerApi.ts:272-282`
**Issue:**
DB schema:
```sql
status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
```

TypeScript 타입:
```ts
export type CheerleaderStatus = 'active' | 'retired';
```

`mapCheerleader` 는 `status: row.status` 를 아무 검증 없이 직접 할당하고 (photographerApi.ts:279), `row: CheerleaderRow` 는 `status: 'active' | 'retired'` 로 선언되어 있어 DB row 와 거짓말 관계가 된다. `fetchCheerleaders` 는 `.eq('status', 'active')` 로 현재는 active row 만 가져오지만 — 만약 관리 툴에서 `status='inactive'` 로 바꾸거나, 쿼리 filter 를 제거하는 순간 TypeScript "사실상의 안전성" 이 깨진다.

또한 Phase 4 types/cheerleader.ts 의 `'retired'` literal 은 DB schema 어디에도 존재하지 않으므로 제네레이트할 수도, 수동 matching 할 수도 없는 "dead" 값이다 (types/cheerleader.ts 주석도 "DB schema 기준" 이라 명시했지만 실제로는 불일치).

**Fix (옵션 A — 권장: DB schema 를 기준값으로 맞춤):**
```ts
// app/src/types/cheerleader.ts
export type CheerleaderStatus = 'active' | 'inactive';
```

**Fix (옵션 B — 신규 migration 으로 DB 를 retired 로 변경):** 
```sql
-- supabase/migrations/033_cheerleaders_status_retired.sql
ALTER TABLE public.cheerleaders DROP CONSTRAINT IF EXISTS cheerleaders_status_check;
ALTER TABLE public.cheerleaders
  ADD CONSTRAINT cheerleaders_status_check CHECK (status IN ('active', 'retired'));
UPDATE public.cheerleaders SET status = 'retired' WHERE status = 'inactive';
```

하나를 택하지 않으면 UI 텍스트나 admin 화면이 추가되었을 때 silent bug 의 원인이 된다. v1 출시 전 정리 필수.

---

## High Priority Issues

### HI-01: `StudioScreen.loadState` 가 unmount 후 setState 호출 가능

**File:** `app/src/screens/photographer/StudioScreen.tsx:55-85`
**Issue:**
`loadState` 는 두 개의 `await` 체인 (`fetchMyPhotographerApplication` → `fetchPhotographerByUserId`) 후 `setState(determineStudioState(...))` 를 실행하지만, `cancelled` / `isMounted` ref 가 없다. 사용자가 fetch 도중 탭을 빠르게 전환하면 Studio 화면 unmount 후 `setState` → RN dev warning + 메모리 leak.

`MainTabNavigator` 의 `useEffect` 는 `cancelled` flag 를 올바르게 사용하지만 (navigation/MainTabNavigator.tsx:33-48), `StudioScreen` 자체는 가드 없음. 특히 Studio 는 Tab 버튼이라 전환이 빈번하다.

**Fix:**
```ts
const loadState = useCallback(async () => {
  // 기존 로직 그대로 ...
}, [user?.id, overridePhotographerId, getPhotographer]);

useEffect(() => {
  let cancelled = false;
  (async () => {
    if (overridePhotographerId) {
      const pg = getPhotographer(overridePhotographerId);
      if (cancelled) return;
      setState(pg ? { kind: 'approved', photographer: pg } : { kind: 'no_application' });
      return;
    }
    if (!user?.id) {
      if (cancelled) return;
      setState({ kind: 'no_application' });
      return;
    }
    if (cancelled) return;
    setState({ kind: 'loading' });
    const appResult = await photographerApi.fetchMyPhotographerApplication(user.id);
    if (cancelled) return;
    const needsPhotographer =
      appResult.data?.status === 'approved'
        ? await photographerApi.fetchPhotographerByUserId(user.id)
        : null;
    if (cancelled) return;
    setState(determineStudioState({ appResult, photographerResult: needsPhotographer }));
  })();
  return () => { cancelled = true; };
}, [user?.id, overridePhotographerId, getPhotographer]);
```

`loadState` 를 top-level callback 으로 유지하고 싶다면 ref 기반 `isMountedRef.current` 패턴이 대안.

---

### HI-02: `MainTabNavigator` Studio 탭 라벨/아이콘 flicker (첫 프레임에 `'tab_photographer'`)

**File:** `app/src/navigation/MainTabNavigator.tsx:26-71`
**Issue:**
초기 state 가 `'no_app'` 으로 설정되어 있으므로 인증 사용자가 앱을 열자마자 `BottomTabBar` 는 `camera-outline` + `tab_photographer` (카메라 아이콘 "포토그래퍼") 라벨을 표시한다. `fetchMyPhotographerApplication` 이 resolve 되면 순간적으로 `'tab_studio'` (aperture) 로 전환. 승인된 포토그래퍼에게는 매 cold start 마다 1~2프레임 flicker 가 나타난다.

또한 Supabase 요청 실패 시 `.catch(() => setStudioState('no_app'))` 하는데, 네트워크 일시 장애 시 승인된 사용자가 `'tab_photographer'` 로 downgrade 되어 보여지는 UX 결함도 있다.

**Fix (옵션 A — AuthContext 의 is_photographer 플래그 사용):**
사용자가 로그인 후 load 된 `user.is_photographer` (users 테이블 컬럼) 가 이미 AuthContext 에 있다면 초기 값으로 사용해 flicker 방지:
```ts
const [studioState, setStudioState] = useState<StudioTabState>(
  user?.is_photographer ? 'approved' : 'no_app'
);
```

**Fix (옵션 B — loading state 추가):**
```ts
type StudioTabState = 'loading' | 'no_app' | 'pending' | 'approved' | 'rejected';
const [studioState, setStudioState] = useState<StudioTabState>('loading');
const studioLabel =
  studioState === 'loading' ? '' :   // 빈 라벨 또는 현재 유지
  studioState === 'pending' ? t('tab_pending_review') :
  studioState === 'approved' ? t('tab_studio') : t('tab_photographer');
```

다운그레이드 우려는 `.catch` 블록을 네트워크 에러 시 기존 state 유지하도록 바꾸면 해결:
```ts
.catch(() => { /* keep previous state on transient network error */ });
```

---

### HI-03: `photographer_applications` 에 `UNIQUE(user_id)` 부재 — 중복 pending 가능

**File:** `supabase/migrations/016_photographer_apps.sql:6-17` (+ 030/031 migrations)
**Issue:**
table 정의 어디에도 `UNIQUE(user_id)` 또는 partial unique index `WHERE status = 'pending'` 제약이 없다. `PhotographerRegisterScreen.handleNext(step===3)` 는 `submitPhotographerApplication` 을 호출할 때 기존 pending 을 체크하지 않고 그대로 INSERT. 사용자가 Step 3 에서 버튼을 연타하거나 거절 후 재신청 시, 같은 user 로 여러 개의 pending row 가 쌓인다.

실제 영향:
- Admin 화면에서 같은 사용자 중복 신청 review 목록에 표시됨
- `fetchMyPhotographerApplication` 은 `.order('created_at desc').limit(1)` 로 "최신 1건" 만 가져와 덮어쓰는데, 이는 상태가 일관되어 보이게 "숨기는" 효과라 운영자에게만 혼란.
- 승인 트리거는 UPDATE OF status 에만 발화하므로 다중 row 중 아무거나 하나를 approved 로 바꾸면 `photographers` 는 `ON CONFLICT (user_id) DO NOTHING` 덕에 하나만 생성되지만 notifications 는 중복 발송 가능 (WR-04).

**Fix (신규 migration):**
```sql
-- 033_photographer_apps_unique_pending.sql
-- 사용자당 pending 상태 신청은 최대 1건.
CREATE UNIQUE INDEX photographer_apps_one_pending_per_user
  ON public.photographer_applications (user_id)
  WHERE status = 'pending';

-- 기존에 쌓여있는 중복 pending 은 가장 최근 것만 남기고 수동 cleanup:
-- DELETE FROM public.photographer_applications a
-- USING public.photographer_applications b
-- WHERE a.user_id = b.user_id
--   AND a.status = 'pending' AND b.status = 'pending'
--   AND a.created_at < b.created_at;
```

**Alternative fix (클라이언트 레벨):**
`PhotographerRegisterScreen.handleNext` 에서 제출 전 `fetchMyPhotographerApplication` 을 호출해 pending 이 있으면 `Alert.alert('이미 심사중인 신청이 있습니다')` 반환. (DB 수준 방어가 아니므로 race 가능하지만 main UX 보호.)

---

## Warnings

### WR-01: `uploadPostVideos` 가 asset 별로 Edge Function 을 N번 호출 — atomicity 부재

**File:** `app/src/services/r2Upload.ts:93-120`
**Issue:**
주석은 "Edge Function 이 호출당 단일 contentType + count 가정" 이라고 설명하지만, 실제로는 `get-upload-url` 이 `contentType` 하나 + `count` 여러 개를 받는다 (단일 mime 다중 파일). `uploadPostVideos` 는 이를 활용 못하고 매 asset 마다 새 presigned URL 을 요청한다. 3 asset 업로드 시 Edge Function hit 4번 (처음 1번 이미지 + 3번 영상). 각 presigned URL 은 15분 TTL 이며 각각 독립 실패 가능 — 중간에 하나만 실패하면 이미 업로드된 앞 asset 이 orphan 상태로 R2 에 남는다.

**Fix:**
`get-upload-url` 에 `contentTypes: string[]` (복수) 또는 `items: { contentType, count }[]` 배열 파라미터를 추가해 한 번에 처리. 또는 클라이언트에서 같은 mime 끼리 묶어 호출:
```ts
// Group localUris by contentType
const groups = new Map<string, number[]>();
localUris.forEach((_, i) => {
  const ct = contentTypes[i];
  const arr = groups.get(ct) ?? [];
  arr.push(i);
  groups.set(ct, arr);
});

for (const [ct, indices] of groups) {
  const { uploads } = await getPresignedUrls(accessToken, 'photo-posts', ct, indices.length);
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    await putToR2(uploads[k].uploadUrl, localUris[i], ct);
    publicUrls[i] = uploads[k].publicUrl;
  }
}
```

최소한 실패 시 이미 업로드된 R2 object 를 best-effort 삭제하는 rollback 훅은 있어야 한다 — orphan 누적 + 50MB × N = storage cost.

---

### WR-02: `PhotographerContext.togglePhotoLike` rollback 시 실제 서버 count 와 동기화 불일치

**File:** `app/src/contexts/PhotographerContext.tsx:284-307`
**Issue:**
Optimistic flip 에서 `like_count` 를 `Math.max(p.like_count + delta, 0)` 로 조정하고, rollback 도 `Math.max(p.like_count - delta, 0)`. 이 자체는 문제없으나, DB 의 실제 count 는 `update_like_count` 트리거로 계산된다. Supabase RLS 제약/race 등으로 서버가 UPDATE 하지 못하고 200 에 가깝지만 error 가 없는 edge case (예: RLS 거부 시 empty result 반환) 에서 local count 는 +1, 서버는 ±0 으로 drift. 다음 refresh 에서 교정되지만 user 로서는 "좋아요 된 채로 따운트만 안 오르는" 혼란 가능.

`togglePhotoLike` 의 `maybeSingle()` 체크가 있고 error 를 반환하도록 설계되어 있어 실용적으로는 안전 — 다만 rollback 로직이 "optimistic 값 에 delta 역산" 방식이라, 중간에 다른 트리거(예: 트리거 내부 에러 → photo_posts.like_count 는 안 바뀜)가 발생하면 drift 가능. 최소한 rollback 후 해당 post 만이라도 `fetchPhotoPost` (단건 조회) 로 동기화하는 것이 보수적.

**Fix (선택적 보강):**
```ts
if (res.error) {
  // Rollback local, then re-fetch authoritative count from server
  // (서버 기준으로 재설정)
  const authoritative = await photographerApi.fetchPhotoPostById(postId);
  if (authoritative?.data) {
    setPhotoPosts((prev) => prev.map((p) => p.id === postId ? authoritative.data : p));
  } else {
    // fallback: optimistic rollback
    ...
  }
}
```

현재 상태로도 동작하지만, 이 pattern 은 Phase 5 bug report 요청 가능성이 있으니 사전 차단 권장.

---

### WR-03: `PhotographerContext.renameCollection` 이 서버 반영 없이 local 만 수정

**File:** `app/src/contexts/PhotographerContext.tsx:382-392`
**Issue:**
주석이 명시하듯 `photographerApi.updateCollection` 미구현 → 현재 local 만 수정. 사용자는 rename 성공한 것처럼 보이지만 앱 재시작 시 원상복귀. 이는 Phase 4 기간 내 release 되는 경우 실제 버그이자 user-facing 결함이다. 최소한 UI 에서 rename CTA 를 비활성화하거나 toast "서버 반영은 추후 업데이트" 를 보여야 한다.

**Fix:**
1. **단기 (Phase 4 출시 차단):** rename 버튼 숨김 또는 disabled + `Alert.alert('추후 버전에서 지원')`.
2. **정식 (Phase 5):** `photographerApi.updateCollection(id, { name, emoji })` + RLS `collections_update_own` 정책 추가 후 await 전환.

동일하게 `AdminContext.approvePost/rejectPost`, `AdminContext.approvePhotographer/rejectPhotographer`, `PhotographerProfileScreen.updatePhotographer` 가 모두 no-op stub. Phase 5 까지 admin 화면은 실제 동작 안 함 — 출시 전에 해당 CTA 를 숨기거나 "점검 중" 표시 필요.

---

### WR-04: `handle_photographer_application_decision` 트리거가 재승인 시 notification 중복 발송 가능

**File:** `supabase/migrations/030_photographer_approval_trigger.sql:57-94`
**Threat:** T-4-07 (Notification spam)
**Issue:**
트리거 WHEN 절은 `OLD.status IS DISTINCT FROM NEW.status` 이고, 함수 내부에서도 `NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status` 를 이중 체크한다 (redundant 이지만 안전). 하지만 `photographers` INSERT 는 `ON CONFLICT (user_id) DO NOTHING` 이고, notification INSERT 는 `ON CONFLICT` 가 없다. HI-03 처럼 사용자가 여러 pending 신청을 가지고 있고 admin 이 각각 approved 로 바꾸면 `photographers` 는 하나만 생성되지만 notifications 는 application 개수만큼 발송.

또한 admin UX 에서 "실수로 rejected → approved → rejected → approved" 시 매번 알림이 가는데, 현 상태는 의도된 동작으로 보이지만 admin error recovery 시에 spam 이 발생할 수 있다.

**Fix (옵션):**
```sql
-- 이미 photographers row 가 있으면 승인 알림 발송 안 함
IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
  IF NOT EXISTS (SELECT 1 FROM public.photographers WHERE user_id = NEW.user_id) THEN
    -- 첫 승인 시에만 알림
    INSERT INTO public.notifications (...) VALUES (...);
  END IF;
  -- photographers INSERT 는 ON CONFLICT DO NOTHING 유지
END IF;
```

또는 HI-03 의 UNIQUE(user_id) WHERE pending 제약이 있으면 이 시나리오 자체가 불가능해 자연스럽게 해결.

---

### WR-05: `UploadPostScreen.handleRemoveImage` 가 `rightsConfirmed` / `selectedCollectionId` stale closure 위험

**File:** `app/src/screens/photographer/UploadPostScreen.tsx:162-169`
**Issue:**
사용자가 "이미지 업로드 → 저작권 동의 체크 → 이미지 모두 삭제 → 다시 업로드" 흐름을 타면 `rightsConfirmed` 가 true 상태로 남아있다. `canPublish` 는 `(isEditing || rightsConfirmed)` 를 체크하지만 동의는 "현재 업로드한 이미지 세트" 에 대한 약속이라는 UX 해석이 가능하다. 엄격히 버그는 아니지만 저작권 UX regulatory 검토 시 재확인 필요.

**Fix:**
```ts
const handleRemoveImage = (idx: number) => {
  setImages((prev) => {
    const next = prev.filter((_, i) => i !== idx);
    if (next.length === 0) setRightsConfirmed(false); // 재업로드 시 다시 동의 필요
    return next;
  });
};
```

**Priority:** 저작권 표시가 법적 의미를 갖는 경우 high, 아니면 warning.

---

### WR-06: `UploadPostScreen.doPublish` — 파일 업로드 후 `createPhotoPost` 실패 시 R2 orphan

**File:** `app/src/screens/photographer/UploadPostScreen.tsx:222-302`
**Issue:**
Step 1 (image upload) + Step 2 (video upload) 성공 → Step 3 (`createPhotoPost`) 에서 Supabase RLS/네트워크 에러 발생 시 R2 에 이미 업로드된 이미지/영상 파일은 삭제되지 않는다. 사용자는 "업로드 실패" 를 보지만 스토리지 비용은 이미 발생. 여러 번 재시도하면 orphan 누적.

**Fix:**
- Step 3 catch 에서 R2 DELETE presigned URL 생성하거나, Edge Function `cleanup-orphans(keys)` 추가해 롤백.
- 또는 간단히 Cloudflare R2 lifecycle rule 에 "24시간 내 photo_posts 에 referenced 되지 않은 object 삭제" 규칙 설정 (DB 조회 필요하므로 bucket native 로는 어려움 — 별도 cron Edge Function 권장).

단기에는 issue 로 기록하고 Phase 5 에 orphan cleanup job 을 계획하는 게 현실적.

---

## Info

### IN-01: `PhotographerProfileScreen.updatePhotographer` 가 no-op stub — rename 은 local 도 아님

**File:** `app/src/screens/photographer/PhotographerProfileScreen.tsx:59-63`
**Issue:** 주석대로 Phase 5 이관 대상이지만, 현재 프로필 수정 UI 가 사용자에게 "저장됨" 느낌을 주면서 실제로는 `console.warn` 만 출력. modal 을 닫으면 local state `editName/editBio` 도 사라져 변경 내역조차 즉시 소멸. WR-03 과 동일한 원칙 — Phase 4 출시 시 UI 를 비활성화하거나 "준비 중" 메시지 표시.

### IN-02: `AdminContext.photographerApplications` 가 `photographers.is_verified=false` 기반 mock seed

**File:** `app/src/contexts/AdminContext.tsx:69-83`
**Issue:** Phase 4 에서 실제 `photographer_applications` 테이블을 생성했는데 AdminContext 는 여전히 mock 데이터 (photographers 중 verified=false 인 사람을 application 으로 위장) 를 사용. admin 흐름은 Phase 5 이관 대상이라고 명시되어 있지만 이 부분이 문서화 안 되어 있으면 추적 어려움.

### IN-03: `photographerApi.fetchPhotoPosts` joined query 를 다시 발급 시 slug cache race

**File:** `app/src/services/photographerApi.ts:137-161`
**Issue:** `ensureSlugMaps` 는 module-level singleton `_slugMap` / `_uuidToSlugMap` 을 lazy load 하는데, 다수의 await 가 병렬로 호출되면 여러 번 fetch 할 수 있다 (Promise-wrap 되지 않음). 기능상 문제는 없지만 `refreshData` 는 7개 API 를 `Promise.all` 으로 호출하므로 최초 load 시 teams 조회가 7번 동시 발생. 소량 오버헤드지만 간단히 고칠 수 있다.

**Fix:**
```ts
let _slugPromise: Promise<void> | null = null;
async function ensureSlugMaps(): Promise<void> {
  if (_slugMap && _uuidToSlugMap) return;
  if (!_slugPromise) {
    _slugPromise = (async () => {
      const { data } = await supabase.from('teams').select('id, slug');
      if (data) {
        _slugMap = new Map(data.map((t) => [t.slug, t.id]));
        _uuidToSlugMap = new Map(data.map((t) => [t.id, t.slug]));
      } else {
        _slugMap = new Map();
        _uuidToSlugMap = new Map();
      }
    })();
  }
  await _slugPromise;
}
```

### IN-04: `VideoPlayer.player.play()` 호출이 play/pause 에러 시 silent console.warn

**File:** `app/src/components/common/VideoPlayer.tsx:42-53`
**Issue:** `try/catch` 로 감싸고 `console.warn` 만 남긴다. feed 모드에서 isVisible 전환 시 예외가 발생해도 UI 에는 알림 없음. Dev mode 에서만 보이므로 prod 품질 측정이 어렵다. 장기적으로 Sentry/로그 수집으로 연결할 예정이라면 TODO 코멘트 추가 권장.

### IN-05: `photographerGrade.calculateGrade` 의 grade 필드 설계 유지보수성

**File:** `app/src/utils/photographerGrade.ts:17-21`
**Issue:** 공식 `post_count + floor(follower_count / 10)` 를 클라이언트 `mapPhotographer` 에서 계산. DB 에는 저장되지 않으므로 "오늘 포스트 수" 기반 UI 는 정확하지만, Supabase 구독/실시간 동기화 시 `grade` 를 별도 계산하는 중복이 발생. Phase 5 이후에 `photographers.grade_cache` 컬럼 + 트리거로 이관하거나, RPC `get_grade(photographer_id)` 로 서버 single source of truth 로 만드는 것을 고려.

### IN-06: `BottomTabBar.AnimatedTab` useEffect deps 에 `scale` 누락

**File:** `app/src/components/shared/BottomTabBar.tsx:42-50`
**Issue:**
```ts
useEffect(() => {
  if (isFocused && !prevFocused.current) { ... }
  prevFocused.current = isFocused;
}, [isFocused]);
```

`scale` (Animated.Value) 는 useRef 라 deps 에 넣을 필요는 없지만, lint rule eslint-plugin-react-hooks/exhaustive-deps 가 경고를 줄 수 있다. 무해하지만 명시적 `// eslint-disable-next-line react-hooks/exhaustive-deps` 주석을 달거나 scale ref 를 `useMemo(() => new Animated.Value(1), [])` 로 바꾸어 deps 기준 명확화.

### IN-07: `navigation.navigate('UploadPost' as any)` 타입 우회

**File:** `app/src/screens/photographer/PhotographerProfileScreen.tsx:312`
**File:** `app/src/screens/cheerleader/CheerleaderProfileScreen.tsx:218`
**Issue:** `UploadPost` 는 `RootStackParamList` 에 `{ postId?: string; draftId?: string } | undefined` 로 정의되어 있어 인자 없이 `navigation.navigate('UploadPost')` 가 **이미 type-safe** 하다. `as any` cast 는 불필요. CLAUDE.md 의 "no any" 규칙 위반.

**Fix:**
```ts
onPress={() => navigation.navigate('UploadPost')}  // 'as any' 제거
```

동일하게 `CheerleaderProfileScreen.tsx:194` 의 `name={tab.icon as any}` 도 `TABS` 배열 `icon` 필드 타입을 `keyof typeof Ionicons.glyphMap` 로 바꾸면 제거 가능.

---

## Appendix: Tests Review

`app/src/utils/__tests__/photographerGrade.test.ts` (7 tests), `GradeBadge.helpers.test.ts` (10), `UploadPostScreen.validateVideoAsset.test.ts` (7), `StudioScreen.state.test.tsx` (6) 모두 pure helper 대상으로 잘 설계됨. render test 는 `@testing-library/react-native` 부재로 skip — 주석 에 명시.

소소한 피드백:
- `UploadPostScreen.validateVideoAsset.test.ts` 의 "Android filesize lowercase fallback" case 가 `fileSize: null, filesize: 60MB` 로 too_large 를 검증. 반대로 `filesize` 정상 + `fileSize: null` 의 passing case 도 넣으면 symmetry 가 좋음.
- `StudioScreen.state.test.tsx` 의 Test 5 (approved + photographer null → pending) 는 race edge case 명시적 — 매우 좋음. 여기에 `photographerResult.error` 가 있는 경우 (트리거가 아직 안 돌았는데 RLS 에 의해 403) 도 커버하면 좋겠다.

---

_Reviewed: 2026-04-15T12:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
