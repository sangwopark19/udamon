---
phase: 02
slug: authentication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest (via expo/jest-expo preset) |
| **Config file** | app/package.json (jest config) or "none — Wave 0 installs" |
| **Quick run command** | `cd app && npx jest --testPathPattern=auth --no-coverage` |
| **Full suite command** | `cd app && npx jest --no-coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd app && npx jest --testPathPattern=auth --no-coverage`
- **After every plan wave:** Run `cd app && npx jest --no-coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | AUTH-01 | T-02-01 / — | OAuth token validated server-side | integration | `supabase db push --dry-run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | AUTH-02 | T-02-02 / — | Session persisted securely in AsyncStorage | unit | `npx jest --testPathPattern=session` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | AUTH-05 | — | Profile data fetched from users table | unit | `npx jest --testPathPattern=profile` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | AUTH-06 | — | Nickname change blocked within 30 days | unit | `npx jest --testPathPattern=nickname` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | AUTH-08 | T-02-03 / — | User data soft-deleted, content shows "탈퇴한 사용자" | integration | `npx jest --testPathPattern=delete` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 2 | AUTH-09 | — | Blocked user posts hidden from feed | unit | `npx jest --testPathPattern=block` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/src/__tests__/auth/` — test directory for auth tests
- [ ] Jest/jest-expo installation verification — ensure test runner works
- [ ] Supabase test client setup — mock or test project config

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect flow | AUTH-01 | Requires real Google OAuth credentials and device browser | 1. Tap Google login 2. Complete OAuth in browser 3. Verify redirect back to app |
| Kakao OAuth redirect flow | AUTH-02 | Requires real Kakao OAuth credentials | 1. Tap Kakao login 2. Complete OAuth 3. Verify session created |
| Naver OAuth via Edge Function | AUTH-03 | Requires deployed Edge Function + Naver API keys | 1. Tap Naver login 2. Verify Edge Function proxy 3. Verify session |
| Apple Sign In | AUTH-04 | Requires Apple Developer account + DUNS | Deferred until DUNS complete |
| App restart session persistence | AUTH-07 | Requires full app lifecycle test | 1. Login 2. Kill app 3. Relaunch 4. Verify still logged in |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
