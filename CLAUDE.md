<!-- GSD:project-start source:PROJECT.md -->
## Project

**UDAMON (우다몬)**

KBO 팬과 팬 포토그래퍼를 위한 모바일 커뮤니티 앱. React Native Expo 모바일 앱 + React/Vite 어드민 웹으로 구성되며, Supabase를 백엔드로 사용한다. 현재 UI 프로토타입 단계에서 실제 Supabase 연동을 완성하여 2026년 5월 중순 v1 런칭이 목표다.

**Core Value:** KBO 팬이 구단별 커뮤니티에서 소통하고, 팬 포토그래퍼가 경기 사진/영상을 공유할 수 있는 공간 — 인증부터 어드민까지 실제 동작하는 완성된 앱.

### Constraints

- **Timeline**: 2026년 5월 중순 v1 런칭 — 약 6주
- **Tech stack**: 기존 스택 유지 (Expo SDK 54, Supabase, R2, Vite)
- **Dependencies**: Apple Developer, 도메인, Firebase는 클라이언트 측 진행 필요
- **Auth**: Supabase Auth 사용 (Google/Apple/Kakao/Naver 4종)
- **Admin**: 1~2명, 역할 구분 불필요
- **Environment**: v1에서는 단일 Supabase 프로젝트 (dev/prod 분리 없음)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~5.9.2 - Mobile app (`app/`) and all source files
- TypeScript ~5.6.2 - Admin web panel (`admin/`)
- SQL (PostgreSQL dialect) - Supabase migrations (`supabase/migrations/`)
- TypeScript (Deno runtime) - Supabase Edge Functions (`supabase/functions/`)
## Runtime
- React Native 0.81.5 via Expo ~54.0.0
- Node.js (dev tooling only; runtime is JSC/Hermes on device)
- Browser (served via Vite dev server, port 5173)
- Deno (Supabase managed runtime)
## Package Manager
- npm
- Lockfile: `app/package-lock.json` present
- npm
- Lockfile: present (not shown but `"type": "module"` in package.json)
## Frameworks
- Expo ~54.0.0 - React Native toolchain, OTA updates, EAS Build
- React 19.1.0 - UI rendering
- React Native 0.81.5 - Native platform layer
- React Navigation 7.x - Screen routing (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)
- React 18.3.1 - UI rendering
- Vite 6.0.1 - Build tool and dev server (`admin/vite.config.ts`)
- React Router DOM 6.28.0 - Client-side routing
- Not detected in either `package.json`
- EAS CLI (>= 12.0.0) - Expo Application Services for iOS/Android builds (`app/eas.json`)
- `@vitejs/plugin-react` 4.3.4 - Vite React plugin (`admin/`)
- TypeScript compiler (`tsc -b`) - Used in admin build pipeline
## Key Dependencies
- `@supabase/supabase-js` ^2.100.0 - Backend client (auth + database)
- `expo` ~54.0.0 - Platform SDK
- `react-native` 0.81.5 - Native runtime
- `@react-navigation/native` ^7.1.33 - Navigation core
- `expo-image-picker` ~17.0.10 - Camera/gallery access for photo uploads
- `expo-image-manipulator` ~14.0.8 - Client-side image crop/rotate before upload
- `expo-haptics` ~15.0.8 - Tactile feedback
- `expo-linear-gradient` ~15.0.8 - Gradient UI elements
- `expo-notifications` ~0.32.16 - Push notification registration and handling
- `expo-web-browser` ~15.0.10 - OAuth in-app browser session (`WebBrowser.openAuthSessionAsync`)
- `@react-native-async-storage/async-storage` 2.2.0 - Session persistence (test accounts, auth state)
- `i18next` ^25.10.4 - i18n framework
- `react-i18next` ^16.6.1 - React bindings
- `expo-localization` ~17.0.8 - Device locale detection
- Locale files: `app/src/i18n/locales/ko.ts` (Korean only currently)
- `react-native-web` ^0.21.0 - Web target support via `expo start --web`
- `react-dom` 19.1.0 - Required for web target
- `react-router-dom` ^6.28.0 - Routing
- `lucide-react` ^0.468.0 - Icon library
- `tailwindcss` ^3.4.15 - Utility CSS (`admin/tailwind.config.js`)
- `autoprefixer` ^10.4.20 + `postcss` ^8.4.49 - CSS processing
- `@aws-sdk/client-s3@3` (npm: Deno) - S3-compatible client for R2
- `@aws-sdk/s3-request-presigner@3` (npm: Deno) - Presigned URL generation
- `@supabase/supabase-js@2` (npm: Deno) - Auth token verification
## Configuration
- `app/.env` file present (contents not read)
- Variables accessed via `process.env.EXPO_PUBLIC_*`:
- Client initialised in `app/src/services/supabase.ts` with graceful fallback to dummy values when env vars are absent
- Injected automatically by Supabase runtime:
- Must be set as Supabase secrets:
- Mobile app: `app/tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`
- Admin: `admin/tsconfig.json` (standard Vite/React setup)
- Mobile: `app/eas.json` — three profiles: `development` (internal), `preview` (APK/simulator), `production` (auto-increment)
- Admin: `admin/vite.config.ts` — single plugin (`@vitejs/plugin-react`), dev port 5173
## Platform Requirements
- Node.js (for npm, Expo CLI, Vite)
- Expo Go or development build on iOS/Android device or simulator
- Supabase project with Edge Function deployed
- iOS: Bundle ID `com.udamonfan.app`, Associated Domain `applinks:udamonfan.com`
- Android: Package `com.udamonfan.app`, Intent filters for `https://udamonfan.com/post` and `https://udamonfan.com/@`
- EAS project ID: `bdc10dd6-5555-4594-a592-8c1e1ba17e8c`
- Admin panel: Static hosting (Vite build output in `admin/dist/`)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## Naming Patterns
- Screen files: `PascalCase` + `Screen` suffix — `CommunityPostDetailScreen.tsx`, `HomeScreen.tsx`
- Component files: `PascalCase` — `EmptyState.tsx`, `PressableScale.tsx`, `StatCard.tsx`
- Context files: `PascalCase` + `Context` suffix — `AuthContext.tsx`, `CommunityContext.tsx`
- Hook files: `camelCase` + `use` prefix — `useLoginGate.ts`, `usePushDeepLinkHandler.ts`
- Utility files: `camelCase` — `time.ts`, `haptics.ts`, `image.ts`
- Type files: `camelCase` domain name — `community.ts`, `navigation.ts`, `photographer.ts`
- React components: `PascalCase` function names with `export default function`
- Hooks: `camelCase` starting with `use`
- Event handlers: `handle` prefix — `handleBack`, `handleLikePost`, `handleSubmitComment`
- Context consumers: `use` prefix matching provider name — `useAuth`, `useCommunity`, `useToast`
- Boolean state: descriptive — `isLoading`, `refreshing`, `ready`, `onboardingDone`
- ID strings: `camelCase` with `Id` suffix — `postId`, `userId`, `photographerId`
- Navigation type aliases: short uppercase — `type Nav = NativeStackNavigationProp<...>`, `type Route = RouteProp<...>`
- Module-level constants: `SCREAMING_SNAKE_CASE` — `PAGE_SIZE`, `COMMENT_MAX`, `TRENDING_WINDOW_MS`, `MAX_TRENDING`
- Layout dimensions: `SCREAMING_SNAKE_CASE` — `CARD_WIDTH`, `SCREEN_WIDTH`, `GRID_PADDING`
- Object shapes (props, context values, DB rows): `interface`
- Union types, aliases, callback signatures: `type`
- Props interfaces named `Props` for local usage, `XxxProps` when exported
- DB row interfaces: `PascalCase` domain name — `CommunityPost`, `CommunityComment`
- Joined/augmented DB types: `WithAuthor` suffix — `CommunityPostWithAuthor`
- Input types: `CreateXxxInput`, `UpdateXxxInput`
## Code Style
- No Prettier or ESLint config detected in either package — no enforced formatter
- Indentation: 2 spaces (consistent throughout)
- Single quotes for strings in imports; JSX uses double quotes for prop strings
- Trailing commas present in multiline arrays/objects
- `strict: true` in both packages
- No `any` — unknown errors handled with `e instanceof Error` pattern (see `r2Upload.ts`)
- Explicit return types on exported async functions returning `{ success: boolean; error?: string }`
- Type imports use `import type { ... }` consistently
- `as const` on all design token objects (`colors`, `fontSize`, `fontWeight`, `radius`, `spacing`, `shadow`)
## Import Organization
- None — all imports use relative paths (`../../contexts/AuthContext`)
- Named imports for hooks, utilities, types: `import { useAuth } from '../../contexts/AuthContext'`
- Default imports for components and screens
- `import type` for all type-only imports
## Error Handling
- Service functions return a discriminated union `{ data: T | null; error: string | null }` — see `r2Upload.ts`
- Auth operations return `{ success: boolean; error?: string }` — see `AuthContext.tsx`
- Errors are caught with `catch (e: unknown)` and narrowed: `e instanceof Error ? e.message : 'Upload failed'`
- Inline error check: `const { data, error } = await supabase.from(...).select(...); if (error) { console.error(...); return null; }`
- Non-critical failures use `console.warn` and fall back gracefully (apply updates locally when Supabase unreachable)
- `Alert.alert(...)` for destructive confirmations (delete, report)
- `showToast(message, 'error')` for lightweight feedback
- Top-level `ErrorBoundary` class component wraps the entire app at `App.tsx` line 245
- Single instance at app root: `app/src/components/common/ErrorBoundary.tsx`
- Logs to `console.error('[ErrorBoundary]', error)` and renders a retry button
## Logging
- OAuth flow logs use `[OAuth]` prefix: `console.log('[OAuth] ...')`
- Deep link logs use `[Deep Link]` prefix
- ErrorBoundary uses `[ErrorBoundary]` prefix
- Auth errors: `console.error('fetchUserProfile error:', error)`
- Non-critical fallbacks: `console.warn('Supabase unreachable, applying locally')`
- `console.log` used only in auth/OAuth flow (not scattered in business logic)
## Comments
- Section dividers using `// ─── Section Name ───` horizontal rule style — used extensively in long files
- Block comments for non-obvious algorithms (trending score calculation, OAuth session extraction)
- JSDoc-style `/** ... */` for exported hooks explaining usage contract (see `useLoginGate.ts`)
- Inline comments for dev-only bypasses: `// Dev test accounts — bypass Supabase`
- Korean comments acceptable for internal notes: `// 환경변수 미설정 시에도 크래시하지 않도록`
## Component Design
- Props destructured inline: `export default function Foo({ variant = 'generic', title, onAction }: Props)`
- Optional props use `?` in interface, with defaults in destructuring
- Children typed as `ReactNode` from React
- `useState` for local UI state
- `useCallback` for all event handlers (prevents re-renders in contexts)
- `useMemo` for derived data (filtered lists, trees, computed values)
- `useRef` for mutable values that don't trigger re-renders (animations, timers, pending flags)
- `useEffect` for side effects (session init, subscriptions, deep links)
- Small helper components (e.g., `CommentItem`, `SplashScreen`, `PushHandler`) defined in the same file as their parent screen, below the main export
- Sub-component props typed with a local `interface XxxProps` immediately before the function
- `accessibilityLabel` on interactive elements using i18n keys: `accessibilityLabel={t('a11y_back')}`
- `activeOpacity={0.7}` on `TouchableOpacity` consistently
## Styling (app)
- Safe area: `{ paddingTop: insets.top }` applied inline
- Conditional: array syntax `[styles.base, condition && styles.variant]`
- Theme tokens used for all visual values — never raw hex/numeric literals except in the token files themselves
- Always import from `../../styles/theme`, not from `../../constants/colors` directly (theme re-exports colors)
## Styling (admin)
- Dynamic colors applied with `style={{ backgroundColor: color + '15' }}`
- Responsive utilities: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
## Context Pattern
## Module Design
- Default export for components and screens (one per file)
- Named exports for utilities, hooks, context providers, and types
- No barrel `index.ts` files — all imports use direct file paths
- All user-facing strings go through `useTranslation()` / `i18n.t()`
- Translation keys defined in `app/src/i18n/locales/ko.ts`
- Keys use `snake_case` — `community_post_delete`, `toast_comment_sent`, `a11y_back`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- `app/` — React Native (Expo) mobile app for KBO fan users
- `admin/` — React + Vite web panel for administrators
- Context-as-store pattern: global state is managed through React Context providers, not Redux or Zustand
- Mock-first data: both apps currently use in-memory mock data; real Supabase calls are gated by `isSupabaseConfigured` flag
- Feature-flag controlled: some features (messaging, ticketing) are disabled via constants in `app/src/constants/config.ts`
- Dual admin surface: light in-app admin screens inside the mobile app + a full admin web panel
## Layers
### Mobile App (`app/`)
- Purpose: Defines screen hierarchy and deep-link routing
- Location: `app/App.tsx`, `app/src/navigation/MainTabNavigator.tsx`
- Contains: Root stack navigator (NativeStack), bottom tab navigator, deep-link `linking` config
- Depends on: AuthContext (to decide initial route), React Navigation
- Used by: All screens
- Purpose: All domain state lives here — acts as the app's data store and business logic hub
- Location: `app/src/contexts/`
- Contains: 18 context providers (AuthContext, PhotographerContext, CommunityContext, AdminContext, etc.)
- Depends on: `app/src/services/` for remote calls, `app/src/data/` for mock fallbacks
- Used by: All screens and components via `use*` hooks
- Purpose: Full-page UI components, one per route entry
- Location: `app/src/screens/`
- Contains: Feature-grouped subdirectories (home, explore, community, photographer, auth, settings, admin, etc.)
- Depends on: Context layer, component layer, navigation types
- Used by: Navigation layer
- Purpose: Reusable UI pieces, not tied to a single route
- Location: `app/src/components/`
- Contains: Subdirectories per domain (`common/`, `shared/`, `community/`, `photographer/`, `admin/`)
- Depends on: styles/theme, constants, utils
- Used by: Screen layer
- Purpose: All external API calls (Supabase, R2 upload)
- Location: `app/src/services/`
- Contains: `supabase.ts` (client singleton), `photographerApi.ts` (Supabase CRUD), `r2Upload.ts` (R2 presigned upload), `paymentApi.ts`
- Depends on: Supabase JS client, fetch
- Used by: Context layer (PhotographerContext calls photographerApi; contexts call r2Upload)
- Purpose: Shared TypeScript interfaces matching DB schema and UI shapes
- Location: `app/src/types/`
- Contains: `navigation.ts`, `photographer.ts`, `community.ts`, `admin.ts`, `poll.ts`, `team.ts`
- Depends on: Nothing
- Used by: All layers
### Admin Web (`admin/`)
- Purpose: Route definitions and auth guard
- Location: `admin/src/App.tsx`, `admin/src/main.tsx`
- Contains: BrowserRouter, AuthGuard HOC, all page routes
- Purpose: Admin-specific state; fully mock-based
- Location: `admin/src/contexts/`
- Contains: `AdminContext.tsx` (large all-in-one mock data store), `AuthContext.tsx` (hardcoded admin credentials)
- Depends on: `admin/src/data/mock` (large mock data file)
- Used by: All pages
- Purpose: Full-page admin views, one per route
- Location: `admin/src/pages/`
- Contains: 21 pages (DashboardPage, PostReviewPage, UserPage, PhotographerPage, SystemSettingsPage, etc.)
- Depends on: AdminContext, AuthContext, local component layer
- Used by: App router
- Purpose: Admin-specific UI chrome and shared widgets
- Location: `admin/src/components/`
- Contains: `Layout.tsx`, `Sidebar.tsx`, `Modal.tsx`, `StatCard.tsx`
- Depends on: Nothing external
- Used by: Page layer
### Supabase Backend
- Location: `supabase/migrations/` (10 sequential migration files)
- Tables: teams, players, community_posts, community_comments, community_polls, spam_filter, photo_posts, photographers, pg_collections, etc.
- RLS: Defined in `supabase/migrations/005_rls_policies.sql` and `supabase/migrations/008_photographer_rls.sql`
- Location: `supabase/functions/get-upload-url/index.ts`
- Purpose: Authenticates user via Supabase JWT, then generates presigned PUT URLs for Cloudflare R2
- Runtime: Deno
## Data Flow
### Photographer Post Upload (Mobile App → R2 → Supabase)
### Screen Data Consumption (App)
### Auth Flow (Mobile)
### Admin Web Auth Flow
- Mobile app: 18 React Context providers nested in `App.tsx`; no external state library
- Admin web: 2 React Context providers (AuthContext, AdminContext); all data is mock
- Persisted state: Auth session via `AsyncStorage` (mobile), `localStorage` (admin web)
## Key Abstractions
- Purpose: Allows app to run on mock data when env vars are missing
- Location: `app/src/services/supabase.ts`
- Pattern: Boolean derived from presence of `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; used as branch condition in contexts
- Purpose: Uniform error-or-data return shape from service layer
- Location: `app/src/services/photographerApi.ts`
- Pattern: `{ data: T | null; error: string | null }`
- Purpose: Merge photo posts and community posts into a single home feed list
- Location: `app/src/types/photographer.ts`
- Pattern: `{ type: 'photo'; data: PhotoPost } | { type: 'community'; data: CommunityPostWithAuthor }`
- Purpose: Type-safe navigation params across all screens
- Location: `app/src/types/navigation.ts`
- Pattern: TypeScript type maps consumed by React Navigation generics
- Purpose: Feature-scoped state container exposed as a typed hook
- Example: `app/src/contexts/PhotographerContext.tsx` exports `PhotographerProvider` and `usePhotographer()`
- Pattern: `createContext<T | null>(null)` → Provider with useState/useCallback logic → exported `use*` hook that throws if used outside provider
## Entry Points
- Location: `app/index.ts` → `app/App.tsx`
- Triggers: Expo bundler (`npx expo start`)
- Responsibilities: Bootstraps i18n, wraps entire tree in provider stack (15+ providers), renders `AppNavigator`
- Location: `admin/src/main.tsx` → `admin/src/App.tsx`
- Triggers: Vite dev server (`npm run dev` in `admin/`)
- Responsibilities: Renders BrowserRouter, AuthProvider, route tree with AuthGuard
- Location: `supabase/functions/get-upload-url/index.ts`
- Triggers: HTTP POST to `{SUPABASE_URL}/functions/v1/get-upload-url`
- Responsibilities: Authenticate JWT, validate prefix/contentType/count, generate R2 presigned PUT URLs
## Error Handling
- Service layer: `try/catch` wrapping Supabase calls, returns `{ data: null, error: message }`
- Contexts: Check `error` field from service calls; some log to console, others silently fall back to mock data
- Top-level: `app/src/components/common/ErrorBoundary.tsx` wraps entire app as last-resort catch
- Edge function: Returns structured `{ error: string }` JSON with appropriate HTTP status codes
## Cross-Cutting Concerns
- Mobile: Supabase Auth with JWT; session managed by `AuthContext`; social OAuth via `expo-web-browser`
- Admin web: Hardcoded credentials in `AuthContext`; session persisted in `localStorage`
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
