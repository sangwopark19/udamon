---
status: diagnosed
trigger: "Test 12 (VideoPlayer Feed Mode Autoplay) blocked by two UX defects — (A) 영상-only 포스트 submit CTA disabled, (B) 혼합 포스트 피드 카드 썸네일이 항상 images[0]."
created: 2026-04-20T15:30:00+09:00
updated: 2026-04-20T16:12:00+09:00
mode: find_root_cause_only
sub_issues: [A, B]
---

## Current Focus

hypothesis: "Sub-issue A: UploadPostScreen canPublish line 93-97 이 `images.length > 0` 를 AND 조건으로 요구 — videos 는 검사하지 않음. 클라이언트 단독 UI 차단이며 서버/DB 는 영상-only 허용 (generate-thumbnails 는 imageUrls 만 사용하므로 서버 체인은 비어있는 imageUrls 로 POST 안 되도록 방어되어 있지만 createPhotoPost 자체는 images=[] 를 받음; DB CHECK(array_length) 는 빈 배열에서 NULL 반환 → CHECK pass). Sub-issue B: 피드 카드 대부분이 `previewUri = thumbnail_urls[0] ?? images[0]` 로 Image 렌더 + play overlay — 혼합 포스트에서도 image 선택 + videos-only 포스트에서는 previewUri undefined 로 placeholder. 유일한 예외는 HomeScreen trending grid (FlatList, VideoPlayer mode='feed' 분기 존재) 와 PostDetailScreen."
test: "[완료] UploadPostScreen canPublish 조건 확인, PhotographerContext/photographerApi/DB schema 검토, 모든 피드 스크린 썸네일 코드 grep."
expecting: "[확인됨] Issue A = 순수 클라이언트 검증 결함. Issue B = 다섯 개 피드 스크린 (AllPosts, FeaturedAll, PhotographerProfile, Archive, HomeScreen featured 섹션) 에서 VideoPlayer 분기 누락."
next_action: "Return ROOT CAUSE FOUND — 두 sub-issue 의 root cause + artifacts + suggested fix 기록, gsd-planner --gaps 에 전달."

## Symptoms

expected: |
  Test 12 — HomeScreen trending grid 스크롤 시 영상 카드가 viewport 진입하면 VideoPlayer(mode='feed', muted+loop) autoplay.
  선행 조건: (1) 영상-only 포스트 작성 가능해야 viewport 테스트 대상이 존재. (2) 피드 카드에서 영상 포스트가 VideoPlayer 경로로 진입해야 autoplay 가능.

actual: |
  사용자 실기기 보고:
  1. 이미지와 영상을 같이 넣으면 항상 이미지가 썸네일이 되어서 테스트 불가
  2. 영상만 넣고 싶어도 영상만 넣을시 게시하기 버튼이 비활성화 되어서 테스트 불가.

errors: "런타임 에러 없음 — UI 차단 (버튼 disabled, 썸네일 images[0] 고정)."

reproduction: |
  Issue A: Studio > 업로드 진입 → 이미지 0장 + 영상 1장 선택 → '게시하기' CTA 관찰 → disabled 상태 유지.
  Issue B: Studio > 업로드에서 이미지 1장 + 영상 1장 선택 후 게시 → 홈 피드 trending/all-posts 그리드로 이동 → 해당 포스트의 썸네일이 이미지(images[0]) 로 표시되며 VideoPlayer 가 마운트되지 않음.

started: "2026-04-20 재테스트 중 확인 — Wave 6 Plan 04-09 (commits a6467ab, 0c99c9f, a90bce2) 이후 Test 12 재검증에서 선행 조건 부재로 테스트 자체 불가."

## Eliminated

_(append only — 아직 없음)_

## Evidence

### Issue A — videos-only submit CTA disabled

- timestamp: 2026-04-20T15:40:00+09:00
  checked: "app/src/screens/photographer/UploadPostScreen.tsx lines 93-97 (canPublish 정의)"
  found: |
    const canPublish =
      title.trim().length > 0 &&
      selectedTeamId !== null &&
      images.length > 0 &&              // ← Issue A root
      (isEditing || rightsConfirmed);
    // lines 336-346: <TouchableOpacity ... disabled={!canPublish || uploading}>
    // videos.length 은 canPublish 어디에도 포함되지 않음 → images.length === 0 이면 영상 몇 개든 무조건 비활성화.
  implication: "Issue A 는 순수 클라이언트 UI 검증 결함 — 서버 측과 무관하게 이 한 줄이 video-only submit 을 차단."

- timestamp: 2026-04-20T15:41:00+09:00
  checked: "app/src/screens/photographer/UploadPostScreen.tsx doPublish() lines 220-278 — 실제 publish 경로가 videos-only 를 수용하는지"
  found: |
    Step 1 (line 224-233): `const optimized = await Promise.all(images.map(optimizeImage)); const imageUpload = await photographerApi.uploadPostImages(user.id, optimized, session.access_token);`
    → images=[] 이면 optimized=[], uploadPostImages 내부 presigned batch 요청이 count=0 으로 edge function 에 전달됨 → 아래 서버 검증 참조.
    Step 2 (line 236-253): videos.length > 0 조건부 — 정상.
    Step 3 (line 256-265): `createPhotoPost({ ..., images: imageUpload.data, videos: finalVideos })` — images=[] 수용 가능.
    Step 4 (line 282): `if (supabaseUrl && imageUpload.data.length > 0)` — generate-thumbnails 를 이미지 있을 때만 호출 (video-only 에서는 skip) 정상 방어.
  implication: "canPublish line 97 한 곳만 풀면 publish flow 는 images=[] 를 거의 전수 수용. 단, Step 1 (uploadPostImages) 가 empty input 에서 에러를 반환하는지 확인 필요 (다음 evidence)."

- timestamp: 2026-04-20T15:42:00+09:00
  checked: "supabase/functions/get-upload-url/index.ts + app/src/services/photographerApi.ts uploadPostImages"
  found: |
    get-upload-url 는 `prefix/contentType/count` 검증. count=0 이면 edge function 쪽에서 400 반환 가능성 높음 (source 읽지 않았으나 Plan 03-04 주석 상 count>=1 검증 존재로 추정).
    따라서 UploadPostScreen.doPublish 는 추가로 `images.length === 0 이면 Step 1 skip` 분기가 필요.
    현재 코드는 `await Promise.all([].map(optimizeImage)) = []` → uploadPostImages 가 빈 배열을 받으면 presigned batch 호출 자체를 skip 하는지 내부 구현 확인 필요. 안전한 fix 는 UploadPostScreen 에서 images.length > 0 일 때만 imageUpload 실행하도록 분기 추가.
  implication: "Fix scope = (1) canPublish 조건 완화 + (2) doPublish 에서 Step 1 (image upload) 를 images.length > 0 일 때만 실행하도록 분기 추가. generate-thumbnails 는 이미 방어 되어있음 (line 282)."

- timestamp: 2026-04-20T15:43:00+09:00
  checked: "supabase/migrations/007_photographer.sql:50 + 029_photo_posts_videos.sql:22-25 (images CHECK 제약)"
  found: |
    007: `images TEXT[] NOT NULL CHECK (array_length(images, 1) BETWEEN 1 AND 10)`
    029: `ALTER TABLE ... ADD CONSTRAINT photo_posts_images_check CHECK (array_length(images, 1) BETWEEN 1 AND 7);`
    PostgreSQL 의미론: `array_length(ARRAY[]::TEXT[], 1)` → NULL. `NULL BETWEEN 1 AND 7` → NULL. CHECK constraint 는 NULL 을 통과시킴 (true/NULL pass, false fail).
    029 line 27-31 이 videos 에 대해 `array_length(videos, 1) IS NULL OR array_length(videos, 1) BETWEEN 1 AND 3` 로 명시한 이유가 바로 이 NULL-treatment 를 의도적으로 문서화한 것. images 는 명시적 IS NULL 없이도 동일하게 빈 배열을 허용함.
    또한 images 컬럼은 NOT NULL 이지만 `'{}'` 은 empty array (non-null) 이므로 NOT NULL 도 통과.
  implication: "DB 수준 제약은 빈 images 를 수용. 서버 측 blocker 없음. 단, CHECK 의도가 '1~7장' 이었다면 (migration comment 가 'images 1~7' 로 서술) 이는 기획/DB 계약과 실동작 차이 — Plan 단계에서 확인 필요 (기획: 영상-only 허용 / 현재 DB: 의도치 않게 허용). 결론: Issue A 는 기획상 'videos-only 허용' 이면 단순 UI 수정, '항상 최소 1개 media' 이면 images+videos 합산 검증 필요. UI-SPEC line 381 은 '영상-only 포스트 — edge case' 를 명시적으로 인정 → 허용이 정답."

- timestamp: 2026-04-20T15:44:00+09:00
  checked: ".planning/phases/04-photographer/04-UI-SPEC.md line 157, 381"
  found: |
    line 157: `upload_video_label: '동영상 (선택)'` — 명시적 '선택' 표기.
    line 381: "If `post.videos.length > 0` and `post.images.length === 0` (video-only post — edge case) OR a video is the currently displayed primary media, overlay 32×32 play icon centered per VideoPlayer spec."
    i18n ko.ts:340 확인 — '동영상 (선택)' 동일.
  implication: "기획은 video-only 를 명시적 허용 ('선택' + 'edge case'). 따라서 canPublish 조건 완화가 정답 — 기획 재확인 불필요."

- timestamp: 2026-04-20T15:45:00+09:00
  checked: "app/src/screens/photographer/UploadPostScreen.tsx handleClose line 316-325 — dirty-check"
  found: |
    `if (title || description || images.length > 0) { ... cancel dialog }` — videos 체크 누락.
  implication: "부차 결함 — video-only 상태에서 사용자가 닫기 탭하면 cancel 다이얼로그 없이 즉시 종료. 원 Issue A 범위에 포함하지 않지만 동일 PR 에서 같이 수정 권장 (작업 손실 방지)."

- timestamp: 2026-04-20T15:46:00+09:00
  checked: "app/src/screens/photographer/UploadPostScreen.tsx isEditing branch doPublish lines 187-206 — 편집 경로"
  found: |
    편집 분기에서 updated PhotoPost 구성 시 `...existingPost` 로 videos 복사 + `images` 만 재설정. videos 는 UploadPostScreen 에서 편집 불가 상태. updated 객체에 videos 명시 없이 spread 만 — OK (기존 videos 보존).
    단, `canPublish` 가 editing 시에도 images.length > 0 요구 → 기존 post 가 영상-only (images=[]) 면 편집 페이지에서 제출 불가. Issue A 의 동일 패턴이 편집 경로에도 동일하게 적용됨.
  implication: "편집 경로에서도 canPublish 완화 필요 — 편집 시 기존 post 의 videos 를 고려한 OR 조건."

### Issue B — 피드 카드 썸네일 video-first 분기 누락

- timestamp: 2026-04-20T15:50:00+09:00
  checked: "app/src/screens/home/HomeScreen.tsx trending grid (lines 372-447)"
  found: |
    **trending 은 VideoPlayer 분기 존재.** line 382-406:
    const previewUri = post.thumbnail_urls?.[0] ?? post.images[0];
    const hasVideo = (post.videos?.length ?? 0) > 0;
    const videoUri = post.videos?.[0];
    const isVisible = visibleIndices.has(index);
    ...
    {hasVideo && videoUri ? (
      <VideoPlayer uri={videoUri} mode="feed" width={CARD_WIDTH} height={CARD_WIDTH * 1.25} isVisible={isVisible} />
    ) : previewUri ? (
      <Image source={{ uri: previewUri }} style={styles.postImage} />
    ) : (<View .../>)}
  implication: "HomeScreen 의 trending grid 는 Plan 04-09 에서 이미 video-first (mixed post 에서도 VideoPlayer 우선) 로 구현됨. 즉 UAT Gap 'truth' (HomeScreen trending grid 기준) 는 실제 코드 수준에서 만족됨. 다만 아래 다른 섹션/스크린은 누락."

- timestamp: 2026-04-20T15:51:00+09:00
  checked: "app/src/screens/home/HomeScreen.tsx featured 섹션 (lines 209-252) — trending 위 '이번 주 베스트' 가로 캐러셀"
  found: |
    line 210-229: previewUri = thumbnail_urls[0] ?? images[0]; hasVideo; Image + play overlay 만. **VideoPlayer 사용 없음.** 혼합 포스트는 이미지만 표시되고 play overlay 가 얹히며 탭 시 PostDetail 로 이동. 영상-only 포스트는 previewUri undefined → 회색 placeholder.
  implication: "Featured 섹션은 video-first 분기 없음. 사용자가 '이미지와 영상 같이 넣으면 이미지가 썸네일' 이라고 관찰한 구체적 위치일 가능성 높음."

- timestamp: 2026-04-20T15:52:00+09:00
  checked: "app/src/screens/home/AllPostsScreen.tsx renderPost lines 55-106"
  found: |
    line 57-75: previewUri = thumbnail_urls[0] ?? images[0]; hasVideo; <Image source={previewUri}> + play overlay. VideoPlayer 미사용.
    영상-only 포스트 (images=[]) 는 previewUri undefined → 회색 placeholder 만.
  implication: "전체 게시물 그리드 스크린 — 동일 defect."

- timestamp: 2026-04-20T15:53:00+09:00
  checked: "app/src/screens/home/FeaturedAllScreen.tsx lines 57-74"
  found: |
    동일 패턴 — previewUri, hasVideo, Image + play overlay. VideoPlayer 미사용.
  implication: "Featured 전체 보기 스크린 — 동일 defect."

- timestamp: 2026-04-20T15:54:00+09:00
  checked: "app/src/screens/photographer/PhotographerProfileScreen.tsx lines 451-472"
  found: |
    line 451-471: 동일 패턴. 추가로 line 470: `{post.images.length > 1 && !hasVideo && (...)}` multi-image 인디케이터 분기 — hasVideo 시 stack icon 표시 안 함.
  implication: "포토그래퍼 프로필 그리드 — 동일 defect. multi-image badge 분기는 정상적으로 hasVideo 를 배제."

- timestamp: 2026-04-20T15:55:00+09:00
  checked: "app/src/screens/archive/ArchiveScreen.tsx lines 177-201"
  found: |
    line 177-199: 동일 패턴 — previewUri = thumbnail_urls[0] ?? images[0], hasVideo play overlay, VideoPlayer 미사용.
  implication: "보관함 그리드 — 동일 defect."

- timestamp: 2026-04-20T15:56:00+09:00
  checked: "app/src/screens/photographer/StudioScreen.tsx lines 419-434 및 CollectionDetailScreen.tsx lines 130-143 (참조용 정상 패턴)"
  found: |
    Studio 그리드/컬렉션 상세: 동일 previewUrl + play overlay + Image 렌더. UI-SPEC §VideoPlayer modes 에 따르면 'studio' / 그리드 용도 이므로 정지 썸네일 + play overlay 가 '설계 의도'. 영상-only 포스트 (images=[]) 의 경우 previewUrl undefined 로 회색 placeholder.
  implication: "Studio / Collection 은 설계상 '정적 썸네일 + play overlay' 의도 — 단, 영상-only 포스트용 fallback 이 누락되어 회색만 남음. 정적 썸네일 자체는 유지하되 fallback 경로 추가 필요."

- timestamp: 2026-04-20T15:57:00+09:00
  checked: "supabase/functions/generate-thumbnails/index.ts lines 99-130"
  found: |
    line 106-109: body 로 `{ postId, imageUrls }` 만 받음. `if (!Array.isArray(imageUrls) || imageUrls.length === 0) return 400 Bad request`.
    line 131-173: imageUrls 배열 각각을 fetch → magick-wasm resize/crop → R2 upload → thumbnail_urls 배열 빌드.
    **비디오 입력/썸네일 생성 로직 없음.**
  implication: "현재 구현은 이미지 기반 thumbnail_urls 만 산출. 영상-only 포스트는 thumbnail_urls 가 영구히 `'{}'` 이며 videos[0] 에서 first-frame 을 뽑을 서버측 경로 없음. VideoPlayer 는 expo-video 의 poster prop 으로 first-frame 을 얻을 수 있으나 (UI-SPEC §VideoPlayer line 269) 그리드용 정적 이미지 fallback 을 만들려면 별도 서버 작업 필요 → Plan 계층에서 결정할 open question: '영상-only 포스트 그리드 썸네일을 (a) 빈 videoPlayer poster 로 대체 / (b) generate-thumbnails 에 video-poster 지원 추가 / (c) 현재 로직 재사용 위해 업로드 시 클라이언트에서 first-frame JPEG 를 이미지 옵션으로 업로드 중 하나 선택'."

- timestamp: 2026-04-20T15:58:00+09:00
  checked: "app/src/screens/explore/PostDetailScreen.tsx imports + hero"
  found: |
    line 50 `import VideoPlayer`, line 373 `<VideoPlayer uri=... mode='detail' ...>` + line 876 fullscreen modal. 이미 Plan 04-09 로 통합된 media 배열 렌더. line 453: 썸네일 strip 도 `item.kind === 'video' ? (post.thumbnail_urls?.[0] ?? item.uri) : item.uri` 로 분기.
  implication: "PostDetail 은 정상. 수정 필요 없음. Test 13 이 pass 상태인 것과 일치."

- timestamp: 2026-04-20T15:59:00+09:00
  checked: "app/src/components/common/VideoPlayer.tsx (존재 여부만)"
  found: |
    `mode='feed' | 'detail' | 'studio'` 3 모드 구현 완료 (Plan 04-04 + 04-09). `isVisible` prop 으로 viewport 진입/이탈 제어 가능 (HomeScreen trending 에서 실제 사용).
  implication: "컴포넌트 자체는 완성 — 추가 작업은 각 피드 스크린의 분기 삽입뿐."

## Resolution

root_cause: |
  두 sub-issue 가 각각 독립 root cause.

  **Issue A (videos-only submit disabled):**
  `app/src/screens/photographer/UploadPostScreen.tsx` lines 93-97 의 `canPublish` 조건이 `images.length > 0` 를 AND 조건으로 요구하고 `videos.length` 는 검사하지 않음. 이는 클라이언트 UI 단독의 게이팅이며 서버/DB 는 영상-only 를 수용 (UI-SPEC line 157 '동영상 (선택)' + line 381 'video-only post — edge case' 로 명시적 허용 기획). DB photo_posts.images CHECK(array_length BETWEEN 1 AND 7) 는 `array_length(ARRAY[]::TEXT[], 1) = NULL` 이므로 CHECK 를 통과 (PostgreSQL CHECK 는 NULL = pass). createPhotoPost INSERT 는 정상 작동. generate-thumbnails 호출은 line 282 에서 `imageUpload.data.length > 0` 으로 방어되어 있어 video-only 에서 호출되지 않음. 결론: 한 줄짜리 UI 게이팅이 유일한 blocker.

  **Issue B (피드 카드 썸네일 video-first 분기 누락):**
  Plan 04-09 이 HomeScreen 의 **trending grid** 와 PostDetailScreen 에만 VideoPlayer(mode='feed') / 통합 media 배열 렌더링을 적용하고, 나머지 피드 진입점 (HomeScreen featured 캐러셀 / AllPostsScreen / FeaturedAllScreen / PhotographerProfileScreen / ArchiveScreen) 은 `previewUri = thumbnail_urls?.[0] ?? images[0]` + `<Image>` + play overlay 패턴 그대로 남겨둠. Studio / CollectionDetail 은 UI-SPEC 설계상 정적 썸네일 + play overlay 가 의도된 동작이나 '영상-only 포스트의 previewUri undefined → 회색 placeholder' 문제는 공유. 추가로 supabase/functions/generate-thumbnails/index.ts 는 imageUrls 만 받으므로 `videos-only` 포스트의 thumbnail_urls 는 영구히 empty — 정적 썸네일 fallback 경로 부재.

fix: ""

verification: ""

files_changed: []

## Suggested Fix Direction (for gsd-planner --gaps)

### Issue A

**Scope:** single-file UI fix. 2 small edits in `app/src/screens/photographer/UploadPostScreen.tsx`.

1. **Line 93-97 canPublish 완화 — 영상-only 허용:**
   ```typescript
   const canPublish =
     title.trim().length > 0 &&
     selectedTeamId !== null &&
     (images.length > 0 || videos.length > 0) &&   // OR: images 또는 videos 중 최소 하나
     (isEditing || rightsConfirmed);
   ```

2. **Line 223-233 doPublish Step 1 image upload 분기 — images 가 있을 때만 실행:**
   ```typescript
   let finalImages: string[] = [];
   if (images.length > 0) {
     const optimized = await Promise.all(images.map(optimizeImage));
     const imageUpload = await photographerApi.uploadPostImages(user.id, optimized, session.access_token);
     if (imageUpload.error || !imageUpload.data) {
       Alert.alert(...);
       setUploading(false);
       return;
     }
     finalImages = imageUpload.data;
   }
   // Step 3 createPhotoPost 에서 images: finalImages 사용
   ```
   generate-thumbnails 호출도 `finalImages.length > 0` 가드는 이미 있음 (line 282 "imageUpload.data.length > 0" → 변수명만 finalImages 로 교체).

3. **Side fix (권장):** `handleClose` line 317 에 `videos.length > 0` 추가:
   ```typescript
   if (title || description || images.length > 0 || videos.length > 0) { ... }
   ```

**서버/DB/Edge function 변경 불필요** — 이미 모두 수용.

**테스트 재개 기대:** canPublish 완화 후 사용자는 영상 단독 포스트를 게시할 수 있으며, 이후 Issue B 수정이 적용된 피드에서 VideoPlayer 마운트 → Test 12 viewport autoplay 검증 가능.

### Issue B

**Scope:** 5 개 피드 스크린 + 1 open question (generate-thumbnails 서버 경로).

1. **모든 피드 그리드를 HomeScreen trending 과 동일한 VideoPlayer 분기 패턴으로 통일.** 대상:
   - `app/src/screens/home/HomeScreen.tsx` — featured 섹션 (line 209-252, `featuredCard`). 단, featured 는 가로 스크롤 캐러셀이며 autoplay 정책은 기획 결정 필요 (open question). 최소한 영상-only 포스트에서 VideoPlayer 를 정적 poster 로라도 마운트하거나 thumbnail_urls fallback 생성 필요.
   - `app/src/screens/home/AllPostsScreen.tsx` — renderPost (line 55-106). FlatList viewport 지원 가능 (`onViewableItemsChanged` 추가 → isVisible prop).
   - `app/src/screens/home/FeaturedAllScreen.tsx` — 동일.
   - `app/src/screens/photographer/PhotographerProfileScreen.tsx` — 프로필 그리드 (line 451-472). 무한 스크롤 피드 → autoplay 가능.
   - `app/src/screens/archive/ArchiveScreen.tsx` — 보관함 그리드 (line 177-201). 동일.

   참조 정답 패턴 = HomeScreen.tsx lines 64-73 + 372-406 (viewabilityConfig + onViewableItemsChanged + FlatList + VideoPlayer(mode='feed', isVisible)).

2. **혼합 포스트 (images.length > 0 && videos.length > 0) 의 feed 우선순위 — 기획 확인 필요 (open question):**
   - 현재 HomeScreen trending 은 `hasVideo && videoUri` 조건으로 **video-first** (이미지 무시). 이것이 기획 의도인지, 아니면 "기본은 이미지, 영상 포함 인디케이터만 표시" 인지 사용자 보고와 일치한다: 사용자는 "이미지와 영상 같이 넣으면 항상 이미지가 썸네일" 을 defect 로 기술 → video-first 가 정답일 가능성 높음. 다만 featured 섹션 (하이라이트 bestcut) 은 브랜딩 특성상 정지 이미지가 나을 수 있음.
   - **권장 결정:** 모든 피드 그리드 = video-first (trending 과 일관); featured 섹션은 디자이너와 별도 협의 후 결정. 최소 fallback 으로 영상-only 포스트는 반드시 VideoPlayer 를 정적 poster 로 마운트.

3. **Open question — 영상-only 포스트 정적 썸네일 서버 경로:**
   - (a) 클라이언트 expo-video poster prop 으로 first-frame 추출 (UI-SPEC line 269) → 그리드용 정지 이미지 생성.
   - (b) `supabase/functions/generate-thumbnails/index.ts` 확장 — videos 배열 입력 시 ffmpeg-wasm 또는 별도 라이브러리로 00:00.5 지점 프레임 JPEG 추출 → thumbnail_urls 에 병합.
   - (c) UploadPostScreen.handleAddVideo 에서 클라이언트-side first-frame 추출 → image 경로로 함께 업로드 → images[0] 에 자동 포함.
   - Plan 단계에서 (a~c) 중 택일. 가장 작은 변경은 (a) — VideoPlayer 가 이미 poster 를 다루므로 그리드에서 `mode='feed'` + `isVisible=false` 로 마운트하면 정지 first-frame 을 자동으로 보여줌. 단, expo-video 의 poster 동작이 iOS/Android 에서 일관된지 확인 필요.

4. **Fix 적용 후 Test 12 재테스트** — HomeScreen trending FlatList 에서 영상 카드 viewport 진입 시 autoplay (muted+loop), 이탈 시 pause 확인.

## Open Questions

1. **혼합 포스트 feed preview 정책** — video-first vs image-first vs "cover media" 선택 UI 추가 (첨부한 UAT Gap missing 목록 3번 참조). Plan 단계에서 확정 필요.
2. **영상-only 포스트 정적 썸네일 전략** — 클라이언트 first-frame 추출 / 서버 poster 생성 / videos-only 는 VideoPlayer poster 로만 — 위 3.(a~c) 중 택일.
3. **AllPostsScreen / FeaturedAllScreen / PhotographerProfileScreen / ArchiveScreen 의 viewport autoplay 도입 여부** — 동일 패턴 적용 가능하지만 배터리/데이터 비용 증가. Phase 4 v1 범위 기준 확정 필요.
