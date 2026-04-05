-- ─── Supabase Storage → Cloudflare R2 마이그레이션 ────────
-- 이미지/영상 스토리지가 Cloudflare R2로 전환됨에 따라
-- 더 이상 사용되지 않는 Supabase Storage 버킷 정책을 제거한다.
-- 인증 및 접근 제어는 Supabase Edge Function(get-upload-url)에서 처리.

DROP POLICY IF EXISTS "photo_posts_public_read" ON storage.objects;
DROP POLICY IF EXISTS "photo_posts_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "photo_posts_owner_delete" ON storage.objects;
