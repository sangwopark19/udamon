# Architecture Research

**Domain:** KBO fan community + photographer app (React Native Expo + Supabase)
**Researched:** 2026-04-05
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌──────────────────────┐       ┌──────────────────────┐            │
│  │   Mobile App (Expo)  │       │   Admin Web (Vite)   │            │
│  │  ┌────────────────┐  │       │  ┌────────────────┐  │            │
│  │  │   Screens      │  │       │  │   Pages        │  │            │
│  │  └───────┬────────┘  │       │  └───────┬────────┘  │            │
│  │  ┌───────┴────────┐  │       │  ┌───────┴────────┐  │            │
│  │  │  Context Layer  │  │       │  │  Context Layer  │  │            │
│  │  └───────┬────────┘  │       │  └───────┬────────┘  │            │
│  │  ┌───────┴────────┐  │       │  ┌───────┴────────┐  │            │
│  │  │ Service Layer  │  │       │  │ Admin Service   │  │            │
│  │  │ (anon key)     │  │       │  │ (service_role)  │  │            │
│  │  └───────┬────────┘  │       │  └──┬──────────┬──┘  │            │
│  └──────────┼──────────┘       └─────┼──────────┼────┘            │
└─────────────┼──────────────────────┼──────────┼──────────────────┘
              │                      │          │
┌─────────────┼──────────────────────┼──────────┼──────────────────┐
│             │   SUPABASE BACKEND   │          │                  │
│  ┌──────────┴──────────┐  ┌───────┴────┐  ┌──┴───────────┐      │
│  │   PostgREST API     │  │   Edge     │  │  Supabase    │      │
│  │   (RLS enforced)    │  │  Functions │  │  Auth        │      │
│  └──────────┬──────────┘  └─────┬──────┘  └──────────────┘      │
│  ┌──────────┴───────────────────┴──────┐                        │
│  │          PostgreSQL Database         │                        │
│  │  (RLS policies + triggers + cron)    │                        │
│  └─────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
              │
┌─────────────┴──────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Cloudflare   │  │ Firebase     │  │ OAuth        │          │
│  │ R2 Storage   │  │ FCM          │  │ Providers    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| Mobile App Service Layer | All Supabase queries with anon key, RLS-enforced | PostgREST API, Edge Functions, R2 |
| Admin Web Service Layer | Supabase queries via Edge Function proxy (service_role) | Edge Functions only (never direct DB with service_role from browser) |
| Context Layer (Mobile) | Domain state, optimistic updates, cache, mock fallback | Service Layer |
| Context Layer (Admin) | Admin state, CRUD dispatch | Admin Service Layer |
| PostgREST API | Auto-generated REST from DB schema, RLS-enforced | PostgreSQL |
| Edge Functions (Deno) | Auth-gated server logic: R2 upload URLs, admin proxy, FCM push, image resize | PostgreSQL (service_role), R2, FCM |
| PostgreSQL | Data storage, RLS enforcement, triggers, pg_cron | -- |
| Cloudflare R2 | Image/video object storage | Edge Function (presigned URLs), Cloudflare Image Resizing |
| Firebase FCM | Push notification delivery | Edge Function |

## Recommended Project Structure

The existing structure is sound. The additions below extend it for the Supabase integration milestone.

```
app/src/
├── services/                    # Service layer (all external I/O)
│   ├── supabase.ts              # Client singleton + isSupabaseConfigured flag
│   ├── photographerApi.ts       # Photographer domain CRUD (KEEP, already done)
│   ├── communityApi.ts          # NEW: Community domain CRUD
│   ├── authApi.ts               # NEW: Auth + user profile operations
│   ├── notificationApi.ts       # NEW: Notification queries
│   ├── r2Upload.ts              # R2 presigned upload (KEEP)
│   └── types.ts                 # NEW: Shared ApiResult<T> type, extracted
├── contexts/                    # Context layer (state + business logic)
│   ├── AuthContext.tsx           # MODIFY: Wire to Supabase Auth
│   ├── PhotographerContext.tsx   # MODIFY: Remove remaining mock fallbacks
│   ├── CommunityContext.tsx      # MODIFY: Wire to communityApi.ts
│   └── NotificationContext.tsx   # NEW: In-app notification state
└── types/                       # Type definitions
    └── database.ts              # NEW: Generated or manual DB row types

admin/src/
├── services/                    # NEW directory
│   ├── supabase.ts              # Admin Supabase client (anon key, NOT service_role)
│   └── adminApi.ts              # Admin operations via Edge Function proxy
├── contexts/
│   ├── AuthContext.tsx           # MODIFY: Wire to Supabase Auth
│   └── AdminContext.tsx          # MODIFY: Wire to adminApi.ts
└── types/
    └── index.ts                 # MODIFY: Align with DB schema

supabase/
├── migrations/
│   ├── 011_users_table.sql      # NEW: public.users + profile trigger
│   ├── 012_new_tables.sql       # NEW: notifications, announcements, etc.
│   ├── 013_photo_posts_status.sql  # NEW: Add status/rejection columns
│   ├── 014_admin_rls.sql        # NEW: Admin-specific RLS policies
│   ├── 015_trending_function.sql   # NEW: Trending calculation DB function
│   └── 016_remove_auto_blind.sql   # NEW: Drop auto-blind trigger
└── functions/
    ├── get-upload-url/           # KEEP: R2 presigned URL generator
    ├── admin-proxy/              # NEW: Admin operations (service_role)
    ├── push-notification/        # NEW: FCM push sender
    └── resize-image/             # NEW: Thumbnail generation (WASM-based)
```

### Structure Rationale

- **`services/` per domain:** Each API file owns one domain's queries (community, photographer, auth, notification). This mirrors `photographerApi.ts` which already works well. Keeps files under 500 lines and concerns separated.
- **`services/types.ts` extracted:** The `ApiResult<T>` type is duplicated between photographerApi and r2Upload. Extract once, import everywhere.
- **Edge Functions by purpose:** One function per concern (upload, admin, push, resize) rather than one monolith function. Matches Supabase's deployment model where each function is an independent Deno process.
- **Admin `services/` directory:** Currently missing. The admin web has zero service layer -- everything is mock data in AdminContext. Adding `adminApi.ts` creates the same clean separation the mobile app already has.

## Architectural Patterns

### Pattern 1: Domain Service Layer (ApiResult<T>)

**What:** Each domain gets a dedicated service file that wraps all Supabase queries and returns a uniform `{ data: T | null; error: string | null }` shape. The context layer never calls `supabase.from()` directly.

**When to use:** Every database operation in the app.

**Trade-offs:**
- Pro: Contexts stay pure state managers; queries are testable in isolation; error shape is consistent
- Pro: Row-to-app-type mapping happens in one place (the mapper functions in the service file)
- Con: One extra layer of indirection vs. calling supabase directly in contexts

**This pattern already exists** in `photographerApi.ts` and works well. Replicate it for community, auth, and notifications.

**Example (communityApi.ts):**
```typescript
import { supabase } from './supabase';
import type { ApiResult } from './types';
import type { CommunityPostWithAuthor } from '../types/community';

function mapPost(row: any): CommunityPostWithAuthor {
  return {
    id: row.id,
    user_id: row.user_id,
    team_id: row.team?.slug ?? null,
    title: row.title,
    content: row.content,
    images: row.images ?? [],
    author: {
      display_name: row.user?.display_name ?? 'Unknown',
      avatar_url: row.user?.avatar_url ?? null,
    },
    like_count: row.like_count,
    comment_count: row.comment_count,
    view_count: row.view_count,
    is_trending: row.is_trending,
    created_at: row.created_at,
    // ...remaining fields
  };
}

export async function fetchPosts(
  teamId: string | null,
  sort: 'latest' | 'popular',
  page: number,
  pageSize = 20,
): Promise<ApiResult<CommunityPostWithAuthor[]>> {
  try {
    let query = supabase
      .from('community_posts')
      .select(`*, user:users!user_id(display_name, avatar_url), team:teams!team_id(slug)`)
      .eq('is_blinded', false)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (teamId) query = query.eq('team_id', teamId);
    if (sort === 'popular') query = query.order('like_count', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(mapPost), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}
```

### Pattern 2: Context-to-Supabase Migration (Incremental Swap)

**What:** Each context currently holds mock data in state. Migrate by: (1) create the domain API service file, (2) add a `loadFromSupabase()` function in the context that calls the service, (3) gate with `isSupabaseConfigured`, (4) once verified, remove mock fallback entirely.

**When to use:** For every context migration (CommunityContext, AuthContext, AdminContext).

**Trade-offs:**
- Pro: Can verify each domain independently; mock fallback available during development
- Pro: PhotographerContext already demonstrates this pattern successfully
- Con: Temporary code duplication between mock and real paths; must clean up after

**The existing `isSupabaseConfigured` gate in PhotographerContext is the proven pattern.** Follow it exactly for CommunityContext, then remove all mock gates once Supabase is fully wired.

**Example (CommunityContext migration):**
```typescript
// Phase 1: Add Supabase loading alongside mock
useEffect(() => {
  if (!isSupabaseConfigured) {
    setPosts(MOCK_POSTS);
    return;
  }
  loadPosts();
}, []);

async function loadPosts() {
  setIsLoading(true);
  const result = await communityApi.fetchPosts(null, 'latest', 0);
  if (result.data) setPosts(result.data);
  else console.error('Failed to load posts:', result.error);
  setIsLoading(false);
}

// Phase 2 (after verification): Remove mock branch entirely
```

### Pattern 3: Optimistic Updates with Rollback

**What:** For user-facing mutations (like, comment, follow, vote), update local state immediately, then fire the Supabase mutation. On error, roll back to the previous state and show a toast.

**When to use:** Any mutation where latency would feel sluggish -- likes, follows, votes, comments. NOT for complex operations like post creation (show a loading indicator instead).

**Trade-offs:**
- Pro: Instant UI feedback; crucial for mobile UX
- Pro: DB triggers handle server-side count updates (like_count, comment_count), so optimistic local increment is safe
- Con: Requires snapshot/rollback logic in each context; more complex than fire-and-forget

**Example (optimistic like toggle):**
```typescript
const toggleLike = useCallback(async (postId: string) => {
  const wasLiked = likedIds.has(postId);
  const prevPosts = [...posts];
  const prevLikedIds = new Set(likedIds);

  // Optimistic update
  setLikedIds(prev => {
    const next = new Set(prev);
    wasLiked ? next.delete(postId) : next.add(postId);
    return next;
  });
  setPosts(prev => prev.map(p =>
    p.id === postId
      ? { ...p, like_count: p.like_count + (wasLiked ? -1 : 1) }
      : p
  ));

  // Server mutation
  const result = await communityApi.toggleLike(userId, 'post', postId);
  if (result.error) {
    // Rollback
    setPosts(prevPosts);
    setLikedIds(prevLikedIds);
    // Show error toast
  }
}, [likedIds, posts, userId]);
```

### Pattern 4: Admin Edge Function Proxy

**What:** The admin web panel must never hold the Supabase `service_role` key in browser JavaScript. Instead, admin operations go through a dedicated Edge Function (`admin-proxy`) that: (1) verifies the caller is authenticated via Supabase Auth JWT, (2) checks `is_admin = true` on the `public.users` row, (3) performs the operation using a `service_role` client that bypasses RLS.

**When to use:** Every admin write operation (approve/reject posts, sanction users, manage announcements, blind content).

**Trade-offs:**
- Pro: service_role key never leaves the server; RLS bypass is controlled and auditable
- Pro: Single Edge Function handles all admin operations via action dispatch
- Con: Extra network hop vs. direct DB calls; but security is non-negotiable

**Example (Edge Function admin-proxy):**
```typescript
// supabase/functions/admin-proxy/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // 1. Verify JWT and get user
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token!);
  if (authError || !user) return errorResponse("Unauthorized", 401);

  // 2. Check admin status via service_role client
  const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await serviceClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) return errorResponse("Forbidden", 403);

  // 3. Dispatch action with service_role (bypasses RLS)
  const { action, payload } = await req.json();
  switch (action) {
    case 'approve_post': /* ... */ break;
    case 'blind_post': /* ... */ break;
    case 'sanction_user': /* ... */ break;
    // ...
  }
});
```

### Pattern 5: Push Notification Pipeline (DB Webhook -> Edge Function -> FCM)

**What:** When a notification row is inserted into the `notifications` table, a Supabase Database Webhook triggers the `push-notification` Edge Function, which fetches the user's FCM token and sends the push via Google's FCM HTTP v1 API.

**When to use:** All push notification events (new comment on your post, post approved/rejected, new follower, admin announcement).

**Trade-offs:**
- Pro: Fully server-side; no client orchestration needed
- Pro: Decoupled -- any code that INSERTs into `notifications` automatically triggers push
- Con: Requires Firebase project setup (external blocker), FCM token storage in `users` table
- Con: Database webhooks have a timeout (1000ms default); FCM call must be fast

**Data flow:**
```
[App action: new comment] 
    -> INSERT into notifications (via service or trigger)
    -> DB Webhook fires
    -> Edge Function: push-notification
    -> Reads FCM token from users table
    -> POST to FCM HTTP v1 API
    -> Push arrives on device
```

### Pattern 6: Image Thumbnail via Cloudflare Image Resizing (NOT Supabase Edge Functions)

**What:** Since images are stored on Cloudflare R2 (not Supabase Storage), use Cloudflare's native Image Resizing service via URL convention rather than a Supabase Edge Function. Supabase Edge Functions have memory limitations (~5MB max for image processing) and do not support native libraries like Sharp.

**When to use:** Thumbnail generation for feed lists, profile avatars, image previews.

**Trade-offs:**
- Pro: Zero custom code for resize; URL-based transformation; CDN-cached
- Pro: No memory/CPU limits -- runs on Cloudflare's infrastructure
- Con: Requires Cloudflare paid plan (Image Resizing); OR a Cloudflare Worker as proxy
- Con: Adds Cloudflare dependency beyond just R2 storage

**Implementation approach:**
```
Original:  https://media.udamon.com/photo-posts/{userId}/{timestamp}.jpg
Thumbnail: https://media.udamon.com/cdn-cgi/image/width=400,quality=80/photo-posts/{userId}/{timestamp}.jpg

OR via Cloudflare Worker:
https://media.udamon.com/thumbnails/photo-posts/{userId}/{timestamp}.jpg
  -> Worker fetches original from R2, applies cf.image options, returns resized
```

If Cloudflare Image Resizing is not available on the current plan, the fallback is a minimal Supabase Edge Function using `magick-wasm` for images under 5MB -- but this is fragile and should be temporary.

## Data Flow

### Complete Request Flow (Mobile App)

```
[User taps "Like"]
    |
    v
[Screen] -- calls --> [useContext hook: toggleLike(postId)]
    |
    v
[Context] -- optimistic update --> [setState: likedIds + like_count]
    |
    v
[Context] -- async call --> [communityApi.toggleLike(userId, 'post', postId)]
    |
    v
[Service Layer] -- supabase.from('community_likes').insert/delete --> [PostgREST API]
    |
    v
[PostgREST] -- RLS check --> [PostgreSQL]
    |
    v
[DB Trigger: update_like_count()] -- auto-increments --> [community_posts.like_count]
    |
    v
[ApiResult<boolean>] -- returned to Context
    |
    v
[Context] -- if error --> [rollback to previous state]
```

### Admin Operation Flow

```
[Admin clicks "Approve Post"]
    |
    v
[Admin Page] -- calls --> [AdminContext.approvePost(postId)]
    |
    v
[AdminContext] -- calls --> [adminApi.adminAction('approve_post', { postId })]
    |
    v
[adminApi] -- fetch() with JWT --> [Edge Function: admin-proxy]
    |
    v
[admin-proxy] -- verifies JWT + is_admin check --> [Auth validation]
    |
    v
[admin-proxy] -- service_role client --> [UPDATE photo_posts SET status='approved']
    |
    v
[admin-proxy] -- optionally --> [INSERT into notifications (triggers push webhook)]
    |
    v
[Response] -- returned to AdminContext --> [Update local state]
```

### Notification Pipeline Flow

```
[Triggering Event: post approved, new comment, new follower]
    |
    v
[INSERT into notifications table]
    (via: service layer call, DB trigger, or Edge Function)
    |
    v
[Database Webhook fires on INSERT]
    |
    v
[Edge Function: push-notification]
    |
    v
[Query users table for FCM token]
    |
    v
[POST to FCM HTTP v1 API with notification payload]
    |
    v
[FCM delivers push to device]
    |
    v
[Device receives push, expo-notifications handler routes to correct screen via deep link]
```

### Auth Flow (After Migration)

```
[User taps "Login with Google"]
    |
    v
[AuthContext.login('google')]
    |
    v
[expo-web-browser opens Supabase OAuth URL]
    |
    v
[OAuth provider flow (Google/Apple/Kakao/Naver)]
    |
    v
[Redirect to udamon://auth/callback with tokens]
    |
    v
[Supabase Auth session established]
    |
    v
[AuthContext reads session, fetches public.users profile]
    |
    v
[If no profile row: create one (auth.users trigger or on-first-login)]
    |
    v
[App navigates to main screens]
```

## Key Data Flow: public.users Table

The `public.users` table is the linchpin of the entire architecture. It bridges Supabase Auth (`auth.users`) to all app logic.

```
auth.users (managed by Supabase Auth)
    |
    | -- DB trigger: on INSERT --> creates public.users row
    |
    v
public.users (app-managed profile)
    ├── id (= auth.users.id)
    ├── display_name, avatar_url, bio
    ├── is_photographer, is_admin
    ├── my_team_id -> teams
    ├── fcm_token (for push notifications)
    └── created_at, updated_at

    Referenced by:
    ├── community_posts.user_id
    ├── community_comments.user_id
    ├── community_likes.user_id
    ├── photographers.user_id
    ├── notifications.user_id
    └── (admin Edge Function checks is_admin)
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users (v1 launch) | Current architecture is sufficient. Single Supabase project, no caching layer, pg_cron for trending. RLS handles authorization. |
| 1k-10k users | Add pagination everywhere (already in community schema with cursor/offset). Consider materialized views for trending/leaderboard. Monitor RLS query performance. |
| 10k-100k users | Split read-heavy queries to Supabase Read Replicas. Move trending calculation to a dedicated materialized view refreshed by pg_cron. Consider adding Redis/CDN cache for feed endpoints. |

### Scaling Priorities

1. **First bottleneck: Feed queries with JOINs.** Community posts joining users + teams + like status is the heaviest query. Mitigation: pagination is already designed in; add database indexes on (team_id, created_at DESC) and (is_trending, created_at DESC). Already present in migrations.
2. **Second bottleneck: Image delivery bandwidth.** R2 public URL without CDN caching. Mitigation: Cloudflare CDN is inherent to R2 public buckets; add Image Resizing for thumbnail optimization to reduce payload.
3. **Third bottleneck: Notification volume.** If many users follow popular photographers, a single post approval could trigger thousands of notifications. Mitigation: batch inserts and rate-limit the FCM Edge Function.

## Anti-Patterns

### Anti-Pattern 1: Exposing service_role Key in Browser

**What people do:** Use the service_role key directly in the admin web app's Supabase client to bypass RLS for admin operations.
**Why it's wrong:** Any user can inspect browser network requests and extract the key, gaining full unrestricted database access. This is the single most dangerous mistake in Supabase architecture.
**Do this instead:** Route all admin write operations through an Edge Function that holds the service_role key server-side. The admin web app uses only the anon key + JWT for authentication.

### Anti-Pattern 2: Business Logic in Contexts Instead of DB

**What people do:** Calculate trending scores, enforce content rules, and aggregate counts in the React context layer.
**Why it's wrong:** Client-side calculations are unreliable (stale data, race conditions), not shared between mobile and admin, and can be manipulated. The current CommunityContext calculates trending in-memory -- this cannot work with real multi-user data.
**Do this instead:** Move trending calculation to a PostgreSQL function executed by pg_cron. Count updates are already handled by DB triggers (correct). Content rules (blinding) should be admin-controlled via the admin-proxy Edge Function.

### Anti-Pattern 3: One Giant Context for All Admin Data

**What people do:** Put all admin state, mock data, and operations into a single ~30KB AdminContext file.
**Why it's wrong:** Unmaintainable, impossible to test individual admin features, and causes unnecessary re-renders across all admin pages when any state changes.
**Do this instead:** Keep the single AdminContext for now (v1 pragmatism), but refactor to call `adminApi.ts` for all operations. The API service file provides the separation needed. Consider splitting the context into domain-specific hooks post-launch if it becomes a maintenance burden.

### Anti-Pattern 4: Swallowing Errors Silently

**What people do:** Service calls fail, context catches error, falls back to mock data or empty state without user feedback.
**Why it's wrong:** Users see empty screens or stale data without understanding why. Debugging production issues becomes impossible.
**Do this instead:** Every service error should propagate to the context, which sets an error state. Screens must check error state and show retry UI. The `ApiResult<T>` pattern is correct -- the problem is contexts ignoring the `error` field.

### Anti-Pattern 5: Duplicating User Info in Multiple Tables

**What people do:** Store `user_name` directly on `photo_comments` (currently done), `display_name` on posts, etc.
**Why it's wrong:** When a user changes their name, all historical records show the old name. Data becomes inconsistent.
**Do this instead:** Reference `public.users.id` via foreign key and JOIN at query time. The `photo_comments` table currently stores `user_name` as a denormalized column -- for v1 this is acceptable to avoid JOINs, but flag for refactoring.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Cloudflare R2 | Edge Function generates presigned PUT URLs; client uploads directly | Already implemented and working. Extend for community-posts prefix. |
| Firebase FCM | Edge Function POSTs to FCM HTTP v1 API using service account JWT | Requires Firebase project setup (external blocker). Store FCM token in `users.fcm_token`. |
| Google OAuth | Supabase Auth built-in provider | Configure in Supabase dashboard. Redirect URI: `udamon://auth/callback`. |
| Apple OAuth | Supabase Auth built-in provider | Requires Apple Developer account (DUNS blocker). Configure Services ID. |
| Kakao OAuth | Supabase Auth custom OIDC provider | Kakao Developers console setup required. |
| Naver OAuth | Supabase Auth custom OIDC provider | Naver Developers console setup required. |
| Cloudflare Image Resizing | URL convention or Cloudflare Worker proxy | For thumbnails on feed. Requires Cloudflare plan check. |

### Internal Boundaries

| Boundary | Communication | Build Order Dependency |
|----------|---------------|----------------------|
| Mobile App <-> PostgREST API | HTTP via supabase-js (anon key + JWT) | Service layer files must exist first |
| Admin Web <-> Edge Function (admin-proxy) | HTTP fetch with JWT bearer | admin-proxy Edge Function must be deployed first |
| Edge Function <-> PostgreSQL | service_role Supabase client (bypasses RLS) | public.users table must exist for admin check |
| Edge Function <-> R2 | AWS S3-compatible API (presigned URLs) | R2 bucket already configured |
| Edge Function <-> FCM | HTTP POST to googleapis.com/v1/projects/*/messages:send | Firebase project must be set up first |
| DB Webhook <-> Edge Function | HTTP POST triggered by table INSERT | notifications table + webhook config needed |
| Screens <-> Contexts | React Context hooks (useAuth, useCommunity, etc.) | Contexts must be migrated before screens can use real data |
| Contexts <-> Services | Direct function import and call | Service files must exist before context migration |

## Suggested Build Order

Based on dependency analysis, the recommended order for Supabase integration:

```
Phase 1: Foundation (no UI changes)
  ├── 1a. public.users table + auth trigger migration
  ├── 1b. New tables migration (notifications, announcements, etc.)
  ├── 1c. Extract ApiResult<T> to services/types.ts
  └── 1d. Environment variable cleanup (.env)

Phase 2: Auth (unblocks everything)
  ├── 2a. AuthContext -> Supabase Auth (mobile)
  ├── 2b. Admin AuthContext -> Supabase Auth (web)
  └── 2c. Remove hardcoded test accounts

Phase 3: Core Data (mobile app)
  ├── 3a. communityApi.ts service file
  ├── 3b. CommunityContext -> Supabase (posts, comments, likes, polls)
  ├── 3c. Community image upload (R2 community-posts prefix)
  └── 3d. Search + trending (DB function + pg_cron)

Phase 4: Admin Integration
  ├── 4a. admin-proxy Edge Function
  ├── 4b. adminApi.ts service file
  ├── 4c. AdminContext -> adminApi (all 20 pages)
  └── 4d. Admin RLS policies

Phase 5: Photographer Completion
  ├── 5a. Video upload support
  ├── 5b. Review/approval process (status column)
  └── 5c. Photographer application flow

Phase 6: Notifications + Polish
  ├── 6a. notifications table + in-app notification UI
  ├── 6b. push-notification Edge Function + FCM (if Firebase ready)
  ├── 6c. Image resize (Cloudflare or Edge Function fallback)
  └── 6d. Error/loading state UI cleanup
```

**Ordering rationale:**
- Phase 1 first because `public.users` is a foreign key dependency for nearly every other table
- Phase 2 next because all subsequent phases need real user sessions for RLS to work
- Phase 3 before Phase 4 because admin operations act on community data that must exist first
- Phase 5 is parallel-safe with Phase 4 (independent domain)
- Phase 6 last because notifications depend on all other data flows being established

## Sources

- [Supabase Expo React Native Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) -- HIGH confidence
- [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- HIGH confidence
- [Supabase Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture) -- HIGH confidence
- [Supabase Push Notifications Guide](https://supabase.com/docs/guides/functions/examples/push-notifications) -- HIGH confidence
- [Supabase Image Manipulation in Edge Functions](https://supabase.com/docs/guides/functions/examples/image-manipulation) -- HIGH confidence (limitations verified)
- [Supabase Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) -- HIGH confidence (confirmed R2 incompatible)
- [Supabase pg_cron Docs](https://supabase.com/docs/guides/cron) -- HIGH confidence
- [Cloudflare Image Resizing with R2 Reference Architecture](https://developers.cloudflare.com/reference-architecture/diagrams/content-delivery/optimizing-image-delivery-with-cloudflare-image-resizing-and-r2/) -- HIGH confidence
- [Supabase MVP Architecture 2026 - Valtorian](https://www.valtorian.com/blog/supabase-mvp-architecture) -- MEDIUM confidence (third-party blog)
- [Supabase Services & Hooks Guide](https://javascript.plainenglish.io/the-supabase-services-hooks-guide-that-will-transform-your-data-layer-architecture-301b79a8c411) -- MEDIUM confidence (third-party blog)

---
*Architecture research for: KBO fan community + photographer app (Supabase integration)*
*Researched: 2026-04-05*
