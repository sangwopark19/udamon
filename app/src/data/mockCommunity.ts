import type { CommunityPostWithAuthor, CommunityCommentWithAuthor } from '../types/community';
import type { PollWithOptions } from '../types/poll';

// ─── Mock Users ──────────────────────────────────────────────
const MOCK_USERS = [
  { id: 'u1', nickname: '야구좋아', avatar_url: null },
  { id: 'u2', nickname: '잠실직관러', avatar_url: null },
  { id: 'u3', nickname: '광주원정대', avatar_url: null },
  { id: 'u4', nickname: '사직응원단', avatar_url: null },
  { id: 'u5', nickname: '두산불곰', avatar_url: null },
  { id: 'u6', nickname: '수원KT팬', avatar_url: null },
  { id: 'u7', nickname: '인천바다', avatar_url: null },
  { id: 'u8', nickname: '대전한화팬', avatar_url: null },
  { id: 'u9', nickname: '창원사람', avatar_url: null },
  { id: 'u10', nickname: '고척돔러', avatar_url: null },
];

export const CURRENT_USER_ID = 'u1';

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

// ─── Mock Posts ──────────────────────────────────────────────
export const MOCK_POSTS: CommunityPostWithAuthor[] = [
  // SSG
  { id: 'cp1', user_id: 'u7', team_id: 'ssg', title: '오늘 랜더스필드 직관 후기', content: '날씨도 좋고 경기도 좋았어요! SSG 5-2 승리! 분위기 최고였습니다. 치킨도 맛있었고 맥주도 시원했어요.', images: ['https://picsum.photos/seed/ssg1/400/300'], has_poll: false, like_count: 45, comment_count: 12, view_count: 320, is_edited: false, is_trending: true, is_blinded: false, created_at: hoursAgo(3), updated_at: hoursAgo(3), user: MOCK_USERS[6], team: { name_ko: 'SSG 랜더스' } },
  { id: 'cp2', user_id: 'u7', team_id: 'ssg', title: 'SSG 외야석 vs 내야석', content: '이번에 처음 내야석 갔는데 확실히 다르더라고요. 외야는 응원 분위기가 좋고 내야는 경기가 잘 보이고.', images: [], has_poll: false, like_count: 18, comment_count: 8, view_count: 150, is_edited: false, is_trending: false, is_blinded: false, created_at: hoursAgo(12), updated_at: hoursAgo(12), user: MOCK_USERS[6], team: { name_ko: 'SSG 랜더스' } },

  // LG
  { id: 'cp3', user_id: 'u2', team_id: 'lg', title: '잠실 직관 꿀팁 공유', content: '잠실 처음 가시는 분들을 위한 팁! 1. 지하철 종합운동장역 5번 출구 2. 치킨은 미리 주문 3. 응원도구는 매점에서 구매 가능', images: ['https://picsum.photos/seed/lg1/400/300', 'https://picsum.photos/seed/lg2/400/300'], has_poll: false, like_count: 67, comment_count: 23, view_count: 890, is_edited: false, is_trending: true, is_blinded: false, created_at: hoursAgo(5), updated_at: hoursAgo(5), user: MOCK_USERS[1], team: { name_ko: 'LG 트윈스' } },
  { id: 'cp4', user_id: 'u2', team_id: 'lg', title: 'LG 선발 로테이션 예상', content: '이번 주 선발 로테이션 어떻게 될까요? 개인적으로는 1번 엔스 2번 플럿코 3번 김윤식 순서일 것 같은데', images: [], has_poll: false, like_count: 12, comment_count: 15, view_count: 200, is_edited: true, is_trending: false, is_blinded: false, created_at: hoursAgo(18), updated_at: hoursAgo(16), user: MOCK_USERS[1], team: { name_ko: 'LG 트윈스' } },

  // 두산
  { id: 'cp5', user_id: 'u5', team_id: 'doosan', title: '두산 신인 드래프트 분석', content: '올해 두산이 지명한 선수들 분석해봤습니다. 투수진 보강에 집중한 모습이고, 특히 2라운드 투수가 기대됩니다.', images: [], has_poll: false, like_count: 34, comment_count: 19, view_count: 450, is_edited: false, is_trending: false, is_blinded: false, created_at: hoursAgo(8), updated_at: hoursAgo(8), user: MOCK_USERS[4], team: { name_ko: '두산 베어스' } },
  { id: 'cp6', user_id: 'u5', team_id: 'doosan', title: '잠실 맛집 추천', content: '직관 전후로 갈 만한 잠실 맛집 추천합니다! 종합운동장역 근처 돈까스집이 진짜 맛있어요.', images: ['https://picsum.photos/seed/food1/400/300'], has_poll: false, like_count: 28, comment_count: 7, view_count: 310, is_edited: false, is_trending: false, is_blinded: false, created_at: daysAgo(1), updated_at: daysAgo(1), user: MOCK_USERS[4], team: { name_ko: '두산 베어스' } },

  // KIA
  { id: 'cp7', user_id: 'u3', team_id: 'kia', title: '챔피언스필드 원정 후기', content: '광주 원정 다녀왔어요! 구장 시설이 정말 좋고 먹거리도 다양해요. 특히 광주식 떡볶이가 맛있었습니다.', images: ['https://picsum.photos/seed/kia1/400/300', 'https://picsum.photos/seed/kia2/400/300', 'https://picsum.photos/seed/kia3/400/300'], has_poll: false, like_count: 52, comment_count: 14, view_count: 620, is_edited: false, is_trending: true, is_blinded: false, created_at: hoursAgo(6), updated_at: hoursAgo(6), user: MOCK_USERS[2], team: { name_ko: 'KIA 타이거즈' } },

  // KT
  { id: 'cp8', user_id: 'u6', team_id: 'kt', title: '위즈파크 좌석 추천', content: '수원 위즈파크 좌석별 장단점 정리해봤어요. 3루쪽이 햇빛을 덜 받아서 여름에는 추천!', images: [], has_poll: false, like_count: 22, comment_count: 9, view_count: 180, is_edited: false, is_trending: false, is_blinded: false, created_at: hoursAgo(15), updated_at: hoursAgo(15), user: MOCK_USERS[5], team: { name_ko: 'KT 위즈' } },

  // 키움
  { id: 'cp9', user_id: 'u10', team_id: 'kiwoom', title: '고척돔 냉방 최고', content: '여름 직관은 고척돔이 최고예요. 에어컨 빵빵하고 비 와도 상관없고. 다만 교통이 좀 불편한 게 단점.', images: [], has_poll: false, like_count: 15, comment_count: 6, view_count: 120, is_edited: false, is_trending: false, is_blinded: false, created_at: daysAgo(2), updated_at: daysAgo(2), user: MOCK_USERS[9], team: { name_ko: '키움 히어로즈' } },

  // NC
  { id: 'cp10', user_id: 'u9', team_id: 'nc', title: 'NC파크 불꽃놀이 일정', content: '이번 달 NC파크 불꽃놀이 있는 경기 아시는 분? 작년에 갔는데 진짜 예뻤어요.', images: [], has_poll: false, like_count: 8, comment_count: 4, view_count: 95, is_edited: false, is_trending: false, is_blinded: false, created_at: daysAgo(1), updated_at: daysAgo(1), user: MOCK_USERS[8], team: { name_ko: 'NC 다이노스' } },

  // 삼성
  { id: 'cp11', user_id: 'u1', team_id: 'samsung', title: '대구 삼성 응원가 모음', content: '삼성 응원가 가사 정리해봤어요. 신입 팬분들 참고하세요! 특히 선수별 응원가가 재미있습니다.', images: [], has_poll: false, like_count: 31, comment_count: 11, view_count: 280, is_edited: false, is_trending: false, is_blinded: false, created_at: hoursAgo(20), updated_at: hoursAgo(20), user: MOCK_USERS[0], team: { name_ko: '삼성 라이온즈' } },

  // 롯데
  { id: 'cp12', user_id: 'u4', team_id: 'lotte', title: '사직 야구장 먹거리 탑5', content: '사직 먹거리 제가 뽑은 탑5! 1. 꿀호떡 2. 치킨 3. 곱창 4. 핫도그 5. 회. 사직은 진짜 먹으러 가는 곳ㅋㅋ', images: [], has_poll: false, like_count: 41, comment_count: 16, view_count: 520, is_edited: false, is_trending: false, is_blinded: false, created_at: hoursAgo(10), updated_at: hoursAgo(10), user: MOCK_USERS[3], team: { name_ko: '롯데 자이언츠' } },

  // 한화
  { id: 'cp13', user_id: 'u8', team_id: 'hanwha', title: '이글스파크 리뉴얼 어때요?', content: '올해 리뉴얼된 이글스파크 가보신 분? 좌석이 많이 바뀌었다는데 직관 후기 궁금합니다.', images: [], has_poll: false, like_count: 13, comment_count: 5, view_count: 110, is_edited: false, is_trending: false, is_blinded: false, created_at: daysAgo(3), updated_at: daysAgo(3), user: MOCK_USERS[7], team: { name_ko: '한화 이글스' } },

  // ─── 투표 포함 글 ──────────────────────────────────────────
  { id: 'cp14', user_id: 'u1', team_id: null, title: '올해 한국시리즈 우승팀 예상', content: '올해 한국시리즈 우승팀 어디라고 생각하세요? 투표해주세요!', images: [], has_poll: true, like_count: 89, comment_count: 42, view_count: 1500, is_edited: false, is_trending: true, is_blinded: false, created_at: hoursAgo(2), updated_at: hoursAgo(2), user: MOCK_USERS[0], team: null },

  { id: 'cp15', user_id: 'u2', team_id: 'lg', title: 'LG 베스트 응원가는?', content: 'LG 응원가 중에 가장 좋은 거 투표! 복수선택 가능합니다.', images: [], has_poll: true, like_count: 36, comment_count: 18, view_count: 400, is_edited: false, is_trending: false, is_blinded: false, created_at: hoursAgo(10), updated_at: hoursAgo(10), user: MOCK_USERS[1], team: { name_ko: 'LG 트윈스' } },

  // ─── 전체 글 (구단 태그 없음) ─────────────────────────────
  { id: 'cp16', user_id: 'u3', team_id: null, title: 'KBO 직관 준비물 체크리스트', content: '직관 갈 때 꼭 챙겨야 할 것들! 1. 응원도구 2. 방석 3. 선크림 4. 보조배터리 5. 현금(일부 매점) 6. 우비(야외구장)', images: [], has_poll: false, like_count: 73, comment_count: 25, view_count: 980, is_edited: false, is_trending: true, is_blinded: false, created_at: hoursAgo(4), updated_at: hoursAgo(4), user: MOCK_USERS[2], team: null },
];

// ─── Mock Polls ──────────────────────────────────────────────
export const MOCK_POLLS: Record<string, PollWithOptions> = {
  cp14: {
    id: 'poll1',
    post_id: 'cp14',
    allow_multiple: false,
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_closed: false,
    total_votes: 156,
    created_at: hoursAgo(2),
    options: [
      { id: 'po1', poll_id: 'poll1', text: 'LG 트윈스', vote_count: 42, sort_order: 0 },
      { id: 'po2', poll_id: 'poll1', text: 'KIA 타이거즈', vote_count: 38, sort_order: 1 },
      { id: 'po3', poll_id: 'poll1', text: 'SSG 랜더스', vote_count: 28, sort_order: 2 },
      { id: 'po4', poll_id: 'poll1', text: '삼성 라이온즈', vote_count: 25, sort_order: 3 },
      { id: 'po5', poll_id: 'poll1', text: '두산 베어스', vote_count: 23, sort_order: 4 },
    ],
  },
  cp15: {
    id: 'poll2',
    post_id: 'cp15',
    allow_multiple: true,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_closed: false,
    total_votes: 84,
    created_at: hoursAgo(10),
    options: [
      { id: 'po6', poll_id: 'poll2', text: '엘지 사랑해 (구단가)', vote_count: 32, sort_order: 0 },
      { id: 'po7', poll_id: 'poll2', text: '승리의 노래', vote_count: 28, sort_order: 1 },
      { id: 'po8', poll_id: 'poll2', text: '오 필승 코리아 (변형)', vote_count: 24, sort_order: 2 },
    ],
  },
};

// ─── Mock Comments ──────────────────────────────────────────
export const MOCK_COMMENTS: CommunityCommentWithAuthor[] = [
  // cp1 댓글
  { id: 'cc1', post_id: 'cp1', user_id: 'u2', parent_comment_id: null, content: '부럽다 ㅠㅠ 나도 가고 싶었는데', like_count: 5, is_edited: false, is_deleted: false, created_at: hoursAgo(2), updated_at: hoursAgo(2), user: MOCK_USERS[1] },
  { id: 'cc2', post_id: 'cp1', user_id: 'u5', parent_comment_id: null, content: 'SSG 경기장 분위기 진짜 좋죠!', like_count: 3, is_edited: false, is_deleted: false, created_at: hoursAgo(2), updated_at: hoursAgo(2), user: MOCK_USERS[4] },
  { id: 'cc3', post_id: 'cp1', user_id: 'u7', parent_comment_id: 'cc1', content: '다음에 같이 가요!', like_count: 1, is_edited: false, is_deleted: false, created_at: hoursAgo(1), updated_at: hoursAgo(1), user: MOCK_USERS[6] },

  // cp3 댓글
  { id: 'cc4', post_id: 'cp3', user_id: 'u5', parent_comment_id: null, content: '좋은 정보 감사합니다! 이번 주에 처음 가는데 참고할게요', like_count: 8, is_edited: false, is_deleted: false, created_at: hoursAgo(4), updated_at: hoursAgo(4), user: MOCK_USERS[4] },
  { id: 'cc5', post_id: 'cp3', user_id: 'u3', parent_comment_id: null, content: '추가로 주차장은 미리 예약하는 게 좋아요', like_count: 6, is_edited: false, is_deleted: false, created_at: hoursAgo(4), updated_at: hoursAgo(4), user: MOCK_USERS[2] },
  { id: 'cc6', post_id: 'cp3', user_id: 'u2', parent_comment_id: 'cc4', content: '즐거운 직관 되세요!', like_count: 2, is_edited: false, is_deleted: false, created_at: hoursAgo(3), updated_at: hoursAgo(3), user: MOCK_USERS[1] },

  // cp14 (투표글) 댓글
  { id: 'cc7', post_id: 'cp14', user_id: 'u4', parent_comment_id: null, content: '올해는 KIA가 강한 것 같은데', like_count: 12, is_edited: false, is_deleted: false, created_at: hoursAgo(1), updated_at: hoursAgo(1), user: MOCK_USERS[3] },
  { id: 'cc8', post_id: 'cp14', user_id: 'u6', parent_comment_id: null, content: 'LG 3연패 가즈아!', like_count: 9, is_edited: false, is_deleted: false, created_at: hoursAgo(1), updated_at: hoursAgo(1), user: MOCK_USERS[5] },
  { id: 'cc9', post_id: 'cp14', user_id: 'u8', parent_comment_id: 'cc7', content: '올해는 한화다 한화!', like_count: 4, is_edited: false, is_deleted: false, created_at: hoursAgo(1), updated_at: hoursAgo(1), user: MOCK_USERS[7] },

  // cp16 댓글
  { id: 'cc10', post_id: 'cp16', user_id: 'u9', parent_comment_id: null, content: '방석 진짜 중요!! 의자가 딱딱해서 엉덩이 아픔', like_count: 15, is_edited: false, is_deleted: false, created_at: hoursAgo(3), updated_at: hoursAgo(3), user: MOCK_USERS[8] },
];
