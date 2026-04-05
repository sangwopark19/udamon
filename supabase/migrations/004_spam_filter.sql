-- ============================================================
-- 004_spam_filter.sql
-- 금칙어, 사용자 제재, 차단, 최근 검색어
-- ============================================================

-- 금칙어 사전
CREATE TABLE spam_filter_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('profanity', 'ad', 'gambling', 'other')),
  is_regex BOOLEAN DEFAULT FALSE,                   -- TRUE면 정규식 패턴
  severity TEXT DEFAULT 'warn' CHECK (severity IN ('warn', 'block', 'blind')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spam_words_category ON spam_filter_words(category);

-- 사용자 제재
CREATE TABLE user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN (
    'post_ban', 'comment_ban', 'permanent_ban'
  )),
  reason TEXT,
  blind_count INTEGER DEFAULT 0,                    -- 블라인드 누적 횟수
  expires_at TIMESTAMPTZ,                           -- NULL이면 영구
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_restrictions_user ON user_restrictions(user_id);
CREATE INDEX idx_user_restrictions_active ON user_restrictions(user_id, is_active)
  WHERE is_active = TRUE;

-- 사용자 차단
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK(blocker_id != blocked_id)                   -- 자기 자신 차단 방지
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- 최근 검색어
CREATE TABLE recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL CHECK (char_length(query) BETWEEN 1 AND 100),
  search_type TEXT DEFAULT 'community' CHECK (search_type IN ('community', 'photo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recent_searches_user ON recent_searches(user_id, created_at DESC);

-- 최근 검색어 최대 10개 유지 함수
CREATE OR REPLACE FUNCTION limit_recent_searches()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM recent_searches
    WHERE id IN (
      SELECT id FROM recent_searches
        WHERE user_id = NEW.user_id
          AND search_type = NEW.search_type
        ORDER BY created_at DESC
        OFFSET 10
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_limit_recent_searches
  AFTER INSERT ON recent_searches
  FOR EACH ROW EXECUTE FUNCTION limit_recent_searches();
