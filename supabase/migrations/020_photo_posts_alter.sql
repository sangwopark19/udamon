-- ============================================================
-- 020_photo_posts_alter.sql
-- photo_posts 컬럼 추가 (DB-10, DB-11)
-- ============================================================

-- DB-10: status + rejection_reason
-- DEFAULT 'approved'는 기존 데이터 호환 -- 이미 존재하는 photo_posts는 모두 approved 상태가 됨
ALTER TABLE photo_posts
  ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE photo_posts
  ADD COLUMN rejection_reason TEXT;

-- DB-11: cheerleader_id FK (cheerleaders 테이블은 017에서 생성됨)
ALTER TABLE photo_posts
  ADD COLUMN cheerleader_id UUID REFERENCES public.cheerleaders(id);

CREATE INDEX idx_photo_posts_status ON photo_posts(status);
CREATE INDEX idx_photo_posts_cheerleader ON photo_posts(cheerleader_id) WHERE cheerleader_id IS NOT NULL;
