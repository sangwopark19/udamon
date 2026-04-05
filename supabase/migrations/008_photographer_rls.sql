-- ============================================================
-- 008_photographer_rls.sql
-- 포토그래퍼 관련 테이블 RLS 정책
-- ============================================================

-- ─── Photographers ────────────────────────────────────────
ALTER TABLE photographers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pg_public_read" ON photographers
  FOR SELECT USING (TRUE);

CREATE POLICY "pg_insert_own" ON photographers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pg_update_own" ON photographers
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Photo Posts ──────────────────────────────────────────
ALTER TABLE photo_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "posts_public_read" ON photo_posts
  FOR SELECT USING (TRUE);

CREATE POLICY "posts_insert_own" ON photo_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photographers WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "posts_update_own" ON photo_posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM photographers WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "posts_delete_own" ON photo_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM photographers WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

-- ─── Photo Likes ──────────────────────────────────────────
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_likes_public_read" ON photo_likes
  FOR SELECT USING (TRUE);

CREATE POLICY "photo_likes_insert_own" ON photo_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "photo_likes_delete_own" ON photo_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Photographer Follows ─────────────────────────────────
ALTER TABLE photographer_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_public_read" ON photographer_follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert_own" ON photographer_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own" ON photographer_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ─── Photo Comments ───────────────────────────────────────
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_comments_public_read" ON photo_comments
  FOR SELECT USING (TRUE);

CREATE POLICY "photo_comments_insert_own" ON photo_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "photo_comments_update_own" ON photo_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- ─── Photo Collections ───────────────────────────────────
ALTER TABLE photo_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_public_read" ON photo_collections
  FOR SELECT USING (TRUE);

CREATE POLICY "collections_insert_own" ON photo_collections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photographers WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "collections_delete_own" ON photo_collections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM photographers WHERE id = photographer_id AND user_id = auth.uid()
    )
  );

-- ─── Photo Collection Posts ──────────────────────────────
ALTER TABLE photo_collection_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "col_posts_public_read" ON photo_collection_posts
  FOR SELECT USING (TRUE);

CREATE POLICY "col_posts_insert_own" ON photo_collection_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM photo_collections c
        JOIN photographers p ON p.id = c.photographer_id
        WHERE c.id = collection_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "col_posts_delete_own" ON photo_collection_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM photo_collections c
        JOIN photographers p ON p.id = c.photographer_id
        WHERE c.id = collection_id AND p.user_id = auth.uid()
    )
  );

-- ─── Timeline Events ─────────────────────────────────────
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_public_read" ON timeline_events
  FOR SELECT USING (TRUE);

-- ─── Timeline Event Teams ─────────────────────────────────
ALTER TABLE timeline_event_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_teams_public_read" ON timeline_event_teams
  FOR SELECT USING (TRUE);

-- ─── Storage: photo-posts 버킷 정책 ──────────────────────
CREATE POLICY "photo_posts_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'photo-posts');

CREATE POLICY "photo_posts_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'photo-posts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "photo_posts_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'photo-posts'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
