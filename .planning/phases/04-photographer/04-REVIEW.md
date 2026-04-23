---
phase: 04-photographer
reviewed: 2026-04-23T00:00:00Z
depth: standard
files_reviewed: 58
files_reviewed_list:
  - app/App.tsx
  - app/app.json
  - app/jest.config.js
  - app/package.json
  - app/src/components/common/VideoPlayer.tsx
  - app/src/components/photographer/GradeBadge.tsx
  - app/src/components/photographer/__tests__/GradeBadge.helpers.test.ts
  - app/src/components/shared/BottomTabBar.tsx
  - app/src/constants/colors.ts
  - app/src/contexts/AdminContext.tsx
  - app/src/contexts/PhotographerContext.tsx
  - app/src/hooks/useLoginGate.ts
  - app/src/i18n/locales/ko.ts
  - app/src/navigation/MainTabNavigator.tsx
  - app/src/navigation/navigationRef.ts
  - app/src/screens/archive/ArchiveScreen.tsx
  - app/src/screens/cheerleader/CheerleaderProfileScreen.tsx
  - app/src/screens/cheerleader/CheerleadersAllScreen.tsx
  - app/src/screens/explore/ExploreScreen.tsx
  - app/src/screens/explore/PostDetailScreen.tsx
  - app/src/screens/home/AllPostsScreen.tsx
  - app/src/screens/home/FeaturedAllScreen.tsx
  - app/src/screens/home/HomeScreen.tsx
  - app/src/screens/home/PopularPhotographersScreen.tsx
  - app/src/screens/photographer/CollectionDetailScreen.tsx
  - app/src/screens/photographer/PhotographerProfileScreen.tsx
  - app/src/screens/photographer/PhotographerRegisterScreen.tsx
  - app/src/screens/photographer/StudioScreen.tsx
  - app/src/screens/photographer/UploadPostScreen.tsx
  - app/src/screens/photographer/__tests__/StudioScreen.state.test.tsx
  - app/src/screens/photographer/__tests__/UploadPostScreen.validateVideoAsset.test.ts
  - app/src/screens/photographer/studioState.ts
  - app/src/screens/social/FollowingListScreen.tsx
  - app/src/services/photographerApi.ts
  - app/src/services/r2Upload.ts
  - app/src/types/cheerleader.ts
  - app/src/types/navigation.ts
  - app/src/types/photographer.ts
  - app/src/types/photographerApplication.ts
  - app/src/utils/__tests__/photographerGrade.test.ts
  - app/src/utils/photographerGrade.ts
  - app/src/utils/videoValidation.ts
  - docs/dev-environment-setup.md
  - docs/phase4-qa-matrix.md
  - supabase/config.toml
  - supabase/functions/generate-thumbnails/deno.json
  - supabase/functions/generate-thumbnails/index.ts
  - supabase/functions/get-upload-url/index.ts
  - supabase/migrations/029_photo_posts_videos.sql
  - supabase/migrations/030_photographer_approval_trigger.sql
  - supabase/migrations/031_photographer_apps_extend.sql
  - supabase/migrations/032_photo_posts_thumbnails.sql
  - supabase/migrations/033_photographer_apps_unique_pending.sql
  - supabase/tests/photo-posts-images-1-7-check.sql
  - supabase/tests/photo-posts-thumbnails.sql
  - supabase/tests/photo-posts-videos-check.sql
  - supabase/tests/photographer-approval-trigger.sql
  - supabase/tests/photographer-apps-extend.sql
  - supabase/tests/photographer-apps-unique-pending.sql
findings:
  critical: 0
  warning: 6
  info: 11
  total: 17
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-23T00:00:00Z
**Depth:** standard
**Files Reviewed:** 58
**Status:** issues_found

## Summary

Phase 04 delivers a substantial body of work: photographer application/approval workflow, video upload (video-first), Studio screen with a clean pure-function state machine, grade badges, viewport-aware video autoplay across five feed surfaces, five Supabase migrations, and an Edge Function for R2 presigned uploads plus a thumbnail generator.

Overall quality is high. Security-sensitive surfaces are handled carefully:

- `get-upload-url` performs JWT verification via `supabase.auth.getUser(token)` inside the function body (since `verify_jwt = false` in `supabase/config.toml` per the Phase 3 03-04 ES256 rotation workaround), scopes the R2 object key to `${prefix}/${userId}/...` so users cannot overwrite each other's content, enforces an allowlist of content types per prefix, and caps file counts.
- `generate-thumbnails` additionally performs an owner check (`photo_posts → photographers.user_id === token.user.id`) before writing thumbnails, closing T-4-05.
- The approval trigger uses `SECURITY DEFINER SET search_path = ''`, `ON CONFLICT DO NOTHING` for idempotency, and only touches `users.is_photographer` (ADJ-01) rather than `users.role`.
- Partial unique index on `photographer_applications(user_id) WHERE status='pending'` correctly enforces T-4-01/HI-03 while preserving history.
- The `validateVideoAsset` utility cleanly mitigates T-4-02 (size cap) and T-4-06 (iOS `.mov` MIME fallback) and is well unit-tested.

Findings are all Warning or Info; no Critical issues were identified. The highest-impact items are:

1. `r2Upload.uploadPostImages` hardcodes `image/jpeg` as the presigned Content-Type AND the PUT header even though the Edge Function allowlist permits `png`/`webp` — any non-JPEG input may be silently mislabeled or rejected by R2 with a `SignatureDoesNotMatch`-style error depending on how the optimiser normalises the asset (WR-1).
2. `PhotographerContext.refreshData` swallows errors silently; a fetch failure during initial load leaves the UI in an empty state with no surfaced error (WR-2).
3. Several FlatList/`onViewableItemsChanged` handlers use `.useRef().current` on the handler but lose per-render closure over state — this is fine for the current handlers (they only use setState) but the pattern is fragile and documented inconsistently (see WR-5).
4. `generate-thumbnails` does not validate that the submitted `imageUrls` actually belong to the post or come from the R2 public URL (see WR-6). Mitigated by the owner check on `postId`, but the function will still fetch any arbitrary URL the caller provides and upload the result to R2 under the post's key space.

## Warnings

### WR-01: uploadPostImages / uploadCommunityImages / uploadAvatar hardcode image/jpeg content type

**File:** `app/src/services/r2Upload.ts:63-88` (and 122-147, 149-168)
**Issue:** Both the presigned URL request (`getPresignedUrls(..., 'image/jpeg', ...)`) and the `PUT` header (`'Content-Type': 'image/jpeg'`) are hardcoded to `image/jpeg`. Client code (`UploadPostScreen`) uses `optimizeImage` which produces JPEG in practice, but:

1. The Edge Function allowlist for `photo-posts` includes `image/jpeg`, `image/png`, `image/webp` (`get-upload-url/index.ts:6-12`) — the client chose the narrowest subset but gave up the ability to upload PNG/WebP without a spec change.
2. If `optimizeImage` ever produces a non-JPEG (e.g. PNG with transparency preservation), the file's actual bytes will be uploaded with a presigned URL bound to `image/jpeg`, and the resulting object will be served with the wrong `Content-Type`, breaking image decoding on some clients.
3. For `videos` the contract is correct: the client threads `contentType` through `uploadPostVideos` (line 93-120).

**Fix:** Make images symmetrical with videos — accept a `contentTypes: string[]` (or infer from local URI extension / `optimizeImage` output) and validate against `ALLOWED_VIDEO_MIME`-style allowlist for images.

```ts
export async function uploadPostImages(
  _userId: string,
  localUris: string[],
  accessToken: string,
  contentTypes: string[] = localUris.map(() => 'image/jpeg'),
): Promise<UploadResult> {
  try {
    if (contentTypes.length !== localUris.length) {
      return { data: null, error: 'contentTypes length must match localUris length' };
    }
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const;
    const publicUrls: string[] = [];
    for (let i = 0; i < localUris.length; i++) {
      const ct = contentTypes[i];
      if (!ALLOWED.includes(ct as typeof ALLOWED[number])) {
        return { data: null, error: `Unsupported image mime: ${ct}` };
      }
      const { uploads } = await getPresignedUrls(accessToken, 'photo-posts', ct, 1);
      await putToR2(uploads[0].uploadUrl, localUris[i], ct);
      publicUrls.push(uploads[0].publicUrl);
    }
    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}
```

If the short-term intent is truly JPEG-only, document it explicitly and assert that `optimizeImage` always produces JPEG (e.g. return `{ uri, mimeType: 'image/jpeg' }` from the optimiser and assert at call site).

### WR-02: PhotographerContext.refreshData swallows all errors silently

**File:** `app/src/contexts/PhotographerContext.tsx:191-240`
**Issue:** The initial data load wraps seven parallel fetches in `try { ... } finally { setLoading(false); }` with no `catch`. If any of the seven `fetch*` calls rejects (e.g. `ensureSlugMaps` fails, or `fetchPhotoPosts` throws), the error propagates to the `void refreshData()` call in `useEffect` (line 243) and is dropped. The user sees an empty feed with no retry mechanism and no logged reason.

Individual API functions do already convert errors into `{ data: null, error: string }` tuples — but the context only reads `.data` and ignores `.error`, so partial failures (e.g. cheerleaders load fails but photographers succeed) leave no trace.

**Fix:** Log per-result errors for observability, and expose a top-level error state that screens can surface:

```ts
const refreshData = useCallback(async () => {
  setLoading(true);
  try {
    const results = await Promise.all([
      photographerApi.fetchPhotographers(),
      photographerApi.fetchPhotoPosts({ page: 0, pageSize: PAGE_SIZE }),
      // ...
    ]);
    results.forEach((r, i) => {
      if (r.error) console.warn(`[PhotographerContext] fetch[${i}] error`, r.error);
    });
    const [photographersRes, postsRes, /* ... */] = results;
    if (photographersRes.data) setPhotographers(photographersRes.data);
    // ...
  } catch (e) {
    console.error('[PhotographerContext] refreshData unhandled', e);
  } finally {
    setLoading(false);
  }
}, [userId]);
```

Consider also setting a `loadError` state so `HomeScreen` / `ExploreScreen` can offer a retry CTA instead of rendering empty lists.

### WR-03: StudioScreen effect re-runs on every myApplication identity change, doubling photographer fetches

**File:** `app/src/screens/photographer/StudioScreen.tsx:74-103`
**Issue:** The effect depends on `myApplication` (the object reference). `PhotographerContext.refreshMyApplication` calls `setMyApplication(res.data)` which produces a new object reference on every refresh, even when data is unchanged. This re-triggers the fetch of `fetchPhotographerByUserId` (line 90) every time the Studio tab re-mounts OR the Context re-fetches — wasting a round-trip.

The `cancelled` guard on lines 85-102 is correct and prevents state-update-after-unmount. The issue is cost, not correctness.

**Fix:** Depend on the stable primitive (`myApplication?.status`) instead of the whole object:

```ts
}, [user?.id, overridePhotographerId, myApplication?.status, applicationLoading]);
```

Alternatively cache `fetchPhotographerByUserId` by user_id inside `photographerApi`, or move the photographer fetch into `PhotographerContext.refreshData` so it uses the existing `photographers` array.

### WR-04: getCollectionPosts bypasses the `collections` state — stale postIds and unnecessary round-trips

**File:** `app/src/contexts/PhotographerContext.tsx:489-496`; `app/src/screens/photographer/CollectionDetailScreen.tsx:52-68`
**Issue:** `getCollectionPosts` always issues a new Supabase query (`fetchCollectionPosts`) even though `collections` already holds `postIds` and `photoPosts` already holds the posts. The server round-trip is not cached, which means:

1. Every entry into `CollectionDetailScreen` re-hits the DB.
2. If the user creates a post inside a collection (`addPostToCollection`), the local `collections` state is updated optimistically but `CollectionDetailScreen` re-fetches and may race with the not-yet-committed INSERT.
3. The `EmptyState` with "retry" button calls `load()` which does the same fetch again — correct.

**Fix:** Either (a) make `getCollectionPosts` synchronous and derive from local state (`collections.find(c => c.id === id)?.postIds.map(getPhotoPost)`), or (b) add a TTL cache keyed by `collectionId`.

If the async call is needed because `photo_posts` may be paginated and not yet loaded, document that clearly. Currently both paths are possible and the implementation doesn't choose.

### WR-05: onViewableItemsChanged handlers use useRef().current without explicit stability warning

**File:** `app/src/screens/home/HomeScreen.tsx:66-86`; `app/src/screens/home/AllPostsScreen.tsx:44-52`; `app/src/screens/home/FeaturedAllScreen.tsx:43-50`; `app/src/screens/photographer/PhotographerProfileScreen.tsx:85-92`; `app/src/screens/archive/ArchiveScreen.tsx:52-61`
**Issue:** All five viewport-aware autoplay surfaces use the pattern:

```ts
const onViewableItemsChanged = useRef(({ viewableItems }) => {
  const indices = new Set<number>();
  viewableItems.forEach((vt) => {
    if (typeof vt.index === 'number') indices.add(vt.index);
  });
  setVisibleIndices(indices);
}).current;
const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
```

This is the correct React Native idiom (FlatList throws `Changing onViewableItemsChanged on the fly is not supported` if the handler identity changes). However:

1. The handler captures `setVisibleIndices` from the first render — this works because `setState` is stable, but a future refactor that captures props or local state will silently break (state inside the handler will be stale).
2. `HomeScreen` keeps two parallel systems (`onViewableItemsChanged` by index for trending grid, `onFeaturedViewableItemsChanged` by id for featured carousel). The inconsistency — index-based vs id-based — is a latent bug: if the trending list data changes (e.g. optimistic `addPhotoPost` prepends), `visibleIndices` no longer refers to the originally-visible items. The id-based approach (featured) is more robust.

**Fix:** Standardise on id-based tracking across all five surfaces. The trending grid's `keyExtractor` already yields `item.id`, so switching is mechanical. Add a comment explaining why `useRef` is required.

### WR-06: generate-thumbnails fetches arbitrary imageUrls without allowlisting R2 public URL

**File:** `supabase/functions/generate-thumbnails/index.ts:106-173`
**Issue:** After the owner check passes, the function calls `fetch(imageUrl)` for each item in the client-supplied `imageUrls` array (line 133). It then uses `new URL(imageUrl).pathname` as the R2 key for the thumbnail (line 155). There is no check that `imageUrl` starts with `R2_PUBLIC_URL`. Concrete risks:

1. An authenticated user who owns a post can pass `imageUrls: ["https://attacker.example/huge.jpg"]` and the edge function will fetch it and place the derived thumbnail under `${post.id}/<path from attacker URL>_thumb.jpg` in R2 — consuming R2 bandwidth + storage and potentially allowing content to be hosted via the project's R2 public URL (cache-poisoning / blocklist-bypass vector).
2. A very large remote image can exhaust the function's memory (the code holds `buf` and `outBytes` in memory for each image).
3. Because the `key` is derived from the URL path only, a malicious URL with `..` path components could write thumbnails outside the expected post prefix. `new URL().pathname` normalises most of this but does not strip leading `/` elements that overlap with other buckets' prefixes.

**Fix:** Validate that every `imageUrl` starts with `R2_PUBLIC_URL`, and that the derived key remains under `photo-posts/<ownerUserId>/`:

```ts
for (const imageUrl of imageUrls) {
  if (!imageUrl.startsWith(`${R2_PUBLIC_URL}/photo-posts/${ownerUserId}/`)) {
    failures.push(imageUrl);
    continue;
  }
  // ... existing download + resize logic
}
```

Also consider server-side matching against `photo_posts.images` to ensure every URL is actually attached to the post row.

## Info

### IN-01: AdminContext has two no-op stubs logged via console.warn

**File:** `app/src/contexts/AdminContext.tsx:57-64`
**Issue:** `updatePostStatus` and `updatePhotographerVerification` are explicitly TODO-stubs for Phase 5. They are still wired into `approvePost` / `rejectPost` / `approvePhotographer` / `rejectPhotographer` callbacks, producing a misleading success UI flow while silently no-op'ing the DB state.
**Fix:** Disable or grey out the admin actions in the UI until Phase 5 adminApi ships, or surface a toast when the stubs are called so testers don't report "the approve button does nothing" as a bug.

### IN-02: console.log in production path (App.tsx AppNavigator resetRoot)

**File:** `app/App.tsx:197`
**Issue:** `console.log('[AppNavigator] resetRoot →', route);` ships to production. The comment says "TODO: remove after stabilization" but the gate has not been removed.
**Fix:** Guard behind `__DEV__` or remove entirely before the v1 launch.

### IN-03: r2Upload exported functions accept unused userId parameter

**File:** `app/src/services/r2Upload.ts:63, 93, 122, 149`
**Issue:** `uploadPostImages(userId, ...)`, `uploadPostVideos(userId, ...)`, `uploadCommunityImages(userId, ...)`, `uploadAvatar(userId, ...)` all accept a `userId` argument that is never used inside the function body. The actual userId scoping happens server-side via JWT.
**Fix:** Drop the parameter or prefix it with `_userId` and document that it's for call-site clarity only.

### IN-04: i18n keys defined but never read

**File:** `app/src/i18n/locales/ko.ts:872-875`
**Issue:** `grade_tier_bronze`, `grade_tier_silver`, `grade_tier_gold`, `grade_tier_diamond` are defined but `GradeBadge` uses the hardcoded Korean `info.label` returned from `gradeToBadge` (`app/src/utils/photographerGrade.ts:29-37`). This duplicates localized strings in two places — future English i18n will need to update both.
**Fix:** Either remove the i18n keys or switch `GradeBadge` to `t(grade_tier_${info.tier})` so the source of truth is ko.ts.

### IN-05: Duplicate `applinks:udamonfan.com` entry in iOS associatedDomains

**File:** `app/app.json:22-25`
**Issue:** The `associatedDomains` array lists `"applinks:udamonfan.com"` twice.
**Fix:** Deduplicate. No functional impact, but clutters the Apple-signed entitlements file.

### IN-06: Duplicate Studio entry in RootStackParamList

**File:** `app/src/types/navigation.ts:14-36`
**Issue:** `Studio: { photographerId?: string } | undefined` is declared both in `MainTabParamList` (line 8) and `RootStackParamList` (line 36). The type still compiles because both shapes are identical, but the root-level duplicate is dead (Studio is registered as a tab screen in `MainTabNavigator`, not as a root stack screen — see `App.tsx:244` where a *different* StudioScreen is registered as a root stack route for deep navigation). The mental model is muddled.
**Fix:** Remove the duplicate from `RootStackParamList` unless Studio is intentionally reachable via root stack navigation (which `App.tsx` line 244 suggests it is); if so, add a comment clarifying "both routes intentional — tab + root stack for goBack()".

### IN-07: BottomTabBar AnimatedTab useEffect missing scale ref dependency

**File:** `app/src/components/shared/BottomTabBar.tsx:42-50`
**Issue:** The effect reads `scale` from useRef but declares only `[isFocused]` in its deps array. `scale` is a stable ref so this is fine in practice, but the exhaustive-deps lint rule (if enabled) would flag it. Also `prevFocused.current = isFocused;` runs on every `isFocused` change regardless of animation path — consider using `useEffect(..., [isFocused])` explicitly with a ref-based prev.
**Fix:** Add `scale` to deps (safe because it's a stable ref), or extract the animation into a `useCallback` that's triggered from a focus-change observer. Consider adding an eslint config — none is currently present in either package (observed from CLAUDE.md project conventions).

### IN-08: CheerleaderProfileScreen renders image only, never VideoPlayer for video posts

**File:** `app/src/screens/cheerleader/CheerleaderProfileScreen.tsx:229-257`
**Issue:** The post grid renders `<Image source={{ uri: post.images[0] }} />` without checking `post.videos.length` or `post.thumbnail_urls`. This is inconsistent with the other five feed surfaces (HomeScreen, AllPostsScreen, FeaturedAllScreen, PhotographerProfileScreen, ArchiveScreen) that all implement video-first rendering. For video-only posts, `post.images[0]` will be `undefined` and the Image component will render a blank tile.
**Fix:** Apply the same pattern used elsewhere:

```tsx
const previewUri = post.thumbnail_urls?.[0] ?? post.images[0];
const hasVideo = (post.videos?.length ?? 0) > 0;
// then render VideoPlayer(feed) / Image / fallback placeholder
```

### IN-09: ExploreScreen hot cards and list items also render Image without video fallback

**File:** `app/src/screens/explore/ExploreScreen.tsx:120, 167`
**Issue:** Same as IN-08 — `renderHotCard` uses `<Image source={{ uri: post.images[0] }} />` and `renderListItem` uses `<Image source={{ uri: post.images[0] }} />` without video fallback. Video-only posts will show blank thumbnails.
**Fix:** Apply the video-first pattern or at minimum use `post.thumbnail_urls?.[0] ?? post.images[0]`.

### IN-10: PhotographerProfileScreen uses `post.images[0]` for featured card with no video fallback

**File:** `app/src/screens/photographer/PhotographerProfileScreen.tsx:371`
**Issue:** The featured post card renders `<Image source={{ uri: featuredPost.images[0] }} />`. If `featuredPost` is a video-only post, this will show blank. The rest of this screen (post grid at line 472-497) correctly handles video-first, so the featured card inconsistency stands out.
**Fix:** Add the same `thumbnail_urls` / `VideoPlayer` branch, or fall back to `thumbnail_urls[0]`.

### IN-11: StudioScreen uses `void refreshMyApplication;` to silence unused warning

**File:** `app/src/screens/photographer/StudioScreen.tsx:63-64`
**Issue:** The code destructures `refreshMyApplication` from the Context but never invokes it, then references `void refreshMyApplication;` to silence the lint warning. The comment says "후속 pull-to-refresh 등에서 사용 예정". This is a code smell — either wire it up (pull-to-refresh would be a small addition on the `StudioApprovedLayout`'s ScrollView) or remove the destructure until needed.
**Fix:** Either add a `RefreshControl` that calls `refreshMyApplication`, or remove the destructure and the `void` statement.

---

_Reviewed: 2026-04-23T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
