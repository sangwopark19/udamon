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

## Follow-up

- v1 런칭 전 `009_seed_photographer.sql` migration 을 prod 적용 대상에서 제외할지 결정 필요 (현재는 `supabase db push` 시 재주입됨). 후속 phase에서 처리 권장.
