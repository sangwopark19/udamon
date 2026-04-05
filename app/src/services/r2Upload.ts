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

export async function uploadPostImages(
  userId: string,
  localUris: string[],
  accessToken: string,
): Promise<UploadResult> {
  try {
    const { uploads } = await getPresignedUrls(
      accessToken,
      'photo-posts',
      'image/jpeg',
      localUris.length,
    );

    const publicUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      await putToR2(uploads[i].uploadUrl, localUris[i], 'image/jpeg');
      publicUrls.push(uploads[i].publicUrl);
    }

    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}

export async function uploadPostVideos(
  userId: string,
  localUris: string[],
  accessToken: string,
  contentType = 'video/mp4',
): Promise<UploadResult> {
  try {
    const { uploads } = await getPresignedUrls(
      accessToken,
      'photo-posts',
      contentType,
      localUris.length,
    );

    const publicUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      await putToR2(uploads[i].uploadUrl, localUris[i], contentType);
      publicUrls.push(uploads[i].publicUrl);
    }

    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}

export async function uploadCommunityImages(
  userId: string,
  localUris: string[],
  accessToken: string,
): Promise<UploadResult> {
  try {
    const { uploads } = await getPresignedUrls(
      accessToken,
      'community-posts',
      'image/jpeg',
      localUris.length,
    );

    const publicUrls: string[] = [];

    for (let i = 0; i < localUris.length; i++) {
      await putToR2(uploads[i].uploadUrl, localUris[i], 'image/jpeg');
      publicUrls.push(uploads[i].publicUrl);
    }

    return { data: publicUrls, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}

export async function uploadAvatar(
  userId: string,
  localUri: string,
  accessToken: string,
): Promise<{ data: string | null; error: string | null }> {
  try {
    const { uploads } = await getPresignedUrls(
      accessToken,
      'avatars',
      'image/jpeg',
      1,
    );

    await putToR2(uploads[0].uploadUrl, localUri, 'image/jpeg');
    return { data: uploads[0].publicUrl, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return { data: null, error: message };
  }
}
