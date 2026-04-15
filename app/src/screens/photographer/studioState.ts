/**
 * StudioScreen state machine — D-09 pure helper
 *
 * fetchMyPhotographerApplication + fetchPhotographerByUserId 결과를 받아
 * UI 가 렌더할 4가지 state (+ loading) 중 하나로 reduce.
 *
 * RN / AsyncStorage / Navigation 의존 없음 → jest 단위 테스트 가능
 * (ADJ-jest-no-render 패턴, Plan 4 계승).
 */
import type { Photographer } from '../../types/photographer';
import type { PhotographerApplication } from '../../types/photographerApplication';

export type StudioState =
  | { kind: 'loading' }
  | { kind: 'no_application' }
  | { kind: 'pending'; application: PhotographerApplication }
  | { kind: 'approved'; photographer: Photographer }
  | { kind: 'rejected'; application: PhotographerApplication };

interface ApiLike<T> {
  data: T | null;
  error: string | null;
}

export interface DetermineStudioStateInput {
  appResult: ApiLike<PhotographerApplication | null>;
  /**
   * approved 상태에서만 참조한다. null 인 경우 photographer 조회를 수행하지 않았거나
   * (예: pending/rejected 또는 아직 fetch 전) 데이터가 없음.
   */
  photographerResult: ApiLike<Photographer> | null;
}

/**
 * 우선순위:
 *  1) appResult.error → no_application 으로 폴백 (사용자가 재신청 가능)
 *  2) appResult.data === null → no_application
 *  3) pending / rejected → 해당 상태
 *  4) approved + photographer 존재 → approved
 *  5) approved 이지만 photographer 부재 (트리거 race) → pending 폴백
 */
export function determineStudioState(input: DetermineStudioStateInput): StudioState {
  const { appResult, photographerResult } = input;

  if (appResult.error) {
    return { kind: 'no_application' };
  }

  const application = appResult.data;
  if (!application) {
    return { kind: 'no_application' };
  }

  if (application.status === 'pending') {
    return { kind: 'pending', application };
  }

  if (application.status === 'rejected') {
    return { kind: 'rejected', application };
  }

  // application.status === 'approved'
  if (photographerResult?.data) {
    return { kind: 'approved', photographer: photographerResult.data };
  }

  // Edge case: approved 이지만 photographers row 가 아직 반영 안 됨 (트리거 race)
  // — pending 으로 표시해 사용자 혼란 방지
  return { kind: 'pending', application };
}
