---
phase: 02-authentication
plan: 02
subsystem: auth-onboarding
tags: [profile-setup, onboarding, nickname, team-selection]
dependency_graph:
  requires: [02-01]
  provides: [profile-onboarding, nickname-validation, team-selection-ui]
  affects: [app-navigation, auth-context]
tech_stack:
  added: []
  patterns: [debounce-uniqueness-check, conditional-navigation-routing, 30-day-change-limit]
key_files:
  created:
    - app/src/screens/onboarding/ProfileSetupScreen.tsx
  modified:
    - app/src/types/navigation.ts
    - app/App.tsx
    - app/src/contexts/AuthContext.tsx
    - app/src/i18n/locales/ko.ts
decisions:
  - ProfileSetup is a separate screen from existing Onboarding (app intro), placed after Onboarding in routing priority
  - Nickname uniqueness check uses 500ms debounce with supabase.from('users').select().eq('nickname').maybeSingle()
  - 30-day nickname change limit enforced client-side in updateUserProfile with toast feedback
metrics:
  duration: 3m 35s
  completed: 2026-04-07T02:22:55Z
  tasks: 2/2
  files: 5
---

# Phase 02 Plan 02: Profile Onboarding System Summary

ProfileSetupScreen with nickname debounce uniqueness check, KBO team 3-column grid selection, and 30-day nickname change limit in AuthContext

## What Was Done

### Task 1: Navigation Type + App.tsx Onboarding Branch (4877db1)

- Added `ProfileSetup: undefined` to `RootStackParamList` in navigation.ts
- Modified `AppNavigator` in App.tsx to destructure `user` from `useAuth()`
- Added `needsProfileSetup` variable: checks `isAuthenticated && user !== null && !user.nickname`
- Refactored `initialRouteName` logic to `getInitialRoute()` helper function with priority: Login > Onboarding > ProfileSetup > MainTabs
- Registered `<RootStack.Screen name="ProfileSetup">` in the canBrowse navigator block
- Preserved existing `Onboarding` screen (app intro) entirely unchanged

### Task 2: ProfileSetupScreen + AuthContext Enhancement (e45b828)

**ProfileSetupScreen.tsx (488 lines):**
- Nickname input with real-time validation:
  - Regex `/^[가-힣a-zA-Z0-9]{2,12}$/` for character/length validation
  - 500ms debounce uniqueness check via `supabase.from('users').select('id').eq('nickname', trimmed).maybeSingle()`
  - Four status states: idle, checking (spinner), available (green check), taken (red X)
  - Self-nickname detection (allows own current nickname)
- Team selection: 3-column FlatList grid loading from `supabase.from('teams').select('id, name_ko, logo_url').order('sort_order')`
- Avatar placeholder section with "set later" notice
- Submit button: active only when nickname=available AND team selected
- On submit: updates `users` table (nickname, my_team_id, nickname_changed_at), calls refreshUser(), navigates to MainTabs via reset

**AuthContext.tsx:**
- Added 30-day nickname change limit check in `updateUserProfile`:
  - Calculates days since `nickname_changed_at`
  - Shows localized toast with remaining days if under 30 days
  - Auto-appends `nickname_changed_at` timestamp on nickname changes
- Added error toast feedback for failed profile updates

**ko.ts:**
- Added 14 i18n keys: profile_setup_title, profile_setup_nickname_label, profile_setup_nickname_placeholder, profile_setup_nickname_checking, profile_setup_nickname_available, profile_setup_nickname_taken, profile_setup_nickname_invalid, profile_setup_team_label, profile_setup_team_select, profile_setup_avatar_later, profile_setup_start, nickname_change_limit, profile_update_error

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- ProfileSetupScreen.tsx exists (488 lines, exceeds 100 line minimum)
- Debounce logic present with 500ms constant
- Nickname regex `/^[가-힣a-zA-Z0-9]{2,12}$/` present
- `supabase.from('users')` calls present (2 locations: uniqueness check + profile update)
- `supabase.from('teams')` call present for team loading
- `numColumns={GRID_COLUMNS}` (3) present for team grid
- AuthContext has 30-day limit check with NICKNAME_CHANGE_LIMIT_DAYS = 30
- All 14 i18n keys present in ko.ts
- TypeScript check passes (zero errors)

## Known Stubs

None - all data sources are wired to real Supabase tables (users, teams).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 4877db1 | feat(02-02): add ProfileSetup route and onboarding branch logic |
| 2 | e45b828 | feat(02-02): create ProfileSetupScreen with nickname validation and team selection |

## Self-Check: PASSED

All 6 files found. All 2 commits verified.
