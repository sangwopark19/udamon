-- ============================================================
-- 034_remove_seed_photographer_data.sql
-- 009_seed_photographer.sql 시드 제거 — prod 재주입 방지용 idempotent cleanup
-- ============================================================
--
-- 목적:
--   009 는 개발 초기 UI 프로토타입용 시드 (pg1~pg5 포토그래퍼, fan1~fan9
--   댓글러, 타임라인 이벤트) 를 고정 UUID 로 주입했음. v1 런칭부터는 실사용자
--   데이터만 남기고자 하므로, 모든 환경에서 migration chain 이 fresh 하게
--   재생될 때도 이 시드가 최종 상태에 남지 않도록 뒤이어 삭제한다.
--
--   현재 원격 prod(`jfynfapkbpkwyrjulsed / udamon`) 는 2026-04-23 manual
--   cleanup(quick task 260423-glr, backup JSON 보관) 으로 이미 이 상태이므로
--   이 migration 은 첫 적용에서 no-op 로 끝난다.
--
-- 범위:
--   - auth.users WHERE id::text LIKE '00000000-0000-0000-0000-%'
--       → CASCADE: public.users, photographers, photo_posts, photo_comments,
--         photo_likes, photographer_follows, photo_collections, photo_collection_posts
--   - timeline_events WHERE id::text LIKE 'e0000000-0000-0000-0000-%'
--       → CASCADE: timeline_event_teams
--
-- Out of scope (유지):
--   - teams (006_seed_teams.sql) — 앱 동작 필수 마스터 데이터
--   - cheerleaders (022_seed_cheerleaders.sql) — 서비스 콘텐츠
--   - players (001_teams_players.sql) — 마스터 데이터
--
-- 로컬 개발 환경 주의:
--   `supabase db reset --local` 로 전체 migration 을 재실행하면 009 가 먼저
--   시드를 넣고, 이어서 034 가 즉시 삭제한다. 로컬에서 시드 데이터를 유지하고
--   싶다면 009 를 수동으로 다시 실행하거나 `supabase/seed.sql` 을 별도로
--   구성할 것.
-- ============================================================

DELETE FROM public.timeline_events
 WHERE id::text LIKE 'e0000000-0000-0000-0000-%';

DELETE FROM auth.users
 WHERE id::text LIKE '00000000-0000-0000-0000-%';
