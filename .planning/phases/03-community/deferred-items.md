# Phase 03 Deferred Items

Items discovered during execution that are out of scope for the current plan.

## From 03-01 (communityApi.ts creation)

### Pre-existing TypeScript errors in AuthContext.tsx

**File:** `app/src/contexts/AuthContext.tsx`
**Error count:** 6
**Errors:** `TS2304: Cannot find name 'AsyncStorage'` on lines 226, 249, 324, 334, 350, 436

**Root cause:** The file uses `AsyncStorage` but never imports it. Regression from Phase 2 work — the import `import AsyncStorage from '@react-native-async-storage/async-storage'` is missing at the top of the file.

**Why deferred:** These errors exist in the baseline BEFORE Plan 03-01 starts. They are not caused by changes in `communityApi.ts` or `types/community.ts`. Per the scope boundary rule in the executor contract, pre-existing failures in unrelated files should not be auto-fixed by an in-progress plan.

**Recommended fix:** A 1-line import at the top of AuthContext.tsx:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
```
Either the Phase 3 verifier can add this as a Rule 3 blocker fix, or a `/gsd-quick` phase-2 regression fix can address it.
