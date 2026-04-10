---
phase: 02-authentication
plan: 03
subsystem: auth
tags: [supabase, edge-function, soft-delete, user-blocks, rls, react-native]

# Dependency graph
requires:
  - phase: 02-authentication/01
    provides: AuthContext with real Supabase Auth (session, logout)
provides:
  - delete-account Edge Function (JWT auth + soft delete via service_role)
  - AccountManagementScreen with 2-step confirmation and Edge Function integration
  - BlockContext converted from in-memory to Supabase user_blocks table
  - Block UI entry points in post/comment menus and author avatar
  - BlockedUsersScreen with user profile loading
affects: [community-feed-filtering, user-profile-display, admin-user-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Edge Function soft delete pattern: public.users update + auth.admin.deleteUser"
    - "2-step confirmation modal for destructive actions"
    - "Context async Supabase integration with optimistic local state updates"

key-files:
  created:
    - supabase/functions/delete-account/index.ts
  modified:
    - app/src/screens/settings/AccountManagementScreen.tsx
    - app/src/contexts/BlockContext.tsx
    - app/src/screens/settings/BlockedUsersScreen.tsx
    - app/src/screens/community/CommunityPostDetailScreen.tsx
    - app/src/screens/my/MyPageScreen.tsx
    - app/src/i18n/locales/ko.ts

key-decisions:
  - "2-step modal (warning -> confirm) instead of DELETE text input for account deletion UX"
  - "Author avatar tap triggers block confirmation for non-owner posts (profile block entry point)"
  - "Block count badge on MyPageScreen settings instead of dedicated block button (no other-user profile view exists)"

patterns-established:
  - "Edge Function pattern: CORS + JWT auth + service_role for privileged operations"
  - "Supabase Context integration: useEffect load on user change + async CRUD with optimistic updates"
  - "Destructive action confirmation: 2-step modal with loading indicator"

requirements-completed: [AUTH-09, AUTH-10]

# Metrics
duration: 7min
completed: 2026-04-07
---

# Phase 02 Plan 03: Account Deletion & User Block Summary

**Edge Function soft delete (public.users + auth.users) with 2-step confirmation, BlockContext Supabase user_blocks integration, and block UI entry points in post/comment menus + author avatar**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-07T02:20:02Z
- **Completed:** 2026-04-07T02:27:02Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- delete-account Edge Function with JWT authentication and dual soft delete (public.users is_deleted + auth.admin.deleteUser)
- AccountManagementScreen converted from DELETE text input to 2-step confirmation modal with loading state
- BlockContext fully converted from in-memory to Supabase user_blocks table with initial load, async insert/delete, and duplicate handling
- Block entry points added in 3 locations: post ... menu, comment ... menu, and author avatar tap (per D-09)
- BlockedUsersScreen enhanced with user profile loading (nickname, avatar) from Supabase
- MyPageScreen shows blocked user count badge on settings item

## Task Commits

Each task was committed atomically:

1. **Task 1: Edge Function + AccountManagement + i18n** - `2a9319e` (feat)
2. **Task 2: BlockContext Supabase + block UI entry points** - `98878cd` (feat)

## Files Created/Modified
- `supabase/functions/delete-account/index.ts` - Edge Function: JWT auth, public.users soft delete, auth.admin.deleteUser
- `app/src/screens/settings/AccountManagementScreen.tsx` - 2-step confirmation modal, Edge Function invoke, deleteLoading state
- `app/src/contexts/BlockContext.tsx` - Supabase user_blocks CRUD, initial load, async blockUser/unblockUser
- `app/src/screens/settings/BlockedUsersScreen.tsx` - Load blocked user profiles (nickname, avatar), async unblock
- `app/src/screens/community/CommunityPostDetailScreen.tsx` - Block option in post menu, onBlock prop on CommentItem, author avatar tap
- `app/src/screens/my/MyPageScreen.tsx` - useBlock integration, blocked count badge on settings item
- `app/src/i18n/locales/ko.ts` - 17 new/updated i18n keys for delete and block flows

## Decisions Made
- Used 2-step modal (warning -> confirm) instead of DELETE text input for better mobile UX
- Added author avatar tap as block entry point since there's no dedicated "other user profile" screen
- Block count badge on MyPageScreen settings item to surface block state without a dedicated block button
- CommentItem ... menu icon (ellipsis-horizontal) for non-owner comments triggers block confirmation Alert

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Author avatar tap block entry for profiles (D-09)**
- **Found during:** Task 2 (MyPageScreen analysis)
- **Issue:** MyPageScreen is self-profile only, no other-user profile view exists. Plan requires profile-level block entry per D-09
- **Fix:** Made author row in CommunityPostDetailScreen tappable (TouchableOpacity) to trigger block confirmation for non-owner posts, serving as the "profile" block entry point
- **Files modified:** app/src/screens/community/CommunityPostDetailScreen.tsx
- **Verification:** Author avatar tap triggers block_confirm Alert for non-owner posts, disabled for own posts

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary to satisfy D-09 profile block requirement. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Edge Function uses SUPABASE_SERVICE_ROLE_KEY which is automatically injected by the Supabase runtime.

## Threat Mitigations Applied
- T-02-11: Edge Function authenticates via JWT before deleting, only the authenticated user's own account can be deleted
- T-02-12: BlockContext uses Supabase client (RLS enforced), blocker_id always equals auth.uid()
- T-02-13: BlockContext delete uses Supabase client (RLS enforced), only own blocks can be removed

## Next Phase Readiness
- Account deletion flow complete, ready for "deleted user" display logic in community views
- Block system ready for feed filtering (community posts/comments should check isUserBlocked)
- BlockedUsersScreen ready for use

---
*Phase: 02-authentication*
*Completed: 2026-04-07*
