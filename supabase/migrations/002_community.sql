-- ============================================================
-- 002_community.sql
-- 커뮤니티 게시글, 댓글, 좋아요, 신고
-- ============================================================

-- 커뮤니티 게시글
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),               -- nullable (전체 게시글)
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 30),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  images TEXT[] DEFAULT '{}',                       -- 최대 10장 URL
  has_poll BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_blinded BOOLEAN DEFAULT FALSE,                 -- 자동 블라인드 (신고 누적)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_posts_team ON community_posts(team_id);
CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_trending ON community_posts(is_trending, created_at DESC);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX idx_community_posts_blinded ON community_posts(is_blinded) WHERE is_blinded = FALSE;

-- images 배열 최대 10장 제한
ALTER TABLE community_posts
  ADD CONSTRAINT chk_images_max_10
  CHECK (array_length(images, 1) IS NULL OR array_length(images, 1) <= 10);

-- 커뮤니티 댓글 (대댓글 1depth)
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  like_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,                 -- soft delete ("삭제된 댓글입니다")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at);
CREATE INDEX idx_community_comments_parent ON community_comments(parent_comment_id)
  WHERE parent_comment_id IS NOT NULL;

-- comment_count 자동 증감 트리거
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts
      SET comment_count = comment_count + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_comment_count_insert
  AFTER INSERT ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

CREATE TRIGGER trg_comment_count_delete
  AFTER DELETE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- 좋아요 (게시글/댓글 공용)
CREATE TABLE community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_community_likes_target ON community_likes(target_type, target_id);

-- like_count 자동 증감 트리거
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.target_type = 'post' THEN
      UPDATE community_posts SET like_count = like_count + 1 WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
      UPDATE community_comments SET like_count = like_count + 1 WHERE id = NEW.target_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.target_type = 'post' THEN
      UPDATE community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'comment' THEN
      UPDATE community_comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.target_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_like_count_insert
  AFTER INSERT ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_like_count();

CREATE TRIGGER trg_like_count_delete
  AFTER DELETE ON community_likes
  FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- 신고
CREATE TABLE community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'profanity', 'harassment', 'misinformation', 'other'
  )),
  detail TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_id, target_type, target_id)       -- 동일 대상 중복 신고 방지
);

CREATE INDEX idx_community_reports_target ON community_reports(target_type, target_id);
CREATE INDEX idx_community_reports_status ON community_reports(status) WHERE status = 'pending';

-- 본인 글/댓글 신고 방지 함수
CREATE OR REPLACE FUNCTION check_self_report()
RETURNS TRIGGER AS $$
DECLARE
  target_author_id UUID;
BEGIN
  IF NEW.target_type = 'post' THEN
    SELECT user_id INTO target_author_id
      FROM community_posts WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'comment' THEN
    SELECT user_id INTO target_author_id
      FROM community_comments WHERE id = NEW.target_id;
  END IF;

  IF target_author_id IS NULL THEN
    RAISE EXCEPTION 'Report target not found';
  END IF;

  IF NEW.reporter_id = target_author_id THEN
    RAISE EXCEPTION 'Cannot report your own content';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_self_report
  BEFORE INSERT ON community_reports
  FOR EACH ROW EXECUTE FUNCTION check_self_report();

-- 신고 누적 시 자동 블라인드 함수
CREATE OR REPLACE FUNCTION auto_blind_on_report()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO report_count
    FROM community_reports
    WHERE target_type = NEW.target_type
      AND target_id = NEW.target_id
      AND status = 'pending';

  -- 신고 5건 누적 시 자동 블라인드
  IF report_count >= 5 THEN
    IF NEW.target_type = 'post' THEN
      UPDATE community_posts SET is_blinded = TRUE WHERE id = NEW.target_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_auto_blind
  AFTER INSERT ON community_reports
  FOR EACH ROW EXECUTE FUNCTION auto_blind_on_report();

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_community_posts_updated
  BEFORE UPDATE ON community_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_community_comments_updated
  BEFORE UPDATE ON community_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
