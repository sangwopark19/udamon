# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Dual-application monorepo with shared Supabase backend

The project is split into two independent front-end applications sharing the same Supabase database and Edge Function layer:
- `app/` — React Native (Expo) mobile app for KBO fan users
- `admin/` — React + Vite web panel for administrators

**Key Characteristics:**
- Context-as-store pattern: global state is managed through React Context providers, not Redux or Zustand
- Mock-first data: both apps currently use in-memory mock data; real Supabase calls are gated by `isSupabaseConfigured` flag
- Feature-flag controlled: some features (messaging, ticketing) are disabled via constants in `app/src/constants/config.ts`
- Dual admin surface: light in-app admin screens inside the mobile app + a full admin web panel

---

## Layers

### Mobile App (`app/`)

**Navigation Layer:**
- Purpose: Defines screen hierarchy and deep-link routing
- Location: `app/App.tsx`, `app/src/navigation/MainTabNavigator.tsx`
- Contains: Root stack navigator (NativeStack), bottom tab navigator, deep-link `linking` config
- Depends on: AuthContext (to decide initial route), React Navigation
- Used by: All screens

**Context / State Layer:**
- Purpose: All domain state lives here — acts as the app's data store and business logic hub
- Location: `app/src/contexts/`
- Contains: 18 context providers (AuthContext, PhotographerContext, CommunityContext, AdminContext, etc.)
- Depends on: `app/src/services/` for remote calls, `app/src/data/` for mock fallbacks
- Used by: All screens and components via `use*` hooks

**Screen Layer:**
- Purpose: Full-page UI components, one per route entry
- Location: `app/src/screens/`
- Contains: Feature-grouped subdirectories (home, explore, community, photographer, auth, settings, admin, etc.)
- Depends on: Context layer, component layer, navigation types
- Used by: Navigation layer

**Component Layer:**
- Purpose: Reusable UI pieces, not tied to a single route
- Location: `app/src/components/`
- Contains: Subdirectories per domain (`common/`, `shared/`, `community/`, `photographer/`, `admin/`)
- Depends on: styles/theme, constants, utils
- Used by: Screen layer

**Service Layer:**
- Purpose: All external API calls (Supabase, R2 upload)
- Location: `app/src/services/`
- Contains: `supabase.ts` (client singleton), `photographerApi.ts` (Supabase CRUD), `r2Upload.ts` (R2 presigned upload), `paymentApi.ts`
- Depends on: Supabase JS client, fetch
- Used by: Context layer (PhotographerContext calls photographerApi; contexts call r2Upload)

**Type Layer:**
- Purpose: Shared TypeScript interfaces matching DB schema and UI shapes
- Location: `app/src/types/`
- Contains: `navigation.ts`, `photographer.ts`, `community.ts`, `admin.ts`, `poll.ts`, `team.ts`
- Depends on: Nothing
- Used by: All layers

---

### Admin Web (`admin/`)

**App Entry:**
- Purpose: Route definitions and auth guard
- Location: `admin/src/App.tsx`, `admin/src/main.tsx`
- Contains: BrowserRouter, AuthGuard HOC, all page routes

**Context / State Layer:**
- Purpose: Admin-specific state; fully mock-based
- Location: `admin/src/contexts/`
- Contains: `AdminContext.tsx` (large all-in-one mock data store), `AuthContext.tsx` (hardcoded admin credentials)
- Depends on: `admin/src/data/mock` (large mock data file)
- Used by: All pages

**Page Layer:**
- Purpose: Full-page admin views, one per route
- Location: `admin/src/pages/`
- Contains: 21 pages (DashboardPage, PostReviewPage, UserPage, PhotographerPage, SystemSettingsPage, etc.)
- Depends on: AdminContext, AuthContext, local component layer
- Used by: App router

**Component Layer:**
- Purpose: Admin-specific UI chrome and shared widgets
- Location: `admin/src/components/`
- Contains: `Layout.tsx`, `Sidebar.tsx`, `Modal.tsx`, `StatCard.tsx`
- Depends on: Nothing external
- Used by: Page layer

---

### Supabase Backend

**Database:**
- Location: `supabase/migrations/` (10 sequential migration files)
- Tables: teams, players, community_posts, community_comments, community_polls, spam_filter, photo_posts, photographers, pg_collections, etc.
- RLS: Defined in `supabase/migrations/005_rls_policies.sql` and `supabase/migrations/008_photographer_rls.sql`

**Edge Functions:**
- Location: `supabase/functions/get-upload-url/index.ts`
- Purpose: Authenticates user via Supabase JWT, then generates presigned PUT URLs for Cloudflare R2
- Runtime: Deno

---

## Data Flow

### Photographer Post Upload (Mobile App → R2 → Supabase)

1. User selects images in `app/src/screens/photographer/UploadPostScreen.tsx`
2. `uploadPostImages()` in `app/src/services/r2Upload.ts` is called with local URIs and access token
3. `r2Upload.ts` POSTs to Supabase Edge Function `get-upload-url` with `{ prefix, contentType, count }`
4. Edge function verifies JWT, calls R2 (S3-compatible API via AWS SDK), returns presigned PUT URLs
5. `r2Upload.ts` PUTs blob data directly to R2 presigned URLs
6. Public R2 URLs are returned to `UploadPostScreen`
7. Screen calls PhotographerContext which calls `photographerApi.ts` to INSERT the post row into Supabase DB with image URLs

### Screen Data Consumption (App)

1. Screen mounts and calls `usePhotographer()` or `useCommunity()` hook
2. Hook returns data from the matching Context provider
3. On mount, Context checks `isSupabaseConfigured` flag
4. If configured: Context calls service layer (`photographerApi.ts`) to fetch from Supabase
5. If not configured: Context uses mock data from `app/src/data/`
6. Screen renders data; mutations (like, comment, follow) are dispatched back through context methods

### Auth Flow (Mobile)

1. `App.tsx` wraps everything in `AuthProvider`
2. `AppNavigator` reads `{ loading, isAuthenticated, guestMode }` from `useAuth()`
3. Before auth: only Login/Signup/ForgotPassword/Terms/Privacy screens are available
4. After auth: full screen tree including admin screens (gated by `is_admin` on user profile) is available
5. Onboarding check via `AsyncStorage.getItem('onboarding_complete')` happens before routing
6. Social login (Google, Apple, Kakao, Naver) uses `expo-web-browser` OAuth flow via Supabase Auth

### Admin Web Auth Flow

1. `admin/src/contexts/AuthContext.tsx` stores session in `localStorage`
2. Credentials are currently hardcoded: `admin@udamon.com` / `admin1234`
3. `AuthGuard` in `admin/src/App.tsx` redirects to `/login` if not authenticated
4. `AdminProvider` wraps all protected routes and provides all mock data

**State Management:**
- Mobile app: 18 React Context providers nested in `App.tsx`; no external state library
- Admin web: 2 React Context providers (AuthContext, AdminContext); all data is mock
- Persisted state: Auth session via `AsyncStorage` (mobile), `localStorage` (admin web)

---

## Key Abstractions

**`isSupabaseConfigured` Flag:**
- Purpose: Allows app to run on mock data when env vars are missing
- Location: `app/src/services/supabase.ts`
- Pattern: Boolean derived from presence of `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; used as branch condition in contexts

**`ApiResult<T>` Generic:**
- Purpose: Uniform error-or-data return shape from service layer
- Location: `app/src/services/photographerApi.ts`
- Pattern: `{ data: T | null; error: string | null }`

**`HomeFeedItem` Discriminated Union:**
- Purpose: Merge photo posts and community posts into a single home feed list
- Location: `app/src/types/photographer.ts`
- Pattern: `{ type: 'photo'; data: PhotoPost } | { type: 'community'; data: CommunityPostWithAuthor }`

**`RootStackParamList` / `MainTabParamList`:**
- Purpose: Type-safe navigation params across all screens
- Location: `app/src/types/navigation.ts`
- Pattern: TypeScript type maps consumed by React Navigation generics

**Context Provider Pattern:**
- Purpose: Feature-scoped state container exposed as a typed hook
- Example: `app/src/contexts/PhotographerContext.tsx` exports `PhotographerProvider` and `usePhotographer()`
- Pattern: `createContext<T | null>(null)` → Provider with useState/useCallback logic → exported `use*` hook that throws if used outside provider

---

## Entry Points

**Mobile App:**
- Location: `app/index.ts` → `app/App.tsx`
- Triggers: Expo bundler (`npx expo start`)
- Responsibilities: Bootstraps i18n, wraps entire tree in provider stack (15+ providers), renders `AppNavigator`

**Admin Web:**
- Location: `admin/src/main.tsx` → `admin/src/App.tsx`
- Triggers: Vite dev server (`npm run dev` in `admin/`)
- Responsibilities: Renders BrowserRouter, AuthProvider, route tree with AuthGuard

**Supabase Edge Function:**
- Location: `supabase/functions/get-upload-url/index.ts`
- Triggers: HTTP POST to `{SUPABASE_URL}/functions/v1/get-upload-url`
- Responsibilities: Authenticate JWT, validate prefix/contentType/count, generate R2 presigned PUT URLs

---

## Error Handling

**Strategy:** Inconsistent — service layer returns `ApiResult<T>` objects; contexts swallow errors silently in some places; screens display error state UI selectively

**Patterns:**
- Service layer: `try/catch` wrapping Supabase calls, returns `{ data: null, error: message }`
- Contexts: Check `error` field from service calls; some log to console, others silently fall back to mock data
- Top-level: `app/src/components/common/ErrorBoundary.tsx` wraps entire app as last-resort catch
- Edge function: Returns structured `{ error: string }` JSON with appropriate HTTP status codes

---

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` only — no structured logging library

**Validation:** Mostly at UI level (form state in screens); Edge Function has server-side type/size/count validation

**Authentication:**
- Mobile: Supabase Auth with JWT; session managed by `AuthContext`; social OAuth via `expo-web-browser`
- Admin web: Hardcoded credentials in `AuthContext`; session persisted in `localStorage`

**Internationalization:** `react-i18next` with Korean locale at `app/src/i18n/locales/`; initialized in `app/index.ts` via `import './src/i18n'`

**Deep Links:** Configured in `app/App.tsx` via React Navigation `linking` config; push notification deep links handled by `app/src/hooks/usePushDeepLinkHandler.ts`

---

*Architecture analysis: 2026-04-05*
