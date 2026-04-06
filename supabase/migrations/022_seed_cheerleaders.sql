-- ============================================================
-- 022_seed_cheerleaders.sql
-- KBO 10개 구단별 치어리더 시드 데이터 (D-09)
-- ============================================================

INSERT INTO public.cheerleaders (team_id, name_ko, name_en, position, status)
SELECT t.id, v.name_ko, v.name_en, v.position, 'active'
FROM (VALUES
  ('ssg',     '박기량',   'Park Gi-ryang',   'leader'),
  ('kiwoom',  '안지현',   'Ahn Ji-hyun',     'leader'),
  ('lg',      '이나영',   'Lee Na-young',    'leader'),
  ('kt',      '이다혜',   'Lee Da-hye',      'leader'),
  ('kia',     '김하나',   'Kim Ha-na',       'leader'),
  ('nc',      '최윤지',   'Choi Yun-ji',     'leader'),
  ('samsung', '오정연',   'Oh Jeong-yeon',   'leader'),
  ('lotte',   '박성은',   'Park Seong-eun',  'leader'),
  ('doosan',  '정유나',   'Jeong Yu-na',     'leader'),
  ('hanwha',  '이수진',   'Lee Su-jin',      'leader')
) AS v(slug, name_ko, name_en, position)
JOIN public.teams t ON t.slug = v.slug;
