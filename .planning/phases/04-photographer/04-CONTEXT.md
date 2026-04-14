# Phase 4: Photographer - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

팬 포토그래퍼가 사진/영상을 업로드하고, 심사를 받고, 등급에 따라 활동할 수 있는 완성된 갤러리 시스템. Phase 1의 `photographer_applications`, DB-10 (photo_posts.status) + DB-11 (cheerleader_id) 스키마, Phase 2의 `public.users` + `AuthContext`, Phase 3의 R2 업로드 인프라와 `photographerApi.ts` 부분 연동을 기반으로, `PhotographerContext`를 mock 데이터에서 Supabase로 **완전 전환**하고 **영상 · 심사 · 썸네일 · 등급** 기능을 신규 구현.

**포함:**
- Mock 제거 및 Supabase 전용 전환 (photographers, photo_posts, photo_comments, photo_likes, photo_collections, photographer_follows, players, cheerleaders, timeline_events)
- 영상 업로드 + 재생 (videos TEXT[] 컬럼 신설, 최대 3개, 30초/50MB 제약, R2 photo-posts prefix)
- 심사 프로세스 (photographer_applications 신청 → 어드민 승인/거절 → photographers row 자동 생성 트리거)
- 이미지 리사이징 + 썸네일 Edge Function (`generate-thumbnails`) + `thumbnail_urls` 컬럼
- 포토그래퍼 등급 계산 (클라이언트: `post_count + floor(follower_count / 10)`) + 구간별 배지
- 치어리더 태깅 DB fetch
- 컬렉션 관리 Supabase 연동 정리 (Phase 3 await 패턴)
- 기존 버그 수정 (togglePhotoLike/toggleFollow 빈 `''` userId 버그)

**미포함:**
- 어드민 웹 포토그래퍼 관리 UI (Phase 5)
- 어드민 웹 심사 승인/거절 화면 (Phase 5)
- 인앱 알림 시스템 (Phase 6 — notifications 테이블 기반 알림은 Phase 6에서 조립; Phase 4는 INSERT만)
- FCM 푸시 알림 (Phase 6)
- 기존 게시물 썸네일 백필 (후속 이슈, Phase 4 범위 밖)
- Cloudflare Image Resizing (대체 전략)

</domain>

<decisions>
## Implementation Decisions

### 영상 업로드 & 스키마

- **D-01:** **`photo_posts.videos TEXT[]` 컬럼 분리.** 신규 마이그레이션 `029_photo_posts_videos.sql` — `ALTER TABLE photo_posts ADD COLUMN videos TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(videos, 1) IS NULL OR array_length(videos, 1) BETWEEN 1 AND 3)`. `images` CHECK 제약은 `1~7` 로 조정 (기존 `1~10` → `1~7`). images는 최소 1장 유지 (게시물은 사진이 메인, 영상은 보조). 렌더링 시 type 명확, 기존 쿼리 상전 유지.
- **D-02:** **R2 prefix는 `photo-posts` 그대로 유지.** 영상도 `photo-posts/{userId}/{key}.mp4` 로 저장. `get-upload-url` Edge Function은 현재 `photo-posts`/`community-posts`/`avatars` 3종 허용 — prefix 추가 없이 contentType 검증만 확장 (`video/mp4` 허용). Edge Function 수정 최소화.
- **D-03:** **영상 제약: 30초 이하 + 50MB 이하, `video/mp4` 고정.** 클라이언트 `expo-image-picker` 가 반환하는 asset의 `duration`, `fileSize` 메타 확인 후 초과 시 Alert로 차단 (업로드 전). `get-upload-url` Edge Function에서도 2차 검증 (count + contentType). v1 엄격 제약 → R2 비용/재생 UX 안정.
- **D-04:** **업로드 순서는 이미지 → 영상 → photo_posts INSERT (순차, Phase 3 D-09 확장).** `UploadPostScreen.doPublish` 흐름: ① `uploadPostImages(userId, optimizedImages, token)` 성공 대기 ② `uploadPostVideos(userId, localVideos, token, 'video/mp4')` 성공 대기 ③ `createPhotoPost({ images, videos, ... })` INSERT. 실패 시 Alert + 폼 retain (Phase 3 D-18 패턴). 고아 파일은 방치 (Phase 3 D-09 deferred).
- **D-05:** **createPhotoPost 시그니처에 `videos` 파라미터 추가.** `photographerApi.createPhotoPost` 에 `videos: string[]` 추가, `mapPhotoPost` 에서 `row.videos ?? []` 매핑. `PhotoPost` 타입에 `videos: string[]` 필드 추가 (`app/src/types/photographer.ts`).

### 심사 프로세스 (photographer_applications)

- **D-06:** **신청 제출 시 `photographer_applications` INSERT만, `photographers` row는 승인 시 DB 트리거로 자동 생성.** 신규 마이그레이션 `030_photographer_approval_trigger.sql` — `AFTER UPDATE OF status ON photographer_applications WHEN NEW.status = 'approved' AND OLD.status != 'approved'` 트리거 → `photographers` INSERT (`user_id`, `display_name` from users.nickname, `team_id` from applications.team_id 또는 users.my_team_id, default `is_verified = FALSE`) + `UPDATE public.users SET role = 'photographer' WHERE id = NEW.user_id`. **근거:** 심사 미승인 사용자는 photographers row가 아예 없으므로 RLS `posts_insert_own` (photographers 존재 체크) 가 업로드를 자연스럽게 차단. 권한 로직 단순.
- **D-07:** **신청 시 applications에 필요한 필드 정리.** 현재 `016_photographer_apps.sql` 스키마: `user_id`, `portfolio_url`, `bio`, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`. 추가 필요: `team_id UUID REFERENCES teams(id)` (신청자가 대표 팀 지정), `activity_links TEXT[]` (현재 PhotographerRegisterScreen의 activityLinks 수용, MAX 3), `activity_plan TEXT` (현재 activityPlan state). 마이그레이션 `031_photographer_apps_extend.sql` 에 ALTER.
- **D-08:** **기존 `activatePhotographerMode()` 흐름 교체.** `PhotographerRegisterScreen` 단계:
  - Step 1: 팀 선택 + 활동 링크 + 활동 계획 (기존 유지)
  - Step 2: 약관 + 저작권 정책 동의 (기존 유지)
  - Step 3: 저작권 확인 (기존 유지)
  - Step 4: **신청 완료 화면 — "심사 대기 중" 메시지 + 예상 시간 안내** (기존 "등록 완료" → "신청 접수" 로 문구 변경). `activatePhotographerMode` 제거, 대신 `submitPhotographerApplication({ user_id, team_id, activity_links, activity_plan, portfolio_url: null, bio: '' })` 호출.
  - `users.role` 은 승인 트리거에서 `user` → `photographer` 로 DB가 업데이트. 클라이언트 `AuthContext.user` 는 다음 session refresh 시 반영.
- **D-09:** **심사중(pending) 상태에서는 photographers 없음 → 프로필/글쓰기 미노출.** Studio 탭 진입 시 `fetchMyPhotographerApplication(userId)` 로 상태 확인: 신청 없음 → 가입 유도 / pending → "심사 대기 중" 페이지 / approved → 기존 Studio / rejected → "거절됨" + `rejection_reason` + 재신청 버튼. MainTabNavigator에서 Studio 탭 레이블/아이콘 분기 필요.
- **D-10:** **승인된 포토그래퍼의 게시물은 업로드 즉시 `status='approved'`.** DB-10 의 `photo_posts.status` DEFAULT 'approved' 유지. 어드민 수동 `rejected` 처리는 Phase 5. pending 상태 게시물은 현재 Phase에서는 발생하지 않음 (이후 관리자 수동 '블라인드 처리' 시 관리자가 `rejected` 로 전환).
- **D-11:** **심사 결과 알림은 `notifications` 테이블 in-app 알림만.** `photographer_applications` 상태 변경 트리거(D-06 확장) 에서 `notifications` INSERT:
  - approved: `type='photographer_approved'`, title="포토그래퍼 신청이 승인되었습니다", body="지금부터 사진을 업로드할 수 있어요"
  - rejected: `type='photographer_rejected'`, title="포토그래퍼 신청이 거절되었습니다", body=rejection_reason 또는 기본 문구
  - `data: { application_id: UUID }` 저장.
  - Phase 4에서는 **INSERT만** 수행, UI 소비는 Phase 6 NotificationContext 작업. Phase 6 전에도 Studio 진입 시 상태 직접 조회로 사용자 확인 가능.
  - Supabase Auth 이메일 / FCM 푸시는 v1 범위 밖 (Phase 6 Firebase 블로커).

### 이미지 리사이징 & 썸네일

- **D-12:** **신규 Edge Function `generate-thumbnails` + `photo_posts.thumbnail_urls TEXT[]` 컬럼.** 마이그레이션 `032_photo_posts_thumbnails.sql` — `ALTER TABLE photo_posts ADD COLUMN thumbnail_urls TEXT[] NOT NULL DEFAULT '{}'`. thumbnail_urls 배열의 order는 images 배열과 1:1 대응 (index 매칭). 영상에는 썸네일 생성 안 함 (v1).
- **D-13:** **썸네일 단일 사이즈 400×400 (cover crop), JPEG.** 피드 카드와 갤러리 그리드 공용. v1 storage 정리 최소화. 다중 사이즈(200/400/800)는 v2 deferred.
- **D-14:** **Edge Function 기동 방식은 클라이언트 fire-and-forget 호출.**
  - 흐름: `UploadPostScreen` → `uploadPostImages` 성공 → `createPhotoPost` 성공(post id 획득) → `fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnails`, { body: { postId, imageUrls } })` 비동기 호출 (await 없음, `.catch(() => {})`). → Edge Function 내부에서 R2 다운로드 → resize (imagescript-wasm or sharp-wasm) → R2 업로드 (`${key}_thumb.jpg`) → `UPDATE photo_posts SET thumbnail_urls = ... WHERE id = postId`.
  - 클라이언트는 업로드 완료 즉시 성공 UI 표시, 썸네일은 다음 feed refresh에 반영.
  - Edge Function은 이미지에만 적용 (videos는 무시).
  - **근거:** 서버 생성 = 신뢰 가능 단일 경로 + 클라이언트 CPU 부담 없음 + pg_net/trigger 경로 대비 관찰성 높음.
- **D-15:** **적용 범위는 Phase 4 신규 게시물만.** 기존 photo_posts는 `thumbnail_urls = '{}'`. 렌더링 시 fallback: `thumbnail_urls.length > 0 ? thumbnail_urls[0] : images[0]`. 기존 데이터 백필은 후속 이슈 (deferred). Phase 4 범위 통제, 위험 최소.
- **D-16:** **영상 썸네일(프레임 캡처)은 v1 범위 밖.** 갤러리/피드에서 영상 아이템은 `<Video>` 컴포넌트의 `posterSource` 없이 아이콘 오버레이(▶)로 표시 또는 첫 프레임 preload. 정식 영상 썸네일은 v2 deferred.

### 등급 계산 & UI

- **D-17:** **등급은 클라이언트에서 계산.** `photographerApi.ts` 에서 `mapPhotographer` 에 `grade = post_count + Math.floor(follower_count / 10)` 필드 추가. 신규 유틸 `app/src/utils/photographerGrade.ts` (`calculateGrade(postCount, followerCount): number`, `gradeToBadge(grade): { tier: 'bronze'|'silver'|'gold'|'diamond'; label: string; color: string; icon: string }`). DB 스키마 변경 불필요, 공식 변경 시 클라이언트만 수정.
- **D-18:** **등급 구간별 배지 표시.** 임계값 (초안, planner가 최종 조정 가능):
  - 0~4: 브론즈 (동메달 아이콘)
  - 5~19: 실버 (은메달)
  - 20~49: 골드 (금메달)
  - 50+: 다이아 (다이아몬드)
  - 표시 위치: PhotographerProfileScreen 헤더 (display_name 옆), Studio 상단, `PhotographerCard` 컴포넌트. 피드 카드에는 아이콘만, 프로필에는 아이콘 + 라벨.
  - 네이밍/임계값 세부는 planner 재량 (is_verified 는 별도 뱃지로 공존).

### Mock 제거 & Context 리팩토링

- **D-19:** **`PhotographerContext.tsx` 를 Phase 3 D-16 패턴 그대로 일괄 Supabase 전환.** `MOCK_PHOTOGRAPHERS`, `MOCK_PHOTO_POSTS`, `MOCK_PLAYERS`, `MOCK_EVENTS`, `MOCK_COLLECTIONS`, `MOCK_PHOTO_COMMENTS`, `MOCK_CHEERLEADERS` import 모두 제거. `isRemote`/`isRemoteRef`/merge 로직 제거. 초기 state는 빈 배열 + `loading=true`. `app/src/data/mockPhotographers.ts`, `mockCheerleaders.ts` 는 _legacy/ 이동 또는 삭제 (Phase 3 mockCommunity.ts 정리 방침과 동일).
- **D-20:** **치어리더는 `cheerleaders` DB fetch로 전환.** Phase 1 D-07 `cheerleaders` 테이블 + 022 시드 + 023 RLS 이미 완비. `photographerApi.ts` 에 `fetchCheerleaders()` 추가 → `ApiResult<Cheerleader[]>`. `Cheerleader` 타입은 `app/src/types/cheerleader.ts` 참조 (필드 재검증 필요).
- **D-21:** **컬렉션 optimistic 제거, Phase 3 await 패턴으로 통일.** 현재 Context `createCollection` / `addPostToCollection` 등은 optimistic + fire-and-forget. Phase 3 D-10 방향(좋아요만 optimistic)에 맞춰 컬렉션 조작은 `await` 후 refresh. 좋아요/팔로우는 optimistic + rollback 유지 (photo_likes 트리거가 count 자동 증감하므로 예측값과 서버값 최종 일치).
- **D-22:** **기존 버그 `togglePhotoLike('', 'post', postId)` / `toggleFollow('', pgId)` 빈 userId 버그 수정.** 시그니처 변경: 호출 시 `useAuth()` 에서 `user.id` 주입. `photographerApi.togglePhotoLike(userId, targetType, targetId)` 그대로 유지, Context 내부에서 `user.id` 전달. 로그인하지 않은 사용자는 `useLoginGate()` 로 가드 (Phase 2 D-03, Phase 3 D-20 패턴). `fetchUserPhotoLikes(userId)`, `fetchUserFollows(userId)` 초기 로드로 `photoLikedIds`/`followedPgIds` 복원.
- **D-23:** **페이지네이션은 Phase 3 D-05 패턴(`.range`, 20개).** `fetchPhotoPosts` 에 `teamId?`, `page?` 파라미터 추가, `PhotographerContext.getPhotoPostsByTeam` 이 서버 fetch + concat. 갤러리/피드 onEndReached에서 다음 page 호출. 컬렉션/프로필 탭 내부 목록은 서버 fetch 분기 (컬렉션 post_id 배열 → posts fetch).

### Claude's Discretion

- `videos TEXT[]` 마이그레이션 정확한 번호와 파일명 구성 (029~032는 초안, 순서/패킹 planner 재량)
- Edge Function `generate-thumbnails` 구체 구현 선택 (imagescript vs sharp-wasm — 성능/용량 트레이드오프)
- Edge Function 내부 에러 재시도 정책 (1회 재시도, 지수 백오프 등 — 기본은 한 번 실패 시 그대로 둠)
- 등급 임계값 세부 조정 (0-4/5-19/20-49/50+ 는 초안, PRD 가이드 없음)
- 등급 배지 아이콘 선택 (Ionicons / 커스텀 SVG)
- `photographer_applications` RLS 추가 수정 필요 여부 (현재 023: 본인 조회 + 어드민 읽기·수정) — 거절 사유 조회 시 추가 고려
- pending/approved 상태 Studio 화면 분기 UI 세부 디자인
- `UploadPostScreen` 영상 편집/미리보기 UX (ImageEditorModal 영상 미지원 — 생략 or 영상은 편집 없이 바로 업로드)
- `expo-av` vs `expo-video` 결정 (SDK 54 권장은 expo-video이나 현재 설치 라이브러리 확인 + planner 판단)
- 비디오 재생 자동재생 정책 (피드 auto-play/muted, 상세 탭 후 재생)
- 비디오 로딩/에러 상태 UI
- 썸네일 R2 key 명명 규칙 (`${key}_thumb.jpg` 초안)
- `mockPhotographers.ts` / `mockCheerleaders.ts` 제거 vs `_legacy/` 이동 결정
- 페이지네이션 스크롤 위치 보존 전략

### Folded Todos

None — `gsd-tools todo match-phase 4` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap

- `.planning/REQUIREMENTS.md` §Photographer — PHOT-01~PHOT-08 요구사항 상세
- `.planning/ROADMAP.md` §Phase 4 — Goal, Success Criteria (4가지 PASS 조건), Dependencies (Phase 2)
- `.planning/PROJECT.md` — Validated (Photographer API 서비스 레이어 존재), Active Requirements, Key Decisions (영상은 포토그래퍼만, 어드민 수동)
- `docs/PRD_v1.md` §3.1.3 포토그래퍼 (이미지 7 + 영상 3, 등급 공식, 심사 프로세스) · §3.1.5 이미지/미디어 처리 (리사이징, 썸네일, 영상)
- `.planning/phases/01-database-foundation-security/01-CONTEXT.md` — D-01, D-02, D-10 (users 테이블, 권한 모델)
- `.planning/phases/02-authentication/02-CONTEXT.md` — D-05~D-07 (프로필 온보딩 — PhotographerRegister 흐름과 분리)
- `.planning/phases/03-community/03-CONTEXT.md` — D-01 (service 패턴), D-09 (R2-first 업로드), D-10 (optimistic 좋아요만), D-16~D-18 (Context 일괄 전환, 로딩/에러 UI)

### Database Schema (포토그래퍼 핵심)

- `supabase/migrations/007_photographer.sql` — photographers, photo_posts, photo_likes, photographer_follows, photo_comments, photo_collections, photo_collection_posts, timeline_events 정의 + 트리거 (`update_photographer_post_count`, `update_photographer_follower_count`, `update_like_count`, `update_post_comment_count`)
- `supabase/migrations/008_photographer_rls.sql` — 포토그래퍼 RLS 정책 (pg_insert_own, posts_insert_own이 photographers EXISTS 체크 → D-06 근거)
- `supabase/migrations/009_seed_photographer.sql` — 포토그래퍼 시드
- `supabase/migrations/016_photographer_apps.sql` — photographer_applications 스키마 (D-07 ALTER 대상)
- `supabase/migrations/017_cheerleaders.sql` — cheerleaders 테이블 (D-20 fetch 대상)
- `supabase/migrations/020_photo_posts_alter.sql` — photo_posts.status / rejection_reason / cheerleader_id (DB-10, DB-11)
- `supabase/migrations/022_seed_cheerleaders.sql` — 치어리더 시드 데이터
- `supabase/migrations/023_rls_policies_remaining.sql` — photographer_applications RLS (61~73), cheerleaders RLS (78~85)

### Existing Services & Code (전환 대상 & 참조)

- `app/src/services/photographerApi.ts` — **부분 구현.** 서비스 레이어 이미 CRUD 함수 존재 (fetchPhotographers, fetchPhotoPosts, createPhotoPost 등). 추가할 함수: `submitPhotographerApplication`, `fetchMyPhotographerApplication`, `fetchCheerleaders`. 시그니처 수정: `createPhotoPost` 에 `videos` 추가, `togglePhotoLike`/`toggleFollow` 에 `userId` 필수. 페이지네이션 파라미터(D-23).
- `app/src/services/r2Upload.ts` — `uploadPostVideos` 이미 존재 (90~116), `uploadPostImages` 이미지 전용. Edge Function 호출 패턴 `getPresignedUrls`.
- `supabase/functions/get-upload-url/index.ts` — R2 presigned URL 생성. D-02 에서 `video/mp4` contentType 허용 확장. 기존 prefix 3종 유지.
- `app/src/contexts/PhotographerContext.tsx` — **전환 대상.** mock + merge 로직 전면 제거, isRemote/isRemoteRef 삭제. Supabase 전용으로 재작성. PhotoComment/PgCollection 타입 정의는 Context 내부 → 필요 시 types/ 로 이동.
- `app/src/types/photographer.ts` — `Photographer`, `PhotoPost`, `Player`, `TimelineEvent`, `HomeFeedItem`. `PhotoPost` 에 `videos: string[]`, `thumbnail_urls: string[]`, `grade: number` 등 필드 추가.
- `app/src/types/cheerleader.ts` — `Cheerleader` 타입 (D-20 DB row 매핑 기준, 필드 재검증 필요)
- `app/src/data/mockPhotographers.ts` — **제거 대상.**
- `app/src/data/mockCheerleaders.ts` — **제거 대상.**
- `app/src/utils/image.ts` — `optimizeImage` 클라이언트 리사이저 (유지, 영상에는 적용 안 함)

### 화면 (연동 대상)

- `app/src/screens/photographer/PhotographerRegisterScreen.tsx` — **재설계.** Step 4를 "심사 대기중" 으로, activatePhotographerMode 교체 (D-08).
- `app/src/screens/photographer/UploadPostScreen.tsx` — **확장.** videos state 이미 존재(63), handleAddVideo 이미 존재(112). R2 영상 업로드 추가, doPublish 흐름에 비디오 upload 단계 추가 (D-04). 파일 제약 체크 (D-03).
- `app/src/screens/photographer/StudioScreen.tsx` — **분기.** 심사 상태별 UI (D-09). 등급 배지 헤더 노출 (D-18).
- `app/src/screens/photographer/PhotographerProfileScreen.tsx` — 등급 배지 display_name 옆 노출, videos 렌더링.
- `app/src/screens/photographer/CollectionDetailScreen.tsx` — 컬렉션 fetch 전환 (D-21).
- `app/src/screens/photographer/RevenueManagementScreen.tsx` — v1 UI만 유지 (PRD §3.1.7 "수익 관리 UI만").

### 컴포넌트 (신규/확장)

- 신규: `app/src/components/photographer/GradeBadge.tsx` — D-17/D-18 배지 컴포넌트
- 신규: `app/src/components/common/VideoPlayer.tsx` — D-16 영상 재생 래퍼 (expo-av 또는 expo-video)
- `app/src/components/photographer/AwardsList.tsx` 등 기존 유지
- `app/src/components/common/ImageEditorModal.tsx` — 영상에는 적용 안 함 (Claude's Discretion)

### Edge Functions

- `supabase/functions/get-upload-url/index.ts` — **수정.** `video/mp4` contentType 허용 (D-02).
- **신규:** `supabase/functions/generate-thumbnails/index.ts` — D-12~D-14. 입력: `{ postId, imageUrls: string[] }`. 출력: `{ thumbnailUrls: string[] }`. R2 read/write + photo_posts UPDATE.

### Notifications (Phase 6 대기)

- `supabase/migrations/013_notifications.sql` — notifications 테이블 스키마. Phase 4는 INSERT만, 소비는 Phase 6.
- D-11 의 type 값 (`photographer_approved`, `photographer_rejected`) 은 Phase 6 NotificationContext에서 파싱 대상으로 인지.

### Requirements Gate (Phase 5 대기)

- 어드민 심사 UI, 포토그래퍼 관리, 신고 관리 등 PHOT 관련 어드민 기능은 Phase 5 Admin 에서 구축. Phase 4는 DB 트리거 + 신청 API + 신청자 UX까지 완결.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`photographerApi.ts` CRUD 기본**: fetchPhotographers, fetchPhotoPosts, createPhotoPost, deletePhotoPost, togglePhotoLike, toggleFollow, createComment, deleteComment, createCollection, deleteCollection, addPostToCollection, removePostFromCollection, fetchCheerleaders(D-20 신규), fetchUserPhotoLikes, fetchUserFollows — Phase 4는 주로 호출부 수정 + 누락 함수 추가.
- **`uploadPostVideos` (r2Upload.ts)**: 이미 존재 (line 90~116), `photo-posts` prefix 사용, contentType 파라미터 기본 `video/mp4`. D-04 에서 그대로 호출.
- **`ensureSlugMaps` / `teamUuidToSlug` / `teamSlugToUuid`**: photographerApi 내부 헬퍼. Phase 3 대비 공유 helper 추출은 여전히 planner 재량.
- **`UploadPostScreen.videos` state + handleAddVideo**: 이미 mediaTypes 'videos' 지원, selectionLimit 로직 있음 (41, 63, 112~127). 파일 크기/길이 체크 로직 추가만 필요.
- **`expo-image-picker` 영상 메타**: `result.assets[0].duration`, `result.assets[0].fileSize`, `result.assets[0].uri` — D-03 클라이언트 검증에 그대로 사용.
- **`photographers` 자동 카운트 트리거**: post_count, follower_count는 DB 트리거로 자동 증감 — 등급 계산 최신성 보장.
- **`useLoginGate`, `useAuth`, `useToast`, `ToastContext`, `Alert`, `Skeleton` (CommunitySkeleton 참고 패턴)** — 기존 UI 인프라 재사용.

### Established Patterns

- **Service 반환 타입**: `{ data: T | null; error: string | null }` — Phase 3 D-01 통일.
- **Optimistic: 좋아요/팔로우만**: Phase 3 D-10. 컬렉션은 D-21에서 await로 전환.
- **R2-first 업로드 → INSERT**: Phase 3 D-09. 본 Phase D-04에서 영상 단계 추가.
- **Mock 완전 제거**: Phase 3 D-16. 본 Phase D-19에서 photographer 도메인 적용.
- **로딩/에러 UI**: Skeleton + Toast + Alert 폼 유지 — Phase 3 D-17, D-18.
- **탈퇴 사용자 렌더링 레이어 치환**: Phase 3 D-03. 포토그래퍼는 탈퇴 시 display_name → "탈퇴한 포토그래퍼" (계정 연동은 D-06 트리거에서 role=photographer 유지, 프로필 조회 시 users.is_deleted 체크).
- **RLS**: photographers.user_id 기반 INSERT/UPDATE/DELETE 제약 (008_photographer_rls.sql). photo_posts는 photographers row EXISTS 체크 — D-06 승인 트리거가 row 생성 → 자연스러운 가드.
- **Migration 번호**: 현재 028까지. Phase 4는 029부터 (videos, approval trigger, apps 확장, thumbnails).

### Integration Points

- **`App.tsx`**: `PhotographerProvider` 위치 확인 필요. Phase 3 전환과 독립적, 같은 패턴.
- **`MainTabNavigator`**: Studio 탭 심사 상태별 분기 (D-09). 라벨/아이콘 가변.
- **`AuthContext`**: `activatePhotographerMode` 제거 → `submitPhotographerApplication` 신규. `user.role` 은 auth state refresh 로 반영.
- **`PhotographerRegisterScreen` → `photographerApi.submitPhotographerApplication`**: 신규 API 호출 지점. Step 4로 이동 후 navigation.reset 또는 goBack + Studio 진입.
- **`UploadPostScreen.doPublish`**: 현재 이미지만 업로드 (176~198). 영상 업로드 단계 추가 (D-04). 클라이언트 파일 제약 체크.
- **`StudioScreen` → `fetchMyPhotographerApplication`**: 심사 상태별 UI 분기 (D-09).
- **`PhotographerProfileScreen` + `PhotographerCard` + `GradeBadge`**: 등급 배지 렌더 포인트.
- **Notifications INSERT (trigger)**: Phase 6 NotificationContext fetch 대기.

</code_context>

<specifics>
## Specific Ideas

- `photographerApi.ts` 패턴을 거울처럼 따르되 Phase 3 `communityApi.ts` 의 개선점(예: 페이지네이션 `.range(from, to)`, 에러 메시지 표준화) 흡수
- 심사 대기 UX는 "신청 접수되었습니다" 메시지 + 예상 소요 시간(예: "영업일 기준 2~3일") 명시. 투명성 중심.
- 영상 30초/50MB 제약은 엄격. 사용자가 선택한 영상이 초과하면 "업로드 실패"가 아니라 "선택 단계에서 즉시 안내" — "60초 이하 영상만 업로드 가능합니다"
- 등급 배지는 게임피케이션 요소지만 v1은 과하지 않게 — 프로필 헤더 + Studio 상단만. 피드 카드는 아이콘 없이 깨끗하게.
- Edge Function 썸네일은 fire-and-forget. 최초 업로드 직후 피드 진입 시 아직 썸네일이 생성되지 않았으면 원본 images[0] 사용 (fallback) — 사용자는 실패를 느끼지 않음.
- photographer_applications 승인 트리거는 **시스템 핵심 로직** — planner가 반드시 확실한 테스트 케이스 (승인, 거절, 재신청, users.role 전이) 설계.

</specifics>

<deferred>
## Deferred Ideas

- **기존 photo_posts 썸네일 백필** — Phase 4 범위 밖, 후속 이슈. 기존 데이터는 렌더링 시 `images[0]` fallback.
- **영상 썸네일 (프레임 캡처)** — v2. 현재는 Video 컴포넌트 기본 posterFrame 또는 아이콘 오버레이.
- **다중 사이즈 썸네일 (200/400/800)** — v2. 반응형 해상도 대응 필요 시.
- **Cloudflare Image Resizing** — 대안 인프라로 검토 대기 (비용/사용량 고려 시 Edge Function 대비 유리할 수 있음). v2에서 재평가.
- **Orphan 파일 cleanup cron (R2)** — Phase 3 D-09 동일 이유로 v2 이후.
- **심사 자동화 (가이드라인 체크)** — v2. 관리자 수동 유지 (PROJECT.md Out of Scope 일치).
- **Photographer 게시물 pending 심사 (승인 PG 글도 검수)** — v1 범위 밖 (D-10). 어드민 수동 블라인드로 대체.
- **심사 결과 이메일/FCM 알림** — Firebase 블로커 (Phase 6) / Supabase SMTP 설정 (v2).
- **등급 임계값 조정/어워드 시스템** — 사용자 데이터 축적 후 튜닝. v2에서 랭크/어워드 관리 페이지 (ADM-10) 와 연동.
- **영상 해상도 프리셋 (HD/SD)** — v2. 현재는 클라이언트 quality 0.7.
- **ImageEditorModal 영상 지원** — v2 (영상 편집 일반적으로 네이티브 앱에서 복잡).
- **컬렉션 공개/비공개 설정** — v2.

### Reviewed Todos (not folded)

None — `gsd-tools todo match-phase 4` 매치 없음.

</deferred>

---

*Phase: 04-photographer*
*Context gathered: 2026-04-14*
