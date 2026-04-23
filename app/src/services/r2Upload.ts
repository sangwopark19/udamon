/**
 * Cloudflare R2 업로드 모듈
 * Supabase Edge Function(get-upload-url)을 통해 presigned URL을 발급받고
 * 클라이언트에서 R2로 직접 업로드한다.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const UPLOAD_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/get-upload-url`;

type UploadPrefix = 'photo-posts' | 'community-posts' | 'avatars';

interface PresignedUrlResponse {
  uploads: Array<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
  }>;
}

interface UploadResult {
  data: string[] | null;
  error: string | null;
}

async function getPresignedUrls(
  accessToken: string,
  prefix: UploadPrefix,
  contentType: string,
  count: number,
): Promise<PresignedUrlResponse> {
  const res = await fetch(UPLOAD_FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefix, contentType, count }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Upload URL request failed: ${res.status}`);
  }

  return res.json();
}

async function putToR2(uploadUrl: string, localUri: string, contentType: string): Promise<void> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!putRes.ok) {
    throw new Error(`R2 upload failed: ${putRes.status}`);
  }
}

// WR-01: 이미지 Content-Type 을 uploadPostVideos 와 동일하게 호출자로부터 주입받음.
// 기본값은 JPEG (optimizeImage 가 JPEG 로 normalize 하므로 기존 호출자는 그대로 동작).
// Edge Function 의 photo-posts allowlist 는 image/jpeg|image/png|image/webp 를 허용.
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

function isAllowedImageMime(ct: string): ct is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(ct);
}

export async function uploadPostImages(
  _userId: string,
  localUris: string[],
  accessToken: string,
  contentTypes?: string[],
): Promise<UploadResult> {
  try {
    const types = contentTypes ?? localUris.map(() => 'image/jpeg');
    if (types.length !== localUris.length) {
      return { data: null, error: 'contentTypes length must match localUris length' };
    }
    const publicUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      const ct = types[i];
      if (!isAllowedImageMime(ct)) {
        return { data: null, error: `Unsupported image mime: ${ct}` };
      }
      const { uploads } = await getPresignedUrls(accessToken, 'photo-posts', ct, 1);
      await putToR2(uploads[0].uploadUrl, localUris[i], ct);
      publicUrls.push(uploads[0].publicUrl);
    }

    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}

// ADJ-02: asset 별로 contentType (video/mp4 또는 video/quicktime) 을 동적으로 받음.
// localUris 와 contentTypes 는 1:1 대응 길이여야 하며, 각 asset 별로 별도의
// get-upload-url 호출이 발생한다 (Edge Function 이 호출당 단일 contentType + count 가정).
export async function uploadPostVideos(
  userId: string,
  localUris: string[],
  accessToken: string,
  contentTypes: string[],
): Promise<UploadResult> {
  try {
    if (contentTypes.length !== localUris.length) {
      return { data: null, error: 'contentTypes length must match localUris length' };
    }
    const publicUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      const contentType = contentTypes[i];
      if (contentType !== 'video/mp4' && contentType !== 'video/quicktime') {
        return { data: null, error: `Unsupported video mime: ${contentType}` };
      }
      const { uploads } = await getPresignedUrls(accessToken, 'photo-posts', contentType, 1);
      await putToR2(uploads[0].uploadUrl, localUris[i], contentType);
      publicUrls.push(uploads[0].publicUrl);
    }

    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}

export async function uploadCommunityImages(
  _userId: string,
  localUris: string[],
  accessToken: string,
  contentTypes?: string[],
): Promise<UploadResult> {
  try {
    const types = contentTypes ?? localUris.map(() => 'image/jpeg');
    if (types.length !== localUris.length) {
      return { data: null, error: 'contentTypes length must match localUris length' };
    }
    const publicUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      const ct = types[i];
      if (!isAllowedImageMime(ct)) {
        return { data: null, error: `Unsupported image mime: ${ct}` };
      }
      const { uploads } = await getPresignedUrls(accessToken, 'community-posts', ct, 1);
      await putToR2(uploads[0].uploadUrl, localUris[i], ct);
      publicUrls.push(uploads[0].publicUrl);
    }

    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}

export async function uploadAvatar(
  _userId: string,
  localUri: string,
  accessToken: string,
  contentType: string = 'image/jpeg',
): Promise<{ data: string | null; error: string | null }> {
  try {
    if (!isAllowedImageMime(contentType)) {
      return { data: null, error: `Unsupported image mime: ${contentType}` };
    }
    const { uploads } = await getPresignedUrls(
      accessToken,
      'avatars',
      contentType,
      1,
    );

    await putToR2(uploads[0].uploadUrl, localUri, contentType);
    return { data: uploads[0].publicUrl, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}
