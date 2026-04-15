/**
 * StudioScreen state machine — pure helper tests (D-09)
 *
 * fetchMyPhotographerApplication / fetchPhotographerByUserId 결과에 따라
 * 4가지 state (no_application / pending / approved / rejected) 중 하나를 반환하는
 * 순수 helper `determineStudioState` 를 검증한다.
 *
 * Plan 4 ADJ-jest-no-render 패턴 — RN render chain 없이 pure 로직만 단위 테스트.
 */
import {
  determineStudioState,
  type StudioState,
} from '../studioState';
import type { PhotographerApplication } from '../../../types/photographerApplication';
import type { Photographer } from '../../../types/photographer';

const buildApplication = (
  overrides: Partial<PhotographerApplication> = {},
): PhotographerApplication => ({
  id: 'app-1',
  user_id: 'user-1',
  team_id: null,
  portfolio_url: null,
  bio: '',
  activity_links: [],
  activity_plan: '',
  status: 'pending',
  rejection_reason: null,
  reviewed_by: null,
  reviewed_at: null,
  created_at: '2026-04-15T00:00:00Z',
  updated_at: '2026-04-15T00:00:00Z',
  ...overrides,
});

const buildPhotographer = (
  overrides: Partial<Photographer> = {},
): Photographer => ({
  id: 'pg-1',
  user_id: 'user-1',
  display_name: 'tester',
  bio: null,
  avatar_url: null,
  cover_url: null,
  team_id: null,
  follower_count: 0,
  post_count: 0,
  grade: 0,
  is_verified: false,
  created_at: '2026-04-15T00:00:00Z',
  ...overrides,
});

describe('StudioScreen state machine — determineStudioState', () => {
  it('Test 1 (no_application): application 이 없을 때 no_application 반환', () => {
    const state: StudioState = determineStudioState({
      appResult: { data: null, error: null },
      photographerResult: null,
    });
    expect(state.kind).toBe('no_application');
  });

  it('Test 2 (pending): application.status === pending 일 때 pending 반환 + application 보존', () => {
    const application = buildApplication({ status: 'pending' });
    const state: StudioState = determineStudioState({
      appResult: { data: application, error: null },
      photographerResult: null,
    });
    expect(state.kind).toBe('pending');
    if (state.kind === 'pending') {
      expect(state.application).toBe(application);
    }
  });

  it('Test 3 (approved): application.status === approved + photographer row 존재 시 approved 반환', () => {
    const application = buildApplication({ status: 'approved' });
    const photographer = buildPhotographer({ post_count: 15, follower_count: 20 });
    const state: StudioState = determineStudioState({
      appResult: { data: application, error: null },
      photographerResult: { data: photographer, error: null },
    });
    expect(state.kind).toBe('approved');
    if (state.kind === 'approved') {
      expect(state.photographer).toBe(photographer);
    }
  });

  it('Test 4 (rejected): application.status === rejected 일 때 rejected 반환 + rejection_reason 보존', () => {
    const application = buildApplication({
      status: 'rejected',
      rejection_reason: '자료 부족',
    });
    const state: StudioState = determineStudioState({
      appResult: { data: application, error: null },
      photographerResult: null,
    });
    expect(state.kind).toBe('rejected');
    if (state.kind === 'rejected') {
      expect(state.application.rejection_reason).toBe('자료 부족');
    }
  });

  it('Test 5 (race edge case): approved status 인데 photographer row 조회 실패 → pending 으로 폴백', () => {
    const application = buildApplication({ status: 'approved' });
    const state: StudioState = determineStudioState({
      appResult: { data: application, error: null },
      photographerResult: { data: null, error: null },
    });
    // 트리거가 아직 photographers INSERT 를 완료하지 않은 edge case — pending 으로 표시하여
    // 사용자 혼란 방지
    expect(state.kind).toBe('pending');
    if (state.kind === 'pending') {
      expect(state.application).toBe(application);
    }
  });

  it('Test 6 (app fetch error): appResult.error 존재 시 no_application 으로 폴백 (사용자 재신청 가능)', () => {
    const state: StudioState = determineStudioState({
      appResult: { data: null, error: 'network timeout' },
      photographerResult: null,
    });
    expect(state.kind).toBe('no_application');
  });
});
