# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
udamon/                              # Monorepo root
├── app/                             # React Native (Expo) mobile app
│   ├── App.tsx                      # Root component: provider stack + navigator
│   ├── index.ts                     # Expo entry point
│   ├── app.json                     # Expo config (bundle ID, scheme, icons)
│   ├── eas.json                     # EAS Build profiles
│   ├── package.json
│   ├── tsconfig.json
│   ├── assets/                      # Static images (icon, splash, android icons)
│   └── src/
│       ├── components/              # Reusable UI components
│       │   ├── common/              # Cross-feature shared components (20 files)
│       │   ├── shared/              # App shell components (BottomTabBar, HeaderBar)
│       │   ├── community/           # Community-specific cards/bars
│       │   ├── photographer/        # Photographer-specific components
│       │   └── admin/               # Admin-specific components (in-app)
│       ├── constants/               # App-wide constants
│       │   ├── colors.ts            # Color palette
│       │   ├── config.ts            # Feature flags and app config
│       │   └── teams.ts             # KBO_TEAMS constant array
│       ├── contexts/                # Global state providers (18 files)
│       ├── data/                    # Mock data files
│       │   ├── mockPhotographers.ts
│       │   ├── mockCommunity.ts
│       │   └── mockCheerleaders.ts
│       ├── hooks/                   # Custom React hooks (4 files)
│       ├── i18n/                    # Internationalization
│       │   ├── index.ts             # i18next init
│       │   └── locales/             # Korean locale strings
│       ├── navigation/
│       │   └── MainTabNavigator.tsx # Bottom tab navigator (5 tabs)
│       ├── screens/                 # One file per screen/route
│       │   ├── admin/               # In-app admin screens (6 screens)
│       │   ├── archive/             # Archive screen
│       │   ├── auth/                # Login, Signup, ForgotPassword
│       │   ├── cheerleader/         # Cheerleader profile + list
│       │   ├── community/           # Community main, detail, write, search
│       │   ├── explore/             # Explore, PostDetail, TeamDetail, PlayerDetail, Search
│       │   ├── home/                # Home, FeaturedAll, AllPosts, PopularPhotographers
│       │   ├── message/             # MessageList, MessageDetail
│       │   ├── my/                  # MyPageScreen
│       │   ├── notifications/       # NotificationsScreen
│       │   ├── onboarding/          # OnboardingScreen
│       │   ├── photographer/        # Profile, Register, UploadPost, Studio, CollectionDetail, RevenueManagement
│       │   ├── settings/            # Terms, Privacy, AccountManagement, BlockedUsers, Inquiries, etc.
│       │   ├── social/              # FollowingList
│       │   └── ticket/              # Ticket screens
│       ├── services/                # External API clients
│       │   ├── supabase.ts          # Supabase client singleton
│       │   ├── photographerApi.ts   # Supabase CRUD for photographer domain
│       │   ├── r2Upload.ts          # Cloudflare R2 presigned upload
│       │   └── paymentApi.ts        # Payment API stub
│       ├── styles/
│       │   └── theme.ts             # Design tokens (re-exports colors, spacing, radius, fontSize, etc.)
│       ├── types/                   # TypeScript interfaces
│       │   ├── navigation.ts        # RootStackParamList, MainTabParamList
│       │   ├── photographer.ts      # Photographer, PhotoPost, Player, HomeFeedItem
│       │   ├── community.ts         # CommunityPost, CommunityComment, inputs, sort types
│       │   ├── admin.ts             # AdminStats, UserSanction, Announcement, etc.
│       │   ├── poll.ts              # Poll types
│       │   ├── team.ts              # Team type
│       │   └── cheerleader.ts       # Cheerleader type
│       └── utils/                   # Utility functions
│           ├── haptics.ts           # Haptic feedback helpers
│           ├── image.ts             # Image utility
│           └── time.ts              # timeAgo, formatCount helpers
│
├── admin/                           # React + Vite admin web panel
│   ├── src/
│   │   ├── main.tsx                 # Vite entry: ReactDOM.createRoot
│   │   ├── App.tsx                  # Routes, AuthGuard, provider wrappers
│   │   ├── index.css
│   │   ├── components/              # Admin UI chrome
│   │   │   ├── Layout.tsx           # Page shell with sidebar
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   ├── Modal.tsx            # Generic modal wrapper
│   │   │   └── StatCard.tsx         # Dashboard stat card
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # Hardcoded admin credentials, localStorage session
│   │   │   └── AdminContext.tsx     # All admin mock data + operations (large file ~30KB)
│   │   ├── data/                    # Admin mock data
│   │   ├── pages/                   # One file per admin route (21 pages)
│   │   └── types/                   # Admin type definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── supabase/                        # Supabase project config
│   ├── migrations/                  # Sequential SQL migration files
│   │   ├── 001_teams_players.sql
│   │   ├── 002_community.sql
│   │   ├── 003_polls.sql
│   │   ├── 004_spam_filter.sql
│   │   ├── 005_rls_policies.sql
│   │   ├── 006_seed_teams.sql
│   │   ├── 007_photographer.sql
│   │   ├── 008_photographer_rls.sql
│   │   ├── 009_seed_photographer.sql
│   │   └── 010_deprecate_storage_policies.sql
│   └── functions/
│       └── get-upload-url/
│           └── index.ts             # Deno Edge Function: R2 presigned URL generator
│
├── docs/
│   └── PRD_v1.md                    # Product requirements document
├── _archive/                        # Project reference documents (not source code)
├── udamon_changes/                  # Snapshot of recent changed files (not source code)
└── .planning/                       # GSD planning artifacts
    └── codebase/                    # Codebase analysis documents (this directory)
```

---

## Directory Purposes

**`app/src/contexts/`:**
- Purpose: Global state management through React Context; acts as the in-memory data store
- Contains: 18 provider files, each exporting a `*Provider` component and a `use*()` hook
- Key files:
  - `app/src/contexts/AuthContext.tsx` — user session, login/logout, OAuth, photographer mode activation
  - `app/src/contexts/PhotographerContext.tsx` — photographer/post/player/cheerleader data; conditionally fetches from Supabase or mock
  - `app/src/contexts/CommunityContext.tsx` — community posts, comments, likes, polls; currently mock-only
  - `app/src/contexts/AdminContext.tsx` — in-app admin operations (post review, user sanctions, announcements)

**`app/src/services/`:**
- Purpose: All network I/O; contexts call into this layer
- Contains: 4 files
- Key files:
  - `app/src/services/supabase.ts` — exports `supabase` (SupabaseClient) and `isSupabaseConfigured` (boolean)
  - `app/src/services/photographerApi.ts` — CRUD operations for photographer, photo_posts, players; includes row-to-type mappers
  - `app/src/services/r2Upload.ts` — presigned URL fetch + blob PUT to Cloudflare R2; exports `uploadPostImages`, `uploadCommunityImages`, `uploadAvatar`

**`app/src/screens/`:**
- Purpose: Full-page screens; each file corresponds to one entry in `RootStackParamList` or `MainTabParamList`
- Contains: Feature-grouped subdirectories; screens are co-located with their feature

**`app/src/components/common/`:**
- Purpose: Truly reusable components used across multiple features
- Key components: `PressableScale.tsx`, `FadeInView.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorBoundary.tsx`, `ImageEditorModal.tsx`, `ReportSheet.tsx`, `TeamFilterBar.tsx`

**`app/src/components/shared/`:**
- Purpose: App shell components that frame content
- Key components: `BottomTabBar.tsx` (custom tab bar), `HeaderBar.tsx`, `BottomSheet.tsx`

**`app/src/types/`:**
- Purpose: Source of truth for all TypeScript types; types mirror DB schema with additional UI-facing extensions
- Note: `navigation.ts` is the canonical type definition for all routes; always update here when adding screens

**`admin/src/contexts/AdminContext.tsx`:**
- Purpose: Single large context providing all admin mock data and operations
- Contains: ~30KB; manages posts, reports, users, photographers, announcements, audit logs, analytics, events, ads, etc.
- Note: Entirely mock-based; no Supabase calls

**`supabase/migrations/`:**
- Purpose: Ordered SQL migrations applied to Supabase project
- Generated: No (manually written)
- Committed: Yes

---

## Key File Locations

**Entry Points:**
- `app/index.ts` — Expo app entry (registered with `registerRootComponent`)
- `app/App.tsx` — Provider stack, navigator, deep-link config
- `admin/src/main.tsx` — Vite app entry
- `admin/src/App.tsx` — Routes and auth guard
- `supabase/functions/get-upload-url/index.ts` — Only backend edge function

**Configuration:**
- `app/app.json` — Expo/EAS config (bundle ID, scheme `udamon`, associated domains)
- `app/eas.json` — EAS Build profiles
- `app/src/constants/config.ts` — Feature flags (`SUPPORT_FEATURE_ENABLED`, `MESSAGE_FEATURE_ENABLED`), deep link config
- `app/src/constants/colors.ts` — Full color palette
- `app/src/styles/theme.ts` — All design tokens (spacing, radius, fontSize, fontWeight, shadow, layout)

**Core Logic:**
- `app/src/contexts/AuthContext.tsx` — Authentication, session, OAuth, user profile
- `app/src/contexts/PhotographerContext.tsx` — Primary data layer for photographer feature
- `app/src/services/photographerApi.ts` — All Supabase queries for photographer domain
- `app/src/services/r2Upload.ts` — Image/video upload pipeline

**Navigation:**
- `app/src/types/navigation.ts` — All route param types (`RootStackParamList`, `MainTabParamList`)
- `app/src/navigation/MainTabNavigator.tsx` — 5-tab bottom navigator
- `app/App.tsx` lines 96–115 — Deep link URL-to-screen mapping

**Testing:**
- No test files detected in the codebase

---

## Naming Conventions

**Files:**
- Screens: `PascalCase` with `Screen` suffix — `HomeScreen.tsx`, `PostDetailScreen.tsx`
- Admin screens (in-app): `Admin*Screen.tsx` — `AdminDashboardScreen.tsx`
- Admin pages (web): `PascalCase` with `Page` suffix — `DashboardPage.tsx`, `UserPage.tsx`
- Contexts: `PascalCase` with `Context` suffix — `AuthContext.tsx`, `CommunityContext.tsx`
- Components: `PascalCase` — `PressableScale.tsx`, `TeamFilterBar.tsx`
- Services: `camelCase` with `Api` suffix — `photographerApi.ts`, `r2Upload.ts`
- Types: `camelCase` — `navigation.ts`, `community.ts`
- Hooks: `camelCase` with `use` prefix — `useLoginGate.ts`, `usePushDeepLinkHandler.ts`
- Constants: `camelCase` — `colors.ts`, `teams.ts`, `config.ts`
- Migrations: `NNN_descriptive_name.sql` — `007_photographer.sql`

**Directories:**
- Feature directories: `camelCase` — `photographer/`, `community/`, `cheerleader/`
- General directories: `camelCase` — `common/`, `shared/`, `contexts/`

**Exports:**
- Contexts: Named exports `AuthProvider` + `useAuth`; components default export
- Services: Named exports for all functions
- Types: Named exports (interfaces and types); no default exports

---

## Where to Add New Code

**New Mobile Feature Screen:**
1. Create screen file at `app/src/screens/{feature}/{FeatureName}Screen.tsx`
2. Add route to `RootStackParamList` in `app/src/types/navigation.ts`
3. Register in `app/App.tsx` inside the appropriate stack group
4. If feature needs global state, add context at `app/src/contexts/{Feature}Context.tsx` and nest provider in `App.tsx`

**New Admin Web Page:**
1. Create page at `admin/src/pages/{Name}Page.tsx`
2. Add route in `admin/src/App.tsx` inside the `<AuthGuard>` route group
3. Add navigation link in `admin/src/components/Sidebar.tsx`
4. Extend `admin/src/contexts/AdminContext.tsx` with required mock data and methods

**New Supabase Table:**
1. Write migration SQL at `supabase/migrations/{NNN}_{description}.sql`
2. Add RLS policies in the same or a follow-up migration file
3. Add TypeScript interface to relevant file in `app/src/types/`
4. Add API functions to `app/src/services/photographerApi.ts` or create a new service file

**New Reusable Component:**
- If cross-feature: `app/src/components/common/{ComponentName}.tsx`
- If app shell (navigation, layout): `app/src/components/shared/{ComponentName}.tsx`
- If feature-specific: `app/src/components/{feature}/{ComponentName}.tsx`

**New Service / API Call:**
- Add to `app/src/services/photographerApi.ts` if photographer domain
- Create `app/src/services/{domain}Api.ts` for new domains
- Always return `ApiResult<T>` shape: `{ data: T | null; error: string | null }`

**New Feature Flag:**
- Add constant to `app/src/constants/config.ts`

---

## Special Directories

**`_archive/`:**
- Purpose: Reference documents (analysis reports, spec documents, Word files)
- Generated: No
- Committed: Yes
- Note: Not source code — do not import from here

**`udamon_changes/`:**
- Purpose: Snapshot copies of recently changed files for reference
- Generated: No
- Committed: Yes
- Note: Not source code — do not import from here

**`app/dist/`:**
- Purpose: Expo web build output
- Generated: Yes
- Committed: Not intentional (should be in .gitignore)

**`admin/dist/`:**
- Purpose: Vite production build output
- Generated: Yes
- Committed: Not intentional

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents for AI-assisted planning
- Generated: By GSD mapper agent
- Committed: Yes

---

*Structure analysis: 2026-04-05*
