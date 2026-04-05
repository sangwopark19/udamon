import type {
  PhotoPost,
  UserProfile,
  ReportEntry,
  PhotographerApplication,
  Announcement,
  AuditLog,
  KBOTeam,
  Player,
  PlayerPosition,
  Cheerleader,
  AdminNotification,
  AdminNotifType,
  VisitorStats,
  TermsDocument,
  SiteSettings,
  MaintenanceConfig,
  AppVersionInfo,
  AdPlacement,
  AdRevenue,
  AdType,
  AdPosition,
  TermsDocType,
  LoginProvider,
  CommunityPost,
  CommunityComment,
  Poll,
  Inquiry,
  InquiryCategory,
  DMConversation,
  TicketTransaction,
  TicketTransactionType,
  TicketPackage,
  GiftItem,
  SupportRecord,
  SettlementRecord,
  RankTier,
  AwardCategory,
  AwardRecord,
  BlockRecord,
  PgCollection,
  SearchKeyword,
  PhotographerFollowStats,
  TimelineEvent,
  EventType,
} from '../types';

// ─── KBO Teams ───
export const KBO_TEAMS: KBOTeam[] = [
  { id: 'lg',      nameKo: 'LG 트윈스',      nameEn: 'LG Twins',       shortName: 'LG',   city: '서울',   stadium: '잠실 야구장',          color: '#C30452', textColor: '#FFFFFF' },
  { id: 'ssg',     nameKo: 'SSG 랜더스',     nameEn: 'SSG Landers',    shortName: 'SSG',  city: '인천',   stadium: 'SSG 랜더스필드',       color: '#CE0E2D', textColor: '#FFFFFF' },
  { id: 'kia',     nameKo: 'KIA 타이거즈',   nameEn: 'KIA Tigers',     shortName: 'KIA',  city: '광주',   stadium: '광주-기아 챔피언스필드', color: '#EA0029', textColor: '#FFFFFF' },
  { id: 'doosan',  nameKo: '두산 베어스',     nameEn: 'Doosan Bears',   shortName: '두산',  city: '서울',   stadium: '잠실 야구장',          color: '#131230', textColor: '#FFFFFF' },
  { id: 'kt',      nameKo: 'KT 위즈',        nameEn: 'KT Wiz',        shortName: 'KT',   city: '수원',   stadium: '수원 KT 위즈파크',     color: '#000000', textColor: '#FFFFFF' },
  { id: 'samsung', nameKo: '삼성 라이온즈',   nameEn: 'Samsung Lions',  shortName: '삼성',  city: '대구',   stadium: '대구 삼성 라이온즈파크', color: '#074CA1', textColor: '#FFFFFF' },
  { id: 'lotte',   nameKo: '롯데 자이언츠',   nameEn: 'Lotte Giants',   shortName: '롯데',  city: '부산',   stadium: '사직 야구장',          color: '#041E42', textColor: '#FFFFFF' },
  { id: 'hanwha',  nameKo: '한화 이글스',     nameEn: 'Hanwha Eagles',  shortName: '한화',  city: '대전',   stadium: '한화생명 이글스파크',    color: '#FF6600', textColor: '#FFFFFF' },
  { id: 'nc',      nameKo: 'NC 다이노스',     nameEn: 'NC Dinos',       shortName: 'NC',   city: '창원',   stadium: '창원 NC파크',          color: '#072040', textColor: '#FFFFFF' },
  { id: 'kiwoom',  nameKo: '키움 히어로즈',   nameEn: 'Kiwoom Heroes',  shortName: '키움',  city: '서울',   stadium: '고척 스카이돔',         color: '#570514', textColor: '#FFFFFF' },
];

export function getTeamName(teamId: string): string {
  return KBO_TEAMS.find((t) => t.id === teamId)?.shortName ?? teamId;
}

// ─── Mock Photo Posts ───
export const MOCK_POSTS: PhotoPost[] = [
  {
    id: 'post-001',
    photographer_id: 'pg-001',
    photographer_name: '김야구',
    image_urls: ['https://picsum.photos/seed/kbo1/600/400', 'https://picsum.photos/seed/kbo2/600/400'],
    title: '잠실 직관 LG vs 두산 하이라이트',
    description: '9회말 역전 투런 홈런 순간을 담았습니다.',
    team_id: 'lg',
    tags: ['직관', '잠실', '홈런'],
    is_featured: false,
    status: 'pending',
    created_at: '2026-03-30T14:30:00Z',
  },
  {
    id: 'post-002',
    photographer_id: 'pg-002',
    photographer_name: '박렌즈',
    image_urls: ['https://picsum.photos/seed/kbo3/600/400'],
    title: '대전 한화 이글스 경기 분위기',
    description: '응원석에서 바라본 그라운드 전경',
    team_id: 'hanwha',
    tags: ['대전', '응원', '분위기'],
    is_featured: false,
    status: 'pending',
    created_at: '2026-03-30T16:00:00Z',
  },
  {
    id: 'post-003',
    photographer_id: 'pg-001',
    photographer_name: '김야구',
    image_urls: ['https://picsum.photos/seed/kbo4/600/400', 'https://picsum.photos/seed/kbo5/600/400', 'https://picsum.photos/seed/kbo6/600/400'],
    title: 'SSG 랜더스 승리의 순간',
    description: '인천 SSG 랜더스필드에서 촬영한 승리 세레모니',
    team_id: 'ssg',
    tags: ['SSG', '인천', '세레모니'],
    is_featured: false,
    status: 'pending',
    created_at: '2026-03-31T10:00:00Z',
  },
  {
    id: 'post-004',
    photographer_id: 'pg-002',
    photographer_name: '박렌즈',
    image_urls: ['https://picsum.photos/seed/kbo7/600/400'],
    title: 'KIA 타이거즈 선수 클로즈업',
    description: '광주 챔피언스필드 투수 역투',
    team_id: 'kia',
    tags: ['KIA', '투수', '광주'],
    is_featured: true,
    status: 'approved',
    created_at: '2026-03-28T12:00:00Z',
    reviewed_by: 'admin-001',
    reviewed_at: '2026-03-28T13:00:00Z',
  },
  {
    id: 'post-005',
    photographer_id: 'pg-001',
    photographer_name: '김야구',
    image_urls: ['https://picsum.photos/seed/kbo8/600/400'],
    title: '삼성 라이온즈 팬 응원전',
    description: '대구 삼성 라이온즈파크 응원 모습',
    team_id: 'samsung',
    tags: ['삼성', '응원', '대구'],
    is_featured: true,
    status: 'approved',
    created_at: '2026-03-27T18:00:00Z',
    reviewed_by: 'admin-001',
    reviewed_at: '2026-03-27T19:00:00Z',
  },
  {
    id: 'post-006',
    photographer_id: 'pg-002',
    photographer_name: '박렌즈',
    image_urls: ['https://picsum.photos/seed/kbo9/600/400'],
    title: 'NC 다이노스 야경',
    description: '창원 NC파크의 아름다운 야경',
    team_id: 'nc',
    tags: ['NC', '야경', '창원'],
    is_featured: false,
    status: 'rejected',
    created_at: '2026-03-26T20:00:00Z',
    reviewed_by: 'admin-001',
    reviewed_at: '2026-03-26T21:00:00Z',
    reject_reason: '저해상도 이미지',
  },
];

// ─── Mock Users ───
export const MOCK_USERS: UserProfile[] = [
  {
    id: 'admin-001',
    email: 'admin@udamon.com',
    display_name: '관리자',
    is_photographer: false,
    is_admin: true,
    admin_role: 'super_admin',
    post_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    login_provider: 'email',
    photographer_since: null,
    consents: { privacy: { agreed: true, agreedAt: '2026-01-01T00:00:00Z' }, terms: { agreed: true, agreedAt: '2026-01-01T00:00:00Z' }, marketing: { agreed: false, agreedAt: null } },
  },
  {
    id: 'user-001',
    email: 'fan1@udamon.com',
    display_name: '야구팬이승우',
    is_photographer: false,
    is_admin: false,
    admin_role: null,
    post_count: 0,
    created_at: '2026-02-15T00:00:00Z',
    login_provider: 'kakao',
    photographer_since: null,
    consents: { privacy: { agreed: true, agreedAt: '2026-02-15T00:00:00Z' }, terms: { agreed: true, agreedAt: '2026-02-15T00:00:00Z' }, marketing: { agreed: true, agreedAt: '2026-02-15T00:00:00Z' } },
  },
  {
    id: 'user-002',
    email: 'fan2@udamon.com',
    display_name: '직관러박지민',
    is_photographer: false,
    is_admin: false,
    admin_role: null,
    post_count: 0,
    created_at: '2026-03-01T00:00:00Z',
    login_provider: 'apple',
    photographer_since: null,
    consents: { privacy: { agreed: true, agreedAt: '2026-03-01T00:00:00Z' }, terms: { agreed: true, agreedAt: '2026-03-01T00:00:00Z' }, marketing: { agreed: false, agreedAt: null } },
  },
  {
    id: 'pg-001',
    email: 'kimyagu@udamon.com',
    display_name: '김야구',
    is_photographer: true,
    is_admin: false,
    admin_role: null,
    post_count: 12,
    created_at: '2026-01-20T00:00:00Z',
    login_provider: 'google',
    photographer_since: '2026-02-01T00:00:00Z',
    consents: { privacy: { agreed: true, agreedAt: '2026-01-20T00:00:00Z' }, terms: { agreed: true, agreedAt: '2026-01-20T00:00:00Z' }, marketing: { agreed: true, agreedAt: '2026-01-20T00:00:00Z' } },
  },
  {
    id: 'pg-002',
    email: 'parklens@udamon.com',
    display_name: '박렌즈',
    is_photographer: true,
    is_admin: false,
    admin_role: null,
    post_count: 8,
    created_at: '2026-02-10T00:00:00Z',
    login_provider: 'naver',
    photographer_since: '2026-03-01T00:00:00Z',
    consents: { privacy: { agreed: true, agreedAt: '2026-02-10T00:00:00Z' }, terms: { agreed: true, agreedAt: '2026-02-10T00:00:00Z' }, marketing: { agreed: true, agreedAt: '2026-02-10T00:00:00Z' } },
  },
];

// ─── Mock Reports ───
export const MOCK_REPORTS: ReportEntry[] = [
  {
    targetType: 'photo_post',
    targetId: 'post-004',
    reporterId: 'user-001',
    reason: 'copyright',
    detail: '타 사이트에서 가져온 이미지로 보입니다.',
    status: 'pending',
    createdAt: '2026-03-30T10:00:00Z',
  },
  {
    targetType: 'community_post',
    targetId: 'comm-012',
    reporterId: 'user-002',
    reason: 'spam',
    detail: '반복적인 광고 게시물',
    status: 'pending',
    createdAt: '2026-03-29T15:30:00Z',
  },
  {
    targetType: 'comment',
    targetId: 'comment-045',
    reporterId: 'user-001',
    reason: 'harassment',
    detail: '특정 팀 팬들에 대한 혐오 발언',
    status: 'pending',
    createdAt: '2026-03-31T08:00:00Z',
  },
];

// ─── Mock Photographer Applications ───
export const MOCK_APPLICATIONS: PhotographerApplication[] = [
  // 대기
  {
    photographerId: 'pg-new-001',
    userId: 'user-new-001',
    displayName: '이포토',
    bio: '야구 직관 5년차, 선수 클로즈업 전문',
    activityLinks: [
      'https://www.instagram.com/lee_photo_baseball',
      'https://blog.naver.com/leephoto_kbo',
      'https://www.flickr.com/photos/leephoto',
    ],
    activityPlan: '두산 베어스 홈경기 위주로 선수 클로즈업 사진을 촬영해서 올릴 예정입니다. 주 2~3회 잠실 직관합니다.',
    teamId: 'doosan',
    appliedAt: '2026-03-29T09:00:00Z',
    status: 'pending',
  },
  {
    photographerId: 'pg-new-002',
    userId: 'user-new-002',
    displayName: '최스냅',
    bio: '스포츠 사진 전문 프리랜서',
    activityLinks: [
      'https://www.instagram.com/choi_snap_sports',
      'https://portfolio.adobe.com/choisnap',
    ],
    activityPlan: '키움 히어로즈 고척돔 경기 사진을 주로 올릴 계획입니다.',
    teamId: 'kiwoom',
    appliedAt: '2026-03-30T14:00:00Z',
    status: 'pending',
  },
  {
    photographerId: 'pg-new-003',
    userId: 'user-new-003',
    displayName: '김렌즈',
    bio: '잠실 직관러, 내야 사진 전문',
    activityLinks: [
      'https://www.instagram.com/kim_lens_jamsil',
      'https://twitter.com/kimlens_kbo',
      'https://blog.naver.com/kimlens_photo',
    ],
    activityPlan: 'LG 트윈스 내야 수비 장면과 타격 순간 위주로 촬영합니다. 매주 주말 잠실 직관.',
    teamId: 'lg',
    appliedAt: '2026-03-31T10:30:00Z',
    status: 'pending',
  },
  // 승인됨
  {
    photographerId: 'pg-approved-001',
    userId: 'user-ap-001',
    displayName: '야구사진관',
    bio: 'KBO 전 구단 직관 포토그래퍼. 잠실/사직 위주 활동.',
    activityLinks: [
      'https://www.instagram.com/baseball_studio',
      'https://blog.naver.com/baseball_studio',
      'https://www.flickr.com/photos/baseballstudio',
    ],
    activityPlan: 'KBO 전 구단 경기 사진을 올립니다. 잠실, 사직 위주 활동하며 주 4~5회 촬영.',
    teamId: 'lg',
    appliedAt: '2026-02-10T09:00:00Z',
    status: 'approved',
    reviewedBy: 'admin-001',
  },
  {
    photographerId: 'pg-approved-002',
    userId: 'user-ap-002',
    displayName: '다이아몬드렌즈',
    bio: '야구장의 감동을 사진으로 담습니다.',
    activityLinks: [
      'https://www.instagram.com/diamond_lens_kbo',
      'https://www.youtube.com/@diamondlens',
    ],
    activityPlan: 'KIA 타이거즈 홈경기 중심으로 선수/팬 분위기를 담은 사진을 공유합니다.',
    teamId: 'kia',
    appliedAt: '2026-02-15T14:00:00Z',
    status: 'approved',
    reviewedBy: 'admin-001',
  },
  {
    photographerId: 'pg-approved-003',
    userId: 'user-ap-003',
    displayName: '마운드포토',
    bio: '투수 전문 포토그래퍼. 불꽃 직구의 순간을 포착합니다.',
    activityLinks: [
      'https://www.instagram.com/mound_photo',
      'https://blog.naver.com/mound_photo',
    ],
    activityPlan: 'SSG 랜더스 투수진 위주로 역동적인 투구 장면을 촬영합니다.',
    teamId: 'ssg',
    appliedAt: '2026-03-01T11:00:00Z',
    status: 'approved',
    reviewedBy: 'admin-001',
  },
  // 반려됨
  {
    photographerId: 'pg-rejected-001',
    userId: 'user-rj-001',
    displayName: '박촬영',
    bio: '야구 좋아하는 대학생입니다',
    activityLinks: [],
    activityPlan: '야구 사진 올리고 싶어요',
    teamId: 'samsung',
    appliedAt: '2026-03-20T08:00:00Z',
    status: 'rejected',
    reviewedBy: 'admin-001',
    reviewNote: '포트폴리오가 충분하지 않습니다',
  },
  {
    photographerId: 'pg-rejected-002',
    userId: 'user-rj-002',
    displayName: '직관매니아',
    bio: '매일 야구장 가는 사람',
    activityLinks: [
      'https://www.instagram.com/jikgwan_mania',
    ],
    activityPlan: '한화 이글스 직관 사진을 올리겠습니다.',
    teamId: 'hanwha',
    appliedAt: '2026-03-22T16:00:00Z',
    status: 'rejected',
    reviewedBy: 'admin-001',
    reviewNote: '본인 촬영 사진인지 확인할 수 없습니다',
  },
];

// ─── Mock Announcements ───
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-001',
    title: '2026 시즌 서비스 오픈!',
    body: 'Dugout이 2026 KBO 시즌과 함께 정식 오픈합니다. 많은 이용 부탁드립니다.',
    type: 'notice',
    isPinned: true,
    createdBy: 'admin-001',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'ann-002',
    title: '개막전 포토 콘테스트',
    body: '개막전 직관 사진을 올려주세요! 우수 포토그래퍼에게 프리미엄 뱃지를 드립니다.',
    type: 'event',
    isPinned: false,
    createdBy: 'admin-001',
    createdAt: '2026-03-20T00:00:00Z',
  },
];

// ─── Mock Audit Logs ───
export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    adminId: 'admin-001',
    action: 'approve_post',
    targetType: 'post',
    targetId: 'post-004',
    detail: '게시물 "KIA 타이거즈 선수 클로즈업" 승인',
    createdAt: '2026-03-28T13:00:00Z',
  },
  {
    id: 'log-002',
    adminId: 'admin-001',
    action: 'approve_post',
    targetType: 'post',
    targetId: 'post-005',
    detail: '게시물 "삼성 라이온즈 팬 응원전" 승인',
    createdAt: '2026-03-27T19:00:00Z',
  },
  {
    id: 'log-003',
    adminId: 'admin-001',
    action: 'approve_post',
    targetType: 'post',
    targetId: 'post-006',
    detail: '게시물 "NC 다이노스 야경" 승인',
    createdAt: '2026-03-26T21:00:00Z',
  },
  {
    id: 'log-004',
    adminId: 'admin-001',
    action: 'create_announcement',
    targetType: 'announcement',
    targetId: 'ann-001',
    detail: '공지사항 "2026 시즌 서비스 오픈!" 작성',
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'log-005',
    adminId: 'admin-001',
    action: 'create_announcement',
    targetType: 'announcement',
    targetId: 'ann-002',
    detail: '공지사항 "개막전 포토 콘테스트" 작성',
    createdAt: '2026-03-20T00:00:00Z',
  },
];

// ─── Reason labels ───
export const REASON_LABELS: Record<string, string> = {
  spam: '스팸/광고',
  inappropriate: '부적절한 콘텐츠',
  copyright: '저작권 침해',
  harassment: '괴롭힘/혐오',
  misinformation: '허위 정보',
  other: '기타',
};

export const SANCTION_LABELS: Record<string, string> = {
  warning: '경고',
  suspend_7d: '7일 정지',
  suspend_30d: '30일 정지',
  permanent_ban: '영구정지',
};

export const RESOLUTION_LABELS: Record<string, string> = {
  delete_content: '콘텐츠 삭제',
  warn_user: '경고 발송',
  suspend_user: '유저 정지',
  dismiss: '무시',
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  P: '투수',
  C: '포수',
  IF: '내야수',
  OF: '외야수',
};

// ─── Mock Players (3 per team) ───
export const MOCK_PLAYERS: Player[] = [
  // LG 트윈스
  { id: 'pl-001', team_id: 'lg',      name_ko: '오스틴',   number: 30, position: 'OF', is_active: true },
  { id: 'pl-002', team_id: 'lg',      name_ko: '임찬규',   number: 29, position: 'P',  is_active: true },
  { id: 'pl-003', team_id: 'lg',      name_ko: '오지환',   number: 8,  position: 'IF', is_active: true },
  // SSG 랜더스
  { id: 'pl-004', team_id: 'ssg',     name_ko: '김광현',   number: 29, position: 'P',  is_active: true },
  { id: 'pl-005', team_id: 'ssg',     name_ko: '최정',     number: 14, position: 'IF', is_active: true },
  { id: 'pl-006', team_id: 'ssg',     name_ko: '추신수',   number: 22, position: 'OF', is_active: false },
  // KIA 타이거즈
  { id: 'pl-007', team_id: 'kia',     name_ko: '양현종',   number: 18, position: 'P',  is_active: true },
  { id: 'pl-008', team_id: 'kia',     name_ko: '나성범',   number: 47, position: 'OF', is_active: true },
  { id: 'pl-009', team_id: 'kia',     name_ko: '김도영',   number: 5,  position: 'IF', is_active: true },
  // 두산 베어스
  { id: 'pl-010', team_id: 'doosan',  name_ko: '양의지',   number: 25, position: 'C',  is_active: true },
  { id: 'pl-011', team_id: 'doosan',  name_ko: '곽빈',     number: 1,  position: 'P',  is_active: true },
  { id: 'pl-012', team_id: 'doosan',  name_ko: '양석환',   number: 53, position: 'IF', is_active: true },
  // KT 위즈
  { id: 'pl-013', team_id: 'kt',      name_ko: '강백호',   number: 50, position: 'IF', is_active: true },
  { id: 'pl-014', team_id: 'kt',      name_ko: '소형준',   number: 17, position: 'P',  is_active: true },
  { id: 'pl-015', team_id: 'kt',      name_ko: '장성우',   number: 31, position: 'C',  is_active: true },
  // 삼성 라이온즈
  { id: 'pl-016', team_id: 'samsung', name_ko: '구자욱',   number: 51, position: 'OF', is_active: true },
  { id: 'pl-017', team_id: 'samsung', name_ko: '오승환',   number: 26, position: 'P',  is_active: true },
  { id: 'pl-018', team_id: 'samsung', name_ko: '김영웅',   number: 7,  position: 'IF', is_active: true },
  // 롯데 자이언츠
  { id: 'pl-019', team_id: 'lotte',   name_ko: '전준우',   number: 7,  position: 'OF', is_active: true },
  { id: 'pl-020', team_id: 'lotte',   name_ko: '박세웅',   number: 20, position: 'P',  is_active: true },
  { id: 'pl-021', team_id: 'lotte',   name_ko: '나승엽',   number: 52, position: 'IF', is_active: true },
  // 한화 이글스
  { id: 'pl-022', team_id: 'hanwha',  name_ko: '문동주',   number: 29, position: 'P',  is_active: true },
  { id: 'pl-023', team_id: 'hanwha',  name_ko: '노시환',   number: 52, position: 'IF', is_active: true },
  { id: 'pl-024', team_id: 'hanwha',  name_ko: '정은원',   number: 33, position: 'OF', is_active: true },
  // NC 다이노스
  { id: 'pl-025', team_id: 'nc',      name_ko: '박건우',   number: 32, position: 'OF', is_active: true },
  { id: 'pl-026', team_id: 'nc',      name_ko: '구창모',   number: 31, position: 'P',  is_active: true },
  { id: 'pl-027', team_id: 'nc',      name_ko: '손아섭',   number: 11, position: 'OF', is_active: false },
  // 키움 히어로즈
  { id: 'pl-028', team_id: 'kiwoom',  name_ko: '이정후',   number: 51, position: 'OF', is_active: true },
  { id: 'pl-029', team_id: 'kiwoom',  name_ko: '안우진',   number: 43, position: 'P',  is_active: true },
  { id: 'pl-030', team_id: 'kiwoom',  name_ko: '김혜성',   number: 3,  position: 'IF', is_active: true },
];

// ─── Mock Cheerleaders (3 per team) ───
export const MOCK_CHEERLEADERS: Cheerleader[] = [
  // LG 트윈스
  { id: 'cl-001', name: '이다혜',   description: 'LG 트윈스 치어리더 팀장',   team_id: 'lg',      image_url: 'https://picsum.photos/seed/cl1/300/300' },
  { id: 'cl-002', name: '김나연',   description: 'LG 트윈스 치어리더',        team_id: 'lg',      image_url: 'https://picsum.photos/seed/cl2/300/300' },
  { id: 'cl-003', name: '정하은',   description: 'LG 트윈스 치어리더',        team_id: 'lg',      image_url: 'https://picsum.photos/seed/cl3/300/300' },
  // SSG 랜더스
  { id: 'cl-004', name: '김현영',   description: 'SSG 랜더스 치어리더 팀장',   team_id: 'ssg',     image_url: 'https://picsum.photos/seed/cl4/300/300' },
  { id: 'cl-005', name: '이예진',   description: 'SSG 랜더스 치어리더',        team_id: 'ssg',     image_url: 'https://picsum.photos/seed/cl5/300/300' },
  { id: 'cl-006', name: '한지은',   description: 'SSG 랜더스 치어리더',        team_id: 'ssg',     image_url: 'https://picsum.photos/seed/cl6/300/300' },
  // KIA 타이거즈
  { id: 'cl-007', name: '최홍라',   description: 'KIA 타이거즈 치어리더 팀장', team_id: 'kia',     image_url: 'https://picsum.photos/seed/cl7/300/300' },
  { id: 'cl-008', name: '서지영',   description: 'KIA 타이거즈 치어리더',      team_id: 'kia',     image_url: 'https://picsum.photos/seed/cl8/300/300' },
  { id: 'cl-009', name: '강예빈',   description: 'KIA 타이거즈 치어리더',      team_id: 'kia',     image_url: 'https://picsum.photos/seed/cl9/300/300' },
  // 두산 베어스
  { id: 'cl-010', name: '김다영',   description: '두산 베어스 치어리더 팀장',   team_id: 'doosan',  image_url: 'https://picsum.photos/seed/cl10/300/300' },
  { id: 'cl-011', name: '박소연',   description: '두산 베어스 치어리더',        team_id: 'doosan',  image_url: 'https://picsum.photos/seed/cl11/300/300' },
  { id: 'cl-012', name: '이채영',   description: '두산 베어스 치어리더',        team_id: 'doosan',  image_url: 'https://picsum.photos/seed/cl12/300/300' },
  // KT 위즈
  { id: 'cl-013', name: '서현숙',   description: 'KT 위즈 치어리더 팀장',      team_id: 'kt',      image_url: 'https://picsum.photos/seed/cl13/300/300' },
  { id: 'cl-014', name: '조은비',   description: 'KT 위즈 치어리더',           team_id: 'kt',      image_url: 'https://picsum.photos/seed/cl14/300/300' },
  { id: 'cl-015', name: '나혜원',   description: 'KT 위즈 치어리더',           team_id: 'kt',      image_url: 'https://picsum.photos/seed/cl15/300/300' },
  // 삼성 라이온즈
  { id: 'cl-016', name: '이수진',   description: '삼성 라이온즈 치어리더 팀장', team_id: 'samsung', image_url: 'https://picsum.photos/seed/cl16/300/300' },
  { id: 'cl-017', name: '최민지',   description: '삼성 라이온즈 치어리더',      team_id: 'samsung', image_url: 'https://picsum.photos/seed/cl17/300/300' },
  { id: 'cl-018', name: '윤서영',   description: '삼성 라이온즈 치어리더',      team_id: 'samsung', image_url: 'https://picsum.photos/seed/cl18/300/300' },
  // 롯데 자이언츠
  { id: 'cl-019', name: '정유나',   description: '롯데 자이언츠 치어리더 팀장', team_id: 'lotte',   image_url: 'https://picsum.photos/seed/cl19/300/300' },
  { id: 'cl-020', name: '송미래',   description: '롯데 자이언츠 치어리더',      team_id: 'lotte',   image_url: 'https://picsum.photos/seed/cl20/300/300' },
  { id: 'cl-021', name: '임수현',   description: '롯데 자이언츠 치어리더',      team_id: 'lotte',   image_url: 'https://picsum.photos/seed/cl21/300/300' },
  // 한화 이글스
  { id: 'cl-022', name: '박기량',   description: '한화 이글스 치어리더 팀장',   team_id: 'hanwha',  image_url: 'https://picsum.photos/seed/cl22/300/300' },
  { id: 'cl-023', name: '안지현',   description: '한화 이글스 치어리더',        team_id: 'hanwha',  image_url: 'https://picsum.photos/seed/cl23/300/300' },
  { id: 'cl-024', name: '윤소이',   description: '한화 이글스 치어리더',        team_id: 'hanwha',  image_url: 'https://picsum.photos/seed/cl24/300/300' },
  // NC 다이노스
  { id: 'cl-025', name: '한수아',   description: 'NC 다이노스 치어리더 팀장',   team_id: 'nc',      image_url: 'https://picsum.photos/seed/cl25/300/300' },
  { id: 'cl-026', name: '박지우',   description: 'NC 다이노스 치어리더',        team_id: 'nc',      image_url: 'https://picsum.photos/seed/cl26/300/300' },
  { id: 'cl-027', name: '김하늘',   description: 'NC 다이노스 치어리더',        team_id: 'nc',      image_url: 'https://picsum.photos/seed/cl27/300/300' },
  // 키움 히어로즈
  { id: 'cl-028', name: '이소희',   description: '키움 히어로즈 치어리더 팀장', team_id: 'kiwoom',  image_url: 'https://picsum.photos/seed/cl28/300/300' },
  { id: 'cl-029', name: '장예은',   description: '키움 히어로즈 치어리더',      team_id: 'kiwoom',  image_url: 'https://picsum.photos/seed/cl29/300/300' },
  { id: 'cl-030', name: '백서윤',   description: '키움 히어로즈 치어리더',      team_id: 'kiwoom',  image_url: 'https://picsum.photos/seed/cl30/300/300' },
];

// ─── Notification type labels ───
export const NOTIF_TYPE_LABELS: Record<AdminNotifType, string> = {
  post_approved: '게시물 승인',
  post_rejected: '게시물 거부',
  photographer_approved: '포토그래퍼 승인',
  photographer_rejected: '포토그래퍼 반려',
  sanction_issued: '제재 발급',
  sanction_revoked: '제재 해제',
  announcement: '공지사항',
  app_update: '앱 업데이트',
  system: '시스템',
  custom: '커스텀',
};

// ─── Mock Sent Notifications ───
export const MOCK_SENT_NOTIFICATIONS: AdminNotification[] = [
  { id: 'notif-001', type: 'post_approved', target: 'user', targetUserId: 'pg-001', title: '게시물 승인', body: '게시물 "KIA 타이거즈 선수 클로즈업"이 승인되었습니다.', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-28T13:00:00Z' },
  { id: 'notif-002', type: 'post_approved', target: 'user', targetUserId: 'pg-002', title: '게시물 승인', body: '게시물 "삼성 라이온즈 팬 응원전"이 승인되었습니다.', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-27T19:00:00Z' },
  { id: 'notif-003', type: 'post_rejected', target: 'user', targetUserId: 'pg-003', title: '게시물 거부', body: '게시물 "NC 다이노스 야경"이 거부되었습니다. 사유: 저해상도 이미지', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-26T21:00:00Z' },
  { id: 'notif-004', type: 'photographer_approved', target: 'user', targetUserId: 'user-010', title: '포토그래퍼 인증 승인', body: '포토그래퍼 인증이 승인되었습니다. 지금부터 사진을 업로드할 수 있습니다!', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-25T10:00:00Z' },
  { id: 'notif-005', type: 'photographer_rejected', target: 'user', targetUserId: 'user-015', title: '포토그래퍼 인증 반려', body: '포토그래퍼 인증이 반려되었습니다. 사유: 포트폴리오가 충분하지 않습니다', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-24T09:00:00Z' },
  { id: 'notif-006', type: 'sanction_issued', target: 'user', targetUserId: 'user-008', title: '계정 제재 알림', body: '회원님의 계정에 제재가 적용되었습니다. (경고): 부적절한 댓글', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-23T14:00:00Z' },
  { id: 'notif-007', type: 'announcement', target: 'all', targetUserId: null, title: '공지: 2026 시즌 서비스 오픈!', body: 'Dugout이 2026 KBO 시즌과 함께 정식 오픈합니다. 많은 이용 부탁드립니다.', sentBy: 'admin-001', isAuto: true, createdAt: '2026-03-01T00:00:00Z' },
  { id: 'notif-008', type: 'app_update', target: 'all', targetUserId: null, title: '앱 업데이트 v1.2.0', body: '치어리더 페이지가 추가되었습니다. 앱을 업데이트해주세요!', sentBy: 'admin-001', isAuto: false, createdAt: '2026-03-20T10:00:00Z' },
  { id: 'notif-009', type: 'system', target: 'all', targetUserId: null, title: '서버 점검 안내', body: '3월 28일 02:00~04:00 서버 점검이 예정되어 있습니다.', sentBy: 'admin-001', isAuto: false, createdAt: '2026-03-27T15:00:00Z' },
  { id: 'notif-010', type: 'custom', target: 'all', targetUserId: null, title: '개막전 포토 콘테스트', body: '개막전 직관 사진을 올려주세요! 우수 포토그래퍼에게 프리미엄 뱃지를 드립니다.', sentBy: 'admin-001', isAuto: false, createdAt: '2026-03-22T00:00:00Z' },
];

// ─── Label maps ───
export const LOGIN_PROVIDER_LABELS: Record<LoginProvider, string> = {
  google: 'Google', apple: 'Apple', kakao: '카카오', naver: '네이버', email: '이메일',
};

export const AD_TYPE_LABELS: Record<AdType, string> = {
  banner: '배너', interstitial: '전면 광고', rewarded_video: '리워드 영상',
};

export const AD_POSITION_LABELS: Record<AdPosition, string> = {
  home: '홈', explore: '탐색', community: '커뮤니티', post_detail: '게시물 상세', photographer_profile: '포토그래퍼 프로필',
};

export const TERMS_TYPE_LABELS: Record<TermsDocType, string> = {
  terms_of_service: '이용약관', privacy_policy: '개인정보처리방침', photographer_terms: '포토그래퍼 이용약관',
};

// ─── Mock Visitor Stats ───
export const MOCK_VISITOR_STATS: VisitorStats = {
  dau: 1247, wau: 5832, mau: 18450,
  dailyTrend: [
    { date: '2026-03-25', dau: 1120, newUsers: 45, pageViews: 4350 },
    { date: '2026-03-26', dau: 1085, newUsers: 38, pageViews: 4120 },
    { date: '2026-03-27', dau: 1340, newUsers: 62, pageViews: 5280 },
    { date: '2026-03-28', dau: 1580, newUsers: 78, pageViews: 6100 },
    { date: '2026-03-29', dau: 1420, newUsers: 55, pageViews: 5500 },
    { date: '2026-03-30', dau: 1195, newUsers: 41, pageViews: 4680 },
    { date: '2026-03-31', dau: 1247, newUsers: 52, pageViews: 4890 },
  ],
  pageBreakdown: [
    { page: '홈', views: 12500, percentage: 35 },
    { page: '탐색', views: 8200, percentage: 23 },
    { page: '커뮤니티', views: 6800, percentage: 19 },
    { page: '포토그래퍼', views: 5100, percentage: 14 },
    { page: '마이페이지', views: 3200, percentage: 9 },
  ],
};

// ─── Mock Terms Documents ───
export const MOCK_TERMS_DOCUMENTS: TermsDocument[] = [
  { id: 'terms-001', type: 'terms_of_service', title: '이용약관', body: 'Dugout 서비스 이용약관 전문입니다. 본 약관은 Dugout 서비스 이용에 관한 기본적인 사항을 규정합니다...', currentVersion: '3.0', status: 'published', versions: [{ version: '3.0', updatedAt: '2026-03-01T00:00:00Z', changeSummary: '커뮤니티 가이드라인 추가' }, { version: '2.0', updatedAt: '2026-01-15T00:00:00Z', changeSummary: '포토그래퍼 섹션 추가' }, { version: '1.0', updatedAt: '2025-12-01T00:00:00Z', changeSummary: '최초 작성' }], updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'terms-002', type: 'privacy_policy', title: '개인정보처리방침', body: '개인정보 수집 및 이용에 관한 방침 전문입니다. Dugout은 최소한의 개인정보만을 수집합니다...', currentVersion: '3.0', status: 'published', versions: [{ version: '3.0', updatedAt: '2026-03-01T00:00:00Z', changeSummary: '마케팅 동의 항목 세분화' }, { version: '2.0', updatedAt: '2026-01-15T00:00:00Z', changeSummary: '소셜 로그인 데이터 처리 추가' }, { version: '1.0', updatedAt: '2025-12-01T00:00:00Z', changeSummary: '최초 작성' }], updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'terms-003', type: 'photographer_terms', title: '포토그래퍼 이용약관', body: '포토그래퍼 활동에 관한 약관 전문입니다. 수익 배분, 저작권, 제재 규정 등을 포함합니다...', currentVersion: '1.0', status: 'published', versions: [{ version: '1.0', updatedAt: '2026-01-15T00:00:00Z', changeSummary: '최초 작성' }], updatedAt: '2026-01-15T00:00:00Z' },
];

// ─── Mock Site Settings ───
export const MOCK_SITE_SETTINGS: SiteSettings = {
  siteName: 'Dugout', siteDescription: 'KBO 야구 사진 공유 플랫폼', primaryColor: '#1B2A4A', logoUrl: 'https://picsum.photos/seed/logo/200/200',
};

// ─── Mock Maintenance ───
export const MOCK_MAINTENANCE: MaintenanceConfig = {
  isEnabled: false, message: '서비스 점검 중입니다. 잠시 후 다시 이용해주세요.', scheduledAt: null, estimatedEnd: null,
};

// ─── Mock App Version ───
export const MOCK_APP_VERSION: AppVersionInfo = {
  currentVersion: '1.2.0', minimumVersion: '1.0.0', forceUpdate: false,
  history: [
    { version: '1.2.0', releasedAt: '2026-03-20T00:00:00Z', notes: '치어리더 페이지 추가, 알림 관리 개선' },
    { version: '1.1.0', releasedAt: '2026-02-15T00:00:00Z', notes: '포토그래퍼 인증 시스템 추가' },
    { version: '1.0.0', releasedAt: '2026-01-01T00:00:00Z', notes: '최초 릴리즈' },
  ],
};

// ─── Mock Ad Placements ───
export const MOCK_AD_PLACEMENTS: AdPlacement[] = [
  { id: 'ad-001', name: '홈 하단 배너', type: 'banner', adUnitId: 'ca-app-pub-xxxxx/111111', isEnabled: true, position: 'home', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'ad-002', name: '탐색 상단 배너', type: 'banner', adUnitId: 'ca-app-pub-xxxxx/222222', isEnabled: true, position: 'explore', createdAt: '2026-03-01T00:00:00Z' },
  { id: 'ad-003', name: '게시물 상세 전면 광고', type: 'interstitial', adUnitId: 'ca-app-pub-xxxxx/333333', isEnabled: false, position: 'post_detail', createdAt: '2026-03-10T00:00:00Z' },
  { id: 'ad-004', name: '커뮤니티 리워드 영상', type: 'rewarded_video', adUnitId: 'ca-app-pub-xxxxx/444444', isEnabled: true, position: 'community', createdAt: '2026-03-15T00:00:00Z' },
];

// ─── Mock Ad Revenue ───
export const MOCK_AD_REVENUE: AdRevenue = { today: 12500, thisWeek: 78300, thisMonth: 342000 };

// ─── Mock Community Posts ───
export const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
  { id: 'cp-001', user_id: 'user-002', user_name: '야구덕후', user_avatar: null, team_id: 'lg', title: 'LG 오늘 경기 예측', content: '오늘 LG vs 두산 경기 누가 이길까요? 선발 라인업 보니까 LG가 유리할 것 같은데', images: [], has_poll: true, like_count: 45, comment_count: 12, view_count: 320, is_edited: false, is_trending: true, is_blinded: false, created_at: '2026-03-30T10:00:00Z' },
  { id: 'cp-002', user_id: 'user-003', user_name: '스타디움러버', user_avatar: null, team_id: 'kia', title: '광주 원정 후기', content: '처음으로 광주 챔피언스필드 갔는데 구장이 너무 좋았어요! 시야도 좋고 먹거리도 다양하고', images: ['https://picsum.photos/seed/stadium1/400/300'], has_poll: false, like_count: 67, comment_count: 8, view_count: 450, is_edited: false, is_trending: false, is_blinded: false, created_at: '2026-03-29T15:00:00Z' },
  { id: 'cp-003', user_id: 'user-004', user_name: '배트맨', user_avatar: null, team_id: null, title: '올 시즌 MVP 후보는?', content: '아직 시즌 초반이지만 벌써부터 MVP 후보가 눈에 보이네요', images: [], has_poll: true, like_count: 89, comment_count: 24, view_count: 780, is_edited: true, is_trending: true, is_blinded: false, created_at: '2026-03-28T09:00:00Z' },
  { id: 'cp-004', user_id: 'user-005', user_name: '직관러', user_avatar: null, team_id: 'doosan', title: '잠실 직관 팁 공유', content: '잠실 야구장 처음 가시는 분들을 위한 팁 정리합니다. 1. 지하철 2호선 종합운동장역 2. 치킨은 미리 주문 3. 방석 필수', images: ['https://picsum.photos/seed/jamsil/400/300', 'https://picsum.photos/seed/jamsil2/400/300'], has_poll: false, like_count: 123, comment_count: 15, view_count: 920, is_edited: false, is_trending: true, is_blinded: false, created_at: '2026-03-27T12:00:00Z' },
  { id: 'cp-005', user_id: 'user-002', user_name: '야구덕후', user_avatar: null, team_id: 'ssg', title: '부적절한 게시글 테스트', content: '이 게시글은 신고로 블라인드 처리된 게시글입니다', images: [], has_poll: false, like_count: 2, comment_count: 0, view_count: 50, is_edited: false, is_trending: false, is_blinded: true, created_at: '2026-03-26T08:00:00Z' },
  { id: 'cp-006', user_id: 'user-003', user_name: '스타디움러버', user_avatar: null, team_id: 'samsung', title: '삼성 신인 드래프트 분석', content: '올해 삼성 드래프트 1순위 선수 분석해봤습니다. 고교 통산 타율 .450으로 기대가 큽니다', images: [], has_poll: false, like_count: 34, comment_count: 7, view_count: 280, is_edited: false, is_trending: false, is_blinded: false, created_at: '2026-03-25T14:00:00Z' },
];

// ─── Mock Community Comments ───
export const MOCK_COMMUNITY_COMMENTS: CommunityComment[] = [
  { id: 'cc-001', post_id: 'cp-001', user_id: 'user-003', user_name: '스타디움러버', parent_comment_id: null, content: 'LG 3:1 승리 예측합니다!', like_count: 8, is_edited: false, is_deleted: false, is_blinded: false, created_at: '2026-03-30T10:30:00Z' },
  { id: 'cc-002', post_id: 'cp-001', user_id: 'user-004', user_name: '배트맨', parent_comment_id: 'cc-001', content: '저도 LG 승리에 한 표!', like_count: 3, is_edited: false, is_deleted: false, is_blinded: false, created_at: '2026-03-30T10:45:00Z' },
  { id: 'cc-003', post_id: 'cp-001', user_id: 'user-005', user_name: '직관러', parent_comment_id: null, content: '두산이 이길 거예요', like_count: 5, is_edited: false, is_deleted: false, is_blinded: false, created_at: '2026-03-30T11:00:00Z' },
  { id: 'cc-004', post_id: 'cp-002', user_id: 'user-002', user_name: '야구덕후', parent_comment_id: null, content: '광주 구장 진짜 좋죠! 치킨도 맛있고', like_count: 12, is_edited: false, is_deleted: false, is_blinded: false, created_at: '2026-03-29T16:00:00Z' },
  { id: 'cc-005', post_id: 'cp-003', user_id: 'user-002', user_name: '야구덕후', parent_comment_id: null, content: '부적절한 댓글입니다', like_count: 0, is_edited: false, is_deleted: false, is_blinded: true, created_at: '2026-03-28T10:00:00Z' },
  { id: 'cc-006', post_id: 'cp-004', user_id: 'user-003', user_name: '스타디움러버', parent_comment_id: null, content: '유용한 정보 감사합니다!', like_count: 15, is_edited: false, is_deleted: false, is_blinded: false, created_at: '2026-03-27T13:00:00Z' },
  { id: 'cc-007', post_id: 'cp-004', user_id: 'user-004', user_name: '배트맨', parent_comment_id: 'cc-006', content: '저도 이거 보고 갔는데 도움 많이 됐어요', like_count: 4, is_edited: true, is_deleted: false, is_blinded: false, created_at: '2026-03-27T14:00:00Z' },
  { id: 'cc-008', post_id: 'cp-003', user_id: 'user-005', user_name: '직관러', parent_comment_id: null, content: '삭제된 댓글입니다', like_count: 0, is_edited: false, is_deleted: true, is_blinded: false, created_at: '2026-03-28T11:00:00Z' },
];

// ─── Mock Polls ───
export const MOCK_POLLS: Poll[] = [
  { id: 'poll-001', post_id: 'cp-001', post_title: 'LG 오늘 경기 예측', allow_multiple: false, expires_at: '2026-03-31T00:00:00Z', is_closed: false, total_votes: 67, options: [{ id: 'po-001', text: 'LG 승리', vote_count: 38 }, { id: 'po-002', text: '두산 승리', vote_count: 22 }, { id: 'po-003', text: '무승부', vote_count: 7 }], created_at: '2026-03-30T10:00:00Z' },
  { id: 'poll-002', post_id: 'cp-003', post_title: '올 시즌 MVP 후보는?', allow_multiple: true, expires_at: '2026-04-04T00:00:00Z', is_closed: false, total_votes: 145, options: [{ id: 'po-004', text: '이정후', vote_count: 52 }, { id: 'po-005', text: '김하성', vote_count: 41 }, { id: 'po-006', text: '양의지', vote_count: 28 }, { id: 'po-007', text: '문동주', vote_count: 24 }], created_at: '2026-03-28T09:00:00Z' },
];

// ─── Mock Inquiries ───
export const INQUIRY_CATEGORY_LABELS: Record<InquiryCategory, string> = {
  account: '계정', payment: '결제', bug: '버그', feature: '기능 요청', other: '기타',
};

export const MOCK_INQUIRIES: Inquiry[] = [
  { id: 'inq-001', userId: 'user-002', userName: '야구덕후', category: 'account', title: '닉네임 변경이 안 됩니다', content: '프로필 편집에서 닉네임을 바꾸려 하는데 저장 버튼이 반응하지 않습니다.', status: 'open', createdAt: '2026-03-30T09:00:00Z' },
  { id: 'inq-002', userId: 'user-003', userName: '스타디움러버', category: 'payment', title: '티켓 구매 후 잔액 미반영', content: '3000원짜리 티켓팩 구매했는데 잔액이 올라가지 않았습니다. 결제는 완료됐습니다.', status: 'replied', reply: '확인 결과 결제 처리 지연으로 인한 문제였습니다. 현재 잔액이 정상 반영되었습니다.', createdAt: '2026-03-28T11:00:00Z', repliedAt: '2026-03-28T15:00:00Z' },
  { id: 'inq-003', userId: 'user-004', userName: '배트맨', category: 'bug', title: '앱 실행 시 크래시 발생', content: 'iOS 17.4에서 앱 실행하면 스플래시 화면 후 바로 종료됩니다.', status: 'open', createdAt: '2026-03-29T08:00:00Z' },
  { id: 'inq-004', userId: 'user-005', userName: '직관러', category: 'feature', title: '다크 모드 지원 요청', content: '야간 경기 볼 때 화면이 너무 밝아서 다크 모드가 있으면 좋겠습니다.', status: 'closed', reply: '다크 모드 기능이 다음 업데이트(v1.3.0)에 포함될 예정입니다. 감사합니다!', createdAt: '2026-03-25T10:00:00Z', repliedAt: '2026-03-26T09:00:00Z' },
  { id: 'inq-005', userId: 'user-002', userName: '야구덕후', category: 'other', title: '포토그래퍼 인증 문의', content: '포토그래퍼 인증 신청 후 얼마나 걸리나요? 3일째 대기 중입니다.', status: 'replied', reply: '포토그래퍼 인증은 보통 1-3 영업일 소요됩니다. 현재 신청서를 검토 중이며 곧 결과를 안내드리겠습니다.', createdAt: '2026-03-27T14:00:00Z', repliedAt: '2026-03-27T17:00:00Z' },
];

// ─── Mock DM Conversations ───
export const MOCK_DM_CONVERSATIONS: DMConversation[] = [
  { id: 'dm-001', user1Id: 'user-002', user1Name: '야구덕후', user2Id: 'user-003', user2Name: '스타디움러버', lastMessage: '광주 원정 같이 갈래요?', lastMessageAt: '2026-03-30T12:00:00Z', messageCount: 15, isReported: false },
  { id: 'dm-002', user1Id: 'user-004', user1Name: '배트맨', user2Id: 'user-005', user2Name: '직관러', lastMessage: '잠실 어디서 만날까요?', lastMessageAt: '2026-03-29T18:00:00Z', messageCount: 8, isReported: false },
  { id: 'dm-003', user1Id: 'user-002', user1Name: '야구덕후', user2Id: 'user-004', user2Name: '배트맨', lastMessage: '욕설 포함 메시지', lastMessageAt: '2026-03-28T20:00:00Z', messageCount: 23, isReported: true, reportReason: '욕설 및 비하 발언' },
  { id: 'dm-004', user1Id: 'user-003', user1Name: '스타디움러버', user2Id: 'user-005', user2Name: '직관러', lastMessage: '사진 잘 받았습니다 감사해요!', lastMessageAt: '2026-03-27T16:00:00Z', messageCount: 5, isReported: false },
  { id: 'dm-005', user1Id: 'user-004', user1Name: '배트맨', user2Id: 'user-003', user2Name: '스타디움러버', lastMessage: '스팸성 광고 메시지', lastMessageAt: '2026-03-26T10:00:00Z', messageCount: 12, isReported: true, reportReason: '스팸/광고 메시지' },
];

// ─── Mock Ticket Transactions ───
export const TICKET_TX_TYPE_LABELS: Record<TicketTransactionType, string> = {
  purchase: '구매', gift_sent: '선물 보냄', gift_received: '선물 받음', refund: '환불',
};

export const MOCK_TICKET_TRANSACTIONS: TicketTransaction[] = [
  { id: 'tx-001', userId: 'user-002', userName: '야구덕후', type: 'purchase', amount: 50, description: '50 티켓 팩 구매', createdAt: '2026-03-30T08:00:00Z' },
  { id: 'tx-002', userId: 'user-002', userName: '야구덕후', type: 'gift_sent', amount: -7, description: '맥주 선물 → 김야구', createdAt: '2026-03-30T09:00:00Z' },
  { id: 'tx-003', userId: 'user-003', userName: '스타디움러버', type: 'purchase', amount: 100, description: '100 티켓 팩 구매', createdAt: '2026-03-29T10:00:00Z' },
  { id: 'tx-004', userId: 'user-003', userName: '스타디움러버', type: 'gift_sent', amount: -30, description: '카메라 렌즈 선물 → 이사진', createdAt: '2026-03-29T11:00:00Z' },
  { id: 'tx-005', userId: 'user-004', userName: '배트맨', type: 'purchase', amount: 20, description: '20 티켓 팩 구매', createdAt: '2026-03-28T12:00:00Z' },
  { id: 'tx-006', userId: 'user-004', userName: '배트맨', type: 'refund', amount: 20, description: '결제 취소 환불', createdAt: '2026-03-28T14:00:00Z' },
  { id: 'tx-007', userId: 'user-005', userName: '직관러', type: 'purchase', amount: 30, description: '30 티켓 팩 구매', createdAt: '2026-03-27T09:00:00Z' },
  { id: 'tx-008', userId: 'user-005', userName: '직관러', type: 'gift_sent', amount: -15, description: '사인볼 선물 → 박포토', createdAt: '2026-03-27T10:00:00Z' },
];

export const MOCK_TICKET_PACKAGES: TicketPackage[] = [
  { id: 'pkg-001', name: '스타터 팩', ticketAmount: 10, price: 1000, isActive: true },
  { id: 'pkg-002', name: '베이직 팩', ticketAmount: 30, price: 2500, isActive: true },
  { id: 'pkg-003', name: '프리미엄 팩', ticketAmount: 50, price: 4000, isActive: true },
  { id: 'pkg-004', name: '프로 팩', ticketAmount: 100, price: 7000, isActive: true },
  { id: 'pkg-005', name: '이벤트 팩', ticketAmount: 200, price: 12000, isActive: false },
];

// ─── Gift Items ───
export const GIFT_ITEMS: GiftItem[] = [
  { id: 'coffee', nameKo: '커피', emoji: '☕', ticketCost: 2 },
  { id: 'hotdog', nameKo: '핫도그', emoji: '🌭', ticketCost: 5 },
  { id: 'beer', nameKo: '맥주', emoji: '🍺', ticketCost: 7 },
  { id: 'signed_ball', nameKo: '사인볼', emoji: '⚾', ticketCost: 15 },
  { id: 'lens', nameKo: '카메라 렌즈', emoji: '📸', ticketCost: 30 },
  { id: 'season_pass', nameKo: '시즌권', emoji: '🎟️', ticketCost: 50 },
];

// ─── Mock Support Records ───
export const MOCK_SUPPORT_RECORDS: SupportRecord[] = [
  { id: 'sup-001', fromUserId: 'user-002', fromUserName: '야구덕후', toPhotographerId: 'pg-001', toPhotographerName: '김야구', giftId: 'beer', ticketAmount: 7, createdAt: '2026-03-30T09:00:00Z' },
  { id: 'sup-002', fromUserId: 'user-003', fromUserName: '스타디움러버', toPhotographerId: 'pg-002', toPhotographerName: '이사진', giftId: 'lens', ticketAmount: 30, createdAt: '2026-03-29T11:00:00Z' },
  { id: 'sup-003', fromUserId: 'user-005', fromUserName: '직관러', toPhotographerId: 'pg-003', toPhotographerName: '박포토', giftId: 'signed_ball', ticketAmount: 15, createdAt: '2026-03-27T10:00:00Z' },
  { id: 'sup-004', fromUserId: 'user-004', fromUserName: '배트맨', toPhotographerId: 'pg-001', toPhotographerName: '김야구', giftId: 'coffee', ticketAmount: 2, createdAt: '2026-03-26T08:00:00Z' },
  { id: 'sup-005', fromUserId: 'user-002', fromUserName: '야구덕후', toPhotographerId: 'pg-002', toPhotographerName: '이사진', giftId: 'hotdog', ticketAmount: 5, createdAt: '2026-03-25T15:00:00Z' },
];

// ─── Mock Settlement Records ───
export const MOCK_SETTLEMENTS: SettlementRecord[] = [
  { id: 'stl-001', photographerId: 'pg-001', photographerName: '김야구', amount: 50, commission: 15, netAmount: 35, status: 'completed', requestedAt: '2026-03-20T00:00:00Z', completedAt: '2026-03-22T00:00:00Z' },
  { id: 'stl-002', photographerId: 'pg-002', photographerName: '이사진', amount: 80, commission: 24, netAmount: 56, status: 'processing', requestedAt: '2026-03-28T00:00:00Z' },
  { id: 'stl-003', photographerId: 'pg-003', photographerName: '박포토', amount: 30, commission: 9, netAmount: 21, status: 'pending', requestedAt: '2026-03-30T00:00:00Z' },
];

export const SETTLEMENT_STATUS_LABELS: Record<string, string> = {
  pending: '대기', processing: '처리 중', completed: '완료',
};

// ─── Rank Tiers ───
export const RANK_TIERS: RankTier[] = [
  { id: 'rookie', nameKo: '루키', emoji: '🌱', minScore: 0 },
  { id: 'amateur', nameKo: '아마추어', emoji: '📷', minScore: 10 },
  { id: 'pro', nameKo: '프로', emoji: '⭐', minScore: 30 },
  { id: 'elite', nameKo: '엘리트', emoji: '🏆', minScore: 70 },
  { id: 'legend', nameKo: '레전드', emoji: '👑', minScore: 150 },
];

// ─── Award Categories ───
export const AWARD_CATEGORIES: AwardCategory[] = [
  { id: 'fans_pick', nameKo: '팬즈 픽', emoji: '🏅' },
  { id: 'rising_star', nameKo: '라이징 스타', emoji: '🌟' },
  { id: 'most_loved', nameKo: '모스트 러브드', emoji: '❤️' },
  { id: 'best_shot', nameKo: '베스트 샷', emoji: '📸' },
  { id: 'team_spirit', nameKo: '팀 스피릿', emoji: '⚾' },
];

export const MOCK_AWARDS: AwardRecord[] = [
  { id: 'aw-001', categoryId: 'fans_pick', photographerId: 'pg-001', photographerName: '김야구', month: '2026-03' },
  { id: 'aw-002', categoryId: 'rising_star', photographerId: 'pg-002', photographerName: '이사진', month: '2026-03' },
  { id: 'aw-003', categoryId: 'best_shot', photographerId: 'pg-003', photographerName: '박포토', month: '2026-03' },
  { id: 'aw-004', categoryId: 'fans_pick', photographerId: 'pg-002', photographerName: '이사진', month: '2026-02' },
  { id: 'aw-005', categoryId: 'most_loved', photographerId: 'pg-001', photographerName: '김야구', month: '2026-02' },
  { id: 'aw-006', categoryId: 'team_spirit', photographerId: 'pg-003', photographerName: '박포토', month: '2026-02' },
];

// ─── Mock Block Records ───
export const MOCK_BLOCKS: BlockRecord[] = [
  { id: 'blk-001', blockerId: 'user-002', blockerName: '야구덕후', blockedId: 'user-005', blockedName: '직관러', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'blk-002', blockerId: 'user-003', blockerName: '스타디움러버', blockedId: 'user-004', blockedName: '배트맨', createdAt: '2026-03-25T14:00:00Z' },
  { id: 'blk-003', blockerId: 'user-005', blockerName: '직관러', blockedId: 'user-002', blockedName: '야구덕후', createdAt: '2026-03-29T09:00:00Z' },
];

// ─── Mock Collections ───
export const MOCK_COLLECTIONS: PgCollection[] = [
  { id: 'col-001', photographerId: 'pg-001', photographerName: '김야구', name: '베스트 샷', emoji: '📸', postCount: 12, createdAt: '2026-02-01T00:00:00Z' },
  { id: 'col-002', photographerId: 'pg-001', photographerName: '김야구', name: '홈런 모음', emoji: '⚾', postCount: 8, createdAt: '2026-02-15T00:00:00Z' },
  { id: 'col-003', photographerId: 'pg-002', photographerName: '이사진', name: '야경 시리즈', emoji: '🌙', postCount: 6, createdAt: '2026-03-01T00:00:00Z' },
  { id: 'col-004', photographerId: 'pg-002', photographerName: '이사진', name: '응원 열기', emoji: '🔥', postCount: 15, createdAt: '2026-03-10T00:00:00Z' },
  { id: 'col-005', photographerId: 'pg-003', photographerName: '박포토', name: '선수 포트레이트', emoji: '👤', postCount: 10, createdAt: '2026-02-20T00:00:00Z' },
];

// ─── Mock Search Keywords ───
export const MOCK_SEARCH_KEYWORDS: SearchKeyword[] = [
  { keyword: 'LG 트윈스', count: 1250, trend: 'up' },
  { keyword: '치어리더', count: 980, trend: 'up' },
  { keyword: '잠실', count: 870, trend: 'stable' },
  { keyword: '홈런', count: 750, trend: 'down' },
  { keyword: '개막전', count: 620, trend: 'up' },
  { keyword: 'KIA 타이거즈', count: 580, trend: 'stable' },
  { keyword: '직관', count: 520, trend: 'up' },
  { keyword: '선발 라인업', count: 480, trend: 'down' },
  { keyword: '두산 베어스', count: 430, trend: 'stable' },
  { keyword: '야구 사진', count: 390, trend: 'up' },
];

// ─── Mock Follow Stats ───
export const MOCK_FOLLOW_STATS: PhotographerFollowStats[] = [
  { photographerId: 'pg-001', photographerName: '김야구', followerCount: 1250, followingCount: 45 },
  { photographerId: 'pg-002', photographerName: '이사진', followerCount: 890, followingCount: 32 },
  { photographerId: 'pg-003', photographerName: '박포토', followerCount: 560, followingCount: 28 },
];

// ─── Mock Timeline Events ───
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  regular_season: '정규시즌', postseason: '포스트시즌', allstar: '올스타', spring_camp: '스프링캠프', fan_meeting: '팬미팅', first_pitch: '시구', other: '기타',
};

export const MOCK_EVENTS: TimelineEvent[] = [
  { id: 'ev-001', title: '2026 KBO 개막전', eventType: 'regular_season', teamIds: ['lg', 'doosan'], date: '2026-03-22', location: '잠실 야구장', description: '2026 시즌 개막전! LG vs 두산 더비', postCount: 45, thumbnailUrl: 'https://picsum.photos/seed/opening/400/300' },
  { id: 'ev-002', title: 'KIA 홈 개막전', eventType: 'regular_season', teamIds: ['kia', 'samsung'], date: '2026-03-23', location: '광주-기아 챔피언스필드', description: 'KIA 홈 개막, 팬 이벤트 다수', postCount: 32, thumbnailUrl: 'https://picsum.photos/seed/kiahome/400/300' },
  { id: 'ev-003', title: '이승엽 레전드 시구', eventType: 'first_pitch', teamIds: ['samsung'], date: '2026-03-25', location: '대구 삼성 라이온즈파크', description: '삼성 레전드 이승엽의 시구 이벤트', postCount: 18, thumbnailUrl: null },
  { id: 'ev-004', title: 'SSG 팬 감사 이벤트', eventType: 'fan_meeting', teamIds: ['ssg'], date: '2026-04-05', location: 'SSG 랜더스필드', description: 'SSG 랜더스 팬 감사 데이 이벤트', postCount: 0, thumbnailUrl: null },
  { id: 'ev-005', title: '2026 올스타전', eventType: 'allstar', teamIds: [], date: '2026-07-15', location: '고척 스카이돔', description: '2026 KBO 올스타전', postCount: 0, thumbnailUrl: null },
];
