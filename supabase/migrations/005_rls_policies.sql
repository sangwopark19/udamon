-- ============================================================
-- 005_rls_policies.sql
-- Row Level Security 정책
-- ============================================================

-- ─── Teams ──────────────────────────────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teams_public_read" ON teams
  FOR SELECT USING (TRUE);

-- ─── Players ────────────────────────────────────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_public_read" ON players
  FOR SELECT USING (TRUE);

-- ─── User My Team ───────────────────────────────────────────
ALTER TABLE user_my_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "my_team_read_own" ON user_my_team
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "my_team_insert_own" ON user_my_team
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "my_team_update_own" ON user_my_team
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "my_team_delete_own" ON user_my_team
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Community Posts ────────────────────────────────────────
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- 공개 조회 (블라인드 제외, 차단한 사용자 제외)
CREATE POLICY "posts_public_read" ON community_posts
  FOR SELECT USING (
    is_blinded = FALSE
    AND user_id NOT IN (
      SELECT blocked_id FROM user_blocks WHERE blocker_id = auth.uid()
    )
  );

-- 비로그인 사용자도 읽기 허용 (차단 필터 없음)
CREATE POLICY "posts_anon_read" ON community_posts
  FOR SELECT TO anon USING (
    is_blinded = FALSE
  );

CREATE POLICY "posts_insert_auth" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "posts_delete_own" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Community Comments ─────────────────────────────────────
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

-- 공개 조회 (차단한 사용자 제외)
CREATE POLICY "comments_public_read" ON community_comments
  FOR SELECT USING (
    user_id NOT IN (
      SELECT blocked_id FROM user_blocks WHERE blocker_id = auth.uid()
    )
  );

CREATE POLICY "comments_anon_read" ON community_comments
  FOR SELECT TO anon USING (TRUE);

CREATE POLICY "comments_insert_auth" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 댓글 수정 (soft delete도 UPDATE로 처리)
CREATE POLICY "comments_update_own" ON community_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Community Likes ────────────────────────────────────────
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_public_read" ON community_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "likes_insert_auth" ON community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own" ON community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Community Reports ──────────────────────────────────────
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

-- 본인 신고 내역만 조회
CREATE POLICY "reports_read_own" ON community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_insert_auth" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ─── Community Polls ────────────────────────────────────────
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polls_public_read" ON community_polls
  FOR SELECT USING (TRUE);

-- 게시글 작성자만 투표 생성 (post_id의 user_id 확인)
CREATE POLICY "polls_insert_post_author" ON community_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts
        WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- ─── Community Poll Options ─────────────────────────────────
ALTER TABLE community_poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_options_public_read" ON community_poll_options
  FOR SELECT USING (TRUE);

-- 투표 생성자만 선택지 추가
CREATE POLICY "poll_options_insert" ON community_poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_polls p
        JOIN community_posts cp ON cp.id = p.post_id
        WHERE p.id = poll_id AND cp.user_id = auth.uid()
    )
  );

-- ─── Community Poll Votes ───────────────────────────────────
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "poll_votes_public_read" ON community_poll_votes
  FOR SELECT USING (TRUE);

CREATE POLICY "poll_votes_insert_auth" ON community_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Spam Filter Words ──────────────────────────────────────
ALTER TABLE spam_filter_words ENABLE ROW LEVEL SECURITY;

-- 금칙어는 서비스 역할로만 관리, 일반 사용자 읽기 불가
-- Edge Function에서 service_role key로 접근

-- ─── User Restrictions ──────────────────────────────────────
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;

-- 본인 제재 내역 조회
CREATE POLICY "restrictions_read_own" ON user_restrictions
  FOR SELECT USING (auth.uid() = user_id);

-- ─── User Blocks ────────────────────────────────────────────
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_read_own" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "blocks_insert_own" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks_delete_own" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- ─── Recent Searches ────────────────────────────────────────
ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "searches_read_own" ON recent_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "searches_insert_own" ON recent_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "searches_delete_own" ON recent_searches
  FOR DELETE USING (auth.uid() = user_id);
