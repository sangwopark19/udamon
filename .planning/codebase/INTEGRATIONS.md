# External Integrations

**Analysis Date:** 2026-04-05

## APIs & External Services

**Backend-as-a-Service:**
- Supabase - Primary backend (database, auth, Edge Functions)
  - SDK/Client: `@supabase/supabase-js` ^2.100.0 (app) / `@supabase/supabase-js@2` via npm: in Deno (Edge Function)
  - Auth env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Client singleton: `app/src/services/supabase.ts`
  - Graceful degradation: falls back to dummy URL/key when env vars absent (prevents crash in dev without .env)

**File Storage:**
- Cloudflare R2 - Media object storage (images and videos)
  - Bucket name env var: `R2_BUCKET_NAME`
  - Public CDN URL env var: `R2_PUBLIC_URL`
  - S3-compatible API accessed via `@aws-sdk/client-s3@3` inside Supabase Edge Function
  - Client app uploads directly to R2 via presigned PUT URLs (never through Supabase Storage)
  - Three storage prefixes: `photo-posts/`, `community-posts/`, `avatars/`
  - Size limits per prefix: photo-posts 30 MB, community-posts 10 MB, avatars 5 MB
  - Presigned URLs expire in 15 minutes (900 seconds)
  - Upload flow: `app/src/services/r2Upload.ts` → Edge Function `get-upload-url` → R2 PUT

## Data Storage

**Database:**
- Supabase (PostgreSQL)
  - Connection: via Supabase client (no direct PostgreSQL connection from app)
  - ORM/client: Supabase JS client `.from(table).select/insert/update/delete`
  - RLS (Row Level Security) enabled on all tables
  - Migrations: `supabase/migrations/` (10 files, sequential numbered)

**Core tables:**
  - `teams` - KBO teams (10 teams with slugs)
  - `players` - Players per team
  - `user_my_team` - User's favourite team (1 per user)
  - `community_posts`, `community_comments`, `community_likes`, `community_reports` - Community board
  - `community_polls`, `community_poll_options`, `community_poll_votes` - Polls on posts
  - `photographers`, `photo_posts`, `photo_likes`, `photo_comments` - Photographer feature
  - `photographer_follows`, `photo_collections`, `photo_collection_posts` - Social graph + collections
  - `timeline_events`, `timeline_event_teams` - Event timeline with team associations
  - `spam_filter_words`, `user_restrictions`, `user_blocks`, `recent_searches` - Moderation

**Database triggers (auto-maintained counts):**
  - `photo_posts.like_count`, `photo_posts.comment_count` — maintained by `trg_likes_count`, `trg_comments_count`
  - `photographers.follower_count`, `photographers.post_count` — maintained by `trg_follows_count`, `trg_photo_posts_count`
  - `community_posts.like_count`, `community_posts.comment_count` — maintained by `trg_like_count_*`, `trg_comment_count_*`
  - Auto-blind: posts with 5+ pending reports auto-set `is_blinded = TRUE` via `trg_auto_blind`
  - Recent searches capped at 10 per user via `trg_limit_recent_searches`

**Local Persistence:**
- `@react-native-async-storage/async-storage` - Used by `app/src/contexts/AuthContext.tsx` to persist test account sessions across app restarts
- `localStorage` (web) - Used by `admin/src/contexts/AuthContext.tsx` to persist admin session

**File Storage:**
- Cloudflare R2 (see above) — `photo-posts/`, `community-posts/`, `avatars/` buckets
- Supabase Storage bucket `photo-posts` exists in DB but is deprecated; RLS policies for it were dropped in `010_deprecate_storage_policies.sql`

**Caching:**
- None detected (no Redis, Memcached, or similar)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - handles sessions, JWTs, OAuth flows
  - Implementation: `app/src/contexts/AuthContext.tsx`
  - Session persistence: `autoRefreshToken` and `persistSession` enabled only when Supabase is configured

**Supported login methods:**
- Email/password — `supabase.auth.signInWithPassword` / `supabase.auth.signUp`
- Google OAuth — `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Apple OAuth — `supabase.auth.signInWithOAuth({ provider: 'apple' })`
- Kakao OAuth — `supabase.auth.signInWithOAuth({ provider: 'kakao' })`
- Naver OAuth — declared but not implemented (TODO in code)
- Guest mode — local state only, no Supabase session

**OAuth redirect handling:**
- Deep link scheme: `udamon://auth/callback`
- iOS: `WebBrowser.openAuthSessionAsync` handles redirect
- Android: system browser + `Linking.addEventListener` deep link listener as fallback
- PKCE code exchange: `supabase.auth.exchangeCodeForSession(code)` or token injection via `supabase.auth.setSession`
- Password reset redirect: `udamon://auth/reset`

**Admin Panel Auth:**
- Hardcoded credential check in `admin/src/contexts/AuthContext.tsx` (no Supabase)
- Session stored in `localStorage` under key `udamon_admin_session`
- No real authentication backend — this is dev/internal tooling only

**Test Accounts (app):**
- Three hardcoded test accounts in `app/src/contexts/AuthContext.tsx` bypass Supabase
- Credentials stored in AsyncStorage key `udamon_test_account`

**Edge Function Auth:**
- Bearer token from app's Supabase session passed as `Authorization` header
- Token verified via `supabase.auth.getUser(token)` using service role key inside Edge Function (`supabase/functions/get-upload-url/index.ts`)

## Push Notifications

**Provider:**
- Expo Push Notifications (`expo-notifications` ~0.32.16)
  - Deep link handler: `app/src/hooks/usePushDeepLinkHandler.ts`
  - Notification taps navigate to `PostDetail` or `PhotographerProfile` based on payload data fields `postId` / `photographerId`
  - Foreground display enabled for iOS (`iosDisplayInForeground: true` in `app/app.json`)
  - Push notification color: `#1B2A4A`
- Note: Push token registration to Supabase is not yet wired up — notifications currently use mock in-memory data (`app/src/contexts/NotificationContext.tsx`)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.log` / `console.error` / `console.warn` throughout codebase
- No structured logging library

## CI/CD & Deployment

**Mobile Build:**
- Expo Application Services (EAS) — `app/eas.json`
  - EAS project owner: `dohakimm`
  - Three build profiles: `development`, `preview`, `production`

**Admin Hosting:**
- Static site (Vite build) — target platform not explicitly configured; `admin/dist/` is the output directory

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc.)

## Webhooks & Callbacks

**Incoming:**
- None detected server-side

**Outgoing:**
- None detected

## Deep Links & Universal Links

**URL Scheme:** `udamon://`
- `udamon://auth/callback` - OAuth redirect target (iOS WebBrowser / Android Linking)
- `udamon://auth/reset` - Password reset redirect

**Universal Links (iOS / Android App Links):**
- iOS Associated Domain: `applinks:udamonfan.com`
- Android Intent Filters:
  - `https://udamonfan.com/post` → `PostDetail` screen
  - `https://udamonfan.com/@` → photographer profile (inferred from intent filter prefix)

## Payment

**Status:** Mock only — no real payment provider integrated
- `app/src/services/paymentApi.ts` simulates a Stripe-like flow with 1.2s delay and 95% success rate
- Supports `card`, `apple_pay`, `google_pay` as `PaymentMethod` types (type-level only)
- No Stripe SDK, RevenueCat, or any other payment SDK installed

---

*Integration audit: 2026-04-05*
