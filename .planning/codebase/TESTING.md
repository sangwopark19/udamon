# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:** None — no test framework is installed or configured in either `app/` or `admin/`

- `app/package.json` has no `jest`, `vitest`, `@testing-library/*`, or similar in dependencies
- `admin/package.json` has no test dependencies
- No `jest.config.*`, `vitest.config.*`, or `*.test.*` / `*.spec.*` files exist anywhere in the repository

**Run Commands:**
```bash
# No test commands available
# app/package.json scripts: start, android, ios, web
# admin/package.json scripts: dev, build, preview
```

---

## Test File Organization

**Location:** None — no test files exist

**No test directories found:**
- No `__tests__/` directories
- No co-located `*.test.ts` / `*.spec.tsx` files
- No `e2e/` or `cypress/` directories

---

## Current Testing Approach

The codebase relies entirely on **manual testing via mock data**. All business logic runs against in-memory mock fixtures rather than real Supabase data, making manual verification the primary QA method.

**Mock data files:**
- `app/src/data/mockCommunity.ts` — full mock posts, comments, polls, users
- `app/src/data/mockPhotographers.ts` — photographer and photo post data
- `app/src/data/mockCheerleaders.ts` — cheerleader data

**Hardcoded test accounts (bypass Supabase auth):**
- `test@udamon.com` / `test1234` — regular user
- `test2@udamon.com` / `test1234` — photographer user
- `admin@udamon.com` / `admin1234` — admin user (works in both app and admin web)
- Defined in `app/src/contexts/AuthContext.tsx` lines 57-112
- Persisted to `AsyncStorage` under key `udamon_test_account`

**Admin test accounts:**
- Defined in `admin/src/contexts/AuthContext.tsx` lines 20-32
- Persisted to `localStorage` under key `udamon_admin_session`

---

## Coverage

**Requirements:** None enforced — no coverage tooling configured

**Current state:** 0% automated test coverage across both packages

---

## Risk Areas Without Tests

The following areas carry the highest regression risk given zero automated coverage:

**Authentication flow** (`app/src/contexts/AuthContext.tsx`):
- OAuth session extraction from deep link URLs
- Test account vs. real Supabase session logic
- `onAuthStateChange` subscription with AsyncStorage interaction

**Community context state machine** (`app/src/contexts/CommunityContext.tsx`):
- Trending score calculation (`getTrendingScore`)
- `getFilteredPosts` pagination + sort logic
- `toggleLike` / `votePoll` optimistic updates

**Upload pipeline** (`app/src/services/r2Upload.ts`):
- Presigned URL fetch and R2 PUT sequence
- Error handling and `{ data, error }` return shape

**Utility functions** (`app/src/utils/time.ts`):
- `timeAgo` boundary cases (just now, minutes, hours, days, weeks)
- `formatCount` threshold at 1000

---

## Adding Tests — Recommended Setup

When tests are added, the stack should match the existing TypeScript/React Native environment:

**For `app/` (React Native):**
```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react-native @testing-library/jest-native
```

Suggested `jest.config.ts`:
```typescript
export default {
  preset: 'react-native',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
```

**For `admin/` (React + Vite):**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom
```

Suggested `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true },
});
```

---

## Recommended Test File Placement

When tests are introduced, follow this structure:

**Utility/pure function tests — co-located:**
```
app/src/utils/time.test.ts        # alongside time.ts
app/src/utils/image.test.ts
```

**Component tests — co-located:**
```
app/src/components/common/EmptyState.test.tsx
app/src/components/common/PressableScale.test.tsx
```

**Context/hook tests — co-located:**
```
app/src/contexts/CommunityContext.test.tsx
app/src/hooks/useLoginGate.test.ts
```

**Service/API tests — co-located:**
```
app/src/services/r2Upload.test.ts
```

---

## Recommended Mocking Patterns

When mocking is needed, use these patterns consistent with the existing codebase structure:

**Supabase client:**
```typescript
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ select: jest.fn(), insert: jest.fn(), update: jest.fn() })),
    auth: { getSession: jest.fn(), onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) },
  },
  isSupabaseConfigured: false,
}));
```

**Expo modules (haptics, AsyncStorage):**
```typescript
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(), notificationAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
```

**Navigation:**
```typescript
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { postId: 'cp1' } }),
}));
```

---

## Priority Test Targets

When starting to add tests, prioritize in this order:

1. **`app/src/utils/time.ts`** — Pure functions, zero dependencies, high usage
2. **`app/src/utils/image.ts`** — Pure utility, testable in isolation
3. **`app/src/services/r2Upload.ts`** — Upload pipeline, `fetch` mockable, error paths untested
4. **`app/src/contexts/CommunityContext.tsx`** — `getTrendingScore`, `getFilteredPosts` logic
5. **`app/src/hooks/useLoginGate.ts`** — Simple hook with navigation side effect
6. **`app/src/contexts/AuthContext.tsx`** — `extractAndSetSession` URL parsing logic

---

*Testing analysis: 2026-04-05*
