# Feature Research

**Domain:** KBO fan community + fan photographer sharing (Korean sports)
**Researched:** 2026-04-05
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features Korean sports community users assume exist. Missing any of these means users leave for existing alternatives (Naver Sports open chat, DC Inside baseball gallery, FM Korea, KakaoTalk open chat, or just Instagram/X).

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Korean social login (Kakao + Google + Apple)** | Korean users expect Kakao login on every app. Google/Apple are standard for mobile. Naver is expected but Supabase lacks native support. | MEDIUM | Kakao is natively supported by Supabase Auth. Naver requires Custom OIDC provider (Supabase allows up to 3 custom providers). Apple Sign In blocked by DUNS registration. |
| **Team-specific community boards** | Every Korean baseball community (Naver Sports, DC Inside, FM Korea) organizes by team (10 KBO teams). Users expect to filter/browse by their team. | LOW | Already modeled: `team_id` on `community_posts`, `KBO_TEAMS` constant exists. Just needs Supabase wiring. |
| **Post creation with images** | Text + image posts are baseline for any community. FM Korea, DC Inside all support multi-image posts. | MEDIUM | R2 upload infra exists. Need community-posts prefix path, client-side image optimization already in place. |
| **Like / comment / reply** | Universal social interaction. Every community app has this. | LOW | Types and UI exist. `community_likes`, `community_comments` tables exist in migrations. Wire to Supabase. |
| **Content reporting** | Users expect to flag inappropriate content. Lack of reporting = users feel unsafe. FM Korea and DC Inside have robust report systems. | LOW | `community_reports` table exists. `reportTarget` function in CommunityContext needs Supabase wiring (currently a TODO). |
| **User profiles with team badge** | Korean fan identity is tightly coupled to team affiliation. Naver Sports MyTicket applies team skins. Users want their team visible on their profile. | MEDIUM | `public.users` table is missing from migrations -- this is the #1 blocker. Needs `my_team_id`, `nickname`, `avatar_url` at minimum. |
| **Push notifications** | Every Korean app sends push notifications. Naver Sports pushes game start/end, lineup. Users will not check the app without reminders. | HIGH | Expo Push Notification deep link handler exists. FCM setup is a blocker (Firebase not configured yet). Needs `notifications` table. |
| **In-app notifications** | Activity feed (likes, comments on your posts, new followers) is standard. Weverse, Instagram, all community apps have this. | MEDIUM | `NotificationContext` exists with mock data. Need `notifications` table and Supabase wiring. |
| **Trending / popular posts** | Korean communities prominently feature "best posts" (DC Inside "hit gallery", FM Korea "best"). Users expect to find popular content easily. | MEDIUM | Trending algorithm exists in CommunityContext (48hr window, like*2 + comment*3 + view*0.1). Needs to run server-side for accuracy, but client-side is acceptable for v1. |
| **Search** | Basic post search is expected in any community. | LOW | `CommunitySearchScreen` exists. Needs Supabase text search (PostgreSQL `to_tsvector` or ILIKE). |
| **Content moderation (admin)** | Posts/comments that violate rules must be removable. Manual admin review is fine for v1 with small user base. | MEDIUM | Admin web has `PostReviewPage`, `ReportPage`, `CommunityManagePage` UI. All mock -- needs Supabase wiring. |
| **Post blinding (hide from public)** | Korean communities use "blinding" as a standard moderation action. DC Inside, FM Korea both have blind/delete distinction. | LOW | `is_blinded` field exists on `CommunityPost` type. Admin can toggle via admin panel. |

### Differentiators (Competitive Advantage)

Features that distinguish Udamon from existing Korean sports community platforms. These fill gaps that Naver Sports, DC Inside, and FM Korea do not address.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Dedicated fan photographer gallery** | No existing Korean platform gives fan photographers a dedicated, structured space. Currently scattered across Instagram, X, personal blogs. Udamon consolidates this into a curated gallery with team/player tagging. | HIGH | Core differentiator. `photo_posts` table, `PhotographerContext` partially wired. Needs: `status` column migration, review workflow, video upload. |
| **Photographer verification & tiers** | Verified photographer badges build trust and incentivize quality content. No competitor offers this for KBO fan photographers. | MEDIUM | `is_verified` on `Photographer` type. Needs `photographer_applications` table for application review flow. |
| **Cheerleader photo tagging** | KBO cheerleaders have massive fan followings. No existing platform lets photographers tag cheerleader photos specifically. | MEDIUM | `cheerleader_id` on `PhotoPost` type exists but `cheerleaders` table is missing from migrations. Need migration + seed data. |
| **Player/team-tagged photography** | Structured metadata (which player, which team, which event) makes photos discoverable. Instagram hashtags are unstructured; this is curated. | LOW | `player_id` and `team_id` on `photo_posts`. Players table and seed data exist. |
| **Polls in community posts** | Interactive polls boost engagement. Naver Sports does not have native community polls. FM Korea has limited poll support. | LOW | Full poll system modeled: `community_polls`, `community_poll_options`, `community_poll_votes` tables. `CreatePollInput` with duration options (24h/3d/7d). |
| **Featured collections / weekly picks** | Admin-curated "best of the week" photo collections. Creates a reason to return. Similar to Instagram's featured/explore but team-specific. | MEDIUM | `is_featured` and `featured_week` on `PhotoPost`. `FeaturedCollectionPage` in admin. Needs wiring. |
| **Combined community + gallery in one app** | No single Korean app combines team community boards AND a curated photo gallery. Users currently jump between DC Inside (discussion) and Instagram (photos). | LOW | This is an architecture advantage, not a feature to build. The app structure already supports both via tab navigation. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem appealing but should be deliberately excluded, especially for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time chat / live game chat** | Naver Sports has open talk (1000-person rooms). Users may expect live discussion during games. | Supabase Realtime is out of scope for v1. Real-time chat requires WebSocket infrastructure, moderation at scale, and handling burst traffic during games. For a small team launching in 6 weeks, this is a maintenance nightmare. | Lean on community posts with "game thread" posts. Let KakaoTalk open chat handle real-time discussion. Link to official KakaoTalk rooms from the app. |
| **DM / 1:1 messaging** | Pro Baseball LIVE has 1:1 messaging. Users want to contact photographers directly. | Creates moderation burden (harassment, spam). Requires real-time infrastructure. Already explicitly out of scope for v1 (`MESSAGE_FEATURE_ENABLED = false`). | Show photographer's social media links (Instagram, X) on their profile. Users contact through existing platforms. |
| **Auto-moderation (spam filter, NSFW detection, auto-blind)** | At scale, manual moderation is unsustainable. Seems like a must-have. | For v1 with a small user base (likely hundreds, not thousands), auto-moderation adds complexity without proportional value. The spam filter migration (004) was already deprecated. False positives frustrate early users. | Manual admin moderation via admin panel. 1-2 admins can handle the volume at launch. Revisit auto-moderation when DAU exceeds ~5,000. |
| **Ticket / payment / monetization** | Revenue is important. Photographers might want to sell prints. | Payment integration (Toss Payments, Stripe) requires business registration, compliance, and significant implementation time. `paymentApi.ts` is entirely simulated. Already confirmed out of scope for v1. | Launch without monetization. Validate that users actually want to pay before building payment infrastructure. |
| **Dark mode** | Modern apps offer dark mode. Users will request it. | `ThemeContext` has `@ts-nocheck`. Implementing dark mode across all screens is a significant effort that does not affect core functionality. Confirmed deferred to v2. | Ship light mode only. Add dark mode in v2 when UI is stable. |
| **Follower-based social graph** | Instagram-style follow/feed model. `new_follower` is already a notification type. | Building a full social graph (follow, unfollow, follower lists, follower-based feed ranking) adds significant complexity. The community model is board-based (by team), not follower-based. | Implement photographer following only (follow photographers to see their new uploads). Do not build a general user-to-user follow system for v1. |
| **Native share to external platforms** | Users want to share posts to KakaoTalk, Instagram Stories, etc. | Expo sharing APIs exist but require platform-specific configuration and testing. Low priority relative to core features. Confirmed as "if time permits" in PROJECT.md. | Basic link copying. Native share can be added post-launch without breaking changes. |

## Feature Dependencies

```
[Kakao/Google/Apple OAuth]
    |
    v
[public.users table + profiles]
    |
    +--------> [Community posts CRUD] -----> [Likes / Comments]
    |               |                              |
    |               v                              v
    |          [Image upload to R2]          [Reporting to DB]
    |               |                              |
    |               v                              v
    |          [Search (text)]            [Admin moderation panel]
    |                                              |
    |                                              v
    +--------> [Photographer registration]   [Post blinding]
    |               |
    |               v
    |          [Photo upload + review workflow]
    |               |
    |               +----> [Player/team tagging]
    |               +----> [Cheerleader tagging] (requires cheerleaders table)
    |               +----> [Featured collections]
    |
    +--------> [Notifications table]
    |               |
    |               +----> [In-app notification feed]
    |               +----> [FCM push notifications] (requires Firebase setup)
    |
    +--------> [Trending algorithm] (requires view_count increment)

[Polls] ----independent----> [Community posts] (optional attachment)

[Admin auth (Supabase)] ----independent----> [Admin panel Supabase wiring]
```

### Dependency Notes

- **Everything requires `public.users` table:** This is the single biggest blocker. Without it, there are no profiles, no team badges, no admin flags, and `fetchUserProfile` returns null for every real user.
- **OAuth requires `public.users`:** After OAuth sign-in, a trigger must create a row in `public.users` from `auth.users`. Without this, authenticated users have no application profile.
- **Community CRUD requires OAuth + users:** Posts must have a `user_id` from an authenticated user.
- **Photographer registration requires OAuth + users:** A photographer is linked to a `user_id`.
- **Photo review workflow requires `status` column migration:** Currently missing from `photo_posts` table. All posts default to "approved" without it.
- **Cheerleader tagging requires `cheerleaders` table:** Currently mock-only data, no migration exists.
- **Push notifications require Firebase:** External dependency blocker. FCM must be configured before push can work.
- **Trending accuracy requires view_count increment:** Currently `view_count` is never incremented anywhere in the codebase.
- **Naver OAuth requires Custom OIDC setup:** Supabase does not natively support Naver. Must use Custom OAuth/OIDC provider feature (limit: 3 custom providers per project).

## MVP Definition

### Launch With (v1)

Based on PROJECT.md timeline (v1 by mid-May 2026, ~6 weeks) and existing codebase state.

- [x] **Kakao + Google OAuth** -- Kakao is the highest-priority Korean login. Google is universal fallback. Both natively supported by Supabase Auth.
- [ ] **Apple OAuth** -- Required for iOS App Store. Blocked by DUNS registration.
- [ ] **`public.users` table + profile system** -- The #1 blocker. Must include `my_team_id`, `nickname`, `avatar_url`, `is_admin`.
- [ ] **Community posts CRUD (Supabase)** -- Wire `CommunityContext` to existing DB tables. Posts, comments, likes, polls.
- [ ] **Community image upload** -- R2 `community-posts/` prefix. Infra exists, just needs client wiring.
- [ ] **Team-filtered community boards** -- Filter by `team_id`. UI exists, logic is trivial once DB is wired.
- [ ] **Reporting to DB** -- Wire `reportTarget` to `community_reports` table.
- [ ] **Trending posts** -- Client-side trending algorithm is acceptable for v1. Must add `view_count` increment.
- [ ] **Search** -- PostgreSQL ILIKE or `to_tsvector` on title + content. `CommunitySearchScreen` exists.
- [ ] **Photographer photo upload + review** -- Add `status`/`rejection_reason` columns. Wire upload and review flow.
- [ ] **In-app notifications** -- Create `notifications` table. Wire `NotificationContext`.
- [ ] **Admin panel Supabase wiring** -- Priority: post review, report resolution, user management.
- [ ] **Admin auth via Supabase** -- Replace hardcoded admin credentials.

### Add After Validation (v1.x)

Features to add once core is working and user feedback is collected.

- [ ] **Naver OAuth (Custom OIDC)** -- Add when Apple DUNS is resolved and core auth is stable. Supabase Custom OIDC provider config needed.
- [ ] **FCM push notifications** -- Add when Firebase project is set up (external blocker). Expo push token registration is already in place.
- [ ] **Cheerleader tagging** -- Create `cheerleaders` table + migration. Seed data needed. Low user-facing urgency.
- [ ] **Featured collections curation** -- Admin workflow for weekly picks. Nice engagement driver once there is photographer content to curate.
- [ ] **Photographer verification tiers** -- Application review workflow via admin panel. Needs `photographer_applications` table.
- [ ] **Native sharing** -- Expo sharing to KakaoTalk, Instagram, etc. Low-effort post-launch addition.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Real-time game chat** -- Requires Supabase Realtime or separate WebSocket infra. Only build if community posts prove insufficient for game-day engagement.
- [ ] **DM / 1:1 messaging** -- Only if photographers explicitly request direct contact. Instagram DMs already serve this purpose.
- [ ] **Payment / monetization** -- Toss Payments or Paddle integration. Only after validating user willingness to pay.
- [ ] **Dark mode** -- UI polish. Fix `ThemeContext` `@ts-nocheck` first.
- [ ] **Auto-moderation (AI)** -- Only when DAU > 5,000 makes manual moderation impractical.
- [ ] **Follower-based social feed** -- Only if team-board model proves insufficient for content discovery.
- [ ] **Next.js web (udamonfan.com)** -- Web presence for SEO and content sharing. Deferred per PROJECT.md.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `public.users` table + profiles | HIGH | MEDIUM | **P0** |
| Kakao + Google OAuth | HIGH | MEDIUM | **P0** |
| Community posts CRUD (Supabase) | HIGH | MEDIUM | **P1** |
| Team-filtered boards | HIGH | LOW | **P1** |
| Community image upload | HIGH | LOW | **P1** |
| Likes / comments wiring | HIGH | LOW | **P1** |
| Reporting to DB | MEDIUM | LOW | **P1** |
| Search | MEDIUM | LOW | **P1** |
| Trending posts + view_count | MEDIUM | MEDIUM | **P1** |
| Admin auth (Supabase) | HIGH | MEDIUM | **P1** |
| Admin panel Supabase wiring | HIGH | HIGH | **P1** |
| Photographer photo upload + review | HIGH | MEDIUM | **P1** |
| In-app notifications | MEDIUM | MEDIUM | **P2** |
| Polls (Supabase wiring) | LOW | LOW | **P2** |
| Apple OAuth | HIGH | LOW (once DUNS resolves) | **P2** |
| Naver OAuth (Custom OIDC) | MEDIUM | MEDIUM | **P2** |
| FCM push notifications | MEDIUM | HIGH (external blocker) | **P2** |
| Cheerleader tagging | LOW | MEDIUM | **P2** |
| Featured collections | LOW | LOW | **P3** |
| Photographer verification | LOW | MEDIUM | **P3** |
| Native sharing | LOW | LOW | **P3** |

**Priority key:**
- P0: Must complete first (blocks everything else)
- P1: Must have for launch
- P2: Should have, add when blockers resolve or time permits
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Naver Sports | DC Inside (yaGal) | FM Korea | KakaoTalk Open Chat | Pro Baseball LIVE | **Udamon** |
|---------|-------------|-------------------|----------|--------------------|--------------------|------------|
| Team-specific boards | Implicit via Open Talk rooms per team | Sub-galleries | Category tags | Per-team chat rooms | Community section | Per-team boards with `team_id` filter |
| Real-time game chat | Open Talk (1000 users) + "watch together" | Thread-based, not real-time | Thread-based | Core feature | Live cheering | Out of scope v1 (post-based game threads) |
| Image sharing | Limited (Open Talk photos) | Gallery-style with image posts | Image posts | Photo sharing in chat | None | Full photo gallery with metadata tagging |
| Photography portfolio | None | None | None | None | None | **Unique: dedicated photographer profiles, curated gallery** |
| Player/cheerleader tagging | None | Hashtags only | Hashtags only | None | None | **Unique: structured DB-level tagging** |
| Polls | None | None | Limited | None | Winning pitcher prediction | Built-in poll system on community posts |
| Admin review | Platform-level moderation | Gallery manager + user reports | Admin + auto-filter | Report-based | Unknown | Dedicated admin web panel (20 pages) |
| OAuth | Naver account | Various | Various | Kakao account | Email/social | Kakao + Google + Apple (+ Naver via OIDC) |
| Push notifications | Game alerts, lineup | None (web-based) | None (web-based) | Chat notifications | Game alerts | In-app + FCM push (when Firebase ready) |
| Content curation | AI-driven trending | "Hit gallery" by votes | "Best" by votes | None | None | Trending algorithm + admin featured picks |

### Key Competitive Insights

1. **No dedicated KBO fan photographer platform exists.** Photographers currently use Instagram (fragmented, no team structure), X/Twitter (ephemeral), or personal blogs (isolated). Udamon's photographer gallery fills a genuine gap.

2. **Existing Korean baseball communities are web-first.** DC Inside and FM Korea are web forums. Naver Sports is app-embedded but part of a mega-app. There is no dedicated mobile-native KBO community app with structured data.

3. **Real-time chat is dominated by KakaoTalk and Naver Open Talk.** Competing on real-time chat is unwise. Instead, complement these platforms with persistent, searchable, team-organized content.

4. **Korean users strongly prefer Kakao login.** It is the single most important OAuth provider. Google and Apple are secondary but required for reach and iOS App Store compliance.

5. **Naver OAuth absence from Supabase is a real friction point.** Many Korean users expect Naver login. The Custom OIDC workaround is viable but adds implementation complexity. This should not block v1 launch but should be added in v1.x.

## Sources

- [Naver Sports community features (2026 KBO opening)](https://v.daum.net/v/20260403174703485) -- MEDIUM confidence
- [Naver, Kakao expand into sports fandom business](https://en.sedaily.com/technology/2025/12/25/naver-kakao-expand-into-sports-fandom-business) -- MEDIUM confidence
- [Pro Baseball LIVE app features](https://apps.apple.com/kr/app/%ED%94%84%EB%A1%9C%EC%95%BC%EA%B5%AC-live/id515155553) -- HIGH confidence (official listing)
- [Supabase Kakao OAuth docs](https://supabase.com/docs/guides/auth/social-login/auth-kakao) -- HIGH confidence
- [Supabase Custom OAuth/OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers) -- HIGH confidence
- [Supabase Naver support discussion](https://github.com/orgs/supabase/discussions/35631) -- HIGH confidence (official GitHub)
- [KakaoTalk Open Chat features](https://www.kakaocorp.com/page/detail/10811) -- HIGH confidence (official)
- [Weverse fan community features](https://weverse.io/) -- MEDIUM confidence
- [Fan engagement best practices 2025 (Infobip)](https://www.infobip.com/blog/fan-engagement) -- LOW confidence (general industry)
- [Content moderation best practices 2025 (Arena)](https://arena.im/uncategorized/content-moderation-best-practices-for-2025/) -- LOW confidence (general industry)
- [Twitter/X algorithm engagement weighting (Sprout Social)](https://sproutsocial.com/insights/twitter-algorithm/) -- MEDIUM confidence (trending formula reference)
- [DC Inside baseball gallery (NamuWiki)](https://namu.wiki/w/%EA%B5%AD%EB%82%B4%EC%95%BC%EA%B5%AC%20%EA%B0%A4%EB%9F%AC%EB%A6%AC) -- MEDIUM confidence
- [FM Korea baseball section](https://www.fmkorea.com/baseball) -- HIGH confidence (direct observation)

---
*Feature research for: KBO fan community + fan photographer sharing*
*Researched: 2026-04-05*
