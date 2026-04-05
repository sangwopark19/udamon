export interface KBOTeam {
  id: string;
  nameKo: string;
  nameEn: string;
  shortName: string;
  city: string;
  stadium: string;
  color: string;
  textColor: string;
}

export const KBO_TEAMS: KBOTeam[] = [
  { id: 'lg',      nameKo: 'LG 트윈스',      nameEn: 'LG Twins',          shortName: 'LG',   city: '서울', stadium: '잠실 야구장',               color: '#C30452', textColor: '#FFFFFF' },
  { id: 'ssg',     nameKo: 'SSG 랜더스',     nameEn: 'SSG Landers',       shortName: 'SSG',  city: '인천', stadium: '인천 SSG 랜더스필드',       color: '#CE0E2D', textColor: '#FFFFFF' },
  { id: 'kia',     nameKo: 'KIA 타이거즈',    nameEn: 'KIA Tigers',        shortName: 'KIA',  city: '광주', stadium: '광주-기아 챔피언스 필드',   color: '#EA0029', textColor: '#FFFFFF' },
  { id: 'doosan',  nameKo: '두산 베어스',     nameEn: 'Doosan Bears',      shortName: '두산',  city: '서울', stadium: '잠실 야구장',               color: '#131230', textColor: '#FFFFFF' },
  { id: 'kt',      nameKo: 'KT 위즈',        nameEn: 'KT Wiz',            shortName: 'KT',   city: '수원', stadium: '수원 KT 위즈파크',          color: '#000000', textColor: '#FFFFFF' },
  { id: 'samsung',  nameKo: '삼성 라이온즈',  nameEn: 'Samsung Lions',     shortName: '삼성',  city: '대구', stadium: '대구 삼성 라이온즈 파크',   color: '#074CA1', textColor: '#FFFFFF' },
  { id: 'lotte',   nameKo: '롯데 자이언츠',   nameEn: 'Lotte Giants',      shortName: '롯데',  city: '부산', stadium: '사직 야구장',               color: '#041E42', textColor: '#FFFFFF' },
  { id: 'hanwha',  nameKo: '한화 이글스',     nameEn: 'Hanwha Eagles',     shortName: '한화',  city: '대전', stadium: '한화생명 이글스파크',       color: '#FF6600', textColor: '#FFFFFF' },
  { id: 'nc',      nameKo: 'NC 다이노스',     nameEn: 'NC Dinos',          shortName: 'NC',   city: '창원', stadium: '창원 NC 파크',              color: '#072040', textColor: '#FFFFFF' },
  { id: 'kiwoom',  nameKo: '키움 히어로즈',   nameEn: 'Kiwoom Heroes',     shortName: '키움',  city: '서울', stadium: '고척 스카이돔',             color: '#570514', textColor: '#FFFFFF' },
];

/** Helper to look up a team's color by ID */
export function getTeamColor(teamId: string): string {
  return KBO_TEAMS.find((t) => t.id === teamId)?.color ?? '#1B2A4A';
}

export const ALL_TEAM_TAB = { id: 'all', nameKo: '전체', nameEn: 'ALL' } as const;
