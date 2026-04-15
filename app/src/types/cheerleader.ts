// ─── Cheerleader (DB schema 기준, 017_cheerleaders.sql) ─────────
// D-20 / RESEARCH §Pitfall 6: 기존 name/description 필드 제거, DB schema 기준으로 재정의
export type CheerleaderPosition = 'leader' | 'member';
export type CheerleaderStatus = 'active' | 'retired';

export interface Cheerleader {
  id: string;
  team_id: string;                // slug (UUID → slug 변환 후)
  name_ko: string;
  name_en: string | null;
  position: CheerleaderPosition;
  status: CheerleaderStatus;
  image_url: string | null;
}
