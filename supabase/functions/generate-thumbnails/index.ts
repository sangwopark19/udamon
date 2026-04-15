// ============================================================
// generate-thumbnails
// R2 에서 photo_posts.images 를 다운로드 → magick-wasm 로 400×400 cover crop JPEG →
// R2 업로드 (${key}_thumb.jpg) → photo_posts.thumbnail_urls UPDATE
//
// 호출: UploadPostScreen 이 createPhotoPost 성공 직후 fire-and-forget.
// Security: T-4-05 — postId owner 검증 (토큰 user.id 와 photographers.user_id 일치)
// ============================================================

import {
  initialize,
  ImageMagick,
  MagickFormat,
  MagickGeometry,
  Gravity,
} from 'npm:@imagemagick/magick-wasm@0.0.39';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  S3Client,
  PutObjectCommand,
} from 'npm:@aws-sdk/client-s3@3';

// WASM 1회 초기화 (cold start 시 1.5~3초)
const wasmBytes = await Deno.readFile(new URL('./magick.wasm', import.meta.url));
await initialize(wasmBytes);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!;
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!;
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!;
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')!;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

// CORS (get-upload-url 패턴)
const ALLOWED_ORIGINS = [
  'https://udamonfan.com',
  'https://www.udamonfan.com',
  'https://admin.udamonfan.com',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const isNativeApp = origin === '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isNativeApp ? '*' : isAllowedOrigin ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
  };
}

function jsonResponse(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

interface ThumbnailRequest {
  postId: string;
  imageUrls: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, req);
  }

  // ─── Auth (Phase 3 03-04 --no-verify-jwt 패턴) ───
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing Authorization' }, 401, req);
  }
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401, req);
  }
  const userId = userData.user.id;

  // ─── Parse body ───
  let body: ThumbnailRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, req);
  }
  const { postId, imageUrls } = body;
  if (!postId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return jsonResponse({ error: 'Bad request' }, 400, req);
  }

  // ─── T-4-05: postId owner 검증 ───
  // photo_posts → photographers → user_id 조인으로 본인 게시물만 허용
  const { data: ownerRow, error: ownerErr } = await supabase
    .from('photo_posts')
    .select('id, photographers!inner(user_id)')
    .eq('id', postId)
    .maybeSingle();
  if (ownerErr || !ownerRow) {
    return jsonResponse({ error: 'Post not found' }, 404, req);
  }
  // deno-lint-ignore no-explicit-any
  const ownerUserId = (ownerRow.photographers as any)?.user_id;
  if (ownerUserId !== userId) {
    return jsonResponse({ error: 'Forbidden: not post owner' }, 403, req);
  }

  // ─── 썸네일 생성 (이미지당 순차 처리 — Open Question 5 메모리 안전) ───
  const thumbnailUrls: string[] = [];
  const failures: string[] = [];

  for (const imageUrl of imageUrls) {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`download ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());

      let outBytes: Uint8Array | null = null;
      ImageMagick.read(buf, (image) => {
        // Cover crop 400×400: fillArea=true resize → center crop
        const fitGeometry = new MagickGeometry(400, 400);
        fitGeometry.fillArea = true;
        image.resize(fitGeometry);
        const cropGeometry = new MagickGeometry(400, 400);
        image.crop(cropGeometry, Gravity.Center);
        image.format = MagickFormat.Jpeg;
        image.quality = 80;
        image.write((data) => {
          outBytes = data;
        });
      });

      if (!outBytes) throw new Error('encode failed');

      // R2 업로드: original key + _thumb.jpg
      const key = new URL(imageUrl).pathname.slice(1);
      const thumbKey = key.replace(/\.[^.]+$/, '_thumb.jpg');

      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: thumbKey,
          Body: outBytes,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      thumbnailUrls.push(`${R2_PUBLIC_URL}/${thumbKey}`);
    } catch (e) {
      console.error('[Thumbnail] failed', imageUrl, e);
      failures.push(imageUrl);
    }
  }

  // ─── photo_posts.thumbnail_urls UPDATE (service role) ───
  if (thumbnailUrls.length > 0) {
    const { error: updateErr } = await supabase
      .from('photo_posts')
      .update({ thumbnail_urls: thumbnailUrls })
      .eq('id', postId);
    if (updateErr) {
      console.error('[Thumbnail] DB update failed', updateErr);
    }
  }

  return jsonResponse({ thumbnailUrls, failures }, 200, req);
});
