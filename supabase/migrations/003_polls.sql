-- ============================================================
-- 003_polls.sql
-- 투표, 선택지, 투표기록
-- ============================================================

-- 투표
CREATE TABLE community_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  allow_multiple BOOLEAN DEFAULT FALSE,             -- 복수 선택 허용
  expires_at TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)                                   -- 1 게시글 = 1 투표
);

-- 투표 선택지 (2~6개)
CREATE TABLE community_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 50),
  vote_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_poll_options_poll ON community_poll_options(poll_id, sort_order);

-- 투표 기록
CREATE TABLE community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES community_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_poll_votes_poll_user ON community_poll_votes(poll_id, user_id);
CREATE INDEX idx_poll_votes_option ON community_poll_votes(option_id);

-- 단일선택 모드: poll당 user 1표 제한
-- 복수선택 모드: poll + option당 user 1표 제한
CREATE UNIQUE INDEX idx_poll_votes_unique_per_option
  ON community_poll_votes(poll_id, option_id, user_id);

-- 단일선택 모드에서 중복 투표 방지 함수
CREATE OR REPLACE FUNCTION check_poll_vote()
RETURNS TRIGGER AS $$
DECLARE
  poll_allow_multiple BOOLEAN;
  poll_closed BOOLEAN;
  poll_expired BOOLEAN;
  existing_vote_count INTEGER;
BEGIN
  -- 투표 상태 확인
  SELECT allow_multiple, is_closed, (expires_at < NOW())
    INTO poll_allow_multiple, poll_closed, poll_expired
    FROM community_polls WHERE id = NEW.poll_id;

  IF poll_closed OR poll_expired THEN
    RAISE EXCEPTION 'Poll is closed or expired';
  END IF;

  -- 단일선택 모드: 이미 투표했는지 확인
  IF NOT poll_allow_multiple THEN
    SELECT COUNT(*) INTO existing_vote_count
      FROM community_poll_votes
      WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id;

    IF existing_vote_count > 0 THEN
      RAISE EXCEPTION 'Already voted (single choice poll)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_poll_vote
  BEFORE INSERT ON community_poll_votes
  FOR EACH ROW EXECUTE FUNCTION check_poll_vote();

-- vote_count / total_votes 자동 증감
CREATE OR REPLACE FUNCTION update_poll_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_poll_options
      SET vote_count = vote_count + 1
      WHERE id = NEW.option_id;
    UPDATE community_polls
      SET total_votes = total_votes + 1
      WHERE id = NEW.poll_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_poll_options
      SET vote_count = GREATEST(vote_count - 1, 0)
      WHERE id = OLD.option_id;
    UPDATE community_polls
      SET total_votes = GREATEST(total_votes - 1, 0)
      WHERE id = OLD.poll_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_poll_vote_count_insert
  AFTER INSERT ON community_poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_vote_count();

CREATE TRIGGER trg_poll_vote_count_delete
  AFTER DELETE ON community_poll_votes
  FOR EACH ROW EXECUTE FUNCTION update_poll_vote_count();
