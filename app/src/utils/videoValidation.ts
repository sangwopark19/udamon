// ─── Video asset 검증 유틸 (D-03, ADJ-02) ─────────────────────
// T-4-02 (DoS 50MB 초과) + T-4-06 (iOS .mov 우회) mitigation
// UploadPostScreen 에서 re-export 되어 사용됨. 단위 테스트는 여기를 직접 import.

export const VIDEO_MAX_DURATION_MS = 30_000;
export const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024;
export const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime'] as const;

export type AllowedVideoMime = (typeof ALLOWED_VIDEO_MIME)[number];

export interface VideoValidationResult {
  ok: boolean;
  reason?: 'too_long' | 'too_large' | 'unsupported_format';
  contentType?: AllowedVideoMime;
}

export interface VideoAssetInput {
  duration?: number | null;
  fileSize?: number | null;
  /** Android lowercase key fallback (RESEARCH Pitfall / Example 5) */
  filesize?: number | null;
  mimeType?: string | null;
  uri: string;
}

/**
 * 동영상 asset 을 업로드 가능 여부 검증.
 *
 * 규칙:
 * 1) duration > 30s → too_long
 * 2) fileSize (fileSize ?? filesize fallback) > 50MB → too_large (T-4-02)
 * 3) mimeType 이 video/mp4 또는 video/quicktime 이 아니면 unsupported_format (T-4-06 ADJ-02)
 *    mimeType 이 없으면 uri 확장자 (.mov → quicktime, .mp4 → mp4) 로 추정
 */
export function validateVideoAsset(asset: VideoAssetInput): VideoValidationResult {
  // 1) Duration
  if (typeof asset.duration === 'number' && asset.duration > VIDEO_MAX_DURATION_MS) {
    return { ok: false, reason: 'too_long' };
  }

  // 2) FileSize (mixed casing — Android 일부 기기)
  const size = asset.fileSize ?? asset.filesize ?? 0;
  if (size > VIDEO_MAX_SIZE_BYTES) {
    return { ok: false, reason: 'too_large' };
  }

  // 3) MIME (iOS .mov 자동 변환 대응 — ADJ-02)
  let mime = asset.mimeType ?? null;
  if (!mime) {
    const lowerUri = asset.uri.toLowerCase();
    if (lowerUri.endsWith('.mov')) mime = 'video/quicktime';
    else if (lowerUri.endsWith('.mp4')) mime = 'video/mp4';
  }
  if (!mime || !ALLOWED_VIDEO_MIME.includes(mime as AllowedVideoMime)) {
    return { ok: false, reason: 'unsupported_format' };
  }

  return { ok: true, contentType: mime as AllowedVideoMime };
}
