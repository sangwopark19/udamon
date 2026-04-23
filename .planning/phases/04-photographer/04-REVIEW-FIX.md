---
phase: 04-photographer
fixed_at: 2026-04-23T00:00:00Z
review_path: .planning/phases/04-photographer/04-REVIEW.md
iteration: 2
findings_in_scope: 17
fixed: 17
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-04-23T00:00:00Z
**Source review:** .planning/phases/04-photographer/04-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 17 (0 Critical + 6 Warning + 11 Info)
- Fixed: 17 (6 Warning in iteration 1 + 11 Info in iteration 2)
- Skipped: 0

## Fixed Issues

### WR-06: generate-thumbnails fetches arbitrary imageUrls without allowlisting R2 public URL

**Files modified:** `supabase/functions/generate-thumbnails/index.ts`
**Commit:** 1e90e70
**Applied fix:** Added allowlist check before each `fetch(imageUrl)`. Every `imageUrl` must start with `${R2_PUBLIC_URL}/photo-posts/${ownerUserId}/`, and after `new URL(imageUrl).pathname` normalisation, the derived path must also begin with `/photo-posts/${ownerUserId}/`. URLs failing either check are pushed into `failures` and skipped. Closes SSRF-adjacent + cross-owner thumbnail write vector.

### WR-01: uploadPostImages / uploadCommunityImages / uploadAvatar hardcode image/jpeg content type

**Files modified:** `app/src/services/r2Upload.ts`
**Commit:** 65f7cdf
**Applied fix:** Introduced `ALLOWED_IMAGE_MIME = ['image/jpeg','image/png','image/webp']` allowlist with a `isAllowedImageMime` type guard. `uploadPostImages` and `uploadCommunityImages` now accept an optional `contentTypes?: string[]` (defaults to all `image/jpeg` — preserving current callers' behaviour since `optimizeImage` outputs JPEG). `uploadAvatar` accepts a `contentType: string = 'image/jpeg'` param. Each per-asset content type is validated against the allowlist and threaded into both the presigned URL request and the PUT header, closing the client/server asymmetry with `uploadPostVideos`.

### WR-02: PhotographerContext.refreshData swallows all errors silently

**Files modified:** `app/src/contexts/PhotographerContext.tsx`
**Commit:** a51f8a2
**Applied fix:** Added a `results.forEach` pass after `Promise.all` that logs `console.warn` per-fetch error with a labelled tag (`photographers`, `photoPosts`, etc.) so partial failures are visible. Added `console.warn` for the secondary `likes`/`follows` `Promise.all`. Wrapped the whole body in a top-level `try/catch` that logs unhandled rejections with `[PhotographerContext] refreshData unhandled` before letting `finally` reset `loading`.

### WR-03: StudioScreen effect re-runs on every myApplication identity change

**Files modified:** `app/src/screens/photographer/StudioScreen.tsx`
**Commit:** 2599542
**Applied fix:** Narrowed the effect's dependency array from `myApplication` (object reference) to `myApplication?.status` (stable primitive). Eliminates redundant `fetchPhotographerByUserId` round-trips when `refreshMyApplication` returns the same logical state with a new object reference. Behaviour is preserved: the effect's only branching signal on `myApplication` is `status === 'approved'`.

### WR-04: getCollectionPosts bypasses the `collections` state — stale postIds and unnecessary round-trips

**Files modified:** `app/src/contexts/PhotographerContext.tsx`
**Commit:** 78deb5d
**Applied fix:** Rewrote `getCollectionPosts` to try the local cache first: iterate `collections[collectionId].postIds`, look each up in `photoPosts`. If every postId is present locally, return the derived list synchronously (still inside the `async` wrapper). If any postId is missing (photoPosts is paginated — first PAGE_SIZE only initially), fall back to `photographerApi.fetchCollectionPosts`. Added `collections` and `photoPosts` to the `useCallback` deps so the closure stays fresh when optimistic updates mutate either.

*Note: This is a correctness/perf fix with implicit behaviour change — when local cache hits, the function no longer talks to Supabase, which means optimistic state in `collections` wins over server state until `refreshData()` is called. Requires human verification that this is the intended semantics for CollectionDetailScreen.*

### WR-05: onViewableItemsChanged handlers mix index-based and id-based tracking

**Files modified:** `app/src/screens/home/HomeScreen.tsx`, `app/src/screens/home/AllPostsScreen.tsx`, `app/src/screens/home/FeaturedAllScreen.tsx`, `app/src/screens/photographer/PhotographerProfileScreen.tsx`, `app/src/screens/archive/ArchiveScreen.tsx`
**Commit:** 7ca15f7
**Applied fix:** Standardised all 5 viewport-aware surfaces on id-based tracking (matching the already-id-based featured carousel in HomeScreen). Each handler now collects `(vt.item as { id: string }).id` into a `Set<string>` (`visibleIds`) instead of numeric indices. Each `renderItem` checks `visibleIds.has(post.id)` instead of `visibleIndices.has(index)`. `useRef(handler).current` pattern retained (FlatList rejects identity changes). Added inline comment explaining the `useRef` constraint + stale-closure risk for future refactors.

### IN-01: AdminContext stub actions produce misleading success UX

**Files modified:** `app/src/contexts/AdminContext.tsx`
**Commit:** 5066cbd
**Applied fix:** Imported `useToast` and wrapped `updatePostStatus`/`updatePhotographerVerification` in `useCallback` with a `showToast('Phase 5 대기 중 — 실제 DB 반영되지 않습니다', 'info')` call alongside the existing `console.warn`. Testers/QA now see a visible banner that the approve/reject action was a no-op, instead of misleading "success" state. `ToastProvider` wraps `AdminProvider` in `App.tsx:285-315`, confirming the hook is available.

### IN-02: console.log in production path (App.tsx AppNavigator resetRoot)

**Files modified:** `app/App.tsx`
**Commit:** 5cf83b9
**Applied fix:** Changed `console.log('[AppNavigator] resetRoot →', route); // TODO: remove after stabilization` → `if (__DEV__) console.log('[AppNavigator] resetRoot →', route);`. The log is still available during development/Expo Go but is stripped in production bundles by Metro's `__DEV__` constant.

### IN-03: r2Upload exported functions accept unused userId parameter

**Files modified:** `app/src/services/r2Upload.ts`, `app/src/screens/photographer/UploadPostScreen.tsx`, `app/src/screens/community/CommunityWriteScreen.tsx`
**Commit:** cc2cba1
**Applied fix:** Removed the leading `userId: string` parameter from `uploadPostImages`, `uploadPostVideos`, `uploadCommunityImages`, and `uploadAvatar`. The actual userId scoping happens server-side via JWT inside `get-upload-url`, so the client-side param was dead. Updated both call sites: `UploadPostScreen.tsx` (2 calls — images + videos) and `CommunityWriteScreen.tsx` (1 call) to drop the `user.id` argument. `uploadAvatar` has no callers currently, so only signature updated.

### IN-04: GradeBadge uses hardcoded Korean label instead of i18n keys

**Files modified:** `app/src/components/photographer/GradeBadge.tsx`
**Commit:** 54bfb75
**Applied fix:** Computed `tierLabel = t(\`grade_tier_${info.tier}\`)` using the existing `grade_tier_bronze`/`silver`/`gold`/`diamond` keys from `ko.ts:872-875`. Replaced all three `info.label` UI references (icon a11yLabel, pill a11yLabel, pill Text) with `tierLabel`. `photographerGrade.ts` still keeps `info.label` as internal identifier for testing, but UI rendering now has single i18n source of truth — future English rollout updates only `en.ts`. GradeBadge helper tests (10) still pass.

### IN-05: Duplicate `applinks:udamonfan.com` entry in iOS associatedDomains

**Files modified:** `app/app.json`
**Commit:** e405508
**Applied fix:** Removed the duplicate `"applinks:udamonfan.com"` from the `ios.associatedDomains` array (lines 22-25). Array now has single entry. Validated JSON syntax with `JSON.parse`.

### IN-06: Duplicate Studio entry in RootStackParamList

**Files modified:** `app/src/types/navigation.ts`
**Commit:** 7a229ca
**Applied fix:** Per reviewer note that `App.tsx:244` registers Studio as a root stack route for deep navigation (goBack), the duplication is INTENTIONAL. Added a Korean comment explaining the dual registration: "MainTabParamList 에도 선언됨 — 의도된 이중 등록. 탭(bottom tab)에서 진입하는 일반 경로와, 딥 링크/다른 photographer 프로필에서 root stack 으로 push 후 goBack() 으로 돌아오는 경로 (App.tsx:244 에 등록) 둘 다 지원." Removes the mental-model confusion without breaking the navigation semantics.

### IN-07: BottomTabBar AnimatedTab useEffect missing scale ref dependency

**Files modified:** `app/src/components/shared/BottomTabBar.tsx`
**Commit:** 4230aa1
**Applied fix:** Added `scale` to the effect's dependency array: `}, [isFocused, scale]);`. `scale` is a stable `useRef(new Animated.Value(1)).current` reference so this is safe — the effect will only re-run when `isFocused` changes. Added a Korean comment explaining the ref stability rationale for future exhaustive-deps lint adoption.

### IN-08: CheerleaderProfileScreen renders image only, never VideoPlayer for video posts

**Files modified:** `app/src/screens/cheerleader/CheerleaderProfileScreen.tsx`
**Commit:** 7eacd60
**Applied fix:** Imported `VideoPlayer`. Rewrote the post grid render block to:
1. Compute `previewUri = post.thumbnail_urls?.[0] ?? post.images[0]`.
2. Compute `hasVideo = (post.videos?.length ?? 0) > 0` and `videoUri = post.videos?.[0]`.
3. Render `<Image>` when previewUri present; else render `<VideoPlayer mode="studio" />` (first-frame poster, no autoplay — ScrollView parent has no viewability tracking); else render a grey placeholder `<View>`.
4. Added a `videoPlayOverlay` (play icon) rendered over the preview when `hasVideo`.
Added `videoPlayOverlay` StyleSheet entry. Matches the StudioScreen poster fallback pattern established in Plan 04-10 Sub-issue B.

### IN-09: ExploreScreen hot cards and list items also render Image without video fallback

**Files modified:** `app/src/screens/explore/ExploreScreen.tsx`
**Commit:** 57433ec
**Applied fix:** Imported `VideoPlayer`. Applied the same `previewUri + hasVideo + videoUri` destructure in both `renderHotCard` and `renderListItem`. Video-only posts now show the first frame via `mode="studio"` VideoPlayer (ExploreScreen is ScrollView-based — no viewport autoplay) instead of a blank tile. Added `hotVideoBadge` and `listVideoBadge` style entries for the play-icon overlay. Grey placeholder `<View>` kept as last-resort fallback.

### IN-10: PhotographerProfileScreen featured card renders post.images[0] with no video fallback

**Files modified:** `app/src/screens/photographer/PhotographerProfileScreen.tsx`
**Commit:** d1001d0
**Applied fix:** Wrapped the featured-post block in an IIFE to compute local variables once: `featuredPreviewUri`, `featuredHasVideo`, `featuredVideoUri`, plus numeric `FEATURED_WIDTH = SCREEN_WIDTH - 32` and `FEATURED_HEIGHT = 220` (sectionWrap paddingHorizontal=16). VideoPlayer studio mode gets those dimensions. Play-icon overlay `featuredVideoBadge` renders when `featuredHasVideo`. Consistent with IN-08/IN-09 pattern and with the already-correct post grid on the same screen (uses `feed` mode for autoplay via FlatList).

### IN-11: StudioScreen uses void refreshMyApplication to silence unused warning

**Files modified:** `app/src/screens/photographer/StudioScreen.tsx`
**Commit:** 8ce7e1a
**Applied fix:** Removed `refreshMyApplication` from the `usePhotographer()` destructure (line 54) and removed the `void refreshMyApplication;` statement (lines 62-64). Replaced the prose with a comment: "refreshMyApplication 은 pull-to-refresh 등 후속 기능 도입 시 다시 destructure 해서 사용. 현재 사용처가 없으므로 void 로 silence 하는 대신 destructure 자체를 제거." When pull-to-refresh is added in a future phase, re-destructure and wire into `RefreshControl`. StudioScreen.state.test.tsx (5 tests) still passes.

## Verification

- `npx tsc --noEmit` (app/) — clean after each fix (all 17)
- `npx jest src/screens/photographer/__tests__/` — 13 tests pass (StudioScreen state + UploadPost validateVideoAsset)
- `npx jest src/components/photographer/__tests__/GradeBadge.helpers.test.ts` — 10 tests pass (IN-04 does not regress helper behaviour)
- `node -e "JSON.parse(...)"` app.json — valid JSON after IN-05 dedup
- Pre-existing failures in `src/__tests__/auth/` (17 failures, 3 suites) are unrelated to phase-04 photographer work; failure count identical before and after this pass (verified via `git stash`).

---

_Fixed: 2026-04-23T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
