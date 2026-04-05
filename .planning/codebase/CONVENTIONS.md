# Coding Conventions

**Analysis Date:** 2026-04-05

## Overview

Two packages share the same conventions: `app/` (React Native Expo, TypeScript) and `admin/` (React + Vite, TypeScript). Both enable `strict: true`. The app is the primary codebase — conventions below apply to both unless noted otherwise.

---

## Naming Patterns

**Files:**
- Screen files: `PascalCase` + `Screen` suffix — `CommunityPostDetailScreen.tsx`, `HomeScreen.tsx`
- Component files: `PascalCase` — `EmptyState.tsx`, `PressableScale.tsx`, `StatCard.tsx`
- Context files: `PascalCase` + `Context` suffix — `AuthContext.tsx`, `CommunityContext.tsx`
- Hook files: `camelCase` + `use` prefix — `useLoginGate.ts`, `usePushDeepLinkHandler.ts`
- Utility files: `camelCase` — `time.ts`, `haptics.ts`, `image.ts`
- Type files: `camelCase` domain name — `community.ts`, `navigation.ts`, `photographer.ts`

**Components and Functions:**
- React components: `PascalCase` function names with `export default function`
- Hooks: `camelCase` starting with `use`
- Event handlers: `handle` prefix — `handleBack`, `handleLikePost`, `handleSubmitComment`
- Context consumers: `use` prefix matching provider name — `useAuth`, `useCommunity`, `useToast`

**Variables and State:**
- Boolean state: descriptive — `isLoading`, `refreshing`, `ready`, `onboardingDone`
- ID strings: `camelCase` with `Id` suffix — `postId`, `userId`, `photographerId`
- Navigation type aliases: short uppercase — `type Nav = NativeStackNavigationProp<...>`, `type Route = RouteProp<...>`

**Constants:**
- Module-level constants: `SCREAMING_SNAKE_CASE` — `PAGE_SIZE`, `COMMENT_MAX`, `TRENDING_WINDOW_MS`, `MAX_TRENDING`
- Layout dimensions: `SCREAMING_SNAKE_CASE` — `CARD_WIDTH`, `SCREEN_WIDTH`, `GRID_PADDING`

**TypeScript Types:**
- Object shapes (props, context values, DB rows): `interface`
- Union types, aliases, callback signatures: `type`
- Props interfaces named `Props` for local usage, `XxxProps` when exported
- DB row interfaces: `PascalCase` domain name — `CommunityPost`, `CommunityComment`
- Joined/augmented DB types: `WithAuthor` suffix — `CommunityPostWithAuthor`
- Input types: `CreateXxxInput`, `UpdateXxxInput`

---

## Code Style

**Formatting:**
- No Prettier or ESLint config detected in either package — no enforced formatter
- Indentation: 2 spaces (consistent throughout)
- Single quotes for strings in imports; JSX uses double quotes for prop strings
- Trailing commas present in multiline arrays/objects

**TypeScript:**
- `strict: true` in both packages
- No `any` — unknown errors handled with `e instanceof Error` pattern (see `r2Upload.ts`)
- Explicit return types on exported async functions returning `{ success: boolean; error?: string }`
- Type imports use `import type { ... }` consistently
- `as const` on all design token objects (`colors`, `fontSize`, `fontWeight`, `radius`, `spacing`, `shadow`)

---

## Import Organization

**Order (app):**
1. React and React Native core — `import React, { ... } from 'react'`; `import { View, Text } from 'react-native'`
2. Third-party packages — `expo-*`, `@react-navigation/*`, `@supabase/supabase-js`, `react-i18next`
3. Internal contexts — `../../contexts/AuthContext`
4. Internal hooks — `../../hooks/useLoginGate`
5. Internal utils/types/constants — `../../utils/time`, `../../types/community`, `../../constants/colors`
6. Internal components — `../../components/common/EmptyState`
7. Internal styles — `../../styles/theme`

**Admin order:**
1. React and react-router-dom
2. Third-party (lucide-react)
3. Internal components
4. Internal contexts

**Path Aliases:**
- None — all imports use relative paths (`../../contexts/AuthContext`)

**Import style:**
- Named imports for hooks, utilities, types: `import { useAuth } from '../../contexts/AuthContext'`
- Default imports for components and screens
- `import type` for all type-only imports

---

## Error Handling

**Async operations:**
- Service functions return a discriminated union `{ data: T | null; error: string | null }` — see `r2Upload.ts`
- Auth operations return `{ success: boolean; error?: string }` — see `AuthContext.tsx`
- Errors are caught with `catch (e: unknown)` and narrowed: `e instanceof Error ? e.message : 'Upload failed'`

**Supabase calls:**
- Inline error check: `const { data, error } = await supabase.from(...).select(...); if (error) { console.error(...); return null; }`
- Non-critical failures use `console.warn` and fall back gracefully (apply updates locally when Supabase unreachable)

**UI-level errors:**
- `Alert.alert(...)` for destructive confirmations (delete, report)
- `showToast(message, 'error')` for lightweight feedback
- Top-level `ErrorBoundary` class component wraps the entire app at `App.tsx` line 245

**Error Boundary:**
- Single instance at app root: `app/src/components/common/ErrorBoundary.tsx`
- Logs to `console.error('[ErrorBoundary]', error)` and renders a retry button

---

## Logging

**Approach:** Native `console.log/warn/error` — no logging library

**Conventions:**
- OAuth flow logs use `[OAuth]` prefix: `console.log('[OAuth] ...')`
- Deep link logs use `[Deep Link]` prefix
- ErrorBoundary uses `[ErrorBoundary]` prefix
- Auth errors: `console.error('fetchUserProfile error:', error)`
- Non-critical fallbacks: `console.warn('Supabase unreachable, applying locally')`
- `console.log` used only in auth/OAuth flow (not scattered in business logic)

---

## Comments

**When to Comment:**
- Section dividers using `// ─── Section Name ───` horizontal rule style — used extensively in long files
- Block comments for non-obvious algorithms (trending score calculation, OAuth session extraction)
- JSDoc-style `/** ... */` for exported hooks explaining usage contract (see `useLoginGate.ts`)
- Inline comments for dev-only bypasses: `// Dev test accounts — bypass Supabase`
- Korean comments acceptable for internal notes: `// 환경변수 미설정 시에도 크래시하지 않도록`

**Section Divider Pattern:**
```typescript
// ─── Section Name ─────────────────────────────────────────────────
```

---

## Component Design

**Function signatures:**
- Props destructured inline: `export default function Foo({ variant = 'generic', title, onAction }: Props)`
- Optional props use `?` in interface, with defaults in destructuring
- Children typed as `ReactNode` from React

**State:**
- `useState` for local UI state
- `useCallback` for all event handlers (prevents re-renders in contexts)
- `useMemo` for derived data (filtered lists, trees, computed values)
- `useRef` for mutable values that don't trigger re-renders (animations, timers, pending flags)
- `useEffect` for side effects (session init, subscriptions, deep links)

**Sub-components:**
- Small helper components (e.g., `CommentItem`, `SplashScreen`, `PushHandler`) defined in the same file as their parent screen, below the main export
- Sub-component props typed with a local `interface XxxProps` immediately before the function

**Accessibility:**
- `accessibilityLabel` on interactive elements using i18n keys: `accessibilityLabel={t('a11y_back')}`
- `activeOpacity={0.7}` on `TouchableOpacity` consistently

---

## Styling (app)

**Approach:** `StyleSheet.create({})` at end of each file — never inline style objects except for dynamic values

**Dynamic styles:**
- Safe area: `{ paddingTop: insets.top }` applied inline
- Conditional: array syntax `[styles.base, condition && styles.variant]`
- Theme tokens used for all visual values — never raw hex/numeric literals except in the token files themselves

**Token imports:**
```typescript
import { colors, fontSize, fontWeight, radius, shadow, spacing, layout } from '../../styles/theme';
```
- Always import from `../../styles/theme`, not from `../../constants/colors` directly (theme re-exports colors)

---

## Styling (admin)

**Approach:** Tailwind CSS utility classes — no CSS modules, no inline styles except dynamic color values

**Pattern:**
```tsx
<div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
```
- Dynamic colors applied with `style={{ backgroundColor: color + '15' }}`
- Responsive utilities: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

---

## Context Pattern

Every context follows this exact structure:

```typescript
// 1. Define interfaces
interface XxxContextValue { ... }

// 2. Create context with null default
const XxxContext = createContext<XxxContextValue | null>(null);

// 3. Named export Provider
export function XxxProvider({ children }: { children: ReactNode }) {
  // state, callbacks, effects
  return <XxxContext.Provider value={...}>{children}</XxxContext.Provider>;
}

// 4. Named export hook with null guard
export function useXxx(): XxxContextValue {
  const ctx = useContext(XxxContext);
  if (!ctx) throw new Error('useXxx must be used within XxxProvider');
  return ctx;
}
```

---

## Module Design

**Exports:**
- Default export for components and screens (one per file)
- Named exports for utilities, hooks, context providers, and types
- No barrel `index.ts` files — all imports use direct file paths

**i18n:**
- All user-facing strings go through `useTranslation()` / `i18n.t()`
- Translation keys defined in `app/src/i18n/locales/ko.ts`
- Keys use `snake_case` — `community_post_delete`, `toast_comment_sent`, `a11y_back`

---

*Convention analysis: 2026-04-05*
