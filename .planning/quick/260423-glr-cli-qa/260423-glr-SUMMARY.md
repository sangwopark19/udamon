---
id: 260423-glr
slug: cli-qa
type: quick
title: 원격 Supabase seed 목업 데이터 제거
status: complete
completed: 2026-04-23
duration: ~10 min
---

# Quick Task 260423-glr — complete

## Outcome

`supabase db query --linked` 로 원격 Supabase(`jfynfapkbpkwyrjulsed / udamon`, Seoul) 에서 `009_seed_photographer.sql` 기원 시드 데이터를 단일 트랜잭션으로 삭제했다. 실사용자(박상우) 포토그래퍼 1명 + 포스트 4개는 그대로 유지.

## Counts — before / after

| 테이블 | 삭제 전 | 삭제 후 | 삭제됨 |
|--------|--------|---------|--------|
| auth.users | 29 | 15 | 14 (5 pg + 9 fan) |
| photographers | 6 | 1 | 5 (CASCADE) |
| photo_posts | 29 | 4 | 25 (CASCADE) |
| photo_comments | 10 | 0 | 10 (CASCADE) |
| photo_collections | 3 | 0 | 3 (CASCADE) |
| photo_collection_posts | 6 | 0 | 6 (CASCADE) |
| timeline_events | 5 | 0 | 5 (직접) |
| timeline_event_teams | 8 | 0 | 8 (CASCADE) |
| teams | 10 | 10 | — |
| cheerleaders | 10 | 10 | — |

## Execution

### Backup

`.planning/quick/260423-glr-cli-qa/backup-pre-delete-2026-04-23.json` (58 KB)
- 삭제 대상 모든 행의 원본 jsonb 저장 (auth.users, auth.identities, photographers, photo_posts, photo_comments, photo_collections, photo_collection_posts, timeline_events, timeline_event_teams)

### SQL

```sql
BEGIN;
WITH deleted_events AS (
  DELETE FROM public.timeline_events
  WHERE id::text LIKE 'e0000000-0000-0000-0000-%'
  RETURNING id
),
deleted_users AS (
  DELETE FROM auth.users
  WHERE id::text LIKE '00000000-0000-0000-0000-%'
  RETURNING id
)
SELECT
  (SELECT COUNT(*) FROM deleted_events) AS deleted_timeline_events,
  (SELECT COUNT(*) FROM deleted_users)  AS deleted_auth_users;
COMMIT;
```

결과: `deleted_auth_users=14, deleted_timeline_events=5`.

### CASCADE 의존성

`auth.users ON DELETE CASCADE` 체인으로 `photographers → photo_posts → photo_comments/photo_likes/photo_collections/photo_collection_posts` 가 자동 삭제됨 (각 FK 정의는 `007_photographer.sql`, `011_users.sql` 참조).

## Remaining real data

실사용자 포토그래퍼 1명 (user_id `4-prefix` 실제 auth user, display_name=`박상우`):
- `54b0ade5...` ("11", 2026-04-21)
- `6a448735...` ("vd", 2026-04-20)
- `a34973f5...` ("testtest", 2026-04-16)
- `d3eda232...` ("testtest", 2026-04-15)

## Rollback

- JSON 백업으로 행 단위 복원 가능
- 또는 migration `009_seed_photographer.sql` 재실행 (ON CONFLICT DO NOTHING 이라 idempotent)

## Follow-up — 완료

후속 조치로 `supabase/migrations/034_remove_seed_photographer_data.sql` 을 작성하고 원격에 push 했다. migration 은 idempotent DELETE 로 구성되어 있어:

- 현재 prod (이미 manual cleanup 완료): 첫 적용은 no-op.
- 향후 fresh 환경 또는 `supabase db reset`: 009 가 시드 주입 후 034 가 즉시 제거 → 최종 상태는 깨끗.
- 로컬 dev 에서 시드를 유지하고 싶다면 별도로 `supabase/seed.sql` 을 구성해야 함 (현재 v1 scope 외).

Verification: `supabase migration list --linked` 결과 local/remote 모두 034 까지 동기. 적용 후 카운트 변동 없음 (auth.users 15, photographers 1, posts 4, timeline_events 0).
