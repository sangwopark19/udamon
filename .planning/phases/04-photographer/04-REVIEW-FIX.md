---
phase: 04-photographer
fixed_at: 2026-04-23T00:00:00Z
review_path: .planning/phases/04-photographer/04-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-04-23T00:00:00Z
**Source review:** .planning/phases/04-photographer/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (0 Critical + 6 Warning, Info out of scope)
- Fixed: 6
- Skipped: 0

## Fixed Issues

### WR-06: generate-thumbnails fetches arbitrary imageUrls without allowlisting R2 public URL

**Files modified:** `supabase/functions/generate-thumbnails/index.ts`
**Commit:** 1e90e70
**Applied fix:** Added allowlist check before each `fetch(imageUrl)`. Every `imageUrl` must start with `${R2_PUBLIC_URL}/photo-posts/${ownerUserId}/`, and after `new URL(imageUrl).pathname` normalisation, the derived path must also begin with `/photo-posts/${ownerUserId}/`. URLs failing either check are pushed into `failures` and skipped. Closes SSRF-adjacent + cross-owner thumbnail write vector.

### WR-01: uploadPostImages / uploadCommunityImages / uploadAvatar hardcode image/jpeg content type

**Files modified:** `app/src/services/r2Upload.ts`
**Commit:** 65f7cdf
**Applied fix:** Introduced `ALLOWED_IMAGE_MIME = ['image/jpeg','image/png','image/webp']` allowlist with a `isAllowedImageMime` type guard. `uploadPostImages` and `uploadCommunityImages` now accept an optional `contentTypes?: string[]` (defaults to all `image/jpeg` — preserving current callers' behaviour since `optimizeImage` outputs JPEG). `uploadAvatar` accepts a `contentType: string = 'image/jpeg'` param. Each per-asset content type is validated against the allowlist and threaded into both the presigned URL request and the PUT header, closing the client/server asymmetry with `uploadPostVideos`. Unused `userId` parameter also renamed to `_userId` for consistency (IN-03 partial).

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
**Applied fix:** Standardised all 5 viewport-aware surfaces on id-based tracking (matching the already-id-based featured carousel in HomeScreen). Each handler now collects `(vt.item as { id: string }).id` into a `Set<string>` (`visibleIds`) instead of numeric indices. Each `renderItem` checks `visibleIds.has(post.id)` instead of `visibleIndices.has(index)`. `useRef(handler).current` pattern retained (FlatList rejects identity changes). Added inline comment explaining the `useRef` constraint + stale-closure risk for future refactors. Verified `visibleIndices`/`setVisibleIndices` are no longer referenced anywhere in `app/src`.

## Verification

- `npx tsc --noEmit` (app/) — clean after each fix
- `npx jest src/screens/photographer/__tests__/` — 13 tests pass
- `grep visibleIndices app/src` — 0 matches post-WR-05

---

_Fixed: 2026-04-23T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
