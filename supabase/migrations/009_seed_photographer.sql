-- ============================================================
-- 009_seed_photographer.sql
-- 포토그래퍼 초기 시드 데이터
-- ============================================================

-- 고정 UUID를 사용하여 FK 참조 가능하게
-- 포토그래퍼 (auth.users에는 더미 user 생성 불필요 — user_id는 실제 가입 사용자를 가리킴)

-- 시드용 auth.users (테스트 전용, 실 운영에서는 제거)
-- test@udamon.com = test-user-001, test2@udamon.com = test-user-002 는 이미 존재한다고 가정
-- pg1~pg5 에 대응하는 가짜 user_id는 직접 auth.users에 넣을 수 없으므로
-- 포토그래퍼 테이블에 user_id 없이 넣기 위해 FK를 일시적으로 제거하고 복구

-- ─── 헬퍼: team slug → uuid 조회 ──────────────────────────
-- 서브쿼리로 처리

-- ─── Photographers ────────────────────────────────────────
-- user_id를 임시로 NULL 허용 → 시드 후 복구할 수도 있지만
-- 대신 dummy auth users를 만들자

-- 더미 auth users (시드 전용)
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'pg1@seed.local', '{"display_name":"야구사진관"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000002', 'pg2@seed.local', '{"display_name":"다이아몬드렌즈"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000003', 'pg3@seed.local', '{"display_name":"마운드포토"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000004', 'pg4@seed.local', '{"display_name":"홈런캡처"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000005', 'pg5@seed.local', '{"display_name":"구장스케치"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- identities도 필요 (Supabase auth 내부 요구)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'email', '{"sub":"00000000-0000-0000-0000-000000000001","email":"pg1@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'email', '{"sub":"00000000-0000-0000-0000-000000000002","email":"pg2@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'email', '{"sub":"00000000-0000-0000-0000-000000000003","email":"pg3@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'email', '{"sub":"00000000-0000-0000-0000-000000000004","email":"pg4@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'email', '{"sub":"00000000-0000-0000-0000-000000000005","email":"pg5@seed.local"}', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 포토그래퍼 프로필 (post_count/follower_count는 트리거가 관리하므로 0으로 넣고 이후 sync)
INSERT INTO photographers (id, user_id, display_name, bio, avatar_url, cover_url, team_id, follower_count, post_count, is_verified)
VALUES
  ('a0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '야구사진관',
   'KBO 전 구단 직관 포토그래퍼. 잠실/사직 위주 활동.',
   NULL, NULL,
   (SELECT id FROM teams WHERE slug = 'lg'),
   0, 0, TRUE),

  ('a0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   '다이아몬드렌즈',
   '야구장의 감동을 사진으로 담습니다.',
   NULL, NULL,
   (SELECT id FROM teams WHERE slug = 'kia'),
   0, 0, TRUE),

  ('a0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   '마운드포토',
   '투수 전문 포토그래퍼. 불꽃 직구의 순간을 포착합니다.',
   NULL, NULL,
   (SELECT id FROM teams WHERE slug = 'ssg'),
   0, 0, FALSE),

  ('a0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000004',
   '홈런캡처',
   '타자의 스윙, 홈런의 순간을 담는 포토그래퍼.',
   NULL, NULL,
   (SELECT id FROM teams WHERE slug = 'doosan'),
   0, 0, FALSE),

  ('a0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000005',
   '구장스케치',
   '야구장 풍경과 팬 문화를 기록합니다.',
   NULL, NULL,
   NULL,
   0, 0, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ─── Photo Posts ──────────────────────────────────────────
-- 25개 게시물 (테스트 사용자 3개 제외 — 실제 로그인 사용자가 작성)
-- 트리거가 post_count를 자동 증가시킴

INSERT INTO photo_posts (id, photographer_id, team_id, player_id, title, description, images, like_count, comment_count, view_count, is_featured, created_at, updated_at)
VALUES
  -- SSG (pg3 = a...03)
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000003',
   (SELECT id FROM teams WHERE slug = 'ssg'),
   (SELECT id FROM players WHERE name_ko = '김광현' AND team_id = (SELECT id FROM teams WHERE slug = 'ssg') LIMIT 1),
   '김광현 역투 7이닝', '김광현 선수의 완벽한 7이닝 역투 장면',
   ARRAY['https://picsum.photos/seed/ssg_pitch/600/400'],
   120, 0, 850, TRUE,
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000003',
   (SELECT id FROM teams WHERE slug = 'ssg'),
   (SELECT id FROM players WHERE name_ko = '최정' AND team_id = (SELECT id FROM teams WHERE slug = 'ssg') LIMIT 1),
   '최정 400호 홈런!', '최정 선수의 역사적인 400호 홈런 순간',
   ARRAY['https://picsum.photos/seed/ssg_hr/600/400'],
   310, 0, 2100, TRUE,
   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),

  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000003',
   (SELECT id FROM teams WHERE slug = 'ssg'),
   NULL,
   '랜더스필드 석양', '경기 전 랜더스필드의 아름다운 석양',
   ARRAY['https://picsum.photos/seed/ssg_sunset/600/400'],
   85, 0, 420, FALSE,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- LG (pg1 = a...01)
  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000001',
   (SELECT id FROM teams WHERE slug = 'lg'),
   (SELECT id FROM players WHERE name_ko = '박해민' AND team_id = (SELECT id FROM teams WHERE slug = 'lg') LIMIT 1),
   '박해민 슈퍼캐치', '외야 펜스에 부딪히면서 잡아낸 슈퍼캐치',
   ARRAY['https://picsum.photos/seed/lg_catch/600/400'],
   180, 0, 1200, TRUE,
   NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),

  ('b0000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000001',
   (SELECT id FROM teams WHERE slug = 'lg'),
   (SELECT id FROM players WHERE name_ko = '임찬규' AND team_id = (SELECT id FROM teams WHERE slug = 'lg') LIMIT 1),
   '임찬규 불꽃 직구', '154km 불꽃 직구 순간 포착',
   ARRAY['https://picsum.photos/seed/lg_fastball/600/400'],
   95, 0, 680, FALSE,
   NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours'),

  ('b0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000001',
   (SELECT id FROM teams WHERE slug = 'lg'),
   NULL,
   '잠실 만원 관중', '잠실 야구장 만원 관중의 열기',
   ARRAY['https://picsum.photos/seed/lg_crowd/600/400'],
   150, 0, 900, TRUE,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000001',
   (SELECT id FROM teams WHERE slug = 'lg'),
   (SELECT id FROM players WHERE name_ko = '오지환' AND team_id = (SELECT id FROM teams WHERE slug = 'lg') LIMIT 1),
   '오지환 끝내기 안타', '9회 말 끝내기 안타로 승리를 이끈 오지환',
   ARRAY['https://picsum.photos/seed/lg_walk/600/400'],
   200, 0, 1500, TRUE,
   NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),

  -- 두산 (pg4 = a...04)
  ('b0000000-0000-0000-0000-000000000008',
   'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM teams WHERE slug = 'doosan'),
   (SELECT id FROM players WHERE name_ko = '양의지' AND team_id = (SELECT id FROM teams WHERE slug = 'doosan') LIMIT 1),
   '양의지 결승 홈런', '8회 양의지의 투런 홈런으로 역전',
   ARRAY['https://picsum.photos/seed/doo_hr/600/400'],
   140, 0, 950, TRUE,
   NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),

  ('b0000000-0000-0000-0000-000000000009',
   'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM teams WHERE slug = 'doosan'),
   (SELECT id FROM players WHERE name_ko = '양석환' AND team_id = (SELECT id FROM teams WHERE slug = 'doosan') LIMIT 1),
   '양석환 파워 스윙', '양석환의 풀스윙 포착',
   ARRAY['https://picsum.photos/seed/doo_swing/600/400'],
   75, 0, 520, FALSE,
   NOW() - INTERVAL '15 hours', NOW() - INTERVAL '15 hours'),

  ('b0000000-0000-0000-0000-000000000010',
   'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM teams WHERE slug = 'doosan'),
   NULL,
   '잠실 야경', '밤 경기 잠실의 아름다운 야경',
   ARRAY['https://picsum.photos/seed/doo_night/600/400'],
   60, 0, 350, FALSE,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- KIA (pg2 = a...02)
  ('b0000000-0000-0000-0000-000000000011',
   'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM teams WHERE slug = 'kia'),
   (SELECT id FROM players WHERE name_ko = '김도영' AND team_id = (SELECT id FROM teams WHERE slug = 'kia') LIMIT 1),
   '김도영 20-20 달성!', '김도영 선수 시즌 20홈런 20도루 달성',
   ARRAY['https://picsum.photos/seed/kia_2020/600/400'],
   280, 0, 1800, TRUE,
   NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

  ('b0000000-0000-0000-0000-000000000012',
   'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM teams WHERE slug = 'kia'),
   (SELECT id FROM players WHERE name_ko = '양현종' AND team_id = (SELECT id FROM teams WHERE slug = 'kia') LIMIT 1),
   '양현종 200승 도전', '양현종 선수의 통산 200승 도전기',
   ARRAY['https://picsum.photos/seed/kia_200w/600/400'],
   190, 0, 1300, TRUE,
   NOW() - INTERVAL '9 hours', NOW() - INTERVAL '9 hours'),

  ('b0000000-0000-0000-0000-000000000013',
   'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM teams WHERE slug = 'kia'),
   (SELECT id FROM players WHERE name_ko = '나성범' AND team_id = (SELECT id FROM teams WHERE slug = 'kia') LIMIT 1),
   '나성범 레이저빔', '나성범의 강력한 송구',
   ARRAY['https://picsum.photos/seed/kia_throw/600/400'],
   100, 0, 720, FALSE,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- KT (pg5 = a...05)
  ('b0000000-0000-0000-0000-000000000014',
   'a0000000-0000-0000-0000-000000000005',
   (SELECT id FROM teams WHERE slug = 'kt'),
   (SELECT id FROM players WHERE name_ko = '강백호' AND team_id = (SELECT id FROM teams WHERE slug = 'kt') LIMIT 1),
   '강백호 장외 홈런', '위즈파크 장외로 날린 폭풍 홈런',
   ARRAY['https://picsum.photos/seed/kt_bomb/600/400'],
   160, 0, 1100, TRUE,
   NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours'),

  ('b0000000-0000-0000-0000-000000000015',
   'a0000000-0000-0000-0000-000000000005',
   (SELECT id FROM teams WHERE slug = 'kt'),
   NULL,
   '위즈파크 전경', '드론으로 촬영한 위즈파크 전경',
   ARRAY['https://picsum.photos/seed/kt_aerial/600/400'],
   70, 0, 400, FALSE,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- 키움 (pg5 = a...05)
  ('b0000000-0000-0000-0000-000000000016',
   'a0000000-0000-0000-0000-000000000005',
   (SELECT id FROM teams WHERE slug = 'kiwoom'),
   (SELECT id FROM players WHERE name_ko = '안우진' AND team_id = (SELECT id FROM teams WHERE slug = 'kiwoom') LIMIT 1),
   '안우진 삼진쇼', '고척돔 안우진의 더블 디짓 삼진',
   ARRAY['https://picsum.photos/seed/kiw_k/600/400'],
   130, 0, 860, TRUE,
   NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours'),

  ('b0000000-0000-0000-0000-000000000017',
   'a0000000-0000-0000-0000-000000000005',
   (SELECT id FROM teams WHERE slug = 'kiwoom'),
   NULL,
   '고척돔 응원', '고척돔 열정 가득한 응원 장면',
   ARRAY['https://picsum.photos/seed/kiw_fans/600/400'],
   50, 0, 280, FALSE,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

  -- NC (pg2 = a...02)
  ('b0000000-0000-0000-0000-000000000018',
   'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM teams WHERE slug = 'nc'),
   (SELECT id FROM players WHERE name_ko = '박건우' AND team_id = (SELECT id FROM teams WHERE slug = 'nc') LIMIT 1),
   '박건우 호수비', 'NC파크에서 보여준 파인 플레이',
   ARRAY['https://picsum.photos/seed/nc_defense/600/400'],
   90, 0, 640, FALSE,
   NOW() - INTERVAL '14 hours', NOW() - INTERVAL '14 hours'),

  ('b0000000-0000-0000-0000-000000000019',
   'a0000000-0000-0000-0000-000000000002',
   (SELECT id FROM teams WHERE slug = 'nc'),
   NULL,
   'NC파크 야경', '창원 NC파크의 아름다운 야경',
   ARRAY['https://picsum.photos/seed/nc_night/600/400'],
   65, 0, 380, FALSE,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- 삼성 (pg1 = a...01)
  ('b0000000-0000-0000-0000-000000000020',
   'a0000000-0000-0000-0000-000000000001',
   (SELECT id FROM teams WHERE slug = 'samsung'),
   (SELECT id FROM players WHERE name_ko = '구자욱' AND team_id = (SELECT id FROM teams WHERE slug = 'samsung') LIMIT 1),
   '구자욱 연타석 홈런', '구자욱의 2경기 연속 홈런',
   ARRAY['https://picsum.photos/seed/sam_hr/600/400'],
   110, 0, 750, TRUE,
   NOW() - INTERVAL '11 hours', NOW() - INTERVAL '11 hours'),

  ('b0000000-0000-0000-0000-000000000021',
   'a0000000-0000-0000-0000-000000000001',
   (SELECT id FROM teams WHERE slug = 'samsung'),
   NULL,
   '라이온즈파크 치어리더', '삼성 치어리더 공연 장면',
   ARRAY['https://picsum.photos/seed/sam_cheer/600/400'],
   80, 0, 450, FALSE,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- 롯데 (pg4 = a...04)
  ('b0000000-0000-0000-0000-000000000022',
   'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM teams WHERE slug = 'lotte'),
   (SELECT id FROM players WHERE name_ko = '전준우' AND team_id = (SELECT id FROM teams WHERE slug = 'lotte') LIMIT 1),
   '전준우 결승타', '사직에서 터진 전준우의 결승타',
   ARRAY['https://picsum.photos/seed/lot_hit/600/400'],
   95, 0, 630, FALSE,
   NOW() - INTERVAL '16 hours', NOW() - INTERVAL '16 hours'),

  ('b0000000-0000-0000-0000-000000000023',
   'a0000000-0000-0000-0000-000000000004',
   (SELECT id FROM teams WHERE slug = 'lotte'),
   NULL,
   '사직구장 불꽃놀이', '경기 후 사직구장 불꽃놀이',
   ARRAY['https://picsum.photos/seed/lot_fire/600/400'],
   170, 0, 1050, TRUE,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  -- 한화 (pg3 = a...03)
  ('b0000000-0000-0000-0000-000000000024',
   'a0000000-0000-0000-0000-000000000003',
   (SELECT id FROM teams WHERE slug = 'hanwha'),
   (SELECT id FROM players WHERE name_ko = '문동주' AND team_id = (SELECT id FROM teams WHERE slug = 'hanwha') LIMIT 1),
   '문동주 데뷔 완봉승', '문동주의 감동적인 데뷔 완봉승 장면',
   ARRAY['https://picsum.photos/seed/han_moon/600/400'],
   250, 0, 1700, TRUE,
   NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),

  ('b0000000-0000-0000-0000-000000000025',
   'a0000000-0000-0000-0000-000000000003',
   (SELECT id FROM teams WHERE slug = 'hanwha'),
   (SELECT id FROM players WHERE name_ko = '노시환' AND team_id = (SELECT id FROM teams WHERE slug = 'hanwha') LIMIT 1),
   '노시환 3점 홈런', '역전 3점 홈런을 터뜨린 노시환',
   ARRAY['https://picsum.photos/seed/han_hr/600/400'],
   105, 0, 700, FALSE,
   NOW() - INTERVAL '18 hours', NOW() - INTERVAL '18 hours')
ON CONFLICT (id) DO NOTHING;

-- ─── Comments ─────────────────────────────────────────────
-- 댓글 user_id도 시드 auth user 필요 → 더미 일반 유저
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'fan1@seed.local', '{"display_name":"야구팬92"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000102', 'fan2@seed.local', '{"display_name":"랜더스사랑"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000103', 'fan3@seed.local', '{"display_name":"SSG직관러"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000104', 'fan4@seed.local', '{"display_name":"최정레전드"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000105', 'fan5@seed.local', '{"display_name":"야구사진가"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000106', 'fan6@seed.local', '{"display_name":"석양헌터"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000107', 'fan7@seed.local', '{"display_name":"타이거즈팬"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000108', 'fan8@seed.local', '{"display_name":"KIA팬클럽"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-000000000109', 'fan9@seed.local', '{"display_name":"두산베어스"}', NOW(), NOW(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', 'email', '{"sub":"00000000-0000-0000-0000-000000000101","email":"fan1@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', 'email', '{"sub":"00000000-0000-0000-0000-000000000102","email":"fan2@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000103', 'email', '{"sub":"00000000-0000-0000-0000-000000000103","email":"fan3@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000104', 'email', '{"sub":"00000000-0000-0000-0000-000000000104","email":"fan4@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000105', 'email', '{"sub":"00000000-0000-0000-0000-000000000105","email":"fan5@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000106', 'email', '{"sub":"00000000-0000-0000-0000-000000000106","email":"fan6@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000107', 'email', '{"sub":"00000000-0000-0000-0000-000000000107","email":"fan7@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000108', 'email', '{"sub":"00000000-0000-0000-0000-000000000108","email":"fan8@seed.local"}', NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000109', 'email', '{"sub":"00000000-0000-0000-0000-000000000109","email":"fan9@seed.local"}', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO photo_comments (id, post_id, user_id, user_name, text, parent_id, like_count, is_deleted)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', '야구팬92', '역투 멋지네요! 사진 퀄리티 최고', NULL, 5, FALSE),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102', '랜더스사랑', '광현이형 화이팅!', NULL, 3, FALSE),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000103', 'SSG직관러', '저도 이날 직관했는데 정말 대단했어요', 'c0000000-0000-0000-0000-000000000001', 1, FALSE),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000104', '최정레전드', '400호 홈런 역사적인 순간을 이렇게 담다니', NULL, 12, FALSE),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000105', '야구사진가', '타격 순간 포착이 완벽해요', NULL, 8, FALSE),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', '야구팬92', '진짜 소름돋았어요 그날', 'c0000000-0000-0000-0000-000000000004', 2, FALSE),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000106', '석양헌터', '랜더스필드 석양은 진짜 예술이죠', NULL, 4, FALSE),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000107', '타이거즈팬', '양현종 선수 폼 진짜 좋아보여요', NULL, 6, FALSE),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000108', 'KIA팬클럽', '포수 프레이밍 사진 처음 봐요 대박', NULL, 3, FALSE),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000109', '두산베어스', '구장 분위기 살아있네요!', NULL, 7, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ─── Collections ──────────────────────────────────────────
INSERT INTO photo_collections (id, photographer_id, name, emoji)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '명장면 모음', '🔥'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '경기장 풍경', '🏟'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', '선수 포커스', '📸')
ON CONFLICT (id) DO NOTHING;

-- 컬렉션 ↔ 게시물
INSERT INTO photo_collection_posts (collection_id, post_id)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004'),
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000006'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000011'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000012'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000013')
ON CONFLICT DO NOTHING;

-- ─── Timeline Events ──────────────────────────────────────
INSERT INTO timeline_events (id, title, event_type, date, location, description, post_count, thumbnail_url)
VALUES
  ('e0000000-0000-0000-0000-000000000001', '2026 KBO 정규시즌 개막전', 'regular_season', '2026-03-28', '잠실 야구장', '2026 시즌 개막전, LG vs 두산 잠실 더비', 12, 'https://picsum.photos/seed/ev_open/600/400'),
  ('e0000000-0000-0000-0000-000000000002', '2025 KBO 한국시리즈', 'postseason', '2025-10-21', '광주-기아 챔피언스 필드', 'KIA 타이거즈 vs 삼성 라이온즈 한국시리즈', 28, 'https://picsum.photos/seed/ev_ks/600/400'),
  ('e0000000-0000-0000-0000-000000000003', '2026 KBO 올스타전', 'allstar', '2026-07-11', '대전 한화생명 이글스파크', 'KBO 올스타전, 나눔 드림 vs 나눔 위시', 8, 'https://picsum.photos/seed/ev_all/600/400'),
  ('e0000000-0000-0000-0000-000000000004', '2026 스프링캠프', 'spring_camp', '2026-02-01', '오키나와 / 미야자키', '2026 시즌 해외 스프링캠프', 15, 'https://picsum.photos/seed/ev_camp/600/400'),
  ('e0000000-0000-0000-0000-000000000005', 'SSG 팬페스티벌 2026', 'fan_meeting', '2026-01-17', '인천 SSG 랜더스필드', 'SSG 랜더스 팬 감사 이벤트', 6, 'https://picsum.photos/seed/ev_fan/600/400')
ON CONFLICT (id) DO NOTHING;

-- 이벤트 ↔ 팀
INSERT INTO timeline_event_teams (event_id, team_id)
VALUES
  ('e0000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE slug = 'lg')),
  ('e0000000-0000-0000-0000-000000000001', (SELECT id FROM teams WHERE slug = 'doosan')),
  ('e0000000-0000-0000-0000-000000000002', (SELECT id FROM teams WHERE slug = 'kia')),
  ('e0000000-0000-0000-0000-000000000002', (SELECT id FROM teams WHERE slug = 'samsung')),
  ('e0000000-0000-0000-0000-000000000004', (SELECT id FROM teams WHERE slug = 'ssg')),
  ('e0000000-0000-0000-0000-000000000004', (SELECT id FROM teams WHERE slug = 'kia')),
  ('e0000000-0000-0000-0000-000000000004', (SELECT id FROM teams WHERE slug = 'lg')),
  ('e0000000-0000-0000-0000-000000000005', (SELECT id FROM teams WHERE slug = 'ssg'))
ON CONFLICT DO NOTHING;

-- ─── comment_count 동기화 ─────────────────────────────────
-- 트리거가 INSERT 시 증가시키므로 이미 반영됨
-- 하지만 like_count는 직접 설정했으므로 동기화 불필요

-- ─── follower_count 수동 보정 (시드 데이터에 맞춤) ────────
-- 시드에는 팔로우 레코드가 없으므로 follower_count는 0 유지
-- 실제 사용자가 팔로우하면 트리거가 자동 증가시킴
