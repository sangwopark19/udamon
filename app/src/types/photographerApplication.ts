// ─── Photographer Application (D-07 Wave 0 스키마 기준) ─────────
// 031_photographer_apps_extend.sql 마이그레이션으로 추가된 team_id, activity_links, activity_plan 반영
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface PhotographerApplication {
  id: string;
  user_id: string;
  team_id: string | null;          // slug (mapApplication 이 UUID → slug 변환)
  portfolio_url: string | null;
  bio: string;
  activity_links: string[];
  activity_plan: string;
  status: ApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
