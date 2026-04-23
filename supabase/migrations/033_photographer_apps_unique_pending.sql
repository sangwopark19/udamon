-- ============================================================
-- 033_photographer_apps_unique_pending.sql
-- photographer_applications: 사용자당 pending 상태 신청은 최대 1건 (HI-03, T-4-01 강화)
--
-- 문제: 기존에는 user_id 에 UNIQUE 제약이 없어 같은 사용자가 pending 상태로
-- 여러 행을 INSERT 할 수 있었음. fetchMyPhotographerApplication 이 order by
-- created_at desc limit 1 로 "최신만" 가져오는 방식은 숨김 효과일 뿐,
-- admin review 큐에는 중복이 누적되고 승인 트리거에서 notification 이 중복
-- 발송될 수 있었음 (WR-04 와 복합).
--
-- 해결: partial unique index 로 status='pending' 인 경우에만 user_id 유일성 강제.
-- approved/rejected 상태의 과거 이력은 중복 허용 (재신청 히스토리 보존).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS photographer_apps_unique_pending
  ON public.photographer_applications (user_id)
  WHERE status = 'pending';

COMMENT ON INDEX public.photographer_apps_unique_pending IS
  'T-4-01 / HI-03: 사용자당 pending 신청은 최대 1건. 중복 INSERT 시 sqlstate 23505 unique_violation.';
