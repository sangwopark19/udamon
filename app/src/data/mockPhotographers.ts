import type { Photographer, PhotoPost, Player, PlayerPosition, TimelineEvent } from '../types/photographer';

// ─── Helpers ─────────────────────────────────────────────────
function hoursAgo(h: number): string {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ─── Photographer Profiles ──────────────────────────────────
export const MOCK_PHOTOGRAPHERS: Photographer[] = [
  {
    id: 'pg1', user_id: 'up1', display_name: '야구사진관',
    bio: 'KBO 전 구단 직관 포토그래퍼. 잠실/사직 위주 활동.',
    avatar_url: null, cover_url: null, team_id: 'lg',
    follower_count: 1240, post_count: 86, is_verified: true,
    created_at: daysAgo(120),
  },
  {
    id: 'pg2', user_id: 'up2', display_name: '다이아몬드렌즈',
    bio: '야구장의 감동을 사진으로 담습니다.',
    avatar_url: null, cover_url: null, team_id: 'kia',
    follower_count: 890, post_count: 54, is_verified: true,
    created_at: daysAgo(90),
  },
  {
    id: 'pg3', user_id: 'up3', display_name: '마운드포토',
    bio: '투수 전문 포토그래퍼. 불꽃 직구의 순간을 포착합니다.',
    avatar_url: null, cover_url: null, team_id: 'ssg',
    follower_count: 650, post_count: 41, is_verified: false,
    created_at: daysAgo(60),
  },
  {
    id: 'pg4', user_id: 'up4', display_name: '홈런캡처',
    bio: '타자의 스윙, 홈런의 순간을 담는 포토그래퍼.',
    avatar_url: null, cover_url: null, team_id: 'doosan',
    follower_count: 480, post_count: 33, is_verified: false,
    created_at: daysAgo(45),
  },
  {
    id: 'pg5', user_id: 'up5', display_name: '구장스케치',
    bio: '야구장 풍경과 팬 문화를 기록합니다.',
    avatar_url: null, cover_url: null, team_id: null,
    follower_count: 320, post_count: 28, is_verified: false,
    created_at: daysAgo(30),
  },
  // ─── Test Photographer Account ───
  {
    id: 'test-user-002', user_id: 'test-user-002', display_name: '테스트포토그래퍼',
    bio: '포토그래퍼 테스트 계정입니다.',
    avatar_url: null, cover_url: null, team_id: 'lg',
    follower_count: 15, post_count: 3, is_verified: false,
    created_at: daysAgo(10),
  },
];

// ─── Player helper ──────────────────────────────────────────
const pl = (
  id: string, tid: string, name: string, num: number, pos: PlayerPosition,
): Player => ({ id, team_id: tid, name_ko: name, number: num, position: pos, is_active: true });

// ═══════════════════════════════════════════════════════════════
// KBO 2026 시즌 1군 엔트리 (구단당 29명 / 총 290명)
// ═══════════════════════════════════════════════════════════════
export const MOCK_PLAYERS: Player[] = [

  // ─── 두산 베어스 ──────────────────────────────────────────
  // 투수 (13)
  pl('pl_doo_1',  'doosan', '박치국',   1, 'P'),
  pl('pl_doo_18', 'doosan', '타무라',  18, 'P'),
  pl('pl_doo_29', 'doosan', '이병헌',  29, 'P'),
  pl('pl_doo_30', 'doosan', '양재훈',  30, 'P'),
  pl('pl_doo_39', 'doosan', '잭로그',  39, 'P'),
  pl('pl_doo_42', 'doosan', '최지강',  42, 'P'),
  pl('pl_doo_45', 'doosan', '이용찬',  45, 'P'),
  pl('pl_doo_47', 'doosan', '곽빈',   47, 'P'),
  pl('pl_doo_49', 'doosan', '박신지',  49, 'P'),
  pl('pl_doo_59', 'doosan', '최준호',  59, 'P'),
  pl('pl_doo_61', 'doosan', '최원준',  61, 'P'),
  pl('pl_doo_63', 'doosan', '김택연',  63, 'P'),
  pl('pl_doo_77', 'doosan', '플렉센',  77, 'P'),
  // 포수 (3)
  pl('pl_doo_22', 'doosan', '김기연',  22, 'C'),
  pl('pl_doo_25', 'doosan', '양의지',  25, 'C'),
  pl('pl_doo_27', 'doosan', '윤준호',  27, 'C'),
  // 내야수 (8)
  pl('pl_doo_6',  'doosan', '오명진',   6, 'IF'),
  pl('pl_doo_7',  'doosan', '박찬호',   7, 'IF'),
  pl('pl_doo_13', 'doosan', '이유찬',  13, 'IF'),
  pl('pl_doo_23', 'doosan', '강승호',  23, 'IF'),
  pl('pl_doo_37', 'doosan', '박지훈',  37, 'IF'),
  pl('pl_doo_52', 'doosan', '박준순',  52, 'IF'),
  pl('pl_doo_53', 'doosan', '양석환',  53, 'IF'),
  pl('pl_doo_62', 'doosan', '안재석',  62, 'IF'),
  // 외야수 (5)
  pl('pl_doo_2',  'doosan', '조수행',   2, 'OF'),
  pl('pl_doo_10', 'doosan', '정수빈',  10, 'OF'),
  pl('pl_doo_35', 'doosan', '김인태',  35, 'OF'),
  pl('pl_doo_50', 'doosan', '이영하',  50, 'OF'),
  pl('pl_doo_55', 'doosan', '페레이라', 55, 'OF'),

  // ─── LG 트윈스 ────────────────────────────────────────────
  // 투수 (13)
  pl('pl_lg_35', 'lg', '임찬규',  35, 'P'),
  pl('pl_lg_37', 'lg', '고우석',  37, 'P'),
  pl('pl_lg_46', 'lg', '켈리',   46, 'P'),
  pl('pl_lg_43', 'lg', '정우영',  43, 'P'),
  pl('pl_lg_27', 'lg', '김윤식',  27, 'P'),
  pl('pl_lg_11', 'lg', '김대현',  11, 'P'),
  pl('pl_lg_48', 'lg', '정주현',  48, 'P'),
  pl('pl_lg_40', 'lg', '플럿코',  40, 'P'),
  pl('pl_lg_14', 'lg', '이형종',  14, 'P'),
  pl('pl_lg_29', 'lg', '한지승',  29, 'P'),
  pl('pl_lg_19', 'lg', '박순빈',  19, 'P'),
  pl('pl_lg_17', 'lg', '엔스',   17, 'P'),
  pl('pl_lg_41', 'lg', '박명근',  41, 'P'),
  // 포수 (3)
  pl('pl_lg_10', 'lg', '박동원',  10, 'C'),
  pl('pl_lg_55', 'lg', '유강남',  55, 'C'),
  pl('pl_lg_21', 'lg', '김성민',  21, 'C'),
  // 내야수 (6)
  pl('pl_lg_8',  'lg', '오지환',   8, 'IF'),
  pl('pl_lg_2',  'lg', '문보경',   2, 'IF'),
  pl('pl_lg_52', 'lg', '구본혁',  52, 'IF'),
  pl('pl_lg_6',  'lg', '김민성',   6, 'IF'),
  pl('pl_lg_36', 'lg', '오선진',  36, 'IF'),
  pl('pl_lg_56', 'lg', '김주원',  56, 'IF'),
  // 외야수 (7)
  pl('pl_lg_33', 'lg', '박해민',  33, 'OF'),
  pl('pl_lg_51', 'lg', '홍창기',  51, 'OF'),
  pl('pl_lg_22', 'lg', '김현수',  22, 'OF'),
  pl('pl_lg_54', 'lg', '오스틴',  54, 'OF'),
  pl('pl_lg_7',  'lg', '신민재',   7, 'OF'),
  pl('pl_lg_25', 'lg', '이정용',  25, 'OF'),
  pl('pl_lg_15', 'lg', '문성주',  15, 'OF'),

  // ─── KIA 타이거즈 ─────────────────────────────────────────
  // 투수 (13)
  pl('pl_kia_14', 'kia', '양현종',  14, 'P'),
  pl('pl_kia_11', 'kia', '이의리',  11, 'P'),
  pl('pl_kia_29', 'kia', '정해영',  29, 'P'),
  pl('pl_kia_38', 'kia', '네일',   38, 'P'),
  pl('pl_kia_26', 'kia', '박민',   26, 'P'),
  pl('pl_kia_48', 'kia', '문경찬',  48, 'P'),
  pl('pl_kia_99', 'kia', '윤영철',  99, 'P'),
  pl('pl_kia_40', 'kia', '올러',   40, 'P'),
  pl('pl_kia_61', 'kia', '김도현',  61, 'P'),
  pl('pl_kia_19', 'kia', '김규성',  19, 'P'),
  pl('pl_kia_33', 'kia', '이태양',  33, 'P'),
  pl('pl_kia_17', 'kia', '한승택',  17, 'P'),
  pl('pl_kia_46', 'kia', '이호연',  46, 'P'),
  // 포수 (3)
  pl('pl_kia_22', 'kia', '한승택C', 22, 'C'),
  pl('pl_kia_10', 'kia', '김태군',  10, 'C'),
  pl('pl_kia_44', 'kia', '이해찬',  44, 'C'),
  // 내야수 (6)
  pl('pl_kia_5',  'kia', '김도영',   5, 'IF'),
  pl('pl_kia_3',  'kia', '김선빈',   3, 'IF'),
  pl('pl_kia_53', 'kia', '이우성',  53, 'IF'),
  pl('pl_kia_2',  'kia', '전상현',   2, 'IF'),
  pl('pl_kia_16', 'kia', '안치홍',  16, 'IF'),
  pl('pl_kia_55', 'kia', '소크라테스', 55, 'IF'),
  // 외야수 (7)
  pl('pl_kia_47', 'kia', '나성범',  47, 'OF'),
  pl('pl_kia_7',  'kia', '최원준',   7, 'OF'),
  pl('pl_kia_23', 'kia', '이창진',  23, 'OF'),
  pl('pl_kia_35', 'kia', '박준표',  35, 'OF'),
  pl('pl_kia_9',  'kia', '고종욱',   9, 'OF'),
  pl('pl_kia_36', 'kia', '김호령',  36, 'OF'),
  pl('pl_kia_4',  'kia', '오선우',   4, 'OF'),

  // ─── 삼성 라이온즈 ────────────────────────────────────────
  // 투수 (13)
  pl('pl_sam_17', 'samsung', '원태인',  17, 'P'),
  pl('pl_sam_43', 'samsung', '윌커슨',  43, 'P'),
  pl('pl_sam_61', 'samsung', '이재현',  61, 'P'),
  pl('pl_sam_29', 'samsung', '최채흥',  29, 'P'),
  pl('pl_sam_21', 'samsung', '전병우',  21, 'P'),
  pl('pl_sam_11', 'samsung', '허윤동',  11, 'P'),
  pl('pl_sam_46', 'samsung', '최지광',  46, 'P'),
  pl('pl_sam_19', 'samsung', '김서진',  19, 'P'),
  pl('pl_sam_30', 'samsung', '이승현',  30, 'P'),
  pl('pl_sam_40', 'samsung', '디그롬',  40, 'P'),
  pl('pl_sam_48', 'samsung', '오명환',  48, 'P'),
  pl('pl_sam_26', 'samsung', '최수환',  26, 'P'),
  pl('pl_sam_38', 'samsung', '디아즈',  38, 'P'),
  // 포수 (3)
  pl('pl_sam_47', 'samsung', '강민호',  47, 'C'),
  pl('pl_sam_27', 'samsung', '박승규',  27, 'C'),
  pl('pl_sam_31', 'samsung', '김재상',  31, 'C'),
  // 내야수 (6)
  pl('pl_sam_2',  'samsung', '김영웅',   2, 'IF'),
  pl('pl_sam_57', 'samsung', '문현빈',  57, 'IF'),
  pl('pl_sam_52', 'samsung', '오선우',  52, 'IF'),
  pl('pl_sam_34', 'samsung', '최형우',  34, 'IF'),
  pl('pl_sam_25', 'samsung', '김지한',  25, 'IF'),
  pl('pl_sam_62', 'samsung', '이성우',  62, 'IF'),
  // 외야수 (7)
  pl('pl_sam_10', 'samsung', '구자욱',  10, 'OF'),
  pl('pl_sam_5',  'samsung', '김지찬',   5, 'OF'),
  pl('pl_sam_8',  'samsung', '김헌곤',   8, 'OF'),
  pl('pl_sam_23', 'samsung', '김호령A', 23, 'OF'),
  pl('pl_sam_7',  'samsung', '이원석',   7, 'OF'),
  pl('pl_sam_15', 'samsung', '김성윤',  15, 'OF'),
  pl('pl_sam_55', 'samsung', '레이예스', 55, 'OF'),

  // ─── KT 위즈 ──────────────────────────────────────────────
  // 투수 (13)
  pl('pl_kt_29', 'kt', '소형준',  29, 'P'),
  pl('pl_kt_43', 'kt', '박영현',  43, 'P'),
  pl('pl_kt_14', 'kt', '고영표',  14, 'P'),
  pl('pl_kt_21', 'kt', '박시영',  21, 'P'),
  pl('pl_kt_11', 'kt', '엄상백',  11, 'P'),
  pl('pl_kt_46', 'kt', '이대은',  46, 'P'),
  pl('pl_kt_19', 'kt', '김재윤',  19, 'P'),
  pl('pl_kt_17', 'kt', '김민혁',  17, 'P'),
  pl('pl_kt_40', 'kt', '쿠에바스', 40, 'P'),
  pl('pl_kt_47', 'kt', '부쇼',   47, 'P'),
  pl('pl_kt_10', 'kt', '윌리엄스', 10, 'P'),
  pl('pl_kt_48', 'kt', '오서준',  48, 'P'),
  pl('pl_kt_26', 'kt', '우규민',  26, 'P'),
  // 포수 (3)
  pl('pl_kt_27', 'kt', '김민수',  27, 'C'),
  pl('pl_kt_22', 'kt', '장성우C', 22, 'C'),
  pl('pl_kt_38', 'kt', '박경수C', 38, 'C'),
  // 내야수 (6)
  pl('pl_kt_50', 'kt', '강백호',  50, 'IF'),
  pl('pl_kt_2',  'kt', '심우준',   2, 'IF'),
  pl('pl_kt_7',  'kt', '장성우',   7, 'IF'),
  pl('pl_kt_5',  'kt', '김상수',   5, 'IF'),
  pl('pl_kt_8',  'kt', '오윤석',   8, 'IF'),
  pl('pl_kt_52', 'kt', '안현민',  52, 'IF'),
  // 외야수 (7)
  pl('pl_kt_57', 'kt', '배정대',  57, 'OF'),
  pl('pl_kt_23', 'kt', '문상철',  23, 'OF'),
  pl('pl_kt_55', 'kt', '멜렌데즈', 55, 'OF'),
  pl('pl_kt_34', 'kt', '로하스',  34, 'OF'),
  pl('pl_kt_31', 'kt', '박경수',  31, 'OF'),
  pl('pl_kt_35', 'kt', '김준성',  35, 'OF'),
  pl('pl_kt_3',  'kt', '송민섭',   3, 'OF'),

  // ─── SSG 랜더스 ───────────────────────────────────────────
  // 투수 (13)
  pl('pl_ssg_29', 'ssg', '김광현',  29, 'P'),
  pl('pl_ssg_21', 'ssg', '이재원',  21, 'P'),
  pl('pl_ssg_46', 'ssg', '문승원',  46, 'P'),
  pl('pl_ssg_27', 'ssg', '노경은',  27, 'P'),
  pl('pl_ssg_38', 'ssg', '오태곤',  38, 'P'),
  pl('pl_ssg_11', 'ssg', '서진용',  11, 'P'),
  pl('pl_ssg_48', 'ssg', '하재승',  48, 'P'),
  pl('pl_ssg_40', 'ssg', '안주형',  40, 'P'),
  pl('pl_ssg_19', 'ssg', '박종훈',  19, 'P'),
  pl('pl_ssg_52', 'ssg', '공민규',  52, 'P'),
  pl('pl_ssg_17', 'ssg', '조병현',  17, 'P'),
  pl('pl_ssg_43', 'ssg', '윌커슨A', 43, 'P'),
  pl('pl_ssg_56', 'ssg', '김택형',  56, 'P'),
  // 포수 (3)
  pl('pl_ssg_22', 'ssg', '이로운',  22, 'C'),
  pl('pl_ssg_35', 'ssg', '김민식',  35, 'C'),
  pl('pl_ssg_32', 'ssg', '이연지',  32, 'C'),
  // 내야수 (6)
  pl('pl_ssg_14', 'ssg', '최정',   14, 'IF'),
  pl('pl_ssg_6',  'ssg', '박성한',   6, 'IF'),
  pl('pl_ssg_2',  'ssg', '김성현',   2, 'IF'),
  pl('pl_ssg_10', 'ssg', '정현',   10, 'IF'),
  pl('pl_ssg_8',  'ssg', '배지환',   8, 'IF'),
  pl('pl_ssg_15', 'ssg', '김태경',  15, 'IF'),
  // 외야수 (7)
  pl('pl_ssg_50', 'ssg', '한유섬',  50, 'OF'),
  pl('pl_ssg_3',  'ssg', '최지훈',   3, 'OF'),
  pl('pl_ssg_55', 'ssg', '에레디아', 55, 'OF'),
  pl('pl_ssg_7',  'ssg', '김강민',   7, 'OF'),
  pl('pl_ssg_44', 'ssg', '스미스',  44, 'OF'),
  pl('pl_ssg_24', 'ssg', '이정배',  24, 'OF'),
  pl('pl_ssg_51', 'ssg', '양찬열',  51, 'OF'),

  // ─── 롯데 자이언츠 ────────────────────────────────────────
  // 투수 (13)
  pl('pl_lot_29', 'lotte', '한현희',  29, 'P'),
  pl('pl_lot_40', 'lotte', '스트렐리', 40, 'P'),
  pl('pl_lot_21', 'lotte', '박세웅',  21, 'P'),
  pl('pl_lot_11', 'lotte', '김원중',  11, 'P'),
  pl('pl_lot_46', 'lotte', '김진욱',  46, 'P'),
  pl('pl_lot_38', 'lotte', '글래스',  38, 'P'),
  pl('pl_lot_48', 'lotte', '이인복',  48, 'P'),
  pl('pl_lot_19', 'lotte', '서준원',  19, 'P'),
  pl('pl_lot_52', 'lotte', '홍성갑',  52, 'P'),
  pl('pl_lot_61', 'lotte', '조영건',  61, 'P'),
  pl('pl_lot_17', 'lotte', '고승민',  17, 'P'),
  pl('pl_lot_26', 'lotte', '장시환',  26, 'P'),
  pl('pl_lot_30', 'lotte', '나균안',  30, 'P'),
  // 포수 (3)
  pl('pl_lot_22', 'lotte', '정보근',  22, 'C'),
  pl('pl_lot_35', 'lotte', '이호성',  35, 'C'),
  pl('pl_lot_32', 'lotte', '김한준',  32, 'C'),
  // 내야수 (6)
  pl('pl_lot_5',  'lotte', '노진혁',   5, 'IF'),
  pl('pl_lot_8',  'lotte', '문현빈',   8, 'IF'),
  pl('pl_lot_3',  'lotte', '황성빈',   3, 'IF'),
  pl('pl_lot_10', 'lotte', '한동희',  10, 'IF'),
  pl('pl_lot_16', 'lotte', '김상수A', 16, 'IF'),
  pl('pl_lot_34', 'lotte', '안권수',  34, 'IF'),
  // 외야수 (7)
  pl('pl_lot_27', 'lotte', '전준우',  27, 'OF'),
  pl('pl_lot_55', 'lotte', '레예스',  55, 'OF'),
  pl('pl_lot_43', 'lotte', '나승엽',  43, 'OF'),
  pl('pl_lot_7',  'lotte', '윤동희',   7, 'OF'),
  pl('pl_lot_2',  'lotte', '손호영',   2, 'OF'),
  pl('pl_lot_25', 'lotte', '김민석',  25, 'OF'),
  pl('pl_lot_9',  'lotte', '유돈노',   9, 'OF'),

  // ─── 한화 이글스 ──────────────────────────────────────────
  // 투수 (13)
  pl('pl_han_29', 'hanwha', '문동주',  29, 'P'),
  pl('pl_han_43', 'hanwha', '피어밴드', 43, 'P'),
  pl('pl_han_17', 'hanwha', '김서현',  17, 'P'),
  pl('pl_han_11', 'hanwha', '한승주',  11, 'P'),
  pl('pl_han_46', 'hanwha', '이성곤',  46, 'P'),
  pl('pl_han_27', 'hanwha', '안우진',  27, 'P'),
  pl('pl_han_40', 'hanwha', '청모',   40, 'P'),
  pl('pl_han_48', 'hanwha', '김태연',  48, 'P'),
  pl('pl_han_19', 'hanwha', '최인호',  19, 'P'),
  pl('pl_han_21', 'hanwha', '송승준',  21, 'P'),
  pl('pl_han_38', 'hanwha', '권혁',   38, 'P'),
  pl('pl_han_26', 'hanwha', '주현상',  26, 'P'),
  pl('pl_han_30', 'hanwha', '이재원P', 30, 'P'),
  // 포수 (3)
  pl('pl_han_22', 'hanwha', '정진호',  22, 'C'),
  pl('pl_han_10', 'hanwha', '최재훈',  10, 'C'),
  pl('pl_han_15', 'hanwha', '채현우',  15, 'C'),
  // 내야수 (6)
  pl('pl_han_52', 'hanwha', '노시환',  52, 'IF'),
  pl('pl_han_6',  'hanwha', '정은원',   6, 'IF'),
  pl('pl_han_55', 'hanwha', '페라자',  55, 'IF'),
  pl('pl_han_5',  'hanwha', '하주석',   5, 'IF'),
  pl('pl_han_2',  'hanwha', '김인환',   2, 'IF'),
  pl('pl_han_34', 'hanwha', '박상원',  34, 'IF'),
  // 외야수 (7)
  pl('pl_han_35', 'hanwha', '이주형',  35, 'OF'),
  pl('pl_han_7',  'hanwha', '황영묵',   7, 'OF'),
  pl('pl_han_23', 'hanwha', '김범수',  23, 'OF'),
  pl('pl_han_44', 'hanwha', '손아섭',  44, 'OF'),
  pl('pl_han_8',  'hanwha', '이택근',   8, 'OF'),
  pl('pl_han_51', 'hanwha', '문현석',  51, 'OF'),
  pl('pl_han_3',  'hanwha', '김재현',   3, 'OF'),

  // ─── NC 다이노스 ──────────────────────────────────────────
  // 투수 (13)
  pl('pl_nc_11', 'nc', '구창모',  11, 'P'),
  pl('pl_nc_43', 'nc', '에릭슨',  43, 'P'),
  pl('pl_nc_29', 'nc', '도태훈',  29, 'P'),
  pl('pl_nc_17', 'nc', '이재학',  17, 'P'),
  pl('pl_nc_46', 'nc', '신민혁',  46, 'P'),
  pl('pl_nc_40', 'nc', '김준완',  40, 'P'),
  pl('pl_nc_19', 'nc', '송명기',  19, 'P'),
  pl('pl_nc_52', 'nc', '김시훈',  52, 'P'),
  pl('pl_nc_21', 'nc', '김영규',  21, 'P'),
  pl('pl_nc_27', 'nc', '소이현',  27, 'P'),
  pl('pl_nc_48', 'nc', '이명기',  48, 'P'),
  pl('pl_nc_38', 'nc', '박재찬',  38, 'P'),
  pl('pl_nc_30', 'nc', '류진욱',  30, 'P'),
  // 포수 (3)
  pl('pl_nc_22', 'nc', '김형준',  22, 'C'),
  pl('pl_nc_38b','nc', '오영수',  38, 'C'),
  pl('pl_nc_32', 'nc', '전민혁',  32, 'C'),
  // 내야수 (6)
  pl('pl_nc_6',  'nc', '박민우',   6, 'IF'),
  pl('pl_nc_7',  'nc', '서호철',   7, 'IF'),
  pl('pl_nc_2',  'nc', '박석민',   2, 'IF'),
  pl('pl_nc_10', 'nc', '최원준',  10, 'IF'),
  pl('pl_nc_55', 'nc', '루치아노', 55, 'IF'),
  pl('pl_nc_8',  'nc', '지석훈',   8, 'IF'),
  // 외야수 (7)
  pl('pl_nc_33', 'nc', '박건우',  33, 'OF'),
  pl('pl_nc_37', 'nc', '손아섭A', 37, 'OF'),
  pl('pl_nc_5',  'nc', '노진혁',   5, 'OF'),
  pl('pl_nc_35', 'nc', '양현',   35, 'OF'),
  pl('pl_nc_44', 'nc', '테일러',  44, 'OF'),
  pl('pl_nc_23', 'nc', '권희동',  23, 'OF'),
  pl('pl_nc_9',  'nc', '김주원',   9, 'OF'),

  // ─── 키움 히어로즈 ────────────────────────────────────────
  // 투수 (13)
  pl('pl_kiw_25', 'kiwoom', '안우진',  25, 'P'),
  pl('pl_kiw_43', 'kiwoom', '이원재',  43, 'P'),
  pl('pl_kiw_27', 'kiwoom', '최원태',  27, 'P'),
  pl('pl_kiw_46', 'kiwoom', '조상우',  46, 'P'),
  pl('pl_kiw_29', 'kiwoom', '임지열',  29, 'P'),
  pl('pl_kiw_11', 'kiwoom', '이주형',  11, 'P'),
  pl('pl_kiw_40', 'kiwoom', '하영민',  40, 'P'),
  pl('pl_kiw_38', 'kiwoom', '한현희A', 38, 'P'),
  pl('pl_kiw_48', 'kiwoom', '변상권',  48, 'P'),
  pl('pl_kiw_19', 'kiwoom', '오선우P', 19, 'P'),
  pl('pl_kiw_52', 'kiwoom', '이승호',  52, 'P'),
  pl('pl_kiw_44', 'kiwoom', '로니',   44, 'P'),
  pl('pl_kiw_30', 'kiwoom', '김민',   30, 'P'),
  // 포수 (3)
  pl('pl_kiw_10', 'kiwoom', '이지영',  10, 'C'),
  pl('pl_kiw_35', 'kiwoom', '김동엽',  35, 'C'),
  pl('pl_kiw_32', 'kiwoom', '김재현C', 32, 'C'),
  // 내야수 (6)
  pl('pl_kiw_8',  'kiwoom', '송성문',   8, 'IF'),
  pl('pl_kiw_17', 'kiwoom', '김혜성',  17, 'IF'),
  pl('pl_kiw_55', 'kiwoom', '주니올',  55, 'IF'),
  pl('pl_kiw_23', 'kiwoom', '이건욱',  23, 'IF'),
  pl('pl_kiw_7',  'kiwoom', '김휘집',   7, 'IF'),
  pl('pl_kiw_15', 'kiwoom', '최주환',  15, 'IF'),
  // 외야수 (7)
  pl('pl_kiw_2',  'kiwoom', '김웅빈',   2, 'OF'),
  pl('pl_kiw_5',  'kiwoom', '전병우',   5, 'OF'),
  pl('pl_kiw_34', 'kiwoom', '장재영',  34, 'OF'),
  pl('pl_kiw_3',  'kiwoom', '박주성',   3, 'OF'),
  pl('pl_kiw_21', 'kiwoom', '김인태',  21, 'OF'),
  pl('pl_kiw_51', 'kiwoom', '이형준',  51, 'OF'),
  pl('pl_kiw_9',  'kiwoom', '이호연A',  9, 'OF'),
];

// ─── Photo Posts (3~5 per team) ─────────────────────────────
const makePhotoPost = (
  id: string, pgId: string, teamId: string, playerId: string | null,
  title: string, desc: string, seed: string,
  likes: number, comments: number, views: number,
  featured: boolean, ago: string,
  pgName: string, verified: boolean,
  teamName: string, playerInfo?: { name_ko: string; number: number } | null,
  cheerleaderId?: string | null, cheerleaderInfo?: { name: string } | null,
): PhotoPost => ({
  id, photographer_id: pgId, team_id: teamId, player_id: playerId,
  cheerleader_id: cheerleaderId ?? null,
  title, description: desc,
  images: [`https://picsum.photos/seed/${seed}/600/400`],
  like_count: likes, comment_count: comments, view_count: views,
  is_featured: featured, status: 'approved' as const, created_at: ago, updated_at: ago,
  photographer: { display_name: pgName, avatar_url: null, is_verified: verified },
  team: { name_ko: teamName },
  player: playerInfo ?? null,
  cheerleader: cheerleaderInfo ?? null,
});

export const MOCK_PHOTO_POSTS: PhotoPost[] = [
  // SSG (pg3)
  makePhotoPost('pp1','pg3','ssg','pl_ssg_29','김광현 역투 7이닝','김광현 선수의 완벽한 7이닝 역투 장면','ssg_pitch',120,18,850,true,hoursAgo(2),'마운드포토',false,'SSG 랜더스',{name_ko:'김광현',number:29}),
  makePhotoPost('pp2','pg3','ssg','pl_ssg_14','최정 400호 홈런!','최정 선수의 역사적인 400호 홈런 순간','ssg_hr',310,45,2100,true,hoursAgo(6),'마운드포토',false,'SSG 랜더스',{name_ko:'최정',number:14}),
  makePhotoPost('pp3','pg3','ssg',null,'랜더스필드 석양','경기 전 랜더스필드의 아름다운 석양','ssg_sunset',85,8,420,false,daysAgo(1),'마운드포토',false,'SSG 랜더스'),

  // LG (pg1)
  makePhotoPost('pp4','pg1','lg','pl_lg_33','박해민 슈퍼캐치','외야 펜스에 부딪히면서 잡아낸 슈퍼캐치','lg_catch',180,22,1200,true,hoursAgo(4),'야구사진관',true,'LG 트윈스',{name_ko:'박해민',number:33}),
  makePhotoPost('pp5','pg1','lg','pl_lg_35','임찬규 불꽃 직구','154km 불꽃 직구 순간 포착','lg_fastball',95,12,680,false,hoursAgo(8),'야구사진관',true,'LG 트윈스',{name_ko:'임찬규',number:35}),
  makePhotoPost('pp6','pg1','lg',null,'잠실 만원 관중','잠실 야구장 만원 관중의 열기','lg_crowd',150,20,900,true,daysAgo(1),'야구사진관',true,'LG 트윈스'),
  makePhotoPost('pp7','pg1','lg','pl_lg_8','오지환 끝내기 안타','9회 말 끝내기 안타로 승리를 이끈 오지환','lg_walk',200,28,1500,true,hoursAgo(12),'야구사진관',true,'LG 트윈스',{name_ko:'오지환',number:8}),

  // 두산 (pg4)
  makePhotoPost('pp8','pg4','doosan','pl_doo_25','양의지 결승 홈런','8회 양의지의 투런 홈런으로 역전','doo_hr',140,16,950,true,hoursAgo(5),'홈런캡처',false,'두산 베어스',{name_ko:'양의지',number:25}),
  makePhotoPost('pp9','pg4','doosan','pl_doo_53','양석환 파워 스윙','양석환의 풀스윙 포착','doo_swing',75,9,520,false,hoursAgo(15),'홈런캡처',false,'두산 베어스',{name_ko:'양석환',number:53}),
  makePhotoPost('pp10','pg4','doosan',null,'잠실 야경','밤 경기 잠실의 아름다운 야경','doo_night',60,5,350,false,daysAgo(2),'홈런캡처',false,'두산 베어스'),

  // KIA (pg2)
  makePhotoPost('pp11','pg2','kia','pl_kia_5','김도영 20-20 달성!','김도영 선수 시즌 20홈런 20도루 달성','kia_2020',280,38,1800,true,hoursAgo(3),'다이아몬드렌즈',true,'KIA 타이거즈',{name_ko:'김도영',number:5}),
  makePhotoPost('pp12','pg2','kia','pl_kia_14','양현종 200승 도전','양현종 선수의 통산 200승 도전기','kia_200w',190,25,1300,true,hoursAgo(9),'다이아몬드렌즈',true,'KIA 타이거즈',{name_ko:'양현종',number:14}),
  makePhotoPost('pp13','pg2','kia','pl_kia_47','나성범 레이저빔','나성범의 강력한 송구','kia_throw',100,14,720,false,daysAgo(1),'다이아몬드렌즈',true,'KIA 타이거즈',{name_ko:'나성범',number:47}),

  // KT (pg5)
  makePhotoPost('pp14','pg5','kt','pl_kt_50','강백호 장외 홈런','위즈파크 장외로 날린 폭풍 홈런','kt_bomb',160,20,1100,true,hoursAgo(7),'구장스케치',false,'KT 위즈',{name_ko:'강백호',number:50}),
  makePhotoPost('pp15','pg5','kt',null,'위즈파크 전경','드론으로 촬영한 위즈파크 전경','kt_aerial',70,6,400,false,daysAgo(2),'구장스케치',false,'KT 위즈'),

  // 키움 (pg5)
  makePhotoPost('pp16','pg5','kiwoom','pl_kiw_25','안우진 삼진쇼','고척돔 안우진의 더블 디짓 삼진','kiw_k',130,15,860,true,hoursAgo(10),'구장스케치',false,'키움 히어로즈',{name_ko:'안우진',number:25}),
  makePhotoPost('pp17','pg5','kiwoom',null,'고척돔 응원','고척돔 열정 가득한 응원 장면','kiw_fans',50,4,280,false,daysAgo(3),'구장스케치',false,'키움 히어로즈'),

  // NC (pg2)
  makePhotoPost('pp18','pg2','nc','pl_nc_33','박건우 호수비','NC파크에서 보여준 파인 플레이','nc_defense',90,11,640,false,hoursAgo(14),'다이아몬드렌즈',true,'NC 다이노스',{name_ko:'박건우',number:33}),
  makePhotoPost('pp19','pg2','nc',null,'NC파크 야경','창원 NC파크의 아름다운 야경','nc_night',65,7,380,false,daysAgo(1),'다이아몬드렌즈',true,'NC 다이노스'),

  // 삼성 (pg1)
  makePhotoPost('pp20','pg1','samsung','pl_sam_10','구자욱 연타석 홈런','구자욱의 2경기 연속 홈런','sam_hr',110,13,750,true,hoursAgo(11),'야구사진관',true,'삼성 라이온즈',{name_ko:'구자욱',number:10}),
  makePhotoPost('pp21','pg1','samsung',null,'라이온즈파크 치어리더','삼성 치어리더 공연 장면','sam_cheer',80,6,450,false,daysAgo(2),'야구사진관',true,'삼성 라이온즈',null,'cl_7',{name:'이수진'}),

  // 롯데 (pg4)
  makePhotoPost('pp22','pg4','lotte','pl_lot_27','전준우 결승타','사직에서 터진 전준우의 결승타','lot_hit',95,10,630,false,hoursAgo(16),'홈런캡처',false,'롯데 자이언츠',{name_ko:'전준우',number:27}),
  makePhotoPost('pp23','pg4','lotte',null,'사직구장 불꽃놀이','경기 후 사직구장 불꽃놀이','lot_fire',170,22,1050,true,daysAgo(1),'홈런캡처',false,'롯데 자이언츠'),

  // 한화 (pg3)
  makePhotoPost('pp24','pg3','hanwha','pl_han_29','문동주 데뷔 완봉승','문동주의 감동적인 데뷔 완봉승 장면','han_moon',250,35,1700,true,hoursAgo(1),'마운드포토',false,'한화 이글스',{name_ko:'문동주',number:29}),
  makePhotoPost('pp25','pg3','hanwha','pl_han_52','노시환 3점 홈런','역전 3점 홈런을 터뜨린 노시환','han_hr',105,12,700,false,hoursAgo(18),'마운드포토',false,'한화 이글스',{name_ko:'노시환',number:52}),

  // ─── Test Photographer (test-user-002) ───
  makePhotoPost('pp-t1','test-user-002','lg','pl_lg_33','잠실 직관 포토','잠실에서 찍은 직관 사진입니다.','test_lg1',25,3,180,false,hoursAgo(5),'테스트포토그래퍼',false,'LG 트윈스',{name_ko:'박해민',number:33}),
  makePhotoPost('pp-t2','test-user-002','lg','pl_lg_35','임찬규 역투','임찬규의 완벽한 투구 장면','test_lg2',18,2,120,false,daysAgo(1),'테스트포토그래퍼',false,'LG 트윈스',{name_ko:'임찬규',number:35}),
  makePhotoPost('pp-t3','test-user-002','lg',null,'잠실 야경 포토','밤 경기 잠실의 분위기','test_lg3',12,1,90,false,daysAgo(3),'테스트포토그래퍼',false,'LG 트윈스'),

  // ─── Cheerleader-tagged posts (UGC) ───
  // 한화 — 박기량
  makePhotoPost('pp26','pg1','hanwha',null,'한화 치어리더 공연','한화 이글스 응원 무대','han_cheer',95,8,520,false,daysAgo(1),'야구사진관',true,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp31','pg5','hanwha',null,'박기량 7회 응원','이글스파크 7회 치어리더 퍼포먼스','han_cheer2',62,4,310,false,daysAgo(3),'구장스케치',false,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp32','pg1','hanwha',null,'한화 치어리더 단체 무대','이글스파크 개막전 치어리더 공연','han_cheer3',110,12,680,false,daysAgo(5),'야구사진관',true,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp57','pg2','hanwha',null,'박기량 이글스파크 직캠','한화 홈경기 박기량 치어리더 응원 직캠','han_cheer5',145,18,920,true,hoursAgo(8),'다이아몬드렌즈',true,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp58','pg3','hanwha',null,'박기량 응원 리액션','팬들과 소통하는 박기량 치어리더','han_cheer6',88,9,540,false,hoursAgo(18),'마운드포토',false,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp59','pg5','hanwha',null,'이글스파크 야간 응원','이글스파크 나이트 게임 치어리더 무대','han_cheer7',120,14,750,false,daysAgo(2),'구장스케치',false,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp60','pg4','hanwha',null,'박기량 시즌 오프닝','2026 시즌 개막전 박기량 치어리더','han_cheer8',160,22,1100,true,daysAgo(4),'홈런캡처',false,'한화 이글스',null,'cl_1',{name:'박기량'}),
  makePhotoPost('pp61','pg1','hanwha',null,'한화 치어리더 하이라이트','이글스파크 주말 경기 치어리더 퍼포먼스','han_cheer9',95,8,480,false,daysAgo(6),'야구사진관',true,'한화 이글스',null,'cl_1',{name:'박기량'}),
  // 한화 — 안지현
  makePhotoPost('pp33','pg5','hanwha',null,'안지현 열정 응원','이글스파크 안지현 치어리더','han_cheer4',48,3,250,false,daysAgo(4),'구장스케치',false,'한화 이글스',null,'cl_2',{name:'안지현'}),
  // LG — 이다혜
  makePhotoPost('pp27','pg5','lg',null,'LG 치어리더 응원','잠실 LG 치어리더 무대','lg_cheer',70,5,380,false,daysAgo(2),'구장스케치',false,'LG 트윈스',null,'cl_3',{name:'이다혜'}),
  makePhotoPost('pp34','pg1','lg',null,'이다혜 잠실 공연','잠실 야구장 치어리더 응원','lg_cheer2',85,6,420,false,daysAgo(4),'야구사진관',true,'LG 트윈스',null,'cl_3',{name:'이다혜'}),
  makePhotoPost('pp35','pg5','lg',null,'LG 트윈스 개막전 치어리더','잠실 개막전 LG 치어리더 무대','lg_cheer3',92,9,550,false,daysAgo(6),'구장스케치',false,'LG 트윈스',null,'cl_3',{name:'이다혜'}),
  // LG — 김나연
  makePhotoPost('pp36','pg1','lg',null,'김나연 응원 무대','잠실 김나연 치어리더 무대','lg_cheer4',55,4,280,false,daysAgo(3),'야구사진관',true,'LG 트윈스',null,'cl_12',{name:'김나연'}),
  // 두산 — 김다영
  makePhotoPost('pp28','pg4','doosan',null,'두산 치어리더 열정무대','잠실 두산 응원단','doo_cheer',65,4,310,false,daysAgo(3),'홈런캡처',false,'두산 베어스',null,'cl_4',{name:'김다영'}),
  makePhotoPost('pp37','pg4','doosan',null,'김다영 두산 응원','두산 베어스 홈경기 응원무대','doo_cheer2',78,5,390,false,daysAgo(5),'홈런캡처',false,'두산 베어스',null,'cl_4',{name:'김다영'}),
  makePhotoPost('pp38','pg1','doosan',null,'잠실 두산 치어리더 공연','두산 홈 개막전 치어리더','doo_cheer3',90,8,480,false,daysAgo(7),'야구사진관',true,'두산 베어스',null,'cl_4',{name:'김다영'}),
  // KIA — 최홍라
  makePhotoPost('pp29','pg2','kia',null,'KIA 치어리더 공연','챔필 치어리더 무대','kia_cheer',88,7,460,false,daysAgo(1),'다이아몬드렌즈',true,'KIA 타이거즈',null,'cl_5',{name:'최홍라'}),
  makePhotoPost('pp39','pg2','kia',null,'최홍라 챔필 응원','KIA 타이거즈 치어리더 최홍라','kia_cheer2',100,10,580,false,daysAgo(4),'다이아몬드렌즈',true,'KIA 타이거즈',null,'cl_5',{name:'최홍라'}),
  makePhotoPost('pp40','pg5','kia',null,'KIA 치어리더 단체 무대','광주 챔피언스필드 공연','kia_cheer3',75,6,400,false,daysAgo(6),'구장스케치',false,'KIA 타이거즈',null,'cl_5',{name:'최홍라'}),
  // KIA — 서지영
  makePhotoPost('pp41','pg2','kia',null,'서지영 KIA 응원','챔필 서지영 치어리더 무대','kia_cheer4',60,3,290,false,daysAgo(5),'다이아몬드렌즈',true,'KIA 타이거즈',null,'cl_16',{name:'서지영'}),
  // SSG — 김현영
  makePhotoPost('pp30','pg3','ssg',null,'SSG 치어리더 무대','랜더스필드 치어리더 공연','ssg_cheer',72,5,340,false,daysAgo(2),'마운드포토',false,'SSG 랜더스',null,'cl_6',{name:'김현영'}),
  makePhotoPost('pp42','pg3','ssg',null,'김현영 랜더스필드 공연','SSG 홈경기 치어리더 무대','ssg_cheer2',82,6,430,false,daysAgo(4),'마운드포토',false,'SSG 랜더스',null,'cl_6',{name:'김현영'}),
  makePhotoPost('pp43','pg1','ssg',null,'SSG 개막전 치어리더','랜더스필드 개막전 공연','ssg_cheer3',95,9,520,false,daysAgo(6),'야구사진관',true,'SSG 랜더스',null,'cl_6',{name:'김현영'}),
  // 삼성 — 이수진
  makePhotoPost('pp44','pg1','samsung',null,'이수진 대구 응원','삼성 라이온즈파크 치어리더','sam_cheer2',68,5,360,false,daysAgo(3),'야구사진관',true,'삼성 라이온즈',null,'cl_7',{name:'이수진'}),
  makePhotoPost('pp45','pg5','samsung',null,'삼성 치어리더 단체 무대','라이온즈파크 주말 공연','sam_cheer3',88,7,470,false,daysAgo(5),'구장스케치',false,'삼성 라이온즈',null,'cl_7',{name:'이수진'}),
  // NC — 한수아
  makePhotoPost('pp46','pg5','nc',null,'한수아 NC 응원','창원 NC파크 치어리더 무대','nc_cheer',74,5,370,false,daysAgo(2),'구장스케치',false,'NC 다이노스',null,'cl_8',{name:'한수아'}),
  makePhotoPost('pp47','pg1','nc',null,'NC 다이노스 치어리더 공연','NC파크 주말 치어리더 무대','nc_cheer2',82,7,440,false,daysAgo(4),'야구사진관',true,'NC 다이노스',null,'cl_8',{name:'한수아'}),
  makePhotoPost('pp48','pg5','nc',null,'한수아 개막전 응원','NC파크 개막전 치어리더','nc_cheer3',91,8,510,false,daysAgo(6),'구장스케치',false,'NC 다이노스',null,'cl_8',{name:'한수아'}),
  // 롯데 — 정유나
  makePhotoPost('pp49','pg4','lotte',null,'정유나 사직 응원','사직 야구장 치어리더 무대','lot_cheer',66,4,330,false,daysAgo(2),'홈런캡처',false,'롯데 자이언츠',null,'cl_9',{name:'정유나'}),
  makePhotoPost('pp50','pg1','lotte',null,'롯데 치어리더 공연','사직구장 주말 치어리더 무대','lot_cheer2',78,6,410,false,daysAgo(5),'야구사진관',true,'롯데 자이언츠',null,'cl_9',{name:'정유나'}),
  makePhotoPost('pp51','pg4','lotte',null,'사직 치어리더 단체 무대','롯데 홈경기 치어리더 퍼포먼스','lot_cheer3',85,7,450,false,daysAgo(7),'홈런캡처',false,'롯데 자이언츠',null,'cl_9',{name:'정유나'}),
  // KT — 서현숙
  makePhotoPost('pp52','pg5','kt',null,'서현숙 수원 응원','수원 KT위즈파크 치어리더','kt_cheer',60,4,300,false,daysAgo(3),'구장스케치',false,'KT 위즈',null,'cl_10',{name:'서현숙'}),
  makePhotoPost('pp53','pg1','kt',null,'KT 치어리더 무대','KT위즈파크 주말 공연','kt_cheer2',73,5,380,false,daysAgo(5),'야구사진관',true,'KT 위즈',null,'cl_10',{name:'서현숙'}),
  // 키움 — 이소희
  makePhotoPost('pp54','pg4','kiwoom',null,'이소희 고척 응원','고척돔 키움 치어리더 무대','kiw_cheer',58,3,290,false,daysAgo(2),'홈런캡처',false,'키움 히어로즈',null,'cl_28',{name:'이소희'}),
  makePhotoPost('pp55','pg1','kiwoom',null,'키움 치어리더 공연','고척돔 주말 치어리더 공연','kiw_cheer2',80,6,420,false,daysAgo(4),'야구사진관',true,'키움 히어로즈',null,'cl_28',{name:'이소희'}),
  makePhotoPost('pp56','pg5','kiwoom',null,'고척돔 치어리더 단체 무대','키움 홈경기 치어리더 퍼포먼스','kiw_cheer3',87,8,490,false,daysAgo(6),'구장스케치',false,'키움 히어로즈',null,'cl_28',{name:'이소희'}),
];

// ─── Timeline Events ─────────────────────────────────────────
export const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: 'ev1', title: '2026 KBO 정규시즌 개막전',
    event_type: 'regular_season', team_ids: ['lg', 'doosan'],
    date: '2026-03-28', location: '잠실 야구장',
    description: '2026 시즌 개막전, LG vs 두산 잠실 더비',
    post_count: 12, thumbnail_url: 'https://picsum.photos/seed/ev_open/600/400',
  },
  {
    id: 'ev2', title: '2025 KBO 한국시리즈',
    event_type: 'postseason', team_ids: ['kia', 'samsung'],
    date: '2025-10-21', location: '광주-기아 챔피언스 필드',
    description: 'KIA 타이거즈 vs 삼성 라이온즈 한국시리즈',
    post_count: 28, thumbnail_url: 'https://picsum.photos/seed/ev_ks/600/400',
  },
  {
    id: 'ev3', title: '2026 KBO 올스타전',
    event_type: 'allstar', team_ids: [],
    date: '2026-07-11', location: '대전 한화생명 이글스파크',
    description: 'KBO 올스타전, 나눔 드림 vs 나눔 위시',
    post_count: 8, thumbnail_url: 'https://picsum.photos/seed/ev_all/600/400',
  },
  {
    id: 'ev4', title: '2026 스프링캠프',
    event_type: 'spring_camp', team_ids: ['ssg', 'kia', 'lg'],
    date: '2026-02-01', location: '오키나와 / 미야자키',
    description: '2026 시즌 해외 스프링캠프',
    post_count: 15, thumbnail_url: 'https://picsum.photos/seed/ev_camp/600/400',
  },
  {
    id: 'ev5', title: 'SSG 팬페스티벌 2026',
    event_type: 'fan_meeting', team_ids: ['ssg'],
    date: '2026-01-17', location: '인천 SSG 랜더스필드',
    description: 'SSG 랜더스 팬 감사 이벤트',
    post_count: 6, thumbnail_url: 'https://picsum.photos/seed/ev_fan/600/400',
  },
];
