---
id: 260423-glr
slug: cli-qa
type: quick
title: 원격 Supabase에서 seed 목업 데이터 제거 (실사용자 데이터만 유지)
created: 2026-04-23
status: in_progress
scope: data_cleanup
blast_radius: production
---

# Quick Task 260423-glr — seed mock data cleanup

## Description

Supabase CLI(`supabase db query --linked`) 로 원격 프로젝트(`jfynfapkbpkwyrjulsed / udamon`)에 연결해 시드(`009_seed_photographer.sql`) 기원 목업 데이터를 제거하고, 사용자가 QA 중 실제 앱으로 만든 데이터만 남긴다.

## Decisions (confirmed with user)

- **Scope (1a)**: `pg1~pg5` 시드 포토그래퍼와 그들의 posts/collections를 삭제. `teams`, `players`, `cheerleaders` 등 앱 동작에 필요한 마스터 데이터는 유지.
- **Classification (2c)**: "실 사용자 데이터" = `user_id`가 `00000000-0000-0000-0000-*` 프리픽스가 아닌 auth.users. 이 정의에 따라 seed 댓글 작성자(`fan1~fan9`)도 시드로 간주되어 함께 삭제.
- **Execution (3)**: Supabase CLI 원격, 직접 실행.
- **Safety (4)**: 삭제 전 seed 데이터 JSON 스냅샷 백업 필수.

## Current state (verified via supabase db query)

| 항목 | 총 | 시드 (삭제) | 실사용자 (유지) |
|------|-----|------------|-----------------|
| auth.users | 29 | 14 | 15 |
| photographers | 6 | 5 | 1 (박상우) |
| photo_posts | 29 | 25 | 4 |
| photo_comments | 10 | 10 | 0 |
| photo_likes | 0 | 0 | 0 |
| photographer_follows | 0 | 0 | 0 |
| photo_collections | 3 | 3 | 0 |
| photo_collection_posts | 6 | 6 | 0 |
| timeline_events | 5 | 5 | 0 |
| timeline_event_teams | 8 | 8 | 0 |

## Deletion strategy

FK 구조 확인 결과 `auth.users` → 모든 관련 테이블이 `ON DELETE CASCADE`. 따라서:

1. `timeline_events` 먼저 삭제 (auth.users 와 FK 없음)
   - `timeline_event_teams` 는 CASCADE
2. `auth.users WHERE id::text LIKE '00000000-0000-0000-0000-%'` 삭제
   - CASCADE 로 아래가 함께 삭제됨:
     - `public.users` (011_users.sql)
     - `photographers` (user_id FK)
     - `photo_posts` (photographer_id FK → photographers → auth.users)
     - `photo_comments` (user_id FK + post_id FK)
     - `photo_likes` (user_id FK)
     - `photographer_follows` (follower_id FK)
     - `photo_collections` (photographer_id FK)
     - `photo_collection_posts` (post_id FK + collection_id FK)

모든 삭제는 하나의 transaction(BEGIN/COMMIT) 안에서 실행한다.

## Expected post-state

| 항목 | 예상 |
|------|-----|
| auth.users | 15 |
| photographers | 1 |
| photo_posts | 4 (박상우 testtest/11/vd) |
| photo_comments | 0 |
| photo_collections | 0 |
| timeline_events | 0 |
| teams | 10 (그대로) |
| cheerleaders | 유지 |

## Rollback

- JSON 백업 파일: `backup-pre-delete-2026-04-23.json` — 각 테이블별 전체 행 저장
- 비상 복구: migration `009_seed_photographer.sql` 을 재실행하면 시드가 동일한 고정 UUID로 재생성됨 (ON CONFLICT DO NOTHING)

## Verification

- 삭제 후 카운트 SELECT로 예상값과 일치 확인
- 앱에서 박상우 포토그래퍼 프로필/포스트 4개가 정상 노출되는지는 후속 수동 QA에서 확인
