# dugout 개발 스펙 (Claude Code 작업 지시서)

> **[NOTE - 2026-04-05]** 이미지/영상 스토리지가 Supabase Storage에서 Cloudflare R2로 전환됨.
> 아래 문서 내 Supabase Storage 버킷, RLS 정책, 업로드 플로우 관련 내용은 더 이상 유효하지 않음.
> 현행 구현: Edge Function(`get-upload-url`) → presigned URL → R2 직접 업로드.

> 이 문서는 dugout 서비스 프로토콜 v2 FINAL을 기반으로 한 기술 구현 명세입니다.
> Claude Code에 작업 지시 시 이 문서 + 프로토콜을 함께 제공하세요.

---

## 1. 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| 앱 프레임워크 | React Native (Expo) | SDK 51+ |
| 언어 | TypeScript | strict mode |
| 네비게이션 | React Navigation | homma와 동일 |
| 상태관리 | **homma 코드 확인 후 동일 적용** | — |
| 스타일링 | **homma 코드 확인 후 동일 적용** | — |
| DB / Auth / Storage | Supabase | latest |
| API | Supabase Edge Functions (Deno) | — |
| Realtime | Supabase Realtime | — |
| 푸시 | Firebase Cloud Messaging | — |
| 웹 | Next.js + Vercel | latest |
| 모니터링 | Sentry | — |
| 이미지 처리 | Sharp (Edge Function 내) | — |
| NSFW 필터 | Google Cloud Vision API 또는 동급 | — |

---

## 2. 프로젝트 구조

> 기본 구조는 homma와 동일하게 유지. 아래는 dugout에서 추가/변경되는 부분.

```
dugout/
├── app/                          # Expo 앱 (homma 포크)
│   ├── src/
│   │   ├── navigation/           # React Navigation 설정
│   │   │   ├── MainTabNavigator.tsx    # 하단 5탭: 홈|탐색|아카이브|커뮤니티|마이
│   │   │   ├── CommunityStackNavigator.tsx  # 🆕 커뮤니티 스택
│   │   │   └── ...               # homma 기존 네비게이터
│   │   │
│   │   ├── screens/
│   │   │   ├── home/             # 홈 피드 (혼합 피드 로직 수정)
│   │   │   ├── explore/          # 탐색 (구단/선수)
│   │   │   ├── archive/          # 아카이브
│   │   │   ├── community/        # 🆕 커뮤니티
│   │   │   │   ├── CommunityMainScreen.tsx      # 메인 (ALL + 구단 탭)
│   │   │   │   ├── CommunityPostDetailScreen.tsx # 글 상세
│   │   │   │   ├── CommunityWriteScreen.tsx      # 글 작성
│   │   │   │   ├── CommunitySearchScreen.tsx     # 커뮤니티 검색
│   │   │   │   └── PollCreateSection.tsx         # 투표 생성 컴포넌트
│   │   │   ├── my/               # 마이 (내 글, 북마크 확장)
│   │   │   ├── onboarding/       # 🆕 온보딩 가이드 + 마이팀 설정
│   │   │   ├── auth/             # 로그인 (카카오/네이버 추가)
│   │   │   └── photographer/     # 포토그래퍼 (업로드, 프로필)
│   │   │
│   │   ├── components/
│   │   │   ├── community/        # 🆕 커뮤니티 전용 컴포넌트
│   │   │   │   ├── CommunityPostCard.tsx         # 하이브리드 글 카드
│   │   │   │   ├── CommunityComment.tsx          # 댓글/대댓글
│   │   │   │   ├── PollDisplay.tsx               # 투표 표시/참여
│   │   │   │   ├── TeamTabBar.tsx                # 구단 수평 스크롤 탭
│   │   │   │   └── TrendingBadge.tsx             # 트렌딩 뱃지
│   │   │   ├── home/
│   │   │   │   └── CommunityHighlightCard.tsx    # 🆕 홈 피드 내 커뮤니티 카드
│   │   │   ├── shared/
│   │   │   │   ├── ShareSheet.tsx                # 🆕 공유 (카톡/트위터/인스타)
│   │   │   │   ├── ReportModal.tsx               # 신고 모달
│   │   │   │   ├── BlockConfirmModal.tsx          # 차단 확인
│   │   │   │   └── DisabledSupportButton.tsx     # 🆕 비활성화 후원 버튼
│   │   │   └── ...
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCommunityPosts.ts    # 🆕 커뮤니티 글 CRUD
│   │   │   ├── useCommunityComments.ts # 🆕 댓글/대댓글
│   │   │   ├── usePoll.ts             # 🆕 투표
│   │   │   ├── useTrending.ts         # 🆕 트렌딩
│   │   │   ├── useHomeFeed.ts         # 수정: 혼합 피드 로직
│   │   │   ├── useSpamFilter.ts       # 🆕 스팸 필터
│   │   │   └── ...
│   │   │
│   │   ├── services/
│   │   │   ├── supabase.ts            # Supabase 클라이언트
│   │   │   ├── auth.ts                # 인증 (카카오/네이버 추가)
│   │   │   ├── community.ts           # 🆕 커뮤니티 API
│   │   │   ├── poll.ts                # 🆕 투표 API
│   │   │   ├── share.ts               # 🆕 공유/딥링크
│   │   │   ├── notifications.ts       # 알림 (커뮤니티 알림 추가)
│   │   │   ├── imageFilter.ts         # 🆕 NSFW 필터
│   │   │   └── ...
│   │   │
│   │   ├── constants/
│   │   │   ├── colors.ts             # 🔧 컬러 시스템 (라이트 모드)
│   │   │   ├── teams.ts              # 🆕 KBO 10개 구단 데이터
│   │   │   └── config.ts             # 앱 설정값
│   │   │
│   │   └── types/
│   │       ├── community.ts          # 🆕 커뮤니티 타입
│   │       ├── poll.ts               # 🆕 투표 타입
│   │       ├── team.ts               # 🆕 구단/선수 타입
│   │       └── ...
│   │
│   ├── app.json                      # Expo 설정
│   ├── package.json
│   └── tsconfig.json
│
├── web/                              # Next.js 웹 (랜딩 + 미리보기)
│   ├── pages/
│   │   ├── index.tsx                 # 랜딩 페이지
│   │   ├── post/[id].tsx             # 커뮤니티 글 미리보기 (딥링크)
│   │   ├── photo/[id].tsx            # 포토그래퍼 콘텐츠 미리보기
│   │   └── photographer/[id].tsx     # 포토그래퍼 프로필
│   └── ...
│
├── supabase/
│   ├── migrations/                   # DB 마이그레이션 SQL
│   │   ├── 001_teams_players.sql
│   │   ├── 002_community.sql
│   │   ├── 003_polls.sql
│   │   ├── 004_spam_filter.sql
│   │   └── 005_rls_policies.sql
│   └── functions/                    # Edge Functions
│       ├── trending/                 # 트렌딩 갱신 (1시간 cron)
│       ├── notify/                   # 알림 발송
│       ├── image-process/            # 이미지 리사이징/압축
│       ├── nsfw-check/               # NSFW 필터링
│       └── spam-check/               # 스팸/금칙어 체크
│
└── docs/
    ├── dugout_protocol_v2_FINAL.md   # 서비스 프로토콜
    └── dugout_dev_spec.md            # 이 문서
```

---

## 3. 컬러 시스템 (colors.ts)

```typescript
export const colors = {
  // Primary
  primary: '#1B2A4A',        // 딥 네이비 — CTA, 헤더, 강조

  // Backgrounds
  background: '#FFFFFF',     // 메인 배경
  surface: '#F5F7FA',        // 카드, 섹션 배경

  // Borders
  border: '#E5E7EB',         // 구분선, 카드 보더

  // Text
  textPrimary: '#1A1A2E',    // 제목, 본문
  textSecondary: '#6B7280',  // 부가 정보
  textTertiary: '#9CA3AF',   // 힌트, 플레이스홀더

  // Buttons
  buttonPrimary: '#1B2A4A',      // Primary 버튼 배경
  buttonPrimaryText: '#FFFFFF',  // Primary 버튼 텍스트
  buttonDisabled: '#F5F7FA',     // Disabled 버튼 배경
  buttonDisabledText: '#9CA3AF', // Disabled 버튼 텍스트

  // Status
  success: '#22C55E',
  error: '#EF4444',

  // Etc
  trending: '#EF4444',       // 트렌딩 뱃지
  communityBadge: '#1B2A4A', // 홈 피드 내 커뮤니티 카드 뱃지
} as const;
```

---

## 4. Supabase DB 마이그레이션

### 4.1 구단/선수 (001_teams_players.sql)

```sql
-- 구단
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  logo_text TEXT,
  city TEXT NOT NULL,
  stadium_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 선수
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name_ko TEXT NOT NULL,
  name_en TEXT,
  number INTEGER,
  position TEXT CHECK (position IN ('pitcher','catcher','infielder','outfielder','designated_hitter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','traded')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_team ON players(team_id);

-- 마이팀
CREATE TABLE user_my_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 4.2 커뮤니티 (002_community.sql)

```sql
-- 커뮤니티 게시글
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),          -- nullable, 선택사항
  title TEXT NOT NULL CHECK (char_length(title) <= 30),
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  images TEXT[] DEFAULT '{}',                  -- 최대 10장
  has_poll BOOLEAN DEFAULT FALSE,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_blinded BOOLEAN DEFAULT FALSE,           -- 자동 블라인드
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_posts_team ON community_posts(team_id);
CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_trending ON community_posts(is_trending, created_at DESC);
CREATE INDEX idx_community_posts_created ON community_posts(created_at DESC);

-- 커뮤니티 댓글
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  like_count INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,           -- "삭제된 댓글입니다" 표시용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_comments_post ON community_comments(post_id, created_at);

-- 좋아요
CREATE TABLE community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

-- 신고
CREATE TABLE community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam','profanity','harassment','misinformation','other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_id, target_type, target_id)  -- 동일 대상 중복 신고 방지
);
```

### 4.3 투표 (003_polls.sql)

```sql
-- 투표
CREATE TABLE community_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  allow_multiple BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

-- 투표 선택지
CREATE TABLE community_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE INDEX idx_poll_options_poll ON community_poll_options(poll_id, sort_order);

-- 투표 기록
CREATE TABLE community_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES community_poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 단일 선택 시 poll_id + user_id 유니크 (allow_multiple=false일 때 앱에서 체크)
CREATE INDEX idx_poll_votes_poll_user ON community_poll_votes(poll_id, user_id);
```

### 4.4 스팸/제재 (004_spam_filter.sql)

```sql
-- 금칙어
CREATE TABLE spam_filter_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('profanity','ad','gambling','other')),
  is_regex BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 제재
CREATE TABLE user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('post_ban','permanent_ban')),
  reason TEXT,
  blind_count INTEGER DEFAULT 0,              -- 블라인드 누적 횟수
  expires_at TIMESTAMPTZ,                     -- NULL이면 영구
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_restrictions_user ON user_restrictions(user_id);

-- 차단
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- 최근 검색어
CREATE TABLE recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  search_type TEXT DEFAULT 'community' CHECK (search_type IN ('community','photo')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recent_searches_user ON recent_searches(user_id, created_at DESC);
```

---

## 5. Supabase RLS 정책 (005_rls_policies.sql)

```sql
-- 커뮤니티 게시글
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공개 조회 (블라인드/차단 제외)" ON community_posts
  FOR SELECT USING (
    is_blinded = FALSE
    AND user_id NOT IN (
      SELECT blocked_id FROM user_blocks WHERE blocker_id = auth.uid()
    )
  );

CREATE POLICY "로그인 사용자 글 작성" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "본인 글 수정" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "본인 글 삭제" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- 커뮤니티 댓글
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공개 조회 (차단 제외)" ON community_comments
  FOR SELECT USING (
    user_id NOT IN (
      SELECT blocked_id FROM user_blocks WHERE blocker_id = auth.uid()
    )
  );

CREATE POLICY "로그인 사용자 댓글 작성" ON community_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "본인 댓글 수정" ON community_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- 댓글 삭제는 is_deleted 플래그 업데이트로 처리 (실제 DELETE 아님)

-- 좋아요
ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공개 조회" ON community_likes FOR SELECT USING (TRUE);
CREATE POLICY "본인 좋아요" ON community_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "본인 좋아요 취소" ON community_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 투표 기록
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공개 조회" ON community_poll_votes FOR SELECT USING (TRUE);
CREATE POLICY "본인 투표" ON community_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 신고 (본인 글 신고 방지는 앱 레벨에서 체크)
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 신고만" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
```

---

## 6. Supabase Edge Functions

### 6.1 함수 목록

| 함수명 | 트리거 | 설명 |
|--------|--------|------|
| `trending-update` | Cron (1시간마다) | 24시간 내 좋아요+댓글 합산 → is_trending 업데이트 |
| `notify-comment` | DB trigger (community_comments INSERT) | 댓글/대댓글 푸시 알림 발송 |
| `notify-like-milestone` | DB trigger (community_likes INSERT) | 좋아요 10/50/100 도달 시 알림 |
| `notify-poll-expired` | Cron (1분마다) | 만료된 투표 is_closed → TRUE + 알림 |
| `image-process` | Storage trigger | 커뮤니티 사진 리사이징(1920px) + 압축(80%) + 썸네일(600px) |
| `image-process-hq` | Storage trigger | 포토그래퍼 사진 썸네일(800px)만 생성, 원본 유지 |
| `nsfw-check` | Storage trigger | AI 이미지 필터링, NSFW 감지 시 업로드 차단 |
| `spam-check` | DB trigger (community_posts INSERT) | 금칙어 필터 + 쿨다운 체크 + 도배 방지 |
| `auto-blind` | DB trigger (community_reports INSERT) | 신고 5건 누적 시 자동 블라인드 + 제재 체크 |
| `send-push` | 내부 호출 | FCM 푸시 알림 발송 공통 함수 |

### 6.2 trending-update 로직

```typescript
// 1시간마다 실행
// 1. 24시간 내 게시글의 (like_count + comment_count) 상위 계산
// 2. 기존 is_trending = TRUE 글 모두 FALSE로 리셋
// 3. 상위 N개 글 is_trending = TRUE
// 4. 활성 투표(is_closed=FALSE) 글 우선 부스트

const TRENDING_COUNT = 20; // 트렌딩 글 수
const POLL_BOOST = 5;      // 활성 투표 추가 점수
```

### 6.3 spam-check 로직

```typescript
// 게시글 INSERT 시 실행
// 1. 가입 후 10분 경과 확인
// 2. 24시간 내 글 5개 제한 (신규 계정)
// 3. 1분 내 2개 초과 쓰로틀링
// 4. 동일 내용 3분 내 재게시 차단
// 5. 금칙어 사전 매칭 (정규식 포함)
// 6. 위반 시 is_blinded = TRUE 또는 INSERT 차단
```

---

## 7. API 엔드포인트 (Supabase 직접 쿼리 + Edge Functions)

### 7.1 커뮤니티 (Supabase Client 직접)

```typescript
// 글 목록 조회 (페이지네이션 20개)
supabase.from('community_posts')
  .select('*, user:users(nickname, avatar_url), team:teams(name_ko)')
  .order('created_at', { ascending: false })
  .range(offset, offset + 19)

// 구단별 필터
  .eq('team_id', teamId)

// 트렌딩
  .eq('is_trending', true)

// 글 상세 + 댓글
supabase.from('community_posts').select('*').eq('id', postId)
supabase.from('community_comments')
  .select('*, user:users(nickname, avatar_url), parent:community_comments(id)')
  .eq('post_id', postId)
  .order('created_at', { ascending: true })

// 글 작성
supabase.from('community_posts').insert({...})

// 글 수정 (투표 포함 글은 앱에서 차단)
supabase.from('community_posts').update({...}).eq('id', postId).eq('user_id', userId)

// 글 삭제 (댓글 CASCADE)
supabase.from('community_posts').delete().eq('id', postId).eq('user_id', userId)

// 댓글 작성
supabase.from('community_comments').insert({...})

// 댓글 삭제 (소프트 삭제)
supabase.from('community_comments')
  .update({ is_deleted: true, content: '' })
  .eq('id', commentId).eq('user_id', userId)

// 좋아요 토글
supabase.from('community_likes').upsert({...})  // 있으면 삭제, 없으면 추가

// 검색 (제목 + 본문)
supabase.from('community_posts')
  .select('*')
  .or(`title.ilike.%${query}%,content.ilike.%${query}%`)

// 최근 검색어 저장 (최대 10개)
supabase.from('recent_searches').insert({...})
```

### 7.2 투표

```typescript
// 투표 생성 (글 작성 시 함께)
supabase.from('community_polls').insert({...})
supabase.from('community_poll_options').insert([...])

// 투표 참여
supabase.from('community_poll_votes').insert({ poll_id, option_id, user_id })
// → option의 vote_count 증가 (trigger 또는 RPC)

// 투표 결과 조회
supabase.from('community_poll_options')
  .select('*')
  .eq('poll_id', pollId)
  .order('sort_order')
```

### 7.3 홈 피드 혼합 로직

```typescript
// useHomeFeed.ts
// 1. 팔로우한 포토그래퍼 콘텐츠 조회 (또는 콜드스타트 시 인기 콘텐츠)
// 2. 커뮤니티 인기글 조회 (is_trending=TRUE 또는 24h 좋아요+댓글 상위)
// 3. 5:1 비율로 혼합
//    - photoItems[0..4] → communityItem[0] → photoItems[5..9] → communityItem[1] → ...
// 4. 콘텐츠 부족 시 비율 무시, 있는 대로 표시

const PHOTO_PER_COMMUNITY = 5;

function mixFeed(photos: PhotoPost[], communityPosts: CommunityPost[]) {
  const mixed = [];
  let photoIdx = 0;
  let communityIdx = 0;

  while (photoIdx < photos.length || communityIdx < communityPosts.length) {
    // 포토 5개
    for (let i = 0; i < PHOTO_PER_COMMUNITY && photoIdx < photos.length; i++) {
      mixed.push({ type: 'photo', data: photos[photoIdx++] });
    }
    // 커뮤니티 1개
    if (communityIdx < communityPosts.length) {
      mixed.push({ type: 'community', data: communityPosts[communityIdx++] });
    }
  }
  return mixed;
}
```

---

## 8. 인증 설정

### 8.1 Supabase Auth Providers

```
필수 설정:
- Kakao (카카오 개발자 앱 등록)
- Naver (네이버 개발자 앱 등록)
- Google
- Apple
- Email (이메일 + 비밀번호)
```

### 8.2 카카오/네이버 OAuth 설정

```typescript
// 카카오 로그인
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'kakao',
  options: { redirectTo: 'dugoutfan://auth/callback' }
});

// 네이버 로그인 (Supabase custom provider 또는 Edge Function)
// 네이버는 Supabase 기본 지원이 아닐 수 있음
// → Edge Function으로 OAuth 플로우 구현 필요
```

### 8.3 비밀번호 찾기

```typescript
// 임시 비밀번호 발급
// Edge Function: generate-temp-password
// 1. 이메일 확인
// 2. 임시 비밀번호 생성 (8자리 랜덤)
// 3. 이메일 발송
// 4. 로그인 후 비밀번호 변경 강제
```

---

## 9. 네비게이션 구조

```typescript
// MainTabNavigator
Tab.Navigator ({
  Home: HomeStackNavigator,
  Explore: ExploreStackNavigator,
  Archive: ArchiveStackNavigator,
  Community: CommunityStackNavigator,   // 🆕
  My: MyStackNavigator,
})

// CommunityStackNavigator
Stack.Navigator ({
  CommunityMain: CommunityMainScreen,       // ALL + 구단 탭
  CommunityPostDetail: CommunityPostDetailScreen,
  CommunityWrite: CommunityWriteScreen,
  CommunitySearch: CommunitySearchScreen,
})

// 하단 탭 아이콘: homma와 동일 스타일, 커뮤니티 탭 아이콘 추가
// 아이콘: 홈(🏠) 탐색(🔍) 아카이브(📚) 커뮤니티(💬) 마이(👤)
```

---

## 10. 화면별 구현 명세

### 10.1 커뮤니티 메인 (CommunityMainScreen)

```
[상단] 수평 스크롤 탭: ALL | SSG | 키움 | LG | KT | KIA | NC | 삼성 | 롯데 | 두산 | 한화
[검색바] 돋보기 아이콘 → CommunitySearchScreen
[정렬] 최신순 | 인기순 | 트렌딩 (ALL 탭만 트렌딩)
[글 목록] 하이브리드 뷰 (페이지네이션 20개, pull to refresh)
[FAB] 글 작성 버튼 (오른쪽 하단)
```

### 10.2 글 작성 (CommunityWriteScreen)

```
[구단 태그] 드롭다운 (선택사항, "태그 없음" 기본)
[제목] 텍스트 입력 (30자 제한, 글자 수 표시)
[본문] 텍스트 입력 (1000자 제한, 글자 수 표시)
[사진 추가] 이미지 피커 (최대 10장, 10MB/장)
[투표 추가] 토글 → 투표 생성 섹션 펼침
  - 선택지 입력 (2~6개, + 버튼으로 추가)
  - 단일/복수 선택 토글
  - 마감 시간 (24시간/3일/7일 선택)
[게시 버튼] → 스팸 체크 → 업로드

※ 투표 포함 글은 수정 불가 안내 토스트
```

### 10.3 글 상세 (CommunityPostDetailScreen)

```
[작성자] 닉네임 + 작성시간 + (수정됨)
[구단 태그] 있으면 표시
[제목]
[본문]
[사진] 있으면 이미지 캐러셀
[투표] 있으면 PollDisplay 컴포넌트
[좋아요/댓글 수/조회수/공유]
[댓글 목록] 대댓글 트리 구조
[댓글 입력] 하단 고정
[더보기] 수정/삭제 (본인) 또는 신고/차단 (타인)
```

### 10.4 온보딩 (OnboardingScreen)

```
[가이드 1] dugout 소개 이미지 + "KBO 팬을 위한 커뮤니티"
[가이드 2] 커뮤니티 + 포토그래퍼 소개
[가이드 3] 시작하기 버튼
→ 로그인/회원가입 (또는 둘러보기)
→ 마이팀 설정 (10개 구단 그리드 + 건너뛰기)
→ 홈 피드
```

---

## 11. 환경 변수

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# Firebase
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_MESSAGING_SENDER_ID=

# OAuth
KAKAO_REST_API_KEY=
KAKAO_REDIRECT_URI=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Sentry
SENTRY_DSN=

# NSFW Filter (Cloud Vision 등)
NSFW_API_KEY=
NSFW_API_ENDPOINT=

# Deep Link
DEEP_LINK_PREFIX=dugoutfan://
WEB_URL=https://dugoutfan.com

# App
APP_VERSION=1.0.0
APP_ENV=production
```

---

## 12. homma 코드 포크 후 체크리스트

### Phase 1: 텍스트/설정 치환
```
□ 프로젝트명: homma → dugout
□ 앱 ID: com.homma.app → com.dugoutfan.app
□ 앱 이름: homma → dugout
□ 색상 시스템: 다크 모드 → 라이트 모드 (colors.ts 교체)
□ 텍스트: artist → team, member → player 전체 치환
□ 카테고리 enum 변경
□ 이벤트 타입 enum 변경
□ 후원 아이템 enum 변경
```

### Phase 2: DB/Auth
```
□ Supabase 새 프로젝트 생성
□ 마이그레이션 SQL 실행 (001~005)
□ KBO 10개 구단 데이터 INSERT
□ 선수 150~200명 데이터 INSERT
□ Auth providers 설정 (카카오/네이버/구글/애플/이메일)
□ RLS 정책 적용
```

### Phase 3: 커뮤니티 신규 개발
```
□ CommunityMainScreen (ALL + 구단 탭)
□ CommunityPostDetailScreen
□ CommunityWriteScreen + 투표 생성
□ CommunitySearchScreen
□ 댓글/대댓글 컴포넌트
□ 투표 표시/참여 컴포넌트
□ 하이브리드 글 목록 뷰
□ 구단별 수평 스크롤 탭
□ 트렌딩 뱃지
```

### Phase 4: 홈 피드 수정
```
□ 혼합 피드 로직 (5:1 비율)
□ 커뮤니티 인기글 카드 컴포넌트
□ 콜드스타트 (팔로우 없을 때) 처리
□ 비로그인 상태 피드 표시
```

### Phase 5: 기능 추가/수정
```
□ 온보딩 가이드 (2~3장)
□ 마이팀 설정 화면
□ 스팸 방어 시스템
□ 금칙어 필터
□ NSFW 이미지 필터
□ 이미지 리사이징/압축 (커뮤니티용)
□ 공유 기능 (카톡/트위터/인스타 + 링크)
□ 딥링크 설정
□ OG 이미지 (웹)
□ 알림 추가 (댓글/좋아요/투표마감/제재)
□ 차단 → 피드 비노출 처리
□ 후원 UI 비활성화 처리
□ 마이 탭 확장 (내 글, 북마크 통합)
□ 프로필 사진 설정
□ 닉네임 변경 (30일 제한)
□ 캐시 삭제 기능
□ 비밀번호 찾기 (임시 비밀번호)
□ 포토그래퍼 콘텐츠 댓글 추가
□ 포토그래퍼 콘텐츠 다운로드 차단
□ 사진 다운로드 차단 (커뮤니티)
```

### Phase 6: 인프라
```
□ Firebase 프로젝트 생성 (FCM)
□ Sentry 프로젝트 생성
□ 도메인 구매 + DNS
□ Vercel 프로젝트 (웹)
□ Next.js 랜딩 페이지
□ 웹 미리보기 페이지 (딥링크용)
□ 도메인 이메일
```

### Phase 7: 배포
```
□ TestFlight 빌드
□ Google Play 내부 테스트
□ 앱 스토어 메타데이터
□ App Store 심사 제출
□ Google Play 심사 제출
```

---

## 13. KBO 10개 구단 초기 데이터

```sql
INSERT INTO teams (name_ko, name_en, city, stadium_name) VALUES
('SSG 랜더스', 'SSG Landers', '인천', '인천 SSG 랜더스필드'),
('키움 히어로즈', 'Kiwoom Heroes', '서울', '고척 스카이돔'),
('LG 트윈스', 'LG Twins', '서울', '잠실 야구장'),
('KT 위즈', 'KT Wiz', '수원', '수원 KT 위즈파크'),
('KIA 타이거즈', 'KIA Tigers', '광주', '광주-기아 챔피언스 필드'),
('NC 다이노스', 'NC Dinos', '창원', '창원 NC 파크'),
('삼성 라이온즈', 'Samsung Lions', '대구', '대구 삼성 라이온즈 파크'),
('롯데 자이언츠', 'Lotte Giants', '부산', '사직 야구장'),
('두산 베어스', 'Doosan Bears', '서울', '잠실 야구장'),
('한화 이글스', 'Hanwha Eagles', '대전', '한화생명 이글스파크');
```

---

## 14. Claude Code 작업 지시 가이드

### 작업 순서 (권장)

```
1단계: homma 코드 분석
  → "homma 프로젝트 구조, 상태관리, 스타일링 방식을 분석해줘"

2단계: 코드 포크 + 텍스트 치환
  → "homma 코드를 dugout으로 포크하고, 모든 artist→team, member→player 치환해줘"

3단계: 컬러/테마 변경
  → "colors.ts를 dugout 라이트 모드 컬러 시스템으로 교체해줘" (이 문서 섹션 3 참고)

4단계: DB 마이그레이션
  → "Supabase에 dugout DB 스키마를 생성해줘" (이 문서 섹션 4 참고)

5단계: 커뮤니티 기능 개발
  → "커뮤니티 게시판을 구현해줘" (이 문서 섹션 10 + 프로토콜 섹션 6 참고)

6단계: 홈 피드 수정
  → "홈 피드에 커뮤니티 인기글을 5:1 비율로 혼합해줘" (이 문서 섹션 7.3 참고)

7단계: 나머지 기능
  → 스팸 방어, 알림, 공유, 온보딩 등 하나씩 지시
```

### 지시 시 팁

- 항상 **이 개발 스펙 문서 + 프로토콜**을 함께 제공
- 한 번에 너무 많은 작업 지시하지 말고 **기능 단위**로 나눠서
- 코드 생성 후 반드시 **타입 체크** (`tsc --noEmit`) 확인 요청
- 새 컴포넌트 생성 시 **기존 homma 컴포넌트 스타일**과 일관성 유지 요청

---

_dugout Dev Spec · Last updated: 2025.03.26_
_이 문서는 dugout 서비스 프로토콜 v2 FINAL과 함께 사용됩니다._
