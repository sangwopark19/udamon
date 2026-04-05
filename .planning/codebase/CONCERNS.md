# Codebase Concerns

**Analysis Date:** 2026-04-05

---

## Tech Debt

### Community feature not connected to Supabase
- Issue: `CommunityContext` is backed entirely by in-memory mock data. All posts, comments, likes, polls, and reports exist only for the session lifetime. There is a full Supabase schema (`community_posts`, `community_comments`, `community_likes`, `community_reports`, `community_polls`) but the context never reads from or writes to it.
- Files: `app/src/contexts/CommunityContext.tsx` (lines 79-86, 236, 380)
- Impact: Community data is lost on every app restart. Reports do not reach the DB. The `refreshPosts()` function is a no-op (explicitly marked `// TODO: Supabase 연결 시 서버에서 새로고침`). The `reportTarget` function never calls Supabase (marked `// TODO: Supabase insert`).
- Fix approach: Wire `CommunityContext` to the Supabase tables that already exist, following the pattern in `PhotographerContext`, which conditionally loads from Supabase when `isSupabaseConfigured` is true.

### Notifications, Messages, and Archive not persisted
- Issue: `NotificationContext`, `MessageContext`, and `ArchiveContext` are all pure in-memory state. There is no backend table for notifications, conversations, messages, or saved/archived posts.
- Files: `app/src/contexts/NotificationContext.tsx`, `app/src/contexts/MessageContext.tsx`, `app/src/contexts/ArchiveContext.tsx`
- Impact: All notification history, messages, and saved posts are wiped on app restart. Messaging is entirely mock (`MESSAGE_FEATURE_ENABLED = false`).
- Fix approach: Create Supabase tables and connect these contexts, or defer until the feature flags are enabled.

### Ticket and Payment system is mock-only
- Issue: `paymentApi.ts` is a simulated payment service with artificial delays and random 5% failure. `TicketContext` stores balance in React state only, with no persistence. Payment history returns an empty array. `SUPPORT_FEATURE_ENABLED = false` gates the UI but the underlying implementation is not real.
- Files: `app/src/services/paymentApi.ts`, `app/src/contexts/TicketContext.tsx`, `app/src/constants/config.ts`
- Impact: The revenue/monetisation feature is non-functional end-to-end. Ticket balance is not persisted across sessions.
- Fix approach: Integrate a real payment provider (Stripe or Toss Payments) and persist balance in the `users` table or a dedicated `ticket_balances` table.

### `users` table is referenced but never defined in migrations
- Issue: `AuthContext` queries and mutates a `users` table (`supabase.from('users').select(...)`, `.update(...)`), but no migration in `supabase/migrations/` creates this table. Supabase auth user data lives in `auth.users`, which is not directly queryable as a public `users` table without an explicit view or table with RLS.
- Files: `app/src/contexts/AuthContext.tsx` (lines 131, 323, 339), `supabase/migrations/` (no `CREATE TABLE users`)
- Impact: On a fresh Supabase project, `fetchUserProfile` will return null for every authenticated user, silently breaking profile loading, admin role checks, and photographer status. The `is_admin`, `admin_role`, `ticket_balance`, and `my_team_id` columns on `UserProfile` have no DB backing.
- Fix approach: Add a migration that creates a `public.users` table (or a view over `auth.users`) with the `UserProfile` columns, a trigger to populate it on `auth.users` INSERT, and RLS policies.

### `photo_posts.status` and `rejection_reason` columns missing from migrations
- Issue: The `PhotoPost` TypeScript type defines `status: 'pending' | 'approved' | 'rejected'` and `rejection_reason?: string | null`, and `mapPhotoPost` reads `row.status` and `row.rejection_reason`. However, neither column exists in `supabase/migrations/007_photographer.sql` — the `photo_posts` table has no `status` column.
- Files: `app/src/types/photographer.ts` (lines 31-32), `app/src/services/photographerApi.ts` (lines 79-80), `supabase/migrations/007_photographer.sql`
- Impact: Newly uploaded posts will have `status: undefined` in remote data, which maps to `row.status ?? 'approved'` via the mapper fallback — so all posts appear approved with no review possible from the real DB. Admin post review workflow is broken for remote data.
- Fix approach: Add `ALTER TABLE photo_posts ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')); ALTER TABLE photo_posts ADD COLUMN rejection_reason TEXT;` as a new migration.

### `cheerleader_id` column missing from `photo_posts` migration
- Issue: `PhotoPost` type and `mapPhotoPost` reference `cheerleader_id`, and the `UploadPostScreen` allows selecting a cheerleader. No migration adds `cheerleader_id` to `photo_posts`. There is also no `cheerleaders` table in any migration — cheerleaders are purely mock data (`app/src/data/mockCheerleaders.ts`).
- Files: `app/src/types/photographer.ts` (line 23), `app/src/services/photographerApi.ts` (line 70), `supabase/migrations/007_photographer.sql`
- Impact: Cheerleader-tagged uploads will silently drop the tag on the DB side. Cheerleader browse/filter will never work with real data.
- Fix approach: Create a `cheerleaders` migration, add `cheerleader_id UUID REFERENCES cheerleaders(id)` to `photo_posts`, and seed the cheerleader data.

### Hardcoded test accounts with known passwords in production bundle
- Issue: `AuthContext` contains three hardcoded accounts (`test@udamon.com`, `test2@udamon.com`, `admin@udamon.com`) with plaintext passwords (`test1234`, `admin1234`). These bypass Supabase auth entirely and are persisted to `AsyncStorage`. The admin account grants `is_admin: true` and `admin_role: 'super_admin'` without any server-side check.
- Files: `app/src/contexts/AuthContext.tsx` (lines 57-112, 278-288)
- Impact: Anyone who decompiles the app bundle can extract these credentials and log in as an admin in the mobile app. Even though admin actions call Supabase (which has RLS), the client-side admin UI will be accessible.
- Fix approach: Remove test accounts before first production release. If dev testing is needed, gate them behind `__DEV__` check or an environment flag.

### Admin panel uses entirely mock data
- Issue: The web admin (`admin/`) imports from `admin/src/data/mock.ts` (853 lines) for all data: users, reports, applications, announcements, tickets, revenue, etc. `AdminContext` in the admin panel never calls Supabase.
- Files: `admin/src/contexts/AdminContext.tsx`, `admin/src/data/mock.ts`
- Impact: Admin actions (approve/reject posts, sanction users, manage players) only update local React state and are not persisted. The admin panel is a UI prototype only.
- Fix approach: Wire the admin context to Supabase, starting with the highest-priority flows: post review and report resolution.

### APP_VERSION hardcoded in two places
- Issue: Version string `'1.0.0'` is hardcoded in `app/src/constants/config.ts` and again directly in `app/src/screens/my/MyPageScreen.tsx` (`const APP_VERSION = '1.0.0'`). The screen import does not use the constants version.
- Files: `app/src/constants/config.ts` (line 1), `app/src/screens/my/MyPageScreen.tsx` (line 40)
- Impact: When the version is bumped in `app.json`, the display in MyPage will be out of sync.
- Fix approach: Remove the local constant in `MyPageScreen` and import from `app/src/constants/config.ts`, or use `expo-constants` to read `Constants.expoConfig.version` at runtime.

### `folderCounter` module-level mutable variable
- Issue: `ArchiveContext` uses a module-level `let folderCounter = 3` to generate folder IDs. This is reset on hot reload but persists across component unmounts within the same JS session.
- Files: `app/src/contexts/ArchiveContext.tsx` (line 32)
- Impact: Folder IDs (`f3`, `f4`, ...) can collide with persisted initial folders (`f1`, `f2`) if state is restored from a future backend.
- Fix approach: Generate IDs with `Date.now()` or `crypto.randomUUID()` instead of an incrementing counter.

---

## Security Considerations

### CORS wildcard on presigned URL edge function
- Risk: The `get-upload-url` Edge Function sets `Access-Control-Allow-Origin: "*"`, allowing any web origin to request upload URLs on behalf of authenticated users.
- Files: `supabase/functions/get-upload-url/index.ts` (line 33)
- Current mitigation: The function validates the bearer token via `supabase.auth.getUser`, so unauthenticated requests are rejected. Upload URLs are user-scoped (`prefix/userId/...`).
- Recommendations: Restrict CORS to known origins (`https://udamonfan.com`, admin domain) once they are confirmed, especially before public launch.

### `ContentLength` in presigned URL does not enforce file size on client upload
- Risk: The presigned URL includes `ContentLength: sizeLimit` in the S3 `PutObjectCommand` metadata, but the actual PUT request from the client in `r2Upload.ts` does not pass a `Content-Length` header explicitly. Cloudflare R2 with presigned URLs does not enforce `ContentLength` from the command — it is advisory only for the signed headers.
- Files: `supabase/functions/get-upload-url/index.ts` (line 143), `app/src/services/r2Upload.ts` (lines 52-60)
- Current mitigation: Image optimization (`optimizeImage`) compresses before upload. Max file count is validated server-side.
- Recommendations: Verify R2 bucket policy enforces object size limits, or add server-side file size validation after upload by checking object metadata.

### Admin role is client-side only
- Risk: The `isAdmin` flag and `adminRole` value are stored in local React state derived from the `users` table (which is currently missing from migrations). Admin access control in the mobile app is entirely client-side — the RLS policies on photographer tables do not restrict admin operations.
- Files: `app/src/contexts/AuthContext.tsx` (lines 362-363), `supabase/migrations/005_rls_policies.sql`
- Current mitigation: The mobile admin screens require `is_admin: true` in the local profile before rendering.
- Recommendations: Once the `users` table is created, add RLS policies that grant admin-specific write permissions (e.g., blinding posts, sanctioning users) only to rows where `auth.uid()` matches a verified admin user.

---

## Performance Bottlenecks

### `PhotographerContext` loads all photo posts, comments, and collections on mount
- Problem: On mount, `loadRemoteData` fires 6 parallel Supabase queries simultaneously — photographers, all photo posts, all players, all events, all comments, all collections. There is no pagination; all rows are fetched.
- Files: `app/src/contexts/PhotographerContext.tsx` (lines 166-172)
- Cause: Single bulk load pattern with no cursor-based or offset pagination.
- Improvement path: Paginate `photo_posts` and `photo_comments` fetches. Load comments lazily per-post in `PostDetailScreen` rather than bulk-loading all comments globally.

### `CommunityContext` trending recalculation on every `posts` state change
- Problem: The `useEffect` in `CommunityContext` that computes trending posts runs on every `posts` state mutation (like, comment, create). It iterates the full post array each time.
- Files: `app/src/contexts/CommunityContext.tsx` (lines 91-121)
- Cause: `posts` is in the dependency array of the effect, and mutations to `posts` (likes, view counts) re-trigger trending calculation.
- Improvement path: Debounce the trending recalculation, or only recalculate when `like_count` or `comment_count` changes materially (e.g., delta > N).

### `HomeScreen` `refreshing` uses `setTimeout` instead of real data refresh
- Problem: Pull-to-refresh on HomeScreen resolves after 500ms `setTimeout` regardless of whether data was actually refreshed.
- Files: `app/src/screens/home/HomeScreen.tsx` (line 67), `app/src/screens/community/CommunityMainScreen.tsx` (line 73)
- Cause: No async data refresh plumbed through from backend.
- Improvement path: Once contexts are wired to Supabase, call the context's `refreshData` method and resolve the refreshing flag when the promise completes.

---

## Fragile Areas

### `PhotographerContext` merges remote + mock data on every load
- Files: `app/src/contexts/PhotographerContext.tsx` (lines 175-199)
- Why fragile: Remote data is merged with mock data by ID — if a real DB row has an ID that matches a mock ID (`pp1`, `pg1`, etc.), the remote data wins but mock IDs are simple short strings that could collide. When Supabase returns data, mock posts with non-matching IDs are appended to real posts, surfacing mock content to users in production.
- Safe modification: Remove mock data merge once real DB has sufficient seed data. The merge guard (`remotePostIds.has(p.id)`) is correct but the coexistence of real UUIDs and mock string IDs is fragile.
- Test coverage: None — no test verifies merge behavior.

### OAuth deep link handling has Android path divergence
- Files: `app/src/contexts/AuthContext.tsx` (lines 258-273)
- Why fragile: On Android, OAuth redirects via `Linking.openURL` (system browser), relying on the deep link listener to catch the callback URL. On iOS, `WebBrowser.openAuthSessionAsync` is used, which returns the result directly. The two code paths have different failure modes: on Android, if the deep link is not registered or the app is killed during auth, the callback is silently dropped with `pendingOAuthProvider.current` left non-null.
- Safe modification: Add a timeout cleanup for `pendingOAuthProvider.current` on Android to avoid stale state if the user abandons the browser mid-flow.
- Test coverage: None.

### Slug ↔ UUID map is module-level cached and never invalidated
- Files: `app/src/services/photographerApi.ts` (lines 19-21, 22-32)
- Why fragile: `_slugMap` and `_uuidToSlugMap` are module-level variables populated once on first API call and never refreshed. If team slugs change (unlikely but possible), the cache will serve stale mappings for the lifetime of the app session. The `resetSlugCache()` export is present but only called in tests.
- Safe modification: The cache is appropriate for teams (static data), but the invalidation path should be wired to `refreshData` in `PhotographerContext` for correctness.

### `PhotographerRegisterScreen` writes locally without checking `isSupabaseConfigured`
- Files: `app/src/screens/photographer/PhotographerRegisterScreen.tsx` (lines 82-101)
- Why fragile: Registration calls `activatePhotographerMode` (which tries Supabase but silently falls back to local state on failure) and then calls `registerPhotographer` (which only updates in-memory state). When Supabase is configured but unreachable, the user appears registered locally but the DB row is not created, so on next app launch the registration is gone.
- Safe modification: After `activatePhotographerMode` succeeds, call `photographerApi.createPhotographerProfile` or equivalent, and surface an error if the DB write fails rather than silently continuing.

---

## Missing Critical Features

### No `users` public table means profile, team preference, and admin flags cannot be stored
- Problem: `UserProfile` fields (`my_team_id`, `is_admin`, `admin_role`, `ticket_balance`, etc.) have no database backing. New real users who sign up will always have null profiles. The `fetchUserProfile` function will return null for every real user until this table exists.
- Blocks: User profile display, team-filtered home feed, admin access, ticket balance persistence.

### View count is never incremented
- Problem: `view_count` exists on both `photo_posts` and `community_posts` in the DB schema and is displayed in the UI, but there is no code path that increments it. The mock data has static view counts. No API call or Supabase function tracks post views.
- Files: `app/src/services/photographerApi.ts`, `app/src/contexts/CommunityContext.tsx`
- Blocks: Trending algorithm accuracy (uses `view_count * 0.1` as a signal), analytics, and spam detection.

### Naver OAuth is not implemented
- Problem: The login screen offers Naver as a sign-in option but `login('naver')` returns immediately with no action. Naver requires a native SDK (not a standard OAuth web flow) that must be separately implemented.
- Files: `app/src/contexts/AuthContext.tsx` (lines 239-240)
- Blocks: Naver users cannot sign in.

---

## Test Coverage Gaps

### Zero test files in the entire codebase
- What's not tested: Every feature — auth flows, community context mutations, photographer API mappers, upload logic, payment simulation, trending algorithm, poll voting, admin actions.
- Files: All of `app/src/`, `admin/src/`, `supabase/functions/`
- Risk: Any refactor to contexts (which will be required when connecting to Supabase) can silently break existing behavior. Business logic in `CommunityContext` (trending score, pagination, soft delete) is completely untested.
- Priority: High — specifically for `photographerApi.ts` mappers, `CommunityContext` mutations, and the `get-upload-url` edge function.

---

## Dependencies at Risk

### `@ts-nocheck` on 5 files bypasses type safety
- Risk: Five files are entirely untyped: `ThemeContext.tsx`, `TicketShopScreen.tsx`, `PurchaseHistoryScreen.tsx`, `RevenueManagementScreen.tsx`, `SupportSheet.tsx`. All are marked "MVP 블라인드" but remain in the active source tree.
- Files: `app/src/contexts/ThemeContext.tsx`, `app/src/screens/ticket/TicketShopScreen.tsx`, `app/src/screens/ticket/PurchaseHistoryScreen.tsx`, `app/src/screens/photographer/RevenueManagementScreen.tsx`, `app/src/components/common/SupportSheet.tsx`
- Impact: TypeScript errors in these files will not be caught at compile time. When the feature flags are enabled, these files will need full type audits before they are safe to ship.
- Migration plan: Remove `@ts-nocheck` and fix type errors when enabling `SUPPORT_FEATURE_ENABLED`.

### `any` type used extensively in API mapper layer
- Risk: All DB row mapper functions in `photographerApi.ts` accept `row: any` as input. There are 29 `any` usages in this file alone. Shape mismatches between DB schema and TypeScript types will not be caught at compile time.
- Files: `app/src/services/photographerApi.ts` (29 occurrences)
- Impact: When the DB schema diverges from the TypeScript types (e.g., the missing `status` column discussed above), the mappers silently produce incorrect data.
- Migration plan: Generate types from the Supabase schema using `supabase gen types typescript` and replace `any` with generated row types.

---

*Concerns audit: 2026-04-05*
