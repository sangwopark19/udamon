-- ============================================================
-- 007_photographer.sql
-- 포토그래퍼, 사진 게시물, 좋아요, 팔로우, 댓글, 컬렉션, 타임라인
-- ============================================================

-- teams 테이블에 slug 컬럼 추가 (클라이언트 slug ↔ DB UUID 매핑)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
UPDATE teams SET slug = CASE name_en
  WHEN 'SSG Landers'    THEN 'ssg'
  WHEN 'Kiwoom Heroes'  THEN 'kiwoom'
  WHEN 'LG Twins'       THEN 'lg'
  WHEN 'KT Wiz'         THEN 'kt'
  WHEN 'KIA Tigers'     THEN 'kia'
  WHEN 'NC Dinos'       THEN 'nc'
  WHEN 'Samsung Lions'  THEN 'samsung'
  WHEN 'Lotte Giants'   THEN 'lotte'
  WHEN 'Doosan Bears'   THEN 'doosan'
  WHEN 'Hanwha Eagles'  THEN 'hanwha'
END WHERE slug IS NULL;
ALTER TABLE teams ALTER COLUMN slug SET NOT NULL;

-- ─── 포토그래퍼 프로필 ─────────────────────────────────────
CREATE TABLE photographers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio         TEXT DEFAULT '',
  avatar_url  TEXT,
  cover_url   TEXT,
  team_id     UUID REFERENCES teams(id),
  follower_count INTEGER DEFAULT 0,
  post_count  INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_photographers_user ON photographers(user_id);
CREATE INDEX idx_photographers_team ON photographers(team_id);

-- ─── 사진 게시물 ───────────────────────────────────────────
CREATE TABLE photo_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  team_id         UUID NOT NULL REFERENCES teams(id),
  player_id       UUID REFERENCES players(id),
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  images          TEXT[] NOT NULL CHECK (array_length(images, 1) BETWEEN 1 AND 10),
  like_count      INTEGER DEFAULT 0,
  comment_count   INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0,
  is_featured     BOOLEAN DEFAULT FALSE,
  featured_week   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_posts_photographer ON photo_posts(photographer_id);
CREATE INDEX idx_photo_posts_team ON photo_posts(team_id);
CREATE INDEX idx_photo_posts_player ON photo_posts(player_id);
CREATE INDEX idx_photo_posts_featured ON photo_posts(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_photo_posts_created ON photo_posts(created_at DESC);

-- ─── 좋아요 ────────────────────────────────────────────────
CREATE TABLE photo_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id  UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_photo_likes_target ON photo_likes(target_type, target_id);
CREATE INDEX idx_photo_likes_user ON photo_likes(user_id);

-- ─── 팔로우 ────────────────────────────────────────────────
CREATE TABLE photographer_follows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, photographer_id)
);

CREATE INDEX idx_follows_photographer ON photographer_follows(photographer_id);
CREATE INDEX idx_follows_follower ON photographer_follows(follower_id);

-- ─── 댓글 ──────────────────────────────────────────────────
CREATE TABLE photo_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES photo_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name  TEXT NOT NULL,
  text       TEXT NOT NULL,
  parent_id  UUID REFERENCES photo_comments(id) ON DELETE SET NULL,
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_comments_post ON photo_comments(post_id);
CREATE INDEX idx_photo_comments_parent ON photo_comments(parent_id);

-- ─── 컬렉션 ────────────────────────────────────────────────
CREATE TABLE photo_collections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES photographers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  emoji           TEXT DEFAULT '📸',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_collections_pg ON photo_collections(photographer_id);

-- ─── 컬렉션 ↔ 게시물 junction ──────────────────────────────
CREATE TABLE photo_collection_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES photo_collections(id) ON DELETE CASCADE,
  post_id       UUID NOT NULL REFERENCES photo_posts(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, post_id)
);

CREATE INDEX idx_collection_posts_col ON photo_collection_posts(collection_id);

-- ─── 타임라인 이벤트 ───────────────────────────────────────
CREATE TABLE timeline_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN (
    'regular_season', 'postseason', 'allstar', 'spring_camp', 'fan_meeting', 'first_pitch', 'other'
  )),
  date          DATE NOT NULL,
  location      TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  post_count    INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 이벤트 ↔ 팀 M:N ──────────────────────────────────────
CREATE TABLE timeline_event_teams (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE(event_id, team_id)
);

CREATE INDEX idx_event_teams_event ON timeline_event_teams(event_id);

-- ═══════════════════════════════════════════════════════════════
-- 트리거: 자동 카운트 증감 + updated_at
-- ═══════════════════════════════════════════════════════════════

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_photographers_updated
  BEFORE UPDATE ON photographers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_photo_posts_updated
  BEFORE UPDATE ON photo_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- post_count 증감 (photo_posts INSERT/DELETE → photographers)
CREATE OR REPLACE FUNCTION update_photographer_post_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photographers SET post_count = post_count + 1 WHERE id = NEW.photographer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photographers SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.photographer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_photo_posts_count
  AFTER INSERT OR DELETE ON photo_posts FOR EACH ROW EXECUTE FUNCTION update_photographer_post_count();

-- follower_count 증감
CREATE OR REPLACE FUNCTION update_photographer_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photographers SET follower_count = follower_count + 1 WHERE id = NEW.photographer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photographers SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.photographer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_follows_count
  AFTER INSERT OR DELETE ON photographer_follows FOR EACH ROW EXECUTE FUNCTION update_photographer_follower_count();

-- like_count 증감 (photo_likes → photo_posts 또는 photo_comments)
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
DECLARE
  delta INTEGER;
  tid UUID;
  ttype TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := 1; tid := NEW.target_id; ttype := NEW.target_type;
  ELSE
    delta := -1; tid := OLD.target_id; ttype := OLD.target_type;
  END IF;

  IF ttype = 'post' THEN
    UPDATE photo_posts SET like_count = GREATEST(like_count + delta, 0) WHERE id = tid;
  ELSIF ttype = 'comment' THEN
    UPDATE photo_comments SET like_count = GREATEST(like_count + delta, 0) WHERE id = tid;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON photo_likes FOR EACH ROW EXECUTE FUNCTION update_like_count();

-- comment_count 증감
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE photo_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE photo_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON photo_comments FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ─── Storage 버킷 (DEPRECATED — Cloudflare R2로 전환됨) ──────
-- 이미지/영상 업로드는 Cloudflare R2 버킷(udamon-media)으로 전환.
-- 아래 코드는 기존 호환성을 위해 유지하나 실제로 사용되지 않음.
-- 관련 RLS 정책은 010_deprecate_storage_policies.sql에서 제거됨.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photo-posts', 'photo-posts', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
