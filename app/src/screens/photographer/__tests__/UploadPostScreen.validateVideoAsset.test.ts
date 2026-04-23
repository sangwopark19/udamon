// validateVideoAsset pure helper 단위 테스트 — Plan 04 Task 3 behavior 1~6 + bonus
// T-4-02 (DoS 50MB 초과) + T-4-06 (iOS .mov 우회) mitigation 검증
//
// Note: UploadPostScreen 에서 re-export 되지만 테스트는 원본 모듈 직접 import
// (UploadPostScreen 전체 import 시 AsyncStorage / expo-video 등 RN 네이티브 체인이
// jest-expo env 에서도 모두 실행되어 infra 비용이 큼).

import { validateVideoAsset } from '../../../utils/videoValidation';

describe('validateVideoAsset', () => {
  it('duration 초과 → too_long', () => {
    const r = validateVideoAsset({ duration: 35000, fileSize: 10, mimeType: 'video/mp4', uri: 'x.mp4' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('too_long');
  });

  it('fileSize 초과 → too_large (T-4-02)', () => {
    const r = validateVideoAsset({ duration: 10000, fileSize: 60 * 1024 * 1024, mimeType: 'video/mp4', uri: 'x.mp4' });
    expect(r.reason).toBe('too_large');
  });

  it('MIME webm 거부 → unsupported_format (T-4-06)', () => {
    const r = validateVideoAsset({ duration: 10000, fileSize: 10, mimeType: 'video/webm', uri: 'x.webm' });
    expect(r.reason).toBe('unsupported_format');
  });

  it('MP4 정상 허용', () => {
    const r = validateVideoAsset({ duration: 25000, fileSize: 10 * 1024 * 1024, mimeType: 'video/mp4', uri: 'x.mp4' });
    expect(r.ok).toBe(true);
    expect(r.contentType).toBe('video/mp4');
  });

  it('iOS MOV (video/quicktime) 허용 — ADJ-02', () => {
    const r = validateVideoAsset({ duration: 25000, fileSize: 10 * 1024 * 1024, mimeType: 'video/quicktime', uri: 'x.mov' });
    expect(r.ok).toBe(true);
    expect(r.contentType).toBe('video/quicktime');
  });

  it('Android filesize lowercase fallback', () => {
    const r = validateVideoAsset({ duration: 10000, fileSize: null, filesize: 60 * 1024 * 1024, mimeType: 'video/mp4', uri: 'x.mp4' });
    expect(r.reason).toBe('too_large');
  });

  it('mimeType undefined + .mov 확장자 → quicktime fallback', () => {
    const r = validateVideoAsset({ duration: 10000, fileSize: 10, mimeType: null, uri: 'file://path/clip.mov' });
    expect(r.ok).toBe(true);
    expect(r.contentType).toBe('video/quicktime');
  });
});
