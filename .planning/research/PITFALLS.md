# Pitfalls Research

**Domain:** KBO fan community + photographer app (React Native Expo / Supabase / R2)
**Researched:** 2026-04-05
**Confidence:** HIGH (verified against official docs, codebase, and multiple community sources)

## Critical Pitfalls

### Pitfall 1: `public.users` trigger blocks signups on failure

**What goes wrong:**
The standard Supabase pattern is to create a trigger on `auth.users` that auto-inserts a row into `public.users` on signup. If the trigger function has any error -- constraint violation, missing column, permission issue -- the entire auth transaction rolls back. New users cannot sign up at all. There is no partial success; the auth row and the profile row are in the same transaction.

**Why it happens:**
The `supabase_auth_admin` role that manages `auth.users` only has permissions within the `auth` schema. When your trigger function tries to INSERT into `public.users`, it needs `SECURITY DEFINER` with the `postgres` role to have write access. Developers forget this, or they add a NOT NULL constraint on `public.users` that the trigger cannot satisfy (e.g., `my_team_id` without a default), and suddenly all signups fail silently.

In this codebase specifically: `AuthContext.tsx` expects `is_admin`, `admin_role`, `ticket_balance`, `my_team_id` on the users table, but no migration creates `public.users` at all (documented in CONCERNS.md). When this table is created, every column must either be nullable or have a sensible default -- otherwise the trigger will fail on every OAuth signup.

**How to avoid:**
1. Create the trigger function with `SECURITY DEFINER` and `SET search_path = public`.
2. Make every column in `public.users` nullable or defaulted -- never require data that the trigger cannot provide at signup time.
3. Test the trigger by creating a test user via the Supabase dashboard BEFORE deploying the migration to the live project.
4. Add a `BEGIN...EXCEPTION WHEN OTHERS THEN NULL; END;` wrapper in the trigger function as a safety net (log errors to a separate table rather than blocking signups).

**Warning signs:**
- OAuth login returns a generic "Database error saving new user" message.
- New users see a blank profile screen after signup.
- `auth.users` has rows that `public.users` does not (orphaned auth entries).

**Phase to address:**
Phase 1 (Foundation/Auth) -- this is the single most blocking pitfall. Must be tested before any OAuth provider is configured.

---

### Pitfall 2: Naver Login is NOT OIDC-compliant -- cannot use Supabase Custom OIDC

**What goes wrong:**
The team plans to add Naver as an OAuth provider via Supabase's Custom OIDC feature. Supabase's custom provider system requires the provider to support OpenID Connect auto-discovery (a `/.well-known/openid-configuration` endpoint). Naver Login API is pure OAuth 2.0 -- it does not implement OIDC, does not issue `id_token`s, and has no discovery endpoint. The Supabase dashboard will fail to validate the provider, and the team will lose days trying to make it work.

Note: Naver Cloud Platform (enterprise SSO) supports OIDC, but the consumer-facing Naver Login API does not. These are different products.

**Why it happens:**
Supabase docs list "Custom OIDC" as the solution for non-built-in providers. Developers assume Korean providers support OIDC because Kakao does. Naver does not.

**How to avoid:**
Implement Naver Login as an Edge Function proxy pattern:
1. Create a Supabase Edge Function that acts as the OAuth 2.0 intermediary.
2. The Edge Function handles Naver's authorization code exchange (code -> access_token -> user profile via `https://openapi.naver.com/v1/nid/me`).
3. The Edge Function calls `supabase.auth.admin.createUser()` or `signInWithIdToken()` with the verified Naver profile data.
4. Alternatively, use `signInWithOAuth` with manual token exchange if Supabase adds support, but as of April 2026 this requires the proxy approach.

This is a known pattern documented by Auth.js (NextAuth) for Naver -- the Naver provider in Auth.js explicitly configures `authorization`, `token`, and `userinfo` endpoints manually rather than using OIDC discovery.

**Warning signs:**
- "Auto-discovery failed" error when adding Naver as a Custom OIDC provider in the Supabase dashboard.
- The Supabase custom provider form rejects the issuer URL.

**Phase to address:**
Phase 1 (Auth) -- must be architectured early. The Edge Function proxy approach requires different client-side code than the standard `signInWithOAuth` pattern used for Google/Apple/Kakao.

---

### Pitfall 3: Android OAuth callback silently dropped when app is killed

**What goes wrong:**
On Android, the OAuth flow uses `Linking.openURL()` to open the system browser (not an in-app WebBrowser session). If the OS kills the app during the browser flow (common on low-memory devices), the deep link callback `udamon://auth/callback` fires but the app cold-starts with no listener attached yet. The `Linking.addEventListener('url')` in `AuthContext` only fires for warm-start events. The user sees the app's initial screen with no login, and `pendingOAuthProvider.current` is reset to null.

This codebase already has this exact code path at `AuthContext.tsx:258-263`, with a comment acknowledging the limitation.

**Why it happens:**
`Linking.addEventListener` only captures URL events while the app is alive. For cold-start (app was killed), you must call `Linking.getInitialURL()` on mount. The current code has a `getInitialURL` call in the `useEffect` (line ~210-220), but it checks for auth callback URLs before the Supabase auth state listener is ready, creating a race condition.

**How to avoid:**
1. In the initial `useEffect`, after `Linking.getInitialURL()` returns a URL containing `auth/callback`, store the URL in a ref and process it AFTER `onAuthStateChange` subscription is set up.
2. Add a 10-second timeout cleanup for `pendingOAuthProvider.current` on Android to avoid stale state.
3. Use `expo-auth-session`'s `useAuthRequest` hook instead of manual `Linking.openURL` for a more reliable flow on Android, or switch to `WebBrowser.openAuthSessionAsync` with `preferEphemeralSession: true` on Android (supported since Expo SDK 50+).

**Warning signs:**
- QA reports: "Login worked on iOS but not Android."
- User says "I signed in with Google/Kakao but the app shows I'm logged out."
- `pendingOAuthProvider.current` is non-null on app mount (stale from previous session).

**Phase to address:**
Phase 1 (Auth) -- must be fixed as part of OAuth integration. Test specifically on Android by force-killing the app during an OAuth flow.

---

### Pitfall 4: RLS policies missing for new tables = data publicly accessible

**What goes wrong:**
Supabase tables have RLS disabled by default. When the team creates new tables (`users`, `notifications`, `announcements`, `inquiries`, `photographer_applications`, `cheerleaders`, `audit_logs`, `site_settings`), forgetting to enable RLS means every row is readable and writable by any authenticated user using the `anon` key. Since the app uses the `anon` key client-side, this means any user can read all notifications for all users, modify site settings, and fabricate admin audit logs.

The existing codebase has RLS only on some tables (migrations 005, 008). New tables added in the upcoming migration phase will need explicit RLS.

**Why it happens:**
During rapid development, developers create tables and immediately test queries from the app. Everything works. They forget that "it works" means "there is no security." The Supabase SQL Editor bypasses RLS (it uses the `postgres` role), so testing there gives false confidence. The real danger surfaces when someone hits the PostgREST API directly.

**How to avoid:**
1. Every `CREATE TABLE` migration MUST include `ALTER TABLE [name] ENABLE ROW LEVEL SECURITY;` in the same file.
2. Create a checklist: for each new table, write SELECT, INSERT, UPDATE, DELETE policies explicitly.
3. Test from the client SDK (not the SQL Editor) with a non-admin user to verify policies work.
4. Use Supabase's "User Impersonation" feature in the dashboard to browse data as a specific user.
5. For tables like `site_settings` and `audit_logs`, only allow SELECT for anon and INSERT/UPDATE for service_role (admin Edge Functions).

**Warning signs:**
- Querying a table returns ALL rows regardless of user (should return only user's own data for personal tables).
- The RLS status column in Supabase Table Editor shows "Disabled" for any public-schema table.

**Phase to address:**
Phase 1 (Foundation) -- every migration that creates a table must include RLS. Add a code review checklist item.

---

### Pitfall 5: Supabase Edge Function image resize hits CPU/memory limits

**What goes wrong:**
The project plans an "image resize/thumbnail Edge Function" (PROJECT.md Active item). Supabase Edge Functions have hard limits: 2-second CPU time per request and limited memory. Libraries like Sharp are not supported (they require native binaries). WASM-based alternatives (e.g., `@cf-wasm/photon`, `squoosh`) work but are slow and memory-hungry for large images. A 10MB photo upload triggering a resize can easily exceed both limits, returning a 546 WORKER_LIMIT error.

**Why it happens:**
Developers assume Edge Functions can do arbitrary image processing like a Node.js server. Supabase Edge Functions run on Deno in constrained isolates. The 2-second CPU limit is real CPU time (not wall-clock time), and image manipulation is CPU-intensive.

**How to avoid:**
Use Cloudflare's Image Resizing service instead -- it is purpose-built for this:
1. Store originals in R2 (already done in this project).
2. Use a Cloudflare Worker with `fetch()` and the `cf.image` options to resize on request.
3. Use `cf.image.width`, `cf.image.height`, `cf.image.fit` in the Worker fetch options for on-the-fly transforms.
4. Cache transformed images in Cloudflare's CDN (KV or Cache API) so each variant is generated only once.
5. Keep the upload path separate from the resize path to avoid request loops.

This approach requires the Cloudflare Images subscription (included in Pro plan, or $5/month on top of free plan for 5,000 unique transformations). It is far more reliable than Edge Function WASM processing.

**Warning signs:**
- 546 errors from the Edge Function.
- Image resize taking >3 seconds per request.
- Out-of-memory errors for images >5MB.

**Phase to address:**
Phase 3 (Media Processing) -- architecture decision must be made before building the thumbnail pipeline. Do NOT attempt Supabase Edge Function-based resizing.

---

### Pitfall 6: Apple Developer enrollment blocks iOS auth AND distribution for weeks

**What goes wrong:**
Apple Developer Program enrollment for organizations requires a DUNS number. The DUNS number request takes 5 business days, but syncing it to Apple's international database takes up to 14 additional business days. Total: up to 30 calendar days. Without enrollment: no Apple Sign In capability, no TestFlight builds, no App Store submission. This is an external blocker that cannot be parallelized with code work.

The project is on a 6-week timeline with v1 launch mid-May 2026. If DUNS enrollment is not resolved by the end of week 2, the iOS launch is at risk.

**Why it happens:**
Teams underestimate the bureaucratic lag. The DUNS number might already exist for the entity ("Heidi") but the format/name might not match Apple's records exactly, causing rejection loops.

**How to avoid:**
1. Check DUNS status immediately using Apple's D-U-N-S Lookup tool (https://developer.apple.com/enroll/duns-lookup/).
2. If the DUNS number exists but name/address does not match, update the D&B profile FIRST (add 5 business days).
3. Enroll as an Individual developer as a fallback -- this allows TestFlight and Apple Sign In testing while the organization enrollment processes. The individual account can be converted to an organization account later, but app transfers must be handled.
4. Build the entire iOS auth flow and test it against a development provisioning profile (local signing, ad-hoc builds) while waiting for enrollment.
5. Set a hard deadline: if organization enrollment is not complete by week 3, ship v1 under the individual account and transfer later.

**Warning signs:**
- DUNS lookup returns "No match found" (need to request a new number, add 2-3 weeks).
- Apple enrollment status stuck at "Pending" for >7 days (contact Apple Developer Support).
- Entity name mismatch between DUNS and Apple enrollment form.

**Phase to address:**
Pre-Phase 1 (immediate action) -- this is a blocker for everything iOS. Client must initiate/verify DUNS enrollment before any code work starts.

---

### Pitfall 7: Mock-to-Supabase migration breaks the admin panel silently

**What goes wrong:**
The admin panel (`admin/`) has 20 pages all backed by `admin/src/data/mock.ts` (853 lines). When migrating to Supabase, developers often wire up the most visible pages (user list, post review) but leave less-used pages (analytics, settings, audit logs) still pointing at mock data. The admin appears functional during demo but certain pages show stale/fake data. Worse: admin actions on half-migrated pages can corrupt real data (e.g., approving a post on a page that mixes mock and real post IDs).

**Why it happens:**
The admin panel has 20 pages, and the team only has 6 weeks. Migrating all 20 pages is tedious work with low perceived value compared to user-facing features. Developers prioritize the mobile app and leave admin pages "for later." But admin is how content moderation happens -- broken admin means no moderation at launch.

**How to avoid:**
1. Prioritize admin pages by criticality for v1 launch: (a) post review/approval, (b) user reports, (c) photographer applications, (d) announcements. These 4 flows are essential for operations. Everything else can stay mock with a clear "Demo Data" banner.
2. Create a single `adminSupabaseClient` service layer that ALL admin pages import from. Never mix mock imports and Supabase calls in the same page.
3. Remove `mock.ts` entirely once the critical 4 flows are wired. For deferred pages, show a "Coming in v2" placeholder rather than fake data.
4. The admin auth is currently hardcoded (`admin@udamon.com` / `admin1234`). This MUST be replaced with Supabase Auth before any real data is exposed.

**Warning signs:**
- Admin page shows data that does not match what the mobile app shows.
- Counts on admin dashboard do not change after real user activity.
- Admin actions (approve, reject, ban) succeed in UI but have no effect on the mobile app.

**Phase to address:**
Phase 4 (Admin Integration) -- but the admin auth replacement should happen in Phase 1 (Auth) to avoid exposing real data through a hardcoded password.

---

### Pitfall 8: FCM push requires two separate credential files -- teams confuse them

**What goes wrong:**
Expo push notifications with FCM require TWO different JSON files:
1. **`google-services.json`**: Goes into the app binary (in `app.json` under `android.googleServicesFile`). Contains the Firebase project config. Safe to commit to version control.
2. **Service Account Key JSON (Firebase Admin SDK)**: Uploaded to EAS via `eas credentials` or the EAS dashboard. Used server-side by Expo's push service to send notifications via FCM v1 API. Contains a private key. NEVER commit to version control.

Teams frequently confuse these two files, uploading `google-services.json` to EAS as the server key (which fails silently -- pushes just never arrive) or committing the Service Account Key to the repo.

Additionally: as of Expo SDK 54, push notifications do NOT work in Expo Go on Android. You must use a development build, which requires a working `google-services.json` AND the EAS build pipeline.

**Why it happens:**
Google's documentation uses the term "credentials" for both files. The Firebase Console downloads them from different pages (Project Settings > General vs. Project Settings > Service Accounts). Developers who have never set up FCM before download the wrong one.

**How to avoid:**
1. Create a Firebase project and enable Cloud Messaging BEFORE starting push notification development.
2. Download `google-services.json` from Firebase Console > Project Settings > General > Your Apps > Android app. Place at project root, reference in `app.json`.
3. Download Service Account Key from Firebase Console > Project Settings > Service Accounts > Generate New Private Key. Upload via `eas credentials` or EAS dashboard. Never commit.
4. Set `"useNextNotificationsApi": true` in `app.json` under `android`.
5. Create a development build (`eas build --profile development --platform android`) to test push notifications -- Expo Go will not work.

**Warning signs:**
- Pushes work on iOS (via APNs) but not on Android.
- `ExpoPushTokenError` when calling `Notifications.getExpoPushTokenAsync()`.
- "InvalidCredentials" or "MismatchSenderId" errors in Expo push receipt responses.

**Phase to address:**
Phase 5 (Push Notifications) -- Firebase project must be created by the client before this phase starts. This is an external dependency blocker.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keeping `isSupabaseConfigured` fallback to mock data | Can demo features without backend | Mock data leaks into production; users see fake content; debugging is harder because data source is ambiguous | Only during Phase 1 development; must be removed before Phase 2 completion |
| Using `any` types in API mappers (29 occurrences in `photographerApi.ts`) | Faster initial development | Schema changes silently produce wrong data; no compile-time safety; the `status` column bug already exists because of this | Never acceptable for production. Generate types with `supabase gen types typescript` in Phase 1 |
| 18 Context Providers without state management library | Avoids adding a dependency | Deep nesting, prop drilling, unnecessary re-renders, hard to debug state flow | Acceptable for v1 given the 6-week timeline, but creates pain for v2 feature additions |
| CORS wildcard (`*`) on Edge Functions | Works from any origin during development | Any website can request presigned upload URLs if they have a valid auth token | Acceptable until domain is purchased; must be locked to `udamonfan.com` before public launch |
| Single Supabase project (no dev/prod split) | Simpler setup, no environment management | Schema changes affect live users; no safe place to test migrations; seed data mixes with real data | Acceptable for v1 launch with <100 users; must split before v2 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth + Expo deep links | Using `Linking.createURL('auth/callback')` which generates `exp://` scheme in dev and `udamon://` in production -- different callback URLs per environment | Register BOTH schemes in Supabase Auth > URL Configuration > Redirect URLs. Or use `makeRedirectUri` from `expo-auth-session` which handles this automatically |
| Kakao OAuth + Supabase | Not registering Supabase's callback URL (`https://<project>.supabase.co/auth/v1/callback`) in Kakao Developer Console | Go to Kakao Developers > App Settings > Kakao Login > Redirect URI and add the Supabase callback URL. The `redirectTo` in `signInWithOAuth` is where Supabase redirects AFTER its own callback |
| Cloudflare R2 presigned URLs | Assuming presigned URL enforces `Content-Length` -- it does not. R2 trusts the uploader to send whatever size they want | Validate uploaded file size AFTER upload by checking object metadata via a Worker or Edge Function. Add R2 lifecycle rules to delete oversized objects |
| Supabase RLS + Admin operations | Writing admin Edge Functions with the `anon` key, which is subject to RLS | Admin Edge Functions must use the `service_role` key to bypass RLS. Never expose the service_role key to the client |
| Expo push tokens + user accounts | Storing the push token once at login and never updating it | Tokens change when the app is reinstalled, when the OS rotates tokens, and when Expo SDK versions change. Re-register the token on every app launch and update the `push_token` column in `public.users` |
| Firebase + EAS Build | Adding `google-services.json` but not the Service Account Key to EAS | Both are required. `google-services.json` goes in the app binary (via `app.json`). Service Account Key goes to EAS credentials (via `eas credentials` CLI or dashboard) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading all photo posts without pagination (`PhotographerContext` lines 166-172) | App startup takes 5+ seconds; memory usage spikes | Implement cursor-based pagination; load 20 posts at a time; use `range()` on Supabase queries | At ~500 photo posts (each with image URLs, comments, metadata) |
| Trending recalculation on every post state change (`CommunityContext` lines 91-121) | UI jank after liking a post; scroll stutters | Debounce trending calculation to every 30 seconds; or compute trending server-side via a Postgres function on a cron schedule | At ~200 community posts with active engagement |
| Fetching all comments globally instead of per-post | Initial load fetches thousands of comments; 90%+ are never viewed | Load comments lazily in `PostDetailScreen` only when the user opens a specific post | At ~50 posts with 10+ comments each |
| No image CDN caching -- every R2 image fetched directly | Slow image loads; high R2 egress bandwidth costs | Serve images through a Cloudflare Worker with Cache-Control headers; use Cloudflare's CDN cache | At ~1000 daily active users viewing photo galleries |
| `view_count` increment per request without deduplication | Inflated view counts; extra DB writes on every screen view | Batch view count increments server-side (e.g., increment via a Postgres function with a 1-minute debounce, or use a simple counter Edge Function with rate limiting per user per post) | Immediately -- any popular post will have inflated counts |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Hardcoded test accounts with known passwords (`test1234`, `admin1234`) in production bundle | Anyone decompiling the APK/IPA can log in as admin; client-side admin UI exposed | Gate test accounts behind `__DEV__` check. Remove entirely before production build. Admin access must come from `public.users.is_admin` verified server-side via RLS |
| Admin hardcoded credentials in admin web panel | Admin panel accessible with `admin@udamon.com` / `admin1234` by anyone who discovers the URL | Replace with Supabase Auth. Check `is_admin` from `public.users` table via RLS, not client-side state |
| `service_role` key in client-side environment variables | Full database access bypassing all RLS; can read/write/delete any row in any table | Never expose `service_role` key to React Native or admin web. Use only in Edge Functions. Use `anon` key on client side |
| No server-side file type validation after R2 upload | User renames malware as `.jpg` and uploads via presigned URL; R2 does not validate file contents | After upload, use a Worker to verify the file's magic bytes match the claimed content type. Reject and delete non-matching files |
| Presigned URL generated but never consumed = orphaned storage | Unused presigned URLs leave allocated storage entries; over time, R2 fills with unused object paths | Set R2 lifecycle rules to delete objects not accessed within 24 hours of creation, or implement a cleanup Edge Function |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| OAuth login opens system browser on Android instead of in-app | User leaves the app, might not return; if app is killed, login state is lost | Use `WebBrowser.openAuthSessionAsync` on both platforms. On Android, this uses Custom Tabs which return to the app automatically |
| No loading/error states during Supabase migration | Mock data loads instantly (in-memory); Supabase adds network latency. Screens flash empty then populate | Add skeleton loading states to every screen BEFORE wiring Supabase. Users should see shimmer placeholders, not blank screens |
| Pull-to-refresh uses `setTimeout(500ms)` instead of real refresh | User pulls to refresh and sees spinner for exactly 500ms regardless of data freshness | Wire refresh to the actual Supabase query promise. Resolve the refreshing flag when data arrives |
| Push notification opens app but does not navigate to the relevant content | User taps a notification about a photo post approval but lands on the home screen | Deep link handling in the notification payload must include the target screen and entity ID. Handle both cold-start and warm-start navigation |
| Naver login button present but non-functional (`provider === 'naver' => return`) | Korean users expect Naver login to work; tapping it does nothing with no feedback | Either implement Naver login before launch or hide the button entirely. Never show a non-functional login option |

## "Looks Done But Isn't" Checklist

- [ ] **OAuth login:** Test on a REAL Android device (not emulator) -- deep link behavior differs. Kill the app during OAuth flow and verify the callback still works on cold start.
- [ ] **RLS policies:** For every new table, run a query from the CLIENT SDK (not SQL Editor) as a non-admin user. Verify they can only see their own data. SQL Editor uses `postgres` role which bypasses RLS.
- [ ] **Push notifications:** Test on a DEVELOPMENT BUILD, not Expo Go. Expo Go does not support push on Android since SDK 54. Verify both foreground and background/killed states.
- [ ] **Admin post review:** Approve a post via admin panel, then verify the post appears on the mobile app. Reject a post and verify it disappears from the mobile feed. If these flows only update local state, moderation is broken.
- [ ] **Image upload:** Upload an image >10MB on a slow connection. Verify the presigned URL does not expire (15-minute expiry) and that error handling shows the user a retry option, not a silent failure.
- [ ] **Kakao login:** Test with a Korean Kakao account (not a test account). Verify the Supabase callback URL is registered in Kakao Developer Console. Check that user profile data (nickname, profile image) is correctly mapped.
- [ ] **User profile creation:** Sign up a brand new user via OAuth. Verify `public.users` row exists (trigger worked). Verify the profile screen shows real data, not null/undefined fields.
- [ ] **Photographer upload flow:** Upload a photo, verify it appears in the admin review queue, approve it, and confirm it appears in the public photographer feed. This is an end-to-end flow crossing 3 systems (R2, Supabase, Admin).
- [ ] **Community post creation:** Create a post, verify it appears in the feed for other users (not just the author). Like it from another account and verify the count updates. This confirms RLS policies allow cross-user reads.
- [ ] **Schema migration:** After applying new migrations, verify existing data is not corrupted. Run `supabase db diff` to check for schema drift between local and remote.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Broken `public.users` trigger blocking signups | LOW | Disable the trigger (`ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created`), fix the function, re-enable. Create missing `public.users` rows for any orphaned `auth.users` entries with an INSERT...SELECT |
| RLS not enabled on a table (data exposed) | MEDIUM | Enable RLS immediately. Audit access logs for unauthorized reads. No data loss, but potential privacy breach. Rotate any exposed API keys if service_role was compromised |
| Android OAuth callback lost | LOW | User retries login. No data corruption. Fix by switching to `WebBrowser.openAuthSessionAsync` on Android |
| FCM credentials misconfigured | LOW | Re-upload correct Service Account Key to EAS. Rebuild the app. No data loss -- pushes were simply not delivered |
| Edge Function image resize hitting 546 errors | MEDIUM | Switch to Cloudflare Worker-based image resizing. Requires architecture change but existing images in R2 are unaffected. Only the resize pipeline changes |
| Admin panel showing mock data in production | HIGH | Must audit every admin page to identify which are mock vs. real. Any admin actions taken on mock data are lost. User-facing moderation may have been ineffective for the duration |
| Apple Developer enrollment delayed past week 4 | HIGH | Ship on individual account (requires re-enrollment later). Or defer iOS launch and ship Android-only v1 with iOS following 2-3 weeks later |
| Schema drift between local and production | MEDIUM | Use `supabase db diff` to detect drift. Generate a corrective migration. Never use `supabase db reset` on production -- it drops all data |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `public.users` trigger failure | Phase 1 (Foundation) | Create a test user via Supabase dashboard; verify `public.users` row exists with correct defaults |
| Naver OAuth not OIDC-compliant | Phase 1 (Auth) | Verify Edge Function proxy returns a valid Supabase session for a Naver user |
| Android OAuth callback dropped | Phase 1 (Auth) | Kill app on Android during OAuth flow; verify login completes on cold restart |
| RLS missing on new tables | Phase 1 (Foundation) | For each new table, query from client SDK as non-admin user; verify restricted access |
| Image resize CPU limit in Edge Functions | Phase 3 (Media) | Decide Cloudflare Worker architecture before implementation begins |
| Apple Developer enrollment delay | Pre-Phase 1 (Immediate) | Verify DUNS number status within first 48 hours of project start |
| Admin panel mock data persistence | Phase 4 (Admin) | Verify admin actions reflect in mobile app for all critical flows (post review, user reports) |
| FCM credential confusion | Phase 5 (Push) | Verify Android push arrives on a development build before marking phase complete |
| Hardcoded test accounts in production | Phase 1 (Foundation) | Verify `TEST_ACCOUNTS` object is gated behind `__DEV__` and does not appear in production bundle |
| CORS wildcard on Edge Functions | Pre-Launch | Verify `Access-Control-Allow-Origin` is set to specific domains before public launch |
| Mock data merge in PhotographerContext | Phase 2 (Community/Photographer) | Verify mock data fallback is removed; no `pp1`, `pg1` style IDs appear in production DB queries |
| No pagination on data loads | Phase 2 (Community/Photographer) | Load test with 500+ records; verify app startup <3 seconds |

## Sources

- [Supabase Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) -- custom provider requires OIDC, limit of 3 per project
- [Supabase Login with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao) -- built-in Kakao support
- [Supabase User Management / Triggers](https://supabase.com/docs/guides/auth/managing-user-data) -- `on_auth_user_created` trigger pattern and SECURITY DEFINER requirement
- [Supabase Trigger Permission Discussion #34518](https://github.com/orgs/supabase/discussions/34518) -- free tier trigger limitations
- [Supabase Database Error on Signup](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB) -- trigger failures blocking signups
- [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security) -- USING vs WITH CHECK, indexing, testing
- [Supabase RLS Common Mistakes (DEV Community)](https://dev.to/solobillions/your-supabase-rls-is-probably-wrong-a-security-guide-for-vibe-coders-3l4e) -- 80% of apps have the same RLS flaw
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) -- 2-second CPU time, no Sharp support
- [Supabase Edge Functions 546 Error](https://supabase.com/docs/guides/troubleshooting/edge-function-546-error-response) -- WORKER_LIMIT exceeded
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) -- no content-length enforcement
- [Cloudflare Image Resizing via Workers](https://developers.cloudflare.com/images/transform-images/transform-via-workers/) -- on-the-fly transform architecture
- [Cloudflare R2 + Image Resizing Reference Architecture](https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/)
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) -- SDK 54 requires development builds
- [Expo FCM v1 Credentials Guide](https://docs.expo.dev/push-notifications/fcm-credentials/) -- Service Account Key vs google-services.json
- [Expo FCM v1 Blog Post](https://expo.dev/blog/expo-adds-support-for-fcm-http-v1-api) -- migration from legacy FCM
- [Expo Deep Linking](https://docs.expo.dev/linking/into-your-app/) -- intent filter and cold-start handling
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- OAuth redirect flow for mobile
- [Auth.js Naver Provider](https://authjs.dev/reference/core/providers/naver) -- confirms Naver is OAuth 2.0 only, manual endpoint config
- [Apple DUNS Enrollment](https://developer.apple.com/help/account/membership/D-U-N-S) -- 5-14 business day timeline
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) -- forward-only migration strategy

---
*Pitfalls research for: KBO fan community + photographer app (udamon)*
*Researched: 2026-04-05*
