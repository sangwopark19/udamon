# Phase 04 Deferred Items

Items discovered during execution but out of scope for the current plan.

## From Plan 04-01 (2026-04-15)

### 1. app/app.json ios.associatedDomains 중복 항목

**Location:** `app/app.json` ios.associatedDomains 배열
**Detected by:** `npx expo-doctor` after installing expo-video (unrelated to this plan)
**Error:** `Field: ios/associatedDomains - must NOT have duplicate items (items ## 1 and 0 are identical)`
**Scope:** Pre-existing issue from earlier phases — not introduced by Plan 04-01.
**Suggested action:** Quick fix in a `/gsd-quick` task to dedupe associated domains.

### 2. Package version mismatches (@types/jest, jest-expo)

**Location:** `app/package.json` devDependencies
**Detected by:** `npx expo-doctor`
**Errors:**
- `@types/jest expected 29.5.14 found 30.0.0`
- `jest-expo expected ~54.0.17 found 55.0.13`
**Scope:** Pre-existing since auth phase — not introduced by Plan 04-01.
**Suggested action:** Run `npx expo install --check` and accept downgrade, or add to `expo.install.exclude` if intentional.

### 3. npm audit vulnerabilities (7: 5 low, 1 moderate, 1 high)

**Location:** `app/node_modules` (transitive from existing deps + @imagemagick/magick-wasm)
**Scope:** Mix of pre-existing + newly introduced by `@imagemagick/magick-wasm@0.0.39` devDependency. magick-wasm is only used for Edge Function WASM file extraction, not bundled into the app runtime.
**Suggested action:** Review with `npm audit` in a dedicated security sweep plan.
