// ─── Photographer Grade Utilities (D-17, D-18) ─────────────────
// Source: Phase 4 RESEARCH §Code Example 3
// Used by: GradeBadge 컴포넌트 (Plan 04), mapPhotographer (Task 3)

export interface GradeInfo {
  grade: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  label: string;
  iconColor: string;
  iconName: 'medal-outline' | 'medal' | 'diamond';
}

/**
 * 등급 스코어 = post_count + floor(follower_count / 10)
 * 음수/소수는 안전하게 0으로 clamp + floor 처리.
 */
export function calculateGrade(postCount: number, followerCount: number): number {
  const safePostCount = Math.max(0, Math.floor(postCount));
  const safeFollowerCount = Math.max(0, Math.floor(followerCount));
  return safePostCount + Math.floor(safeFollowerCount / 10);
}

/**
 * 등급 스코어 → 배지 정보 (UI-SPEC §GradeBadge tier palette).
 * 임계값: 0~4 브론즈 / 5~19 실버 / 20~49 골드 / 50+ 다이아.
 */
export function gradeToBadge(grade: number): GradeInfo {
  if (grade >= 50) {
    return { grade, tier: 'diamond', label: '다이아', iconColor: '#1B2A4A', iconName: 'diamond' };
  }
  if (grade >= 20) {
    return { grade, tier: 'gold', label: '골드', iconColor: '#FACC15', iconName: 'medal' };
  }
  if (grade >= 5) {
    return { grade, tier: 'silver', label: '실버', iconColor: '#6B7280', iconName: 'medal-outline' };
  }
  return { grade, tier: 'bronze', label: '브론즈', iconColor: '#A97142', iconName: 'medal-outline' };
}
