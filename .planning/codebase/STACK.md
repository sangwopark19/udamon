# Technology Stack

**Analysis Date:** 2026-04-05

## Languages

**Primary:**
- TypeScript ~5.9.2 - Mobile app (`app/`) and all source files
- TypeScript ~5.6.2 - Admin web panel (`admin/`)
- SQL (PostgreSQL dialect) - Supabase migrations (`supabase/migrations/`)

**Secondary:**
- TypeScript (Deno runtime) - Supabase Edge Functions (`supabase/functions/`)

## Runtime

**Mobile App:**
- React Native 0.81.5 via Expo ~54.0.0
- Node.js (dev tooling only; runtime is JSC/Hermes on device)

**Admin Web Panel:**
- Browser (served via Vite dev server, port 5173)

**Edge Functions:**
- Deno (Supabase managed runtime)

## Package Manager

**Mobile App (`app/`):**
- npm
- Lockfile: `app/package-lock.json` present

**Admin (`admin/`):**
- npm
- Lockfile: present (not shown but `"type": "module"` in package.json)

## Frameworks

**Mobile App:**
- Expo ~54.0.0 - React Native toolchain, OTA updates, EAS Build
- React 19.1.0 - UI rendering
- React Native 0.81.5 - Native platform layer
- React Navigation 7.x - Screen routing (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`)

**Admin Web Panel:**
- React 18.3.1 - UI rendering
- Vite 6.0.1 - Build tool and dev server (`admin/vite.config.ts`)
- React Router DOM 6.28.0 - Client-side routing

**Testing:**
- Not detected in either `package.json`

**Build/Dev:**
- EAS CLI (>= 12.0.0) - Expo Application Services for iOS/Android builds (`app/eas.json`)
- `@vitejs/plugin-react` 4.3.4 - Vite React plugin (`admin/`)
- TypeScript compiler (`tsc -b`) - Used in admin build pipeline

## Key Dependencies

**Mobile App — Critical:**
- `@supabase/supabase-js` ^2.100.0 - Backend client (auth + database)
- `expo` ~54.0.0 - Platform SDK
- `react-native` 0.81.5 - Native runtime
- `@react-navigation/native` ^7.1.33 - Navigation core

**Mobile App — Media & UX:**
- `expo-image-picker` ~17.0.10 - Camera/gallery access for photo uploads
- `expo-image-manipulator` ~14.0.8 - Client-side image crop/rotate before upload
- `expo-haptics` ~15.0.8 - Tactile feedback
- `expo-linear-gradient` ~15.0.8 - Gradient UI elements
- `expo-notifications` ~0.32.16 - Push notification registration and handling
- `expo-web-browser` ~15.0.10 - OAuth in-app browser session (`WebBrowser.openAuthSessionAsync`)

**Mobile App — Data & State:**
- `@react-native-async-storage/async-storage` 2.2.0 - Session persistence (test accounts, auth state)

**Mobile App — Internationalisation:**
- `i18next` ^25.10.4 - i18n framework
- `react-i18next` ^16.6.1 - React bindings
- `expo-localization` ~17.0.8 - Device locale detection
- Locale files: `app/src/i18n/locales/ko.ts` (Korean only currently)

**Mobile App — Web Compatibility:**
- `react-native-web` ^0.21.0 - Web target support via `expo start --web`
- `react-dom` 19.1.0 - Required for web target

**Admin Web Panel — Critical:**
- `react-router-dom` ^6.28.0 - Routing
- `lucide-react` ^0.468.0 - Icon library
- `tailwindcss` ^3.4.15 - Utility CSS (`admin/tailwind.config.js`)
- `autoprefixer` ^10.4.20 + `postcss` ^8.4.49 - CSS processing

**Edge Function — R2 Upload:**
- `@aws-sdk/client-s3@3` (npm: Deno) - S3-compatible client for R2
- `@aws-sdk/s3-request-presigner@3` (npm: Deno) - Presigned URL generation
- `@supabase/supabase-js@2` (npm: Deno) - Auth token verification

## Configuration

**Environment (Mobile App):**
- `app/.env` file present (contents not read)
- Variables accessed via `process.env.EXPO_PUBLIC_*`:
  - `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `EXPO_PUBLIC_SUPABASE_KEY` - Supabase publishable key
- Client initialised in `app/src/services/supabase.ts` — throws Error when env vars are absent (fail-closed)

**Environment (Edge Function):**
- Injected automatically by Supabase runtime:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Must be set as Supabase secrets:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_URL`

**TypeScript:**
- Mobile app: `app/tsconfig.json` extends `expo/tsconfig.base` with `"strict": true`
- Admin: `admin/tsconfig.json` (standard Vite/React setup)

**Build:**
- Mobile: `app/eas.json` — three profiles: `development` (internal), `preview` (APK/simulator), `production` (auto-increment)
- Admin: `admin/vite.config.ts` — single plugin (`@vitejs/plugin-react`), dev port 5173

## Platform Requirements

**Development:**
- Node.js (for npm, Expo CLI, Vite)
- Expo Go or development build on iOS/Android device or simulator
- Supabase project with Edge Function deployed

**Production:**
- iOS: Bundle ID `com.udamonfan.app`, Associated Domain `applinks:udamonfan.com`
- Android: Package `com.udamonfan.app`, Intent filters for `https://udamonfan.com/post` and `https://udamonfan.com/@`
- EAS project ID: `bdc10dd6-5555-4594-a592-8c1e1ba17e8c`
- Admin panel: Static hosting (Vite build output in `admin/dist/`)

---

*Stack analysis: 2026-04-05*
