---
status: verifying
trigger: "After email signup step 3 celebration, clicking 시작하기 sends user back to step 1 instead of MainTabs. Login with same credentials also fails."
created: 2026-04-10T00:00:00Z
updated: 2026-04-10T00:00:00Z
---

## Current Focus

hypothesis: After completeSignup() clears signupInProgressRef, a pending onAuthStateChange event slips through the guard and either (a) calls setUser(null) if ensureUserProfile returns null, or (b) overwrites user with stale DB data (my_team_id=null), making needsProfileSetup=true. Either way, the navigator transition to 'main' is undone or results in wrong initial route.
test: Added diagnostic logging + signupJustCompleted ref guard. User needs to run the app and check logs.
expecting: Logs will show either an onAuthStateChange event firing after completeSignup that overwrites user, OR reveal a different cause.
next_action: Wait for user to test with diagnostic logging and signupJustCompleted fix applied

## Symptoms

expected: After signup step 3 "시작하기" button -> completeSignup() -> signupInProgress=false -> canBrowse=true -> navigator key 'auth'->'main' -> MainTabs. Login with created account should work.
actual: Button click sends user back to signup step 1. Login with test@test.com / testtest also doesn't respond.
errors: No error messages visible to user. DB data was saved correctly.
reproduction: 1. Go to signup, fill step 1, step 2, click 가입하기, see step 3 celebration, click 시작하기 -> back to step 1. 2. Login with test@test.com / testtest -> no response.
started: Active bug during development of signupInProgress flag feature.

## Eliminated

## Evidence

- timestamp: 2026-04-10T00:01:00Z
  checked: signUpWithEmail flow in AuthContext.tsx lines 359-391
  found: When data.session is null (email confirmation required), signupInProgress is set back to false at line 387 BUT success:true is returned at line 390. SignupScreen shows step 3 celebration. Then completeSignup() is a no-op because signupInProgress is already false. isAuthenticated stays false so canBrowse stays false. Navigator stays 'auth'. No navigation to MainTabs possible.
  implication: If email confirmation is required, the entire signup flow is broken. User gets stuck because isAuthenticated is never set to true.

- timestamp: 2026-04-10T00:02:00Z
  checked: signUpWithEmail flow when data.session IS present (auto-confirm enabled)
  found: When data.session exists, ensureUserProfile is called. Then my_team_id is updated via supabase update + profile.my_team_id mutation. setUser is called. But emailAuthJustSet flag (line 369) only blocks ONE onAuthStateChange event (line 270-273 consumes and resets it). If supabase.auth.signUp triggers >1 auth state change events, the 2nd event calls ensureUserProfile again which returns the DB row WITHOUT my_team_id (the update at line 376 may not have committed yet, or the fetched row is stale).
  implication: Race condition can cause user.my_team_id to be null in state even though DB has it. This makes needsProfileSetup=true, causing getInitialRoute to return 'ProfileSetup' instead of 'MainTabs'.

- timestamp: 2026-04-10T00:03:00Z
  checked: App.tsx line 188 needsProfileSetup condition
  found: needsProfileSetup = isAuthenticated && user && (!user.nickname || user.nickname.startsWith('user_') || !user.my_team_id). The nickname passed to signUp is set in user_metadata as preferred_username. The DB trigger (migration 011) uses preferred_username for nickname. BUT the ensureUserProfile function at line 125 first calls fetchUserProfile (DB select). If the trigger hasn't fired yet or there's a race, ensureUserProfile falls through to the upsert path (line 133-143) which sets nickname from metadata. This should work. The issue is my_team_id.
  implication: Even in auto-confirm scenario, needsProfileSetup can redirect user to ProfileSetup instead of MainTabs due to race condition on my_team_id.

- timestamp: 2026-04-10T00:04:00Z
  checked: loginWithEmail flow for the 2nd reported issue
  found: loginWithEmail at line 340 calls supabase.auth.signInWithPassword. If email is not confirmed (Supabase default), signInWithPassword returns an error like "Email not confirmed". The error is returned as { success: false, error: error.message }. But the user reports "no response" — this could mean the UI doesn't show the error message visually.
  implication: Login failure is a downstream effect of the signup issue. If email confirmation is required, the user can't log in either. The error might not be shown in the UI.

- timestamp: 2026-04-10T01:00:00Z
  checked: Full code trace of completeSignup -> signupInProgress state -> AppNavigator re-render chain
  found: After completeSignup() sets signupInProgressRef.current=false, any onAuthStateChange event would bypass all guards (emailAuthJustSet already consumed, signupInProgress now false). The handler calls ensureUserProfile which fetches from DB — if profile returns null (timeout/error) then setUser(null) makes isAuthenticated=false and canBrowse flips back to false. If profile returns with my_team_id=null (stale read before the update on line 398 committed), needsProfileSetup becomes true. Either scenario prevents correct navigation to MainTabs.
  implication: Race condition between completeSignup clearing the guard and onAuthStateChange overwriting user state. Fix: add signupJustCompleted ref that blocks the first post-completion auth event.

- timestamp: 2026-04-10T01:01:00Z
  checked: Applied fix — signupJustCompleted ref guard in onAuthStateChange + diagnostic logging in AppNavigator, completeSignup, and onAuthStateChange
  found: TypeScript typecheck passes. Fix is minimal — one new ref, one guard check, one flag set in completeSignup.
  implication: Awaiting user verification with diagnostic logs to confirm hypothesis or reveal alternative cause.

## Resolution

root_cause: Race condition between completeSignup() and onAuthStateChange. When completeSignup() sets signupInProgressRef=false, any pending Supabase auth event (TOKEN_REFRESHED, SIGNED_IN) slips through all guards and calls ensureUserProfile. This either returns null (setUser(null) -> isAuthenticated=false -> canBrowse flips back to false -> navigator returns to 'auth') or returns stale DB data with my_team_id=null (needsProfileSetup=true -> wrong route). Previous fix addressed no-session and signupInProgress guard but missed the post-completion race.
fix: Added signupJustCompleted ref guard. completeSignup sets signupJustCompleted.current=true before clearing signupInProgress. onAuthStateChange checks this flag and skips one event after completion, preventing stale DB data from overwriting the user state set by signUpWithEmail. Also added diagnostic logging.
verification: TypeScript typecheck passes. Awaiting human verification on device with diagnostic logs.
files_changed: [app/src/contexts/AuthContext.tsx, app/App.tsx]
