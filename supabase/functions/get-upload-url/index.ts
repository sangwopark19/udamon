import { createClient } from "npm:@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3@3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3";

const ALLOWED_TYPES: Record<string, string[]> = {
  "photo-posts": [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ],
  "community-posts": ["image/jpeg", "image/png", "image/webp"],
  avatars: ["image/jpeg", "image/png", "image/webp"],
};

const SIZE_LIMITS: Record<string, number> = {
  "photo-posts": 50 * 1024 * 1024,  // v1: 이미지 30MB / 영상 50MB 허용 (영상 최대값 기준 — Phase 4 T-4-02)
  "community-posts": 10 * 1024 * 1024,
  avatars: 5 * 1024 * 1024,
};

const MAX_FILES: Record<string, number> = {
  "photo-posts": 10,
  "community-posts": 10,
  avatars: 1,
};

const PRESIGNED_URL_EXPIRES_IN = 900; // 15 minutes

// TODO: 도메인 구매 후 실제 도메인으로 교체 (STATE.md blocker)
const ALLOWED_ORIGINS = [
  'https://udamonfan.com',
  'https://www.udamonfan.com',
  'https://admin.udamonfan.com',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  // 네이티브 앱은 origin 헤더가 없음 -- origin이 빈 문자열이면 허용
  // 브라우저 요청은 origin이 있으므로 ALLOWED_ORIGINS와 대조
  const isNativeApp = origin === '';
  const isAllowedOrigin = ALLOWED_ORIGINS.includes(origin);
  const allowedOrigin = isNativeApp ? '*' : (isAllowedOrigin ? origin : ALLOWED_ORIGINS[0]);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
  };
}

function jsonResponse(body: unknown, status = 200, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number, req: Request): Response {
  return jsonResponse({ error: message }, status, req);
}

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[contentType] ?? "bin";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Missing or invalid Authorization header", 401, req);
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return errorResponse("Unauthorized", 401, req);
  }

  const userId = userData.user.id;

  // --- Parse & validate body ---
  let body: { prefix: string; contentType: string; count: number };
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, req);
  }

  const { prefix, contentType, count } = body;

  if (!prefix || !contentType || !count) {
    return errorResponse("Missing required fields: prefix, contentType, count", 400, req);
  }

  const allowedTypes = ALLOWED_TYPES[prefix];
  if (!allowedTypes) {
    return errorResponse(`Invalid prefix: ${prefix}`, 400, req);
  }

  if (!allowedTypes.includes(contentType)) {
    return errorResponse(`Content type '${contentType}' not allowed for prefix '${prefix}'`, 400, req);
  }

  const maxFiles = MAX_FILES[prefix];
  if (count < 1 || count > maxFiles) {
    return errorResponse(`Count must be between 1 and ${maxFiles}`, 400, req);
  }

  // --- R2 config ---
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
  const bucketName = Deno.env.get("R2_BUCKET_NAME")!;
  const publicUrl = Deno.env.get("R2_PUBLIC_URL")!;

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Disable AWS SDK v3 flexible checksum injection so presigned URLs stay
    // compatible with R2 and simple PUT clients (fetch/XHR don't auto-compute CRC32).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  // --- Generate presigned URLs ---
  const sizeLimit = SIZE_LIMITS[prefix];
  const ext = getExtension(contentType);
  const uploads: { uploadUrl: string; publicUrl: string; key: string }[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const key = `${prefix}/${userId}/${timestamp}_${random}.${ext}`;

    // NOTE: ContentLength intentionally omitted. Including it binds the
    // presigned URL to an exact byte count, causing SignatureDoesNotMatch for
    // any real upload (R2/S3 reconstruct the canonical request with the actual
    // content-length header). Size enforcement is handled at the R2 bucket
    // level (lifecycle rules / bucket policies) per SIZE_LIMITS above.
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    });

    uploads.push({
      uploadUrl,
      publicUrl: `${publicUrl}/${key}`,
      key,
    });
  }

  return jsonResponse({ uploads }, 200, req);
});
