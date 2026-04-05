# Stack Research

**Domain:** KBO fan community + photographer app (brownfield completion)
**Researched:** 2026-04-05
**Confidence:** HIGH (verified via official docs, npm registry, Supabase docs)

## Context

This is NOT a greenfield project. The core stack (Expo SDK 54, Supabase, Cloudflare R2, React/Vite admin) is already decided and partially built. This research covers what NEW packages and patterns are needed to complete the remaining features: OAuth providers, image processing, push notifications, admin Supabase integration, and error monitoring.

---

## Recommended Stack

### OAuth Providers (Google / Apple / Kakao / Naver)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@react-native-google-signin/google-signin` | ^16.1.2 | Native Google Sign-In | Uses native Credential Manager (Android) / Sign In with Google (iOS). Produces an idToken that Supabase accepts via `signInWithIdToken`. No browser redirect needed -- better UX than OAuth browser flow. Expo config plugin built-in. SDK 54 compileSdkVersion 35+ requirement already met. |
| `expo-apple-authentication` | ~7.2.4 | Native Apple Sign-In (iOS) | Expo first-party package. Produces identityToken for `signInWithIdToken`. Required by App Store policy for apps with social login. iOS-only natively; Android falls back to `signInWithOAuth` browser flow. |
| Supabase built-in Kakao provider | N/A (dashboard config) | Kakao OAuth | Supabase natively supports Kakao as a first-class provider. Configure REST API key (client_id) + Client Secret in Dashboard. Use `signInWithOAuth({ provider: 'kakao' })` with browser redirect flow via `expo-web-browser`. |
| Supabase custom OAuth provider | N/A (dashboard config) | Naver OAuth | Supabase does NOT natively support Naver. Must use Custom OAuth Provider feature (max 3 per project). Configure with Naver's endpoints directly in Supabase Dashboard. |

**Naver Custom OAuth Configuration (verified via Supabase + Naver docs):**

| Field | Value |
|-------|-------|
| Identifier | `custom:naver` |
| Authorization URL | `https://nid.naver.com/oauth2.0/authorize` |
| Token URL | `https://nid.naver.com/oauth2.0/token` |
| UserInfo URL | `https://openapi.naver.com/v1/nid/me` |

**OAuth Pattern Summary:**

| Provider | Method | Flow | Library |
|----------|--------|------|---------|
| Google | `signInWithIdToken` | Native (no browser) | `@react-native-google-signin/google-signin` |
| Apple | `signInWithIdToken` | Native iOS / Browser Android | `expo-apple-authentication` + `expo-web-browser` (Android fallback) |
| Kakao | `signInWithOAuth` | Browser redirect (PKCE) | `expo-web-browser` (already installed) |
| Naver | `signInWithOAuth` | Browser redirect (PKCE) | `expo-web-browser` (already installed) |

**Confidence:** HIGH -- Supabase Kakao docs verified, Custom OAuth docs verified, Google/Apple native patterns verified via official Supabase social login guides.

### Push Notifications

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `expo-notifications` | ~0.32.16 | Push notification handling | Already installed. Handles token registration, foreground display, deep link routing. |
| `expo-device` | ~8.0.10 | Physical device detection | Required by Expo push setup to guard against simulator/emulator token requests. SDK 54 compatible. |
| `expo-constants` | ~18.0.13 | Project ID access | Required by `getExpoPushTokenAsync({ projectId })`. SDK 54 compatible. |
| Expo Push Service | N/A | Notification delivery | Abstracts FCM (Android) and APNs (iOS) behind a single API. Edge Function sends to `https://exp.host/--/api/v2/push/send`. Eliminates need to manage FCM/APNs separately in app code. |

**Architecture Pattern (verified via Supabase official example):**

1. **Client:** Register Expo push token, store in `profiles.expo_push_token` column
2. **Database:** `notifications` table with webhook on INSERT
3. **Edge Function (`push`):** Triggered by database webhook, fetches target user's push token from `profiles`, sends via Expo Push API
4. **Credentials:** FCM V1 Service Account Key JSON uploaded to EAS, `google-services.json` in Android build, EXPO_ACCESS_TOKEN as Supabase secret for enhanced security

**Critical SDK 54 Note:** Push notifications no longer work in Expo Go. Development build required for testing.

**Confidence:** HIGH -- Supabase official push notification guide verified, Expo docs confirmed architecture.

### Image/Video Processing

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `magick-wasm` | 0.0.3 | WASM-based image resize in Supabase Edge Functions | Only viable option. Sharp/libvips NOT supported in Deno Edge Functions (native library dependency). magick-wasm is the ImageMagick WASM port. Supabase official docs recommend it. |
| Cloudflare Images (Workers binding) | N/A | On-the-fly image transforms | Alternative to Edge Function processing. R2-stored images can be resized/optimized via Workers binding. Better for serve-time transforms (thumbnails, responsive sizes). |

**Recommended Approach: Two-tier processing**

| Tier | When | Where | Tool |
|------|------|-------|------|
| Upload-time thumbnail | After upload completes | Supabase Edge Function | `magick-wasm` (resize to thumbnail dimensions, JPEG output) |
| Serve-time optimization | On image request | Cloudflare Worker (optional) | Cloudflare Images binding (resize, format conversion, quality) |

**Edge Function Constraints (verified):**
- Memory limit applies: images > 5MB may cause resource limit errors
- Only WASM libraries supported (no Sharp, no native binaries)
- For video thumbnails: NOT feasible in Edge Functions. Client-side `expo-video-thumbnails` (SDK 54 supported) or defer to v2

**Cloudflare Images Constraint:** Requires paid Images subscription ($5/month base). If budget allows, this is the superior serve-time solution. Otherwise, pre-generate thumbnails at upload time with magick-wasm only.

**Confidence:** MEDIUM -- magick-wasm version 0.0.3 is very early. Edge Function memory limits could be a practical blocker for large images. Needs phase-specific validation with real image sizes.

### Error Monitoring

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@sentry/react-native` | ^8.7.0 | Crash reporting, performance monitoring, session replay | Industry standard for React Native. Expo config plugin for automatic native setup. Source maps uploaded automatically during EAS Build. Supports SDK 50+ (SDK 54 confirmed). Replaces deprecated `sentry-expo` package. |

**Configuration (verified via Sentry Expo docs):**

app.json plugin entry:
```json
["@sentry/react-native/expo", {
  "url": "https://sentry.io/",
  "project": "udamon",
  "organization": "heidi"
}]
```

Metro config addition (metro.config.js):
```js
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const config = getSentryExpoConfig(__dirname);
module.exports = config;
```

Initialization:
```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  sendDefaultPii: true,
});

// Wrap root component
export default Sentry.wrap(App);
```

**Confidence:** HIGH -- verified via Sentry official Expo docs, npm version confirmed, SDK 54 compatibility confirmed.

### Admin Panel Supabase Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@supabase/supabase-js` | ^2.101.1 | Supabase client for admin web | Same SDK used in mobile app. Direct integration without extra framework. Admin panel already has React 18 + Vite + Tailwind -- adding supabase-js is the minimal path. |

**Admin Auth Pattern (verified via Supabase docs):**

The admin panel should NOT use the service_role key in the browser. Instead:

1. **Admin login:** Use `supabase.auth.signInWithPassword()` with admin email/password
2. **Role enforcement:** RLS policies check `auth.jwt() ->> 'role'` or a custom `is_admin` flag in `public.users`
3. **Privileged operations:** Edge Functions with service_role key for admin-only actions (user management, bulk operations)
4. **Environment variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (NEVER expose service_role in browser)

**Why NOT react-admin / ra-supabase:**
The admin UI (20 pages) is already built with custom React + Tailwind. Migrating to react-admin would mean rewriting all 20 pages. The simpler path: add `@supabase/supabase-js` and replace mock data calls with Supabase queries in existing components.

**Confidence:** HIGH -- direct Supabase client usage is the documented standard pattern. No framework migration risk.

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-web-browser` | ~15.0.10 | OAuth browser sessions | Already installed. Used for Kakao/Naver OAuth redirect flows. |
| `expo-crypto` | ~14.0.5 | Nonce generation for Apple Sign-In | Apple auth requires nonce hashing for security. SDK 54 compatible. |
| `expo-video-thumbnails` | ~9.0.8 | Client-side video thumbnail extraction | For photographer video posts. Generates thumbnail frame before upload. Avoid server-side video processing entirely. |

---

## Installation

```bash
# Mobile app -- new packages
cd app
npx expo install @react-native-google-signin/google-signin expo-apple-authentication expo-device expo-constants expo-crypto expo-video-thumbnails @sentry/react-native

# Admin panel -- new packages
cd admin
npm install @supabase/supabase-js@^2.101.1
```

**Note:** Use `npx expo install` (not `npm install`) for Expo packages. This ensures SDK 54-compatible versions are resolved automatically.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@react-native-google-signin/google-signin` (native) | `signInWithOAuth` (browser redirect) | If you want zero native dependencies. But UX is worse (opens browser, returns to app). |
| `expo-apple-authentication` (native) | `signInWithOAuth({ provider: 'apple' })` (browser) | For Android Apple Sign-In fallback. iOS should always use native. |
| Supabase Custom OAuth (Naver) | Self-hosted Edge Function proxy | If you exceed the 3 custom provider limit. Unlikely for this project. |
| `magick-wasm` (Edge Function) | Cloudflare Images (Workers binding) | If budget allows paid Images subscription. Better for dynamic serve-time transforms. |
| `magick-wasm` (Edge Function) | Client-side `expo-image-manipulator` (already installed) | For simple resize before upload. Already in the project. May be sufficient for avatars and community thumbnails. |
| `@sentry/react-native` | Bugsnag, Datadog RUM | If Sentry pricing is a concern. But Sentry has the best Expo integration by far. |
| Direct supabase-js (admin) | ra-supabase (react-admin) | Only for greenfield admin panels. Existing 20-page admin would need full rewrite. |
| Expo Push Service | Direct FCM/APNs | If you need features Expo Push doesn't support (topics, conditional delivery). Overkill for v1. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `sentry-expo` | Deprecated. Only for SDK 49 and earlier. | `@sentry/react-native` ^8.x with Expo config plugin |
| Sharp in Edge Functions | Native binary -- will NOT run in Supabase Deno Edge Functions. | `magick-wasm` or client-side `expo-image-manipulator` |
| Service role key in admin browser | Exposes full database bypass in client-side JS. Anyone can inspect and steal it. | Anon key + RLS policies + Edge Functions for privileged ops |
| `expo-auth-session` for Google/Apple | Works but inferior UX (browser-based). Google/Apple have native SDKs that are smoother. | `@react-native-google-signin/google-signin` + `expo-apple-authentication` |
| Firebase SDK directly for push | Unnecessary complexity. Expo Push Service wraps FCM/APNs transparently. | `expo-notifications` + Expo Push API via Edge Function |
| `react-admin` / `ra-supabase` | Admin UI already built. Migration cost far exceeds benefit. | Direct `@supabase/supabase-js` in existing React components |
| Supabase Realtime for notifications | Out of scope for v1 per PROJECT.md. Adds WebSocket complexity. | Database webhook + Edge Function + Expo Push for async notifications |

---

## Stack Patterns by Feature Area

**If adding a new OAuth provider:**
- Check if Supabase has native support first (Dashboard > Auth > Providers)
- If native: configure in Dashboard, use `signInWithOAuth` (browser) or `signInWithIdToken` (native SDK)
- If not native: use Custom OAuth Provider (max 3 per project, `custom:` prefix required)

**If processing images at upload time:**
- Small images (< 5MB): Supabase Edge Function with `magick-wasm`
- Large images (> 5MB): Client-side resize with `expo-image-manipulator` BEFORE upload
- Thumbnails: Generate at upload, store as separate R2 key with `/thumb/` prefix

**If processing images at serve time:**
- Cloudflare Images binding in Worker (requires paid plan)
- Or: pre-generate all needed sizes at upload and serve static from R2

**If admin needs to perform privileged operations:**
- NEVER give admin browser the service_role key
- Admin authenticates with email/password via Supabase Auth
- Privileged operations (delete user, bulk update) go through Edge Functions that verify admin role and use service_role internally

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `expo` ~54.0.0 | `react-native` 0.81.5 | Pinned together by Expo SDK 54 |
| `@react-native-google-signin/google-signin` ^16.1.2 | Expo SDK 53+ | Requires compileSdkVersion >= 35, kotlinVersion >= 2.0.21 (both met by SDK 54) |
| `expo-apple-authentication` ~7.2.4 | Expo SDK 54 | Use `npx expo install` to get correct version |
| `expo-device` ~8.0.10 | Expo SDK 54 | Use `npx expo install` |
| `expo-constants` ~18.0.13 | Expo SDK 54 | Use `npx expo install` |
| `@sentry/react-native` ^8.7.0 | Expo SDK 50+ | Verified compatible with SDK 54 + RN 0.81 |
| `@supabase/supabase-js` ^2.101.1 | Any (web SDK) | Same version for mobile app and admin panel |
| `magick-wasm` 0.0.3 | Deno (Supabase Edge Functions) | Import via npm: specifier in Deno |

---

## Environment Variables Needed

### Mobile App (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Admin Panel (.env)
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Supabase Secrets (Edge Functions)
```bash
# Already set (R2 upload)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=udamon-media
R2_PUBLIC_URL=https://xxx

# New (push notifications)
EXPO_ACCESS_TOKEN=xxx

# New (Sentry -- optional for Edge Function error tracking)
SENTRY_DSN=xxx
```

### EAS / Build Secrets
```bash
# FCM (Android push)
# Upload google-services.json to EAS
# Upload FCM V1 Service Account Key JSON to EAS

# Sentry
SENTRY_AUTH_TOKEN=xxx

# Google Sign-In
# google-services.json (if using Firebase config plugin variant)
```

---

## External Service Dependencies (Blockers)

| Service | Status | Blocks | Action Required |
|---------|--------|--------|-----------------|
| Apple Developer Account | DUNS pending | Apple Sign-In, iOS builds, APNs | Client must complete DUNS registration |
| Domain (udamonfan.com) | Not purchased | OAuth callback URLs, admin hosting | Client must purchase |
| Firebase Project | Not created | FCM push (Android), google-services.json | Create project, download config files |
| Google Cloud Console | Not configured | Google Sign-In OAuth client IDs | Create Web + Android + iOS OAuth clients |
| Kakao Developers | Not configured | Kakao OAuth | Register app, get REST API key, optionally register as Biz App for email scope |
| Naver Developers | Not configured | Naver OAuth | Register app, get client ID/secret |
| Sentry | Not configured | Error monitoring | Create project, get DSN |
| Cloudflare Images (optional) | Not subscribed | Serve-time image transforms | Subscribe if budget allows ($5/month base) |

---

## Sources

- [Supabase Kakao Auth](https://supabase.com/docs/guides/auth/social-login/auth-kakao) -- Kakao provider setup (HIGH confidence)
- [Supabase Custom OAuth Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) -- Naver via custom provider (HIGH confidence)
- [Supabase Google Auth](https://supabase.com/docs/guides/auth/social-login/auth-google) -- Google signInWithIdToken pattern (HIGH confidence)
- [Supabase Apple Auth](https://supabase.com/docs/guides/auth/social-login/auth-apple) -- Apple signInWithIdToken pattern (HIGH confidence)
- [Supabase Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications) -- Expo push + Edge Function architecture (HIGH confidence)
- [Supabase Image Manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation) -- magick-wasm, Sharp not supported (HIGH confidence)
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) -- Token registration, FCM setup (HIGH confidence)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- Breaking changes, package versions (HIGH confidence)
- [Sentry Expo Manual Setup](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) -- @sentry/react-native config plugin (HIGH confidence)
- [Naver OAuth Endpoints](https://logto.io/oauth-providers-explorer/naver) -- Authorization/token/userinfo URLs (MEDIUM confidence -- third party aggregator, endpoints match known patterns)
- [Cloudflare Images + R2](https://developers.cloudflare.com/images/tutorials/optimize-user-uploaded-image/) -- Workers binding for image transforms (HIGH confidence)
- [Cloudflare Images Pricing](https://developers.cloudflare.com/images/pricing/) -- Paid plan requirement (HIGH confidence)
- npm registry (direct queries) -- Version numbers verified 2026-04-05 (HIGH confidence)

---
*Stack research for: UDAMON KBO fan community + photographer app (brownfield completion)*
*Researched: 2026-04-05*
