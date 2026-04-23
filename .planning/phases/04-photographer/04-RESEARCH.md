# Phase 4: Photographer - Research

**Researched:** 2026-04-14
**Domain:** React Native Expo (SDK 54) + Supabase (Postgres + Edge Functions Deno) + Cloudflare R2 — 비디오 업로드/재생, 심사 트리거, 썸네일 Edge Function, 등급 계산, Mock 제거 마이그레이션
**Confidence:** HIGH

---

## Summary

Phase 4는 Phase 3에서 검증된 패턴(`communityApi` 페이지네이션, R2-first 업로드, optimistic 좋아요만, 일괄 mock 제거, Skeleton/Toast/Alert 로딩 UI)을 photographer 도메인에 그대로 적용하는 동시에 **신규 4개 영역**을 추가한다: ① 영상 업로드/재생(`expo-video` 신규 설치, `expo-av`는 SDK 55에서 제거 예정 [VERIFIED: WebSearch + Expo blog]), ② 심사 트리거(`AFTER UPDATE OF status` → `photographers` INSERT + `users.role` UPDATE + `notifications` INSERT 단일 트랜잭션), ③ 썸네일 Edge Function(`magick-wasm` WASM 라이브러리 — sharp는 Edge Functions 미지원 [VERIFIED: Supabase docs]), ④ 등급 계산 클라이언트 유틸 + GradeBadge 컴포넌트.

CONTEXT.md의 23개 결정(D-01~D-23)은 대부분 그대로 실행 가능하지만 **3가지 충돌/공백**을 발견했다:
1. `users.role` CHECK 제약은 `('user', 'admin')` 만 허용 → D-06 트리거가 `role = 'photographer'`로 업데이트하려면 CHECK 변경 마이그레이션 필요. 또는 `is_photographer BOOLEAN` 필드만 사용하는 대안 채택.
2. `get-upload-url` Edge Function의 `photo-posts` SIZE_LIMIT는 30MB → D-03의 50MB 영상 제약과 불일치. 영상은 prefix를 분리하거나 SIZE_LIMIT 조정 필요.
3. 기존 `Cheerleader` 타입(`name`, `description`)은 DB schema(`name_ko`, `name_en`, `position`, `status`, `image_url`, `team_id` UUID)와 불일치 → D-20 작업 시 타입 재정의 필수.

**Primary recommendation:** Phase 4를 4개 wave로 분할 — Wave 0 (마이그레이션 029~032 + Edge Function magick-wasm + pgTAP 트리거 테스트), Wave 1 (`photographerApi` 함수 추가/수정 + 페이지네이션 + 타입 정리), Wave 2 (`PhotographerContext` Supabase 일괄 전환 + mock 제거), Wave 3 (UploadPostScreen 영상 + Studio 심사 분기 + GradeBadge + VideoPlayer 컴포넌트 + UI-SPEC 적용).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 영상 업로드 & 스키마
- **D-01:** `photo_posts.videos TEXT[]` 컬럼 분리. 마이그레이션 `029_photo_posts_videos.sql` — `ADD COLUMN videos TEXT[] NOT NULL DEFAULT '{}' CHECK (array_length(videos, 1) IS NULL OR array_length(videos, 1) BETWEEN 1 AND 3)`. `images` CHECK 제약은 `1~7`로 조정 (기존 `1~10` → `1~7`). images는 최소 1장 유지.
- **D-02:** R2 prefix는 `photo-posts` 그대로 유지. 영상도 `photo-posts/{userId}/{key}.mp4`. `get-upload-url` Edge Function은 contentType 검증만 확장 (`video/mp4` 허용). prefix 추가 없이 처리.
- **D-03:** 영상 제약: 30초 이하 + 50MB 이하, `video/mp4` 고정. 클라이언트 `expo-image-picker` asset의 `duration`, `fileSize` 메타 확인 후 초과 시 Alert로 차단. Edge Function에서 contentType 2차 검증.
- **D-04:** 업로드 순서 = 이미지 → 영상 → photo_posts INSERT (순차). 실패 시 Alert + 폼 retain (Phase 3 D-18). 고아 파일 방치 (Phase 3 D-09 deferred).
- **D-05:** `createPhotoPost`에 `videos: string[]` 추가. `mapPhotoPost`에서 `row.videos ?? []` 매핑. `PhotoPost` 타입에 `videos: string[]` 필드 추가.

#### 심사 프로세스 (photographer_applications)
- **D-06:** 신청 제출 시 `applications` INSERT만, `photographers` row는 승인 시 DB 트리거로 자동 생성. 마이그레이션 `030_photographer_approval_trigger.sql` — `AFTER UPDATE OF status WHEN NEW.status = 'approved' AND OLD.status != 'approved'` → `photographers` INSERT (`user_id`, `display_name = users.nickname`, `team_id` from applications.team_id 또는 users.my_team_id, `is_verified = FALSE`) + `UPDATE users SET role = 'photographer'`.
- **D-07:** `photographer_applications`에 컬럼 추가: `team_id UUID REFERENCES teams(id)`, `activity_links TEXT[]` (MAX 3), `activity_plan TEXT`. 마이그레이션 `031_photographer_apps_extend.sql`.
- **D-08:** `activatePhotographerMode()` 흐름 교체 → `submitPhotographerApplication({ user_id, team_id, activity_links, activity_plan, portfolio_url: null, bio: '' })` 호출. Step 4 = "심사 대기 중" 메시지.
- **D-09:** 심사중(pending) 상태에서는 photographers 없음 → 프로필/글쓰기 미노출. Studio 탭 진입 시 `fetchMyPhotographerApplication(userId)` 상태별 분기: 신청 없음 → 가입 유도 / pending → "심사 대기 중" / approved → 기존 Studio / rejected → "거절됨" + 사유 + 재신청.
- **D-10:** 승인된 PG 게시물은 업로드 즉시 `status='approved'`. DB-10의 DEFAULT 'approved' 유지.
- **D-11:** 심사 결과 알림은 `notifications` 테이블 in-app 알림만. 트리거(D-06 확장)에서 INSERT — `photographer_approved` / `photographer_rejected` type. Phase 4는 INSERT만, 소비는 Phase 6.

#### 이미지 리사이징 & 썸네일
- **D-12:** 신규 Edge Function `generate-thumbnails` + `photo_posts.thumbnail_urls TEXT[]` 컬럼. 마이그레이션 `032_photo_posts_thumbnails.sql` — `ADD COLUMN thumbnail_urls TEXT[] NOT NULL DEFAULT '{}'`. 영상에는 적용 안 함.
- **D-13:** 썸네일 단일 사이즈 400×400 (cover crop), JPEG. 다중 사이즈는 v2 deferred.
- **D-14:** Edge Function 기동은 클라이언트 fire-and-forget. `createPhotoPost` 성공 → `fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnails`, ...)` 비동기 호출 (await 없음). Edge Function 내부에서 R2 다운로드 → resize → R2 업로드(`${key}_thumb.jpg`) → `UPDATE photo_posts SET thumbnail_urls = ...`.
- **D-15:** 적용 범위는 Phase 4 신규 게시물만. 기존 photo_posts는 `thumbnail_urls = '{}'`. 렌더링 fallback: `thumbnail_urls.length > 0 ? thumbnail_urls[0] : images[0]`.
- **D-16:** 영상 썸네일(프레임 캡처)은 v1 범위 밖. 갤러리/피드에서 영상은 아이콘 오버레이(▶)로 표시.

#### 등급 계산 & UI
- **D-17:** 등급은 클라이언트에서 계산. `mapPhotographer`에 `grade = post_count + Math.floor(follower_count / 10)` 추가. 신규 유틸 `app/src/utils/photographerGrade.ts` (`calculateGrade`, `gradeToBadge`).
- **D-18:** 등급 구간 (초안, planner 조정 가능): 0~4 브론즈 / 5~19 실버 / 20~49 골드 / 50+ 다이아. 표시 위치: PhotographerProfileScreen 헤더, Studio 상단, PhotographerCard.

#### Mock 제거 & Context 리팩토링
- **D-19:** `PhotographerContext.tsx`를 Phase 3 D-16 패턴 그대로 일괄 Supabase 전환. mock import 모두 제거, isRemote/isRemoteRef/merge 로직 제거. 초기 state는 빈 배열 + `loading=true`. mockPhotographers/mockCheerleaders는 _legacy/ 이동 또는 삭제.
- **D-20:** 치어리더는 `cheerleaders` DB fetch로 전환. `photographerApi.ts`에 `fetchCheerleaders()` 추가. Cheerleader 타입은 DB schema 기준으로 재정의 필요.
- **D-21:** 컬렉션 optimistic 제거, Phase 3 await 패턴으로 통일. 좋아요/팔로우는 optimistic + rollback 유지.
- **D-22:** `togglePhotoLike('', ...)` / `toggleFollow('', ...)` 빈 userId 버그 수정. Context 내부에서 `useAuth().user.id` 주입. 비로그인 사용자는 `useLoginGate()` 가드.
- **D-23:** 페이지네이션은 Phase 3 D-05 패턴 (`.range`, 20개). `fetchPhotoPosts(teamId?, page?)`. FlatList `onEndReached`에서 다음 page.

### Claude's Discretion

(Claude가 결정 가능 — 본 RESEARCH §"Claude's Discretion 결정 가이드" 참조)

- 마이그레이션 번호/파일명 (029~032 초안)
- Edge Function `generate-thumbnails` 라이브러리 선택 → **본 연구 결론: `magick-wasm`**
- Edge Function 에러 재시도 정책 → **권장: 1회 실패 시 그대로 둠 (fallback 동작)**
- 등급 임계값 세부 조정 → **권장: 초안 유지 (0/5/20/50)**
- 등급 배지 아이콘 → **권장: Ionicons (`medal-outline`/`medal`/`diamond`) per UI-SPEC**
- `photographer_applications` RLS 추가 수정 → **결론: 023 RLS 그대로 충분**
- pending/approved Studio UI → **UI-SPEC 06-UI-SPEC.md에서 이미 정의됨**
- UploadPostScreen 영상 편집/미리보기 → **권장: 편집 없이 바로 업로드 (ImageEditorModal 영상 미지원)**
- `expo-av` vs `expo-video` → **결론: `expo-video` (SDK 54 권장, expo-av는 SDK 55 제거 예정)**
- 비디오 자동재생 정책 → **UI-SPEC §VideoPlayer mode 표 참조 (feed: muted 자동, detail: 탭 후 재생)**
- 비디오 로딩/에러 UI → **UI-SPEC에서 이미 정의됨**
- 썸네일 R2 key 명명 → **권장: `${key}_thumb.jpg`**
- mockPhotographers/mockCheerleaders 처리 → **권장: 즉시 삭제 (Phase 3 mockCommunity.ts 정리 방침과 동일)**
- 페이지네이션 스크롤 위치 보존 → **권장: `concat` 누적 + onEndReached 중복 호출 가드 (`loadingMoreRef`)**

### Deferred Ideas (OUT OF SCOPE)

- 기존 photo_posts 썸네일 백필 (후속 이슈)
- 영상 썸네일 (프레임 캡처) — v2
- 다중 사이즈 썸네일 (200/400/800) — v2
- Cloudflare Image Resizing — v2 재평가
- Orphan 파일 cleanup cron (R2) — v2
- 심사 자동화 (가이드라인 체크) — v2
- 포토그래퍼 게시물 pending 심사 (승인 PG 글도 검수) — v1 범위 밖 (D-10)
- 심사 결과 이메일/FCM 알림 — Firebase 블로커 (Phase 6)
- 등급 임계값 조정/어워드 시스템 — v2
- 영상 해상도 프리셋 — v2
- ImageEditorModal 영상 지원 — v2
- 컬렉션 공개/비공개 설정 — v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOT-01 | 포토그래퍼 Supabase 연동 완성 (mock 데이터 병합 제거) | §"Mock 제거 일괄 전환 패턴" — Phase 3 D-16 가이드, `PhotographerContext` 일괄 재작성 절차 (Wave 2) |
| PHOT-02 | 포토그래퍼 심사 프로세스 (applications 테이블 연동) | §"DB 승인 트리거 설계" — `030_photographer_approval_trigger.sql` 패턴 + pgTAP 테스트 케이스 + `users.role` CHECK 제약 충돌 해결안 |
| PHOT-03 | 영상 업로드 기능 (R2, 최대 3개) | §"R2 영상 업로드 보강" — `uploadPostVideos` 기존 활용 + Edge Function `photo-posts` SIZE_LIMIT 50MB 조정 + range request 경고 |
| PHOT-04 | 영상 재생 기능 (앱 내 네이티브) | §"영상 재생 라이브러리 (expo-video)" — `useVideoPlayer` + `VideoView` 패턴, FlatList viewport-aware 자동재생, MOV 변환 이슈 |
| PHOT-05 | 이미지 리사이징/썸네일 생성 | §"Edge Function `generate-thumbnails` 구현" — `magick-wasm` 채택, 400×400 cover crop JPEG, fire-and-forget 호출, R2 다운로드/업로드 |
| PHOT-06 | 포토그래퍼 등급 계산 (포스트 수 + 팔로워/10) | §"등급 계산 유틸 + 배지" — `calculateGrade`/`gradeToBadge` 시그니처, 임계값 매핑, GradeBadge 컴포넌트 (UI-SPEC 정합) |
| PHOT-07 | 치어리더 태깅 (cheerleaders 테이블 연동) | §"치어리더 DB fetch 전환" — Cheerleader 타입 재정의 (DB schema 매핑), `fetchCheerleaders()` 함수 |
| PHOT-08 | 컬렉션 관리 연동 | §"컬렉션 await 전환" — Phase 3 D-21 패턴, `addPostToCollection` 등의 `await` 변경 |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

### 사용자 글로벌 (CLAUDE.md)
- **ES Modules** 강제 (import/export, no CommonJS) — `photographerApi.ts`는 ESM 그대로 유지
- **함수형 우선**, 클래스는 외부 인터페이스에만
- **strict typing 전체** — `any` 금지, untyped 변수 금지 → mapPhotographer/mapPhotoPost의 `(row: any)` 시그니처는 명시적 row interface로 교체 필요 (Phase 3 communityApi 패턴 참조)
- **typecheck 후 실행** — 코드 변경 후 typecheck 명령
- **lint 후 수정** — 변경된 코드의 warning까지 수정
- **pre-commit hook --no-verify 금지**
- **Conventional commits** (feat:/fix:/test:/refactor:/docs:)
- **Co-Authored-By 트레일러 금지** — user가 유일 author
- **Korean 응답** — 본 RESEARCH.md는 한국어로 작성

### 프로젝트 (./CLAUDE.md)
- **Tech stack 유지**: Expo SDK 54, Supabase, R2, Vite — 신규 라이브러리는 `expo-video`, `magick-wasm` 만 추가
- **단일 Supabase 프로젝트** (dev/prod 분리 없음) — 마이그레이션은 production 직접 적용
- **TypeScript strict** — `app/tsconfig.json` 이미 strict
- **에러 처리 패턴**: 서비스 함수는 `{ data: T | null; error: string | null }` 반환
- **Style**: 인라인 `StyleSheet.create`, theme 토큰만 사용, 비가공 hex 금지 (예외: bronze `#A97142` UI-SPEC 명시)
- **i18n**: 모든 user-facing 문자열은 `app/src/i18n/locales/ko.ts` snake_case 키
- **Comments**: Korean 허용 (특히 `// 환경변수 미설정 시...` 같은 내부 주석)
- **Logging prefix 컨벤션**: `[OAuth]`, `[Deep Link]`, `[ErrorBoundary]` 등 — Phase 4 영상 업로드 디버깅용 prefix `[VideoUpload]`, `[Thumbnail]` 권장

---

## Standard Stack

### Core (신규 설치 필요)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-video` | latest (npm: 1.x; expo SDK 54 호환 — `npx expo install`로 호환 버전 자동 선택) | 영상 재생 (`VideoView` + `useVideoPlayer`) | SDK 54 공식 권장. `expo-av` 는 SDK 55에서 완전 제거 예정. 분리된 player/view 아키텍처로 메모리 관리 명확 [VERIFIED: Expo blog + expo/expo Issue #37259] |
| `@imagemagick/magick-wasm` | 0.0.39 [VERIFIED: npm view 2026-04-14] | Edge Function 이미지 resize/crop | Supabase Edge Function 공식 권장. sharp는 Edge Functions 미지원 (Deno 런타임 + native lib 충돌) [VERIFIED: Supabase docs] |

### Supporting (기존 설치 — 그대로 활용)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-image-picker` | ~17.0.10 | 영상 선택 (`mediaTypes: ['videos']`) | UploadPostScreen.handleAddVideo (이미 구현됨, asset 메타 검증만 추가) |
| `expo-image-manipulator` | ~14.0.8 | 클라이언트 이미지 최적화 (`optimizeImage`) | Phase 3에서 이미 활용 — 영상에는 적용 안 함 |
| `@supabase/supabase-js` | ^2.100.0 | DB CRUD, Auth | photographerApi 전 함수에서 활용 |
| `expo` | ~54.0.0 | 플랫폼 SDK | (변경 없음) |
| `expo-haptics` | ~15.0.8 | 좋아요 햅틱 | Phase 3 패턴 그대로 |

### Edge Function 의존성 (`supabase/functions/generate-thumbnails/`)

| Library | Source | Purpose |
|---------|--------|---------|
| `@imagemagick/magick-wasm` | npm: (jsr 또는 npm:@imagemagick/magick-wasm@0.0.39) | resize + crop + JPEG 인코딩 |
| `@aws-sdk/client-s3@3` | npm: | R2 GET (원본 다운로드) + PUT (썸네일 업로드) — 기존 get-upload-url 패턴 동일 |
| `@supabase/supabase-js@2` | npm: | photo_posts UPDATE (service role) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-video` | `react-native-video` (TheWidlarzGroup) | RN-video는 Expo 미적용 시 더 다양한 기능 + 상용 지원, 그러나 Expo 환경에서는 expo-video가 Expo lifecycle와 통합되어 마찰 적음. RN-video는 이번 사례에 over-engineering [CITED: dev.to/zuludev react-native-video VS expo-video] |
| `magick-wasm` | `imagescript` (pure-Deno WASM) | imagescript는 더 작은 번들(\~2MB) + Deno-native, 그러나 cover-crop API 지원 약함 + JPEG quality 세밀 조정 어려움. magick-wasm은 \~10MB이지만 Supabase 공식 예제 + 100+ 포맷 지원 [VERIFIED: Supabase docs] |
| `magick-wasm` | Cloudflare Image Resizing | URL 기반 변환 (`/cdn-cgi/image/...`) — 무한 사이즈, 무료 계층 1000장/월. 그러나 Workers 라우팅 설정 필요 + R2 public domain 통과 시 별도 변환 라우트 필요. CONTEXT.md에서 이미 v2 deferred |
| `magick-wasm` | Supabase Storage Image Transform | Supabase Storage(`supabase.storage.from(...).getPublicUrl(path, { transform: { width, height } })`) — 그러나 우리는 R2 사용. Storage 사용 안 함 [CITED: supabase.com/features/image-transformations] |
| client-side resize (`expo-image-manipulator`) | — | 업로드 전 클라이언트에서 400×400 생성. 그러나 일관성 + 디바이스 CPU 부담 + 향후 다중 사이즈 확장성 측면에서 서버 생성이 유리 (CONTEXT.md D-14 근거) |
| pgTAP (트리거 테스트) | Supabase JS integration test | pgTAP는 SQL 파일 기반, RLS/트리거 테스트에 특화. JS 통합 테스트는 더 광범위하지만 트리거 로직 격리 어려움. **Wave 0 트리거 검증은 pgTAP, Wave 2 Context 검증은 별도 manual QA** |

**Installation:**

```bash
# 클라이언트 (mobile app)
cd app && npx expo install expo-video

# Edge Function 의존성은 supabase/functions/generate-thumbnails/index.ts의 import에서 자동 해결 (deno deploy 시 fetch)
# config.toml에 wasm 정적 파일 등록 필요 (아래 §"Edge Function generate-thumbnails 구현" 참조)
```

**Version verification:** [VERIFIED: npm view 2026-04-14]
- `expo-video@latest` → 사용 권장 (Expo SDK 54 호환 버전은 `expo install`이 자동 선택)
- `@imagemagick/magick-wasm@0.0.39` → 최신 안정 버전
- 검증 명령:
  ```bash
  npm view expo-video version
  npm view @imagemagick/magick-wasm version
  ```

> **참고:** Edge Function의 npm: import는 Supabase Deno runtime이 실시간으로 패치됨. `supabase functions deploy` 시 첫 호출에서 콜드 스타트 1.5\~3초 발생 가능 (WASM 초기화 포함).

---

## Architecture Patterns

### Recommended Project Structure (Phase 4 신규/변경)

```
app/src/
├── components/
│   ├── common/
│   │   └── VideoPlayer.tsx              # 신규 (D-16, UI-SPEC §VideoPlayer)
│   └── photographer/
│       └── GradeBadge.tsx               # 신규 (D-18, UI-SPEC §GradeBadge)
├── contexts/
│   └── PhotographerContext.tsx          # 일괄 재작성 (D-19, mock 제거)
├── data/
│   ├── mockPhotographers.ts             # 삭제
│   └── mockCheerleaders.ts              # 삭제
├── screens/photographer/
│   ├── PhotographerRegisterScreen.tsx   # Step 4 재설계 (D-08, UI-SPEC §State B)
│   ├── StudioScreen.tsx                 # 4가지 application_status 분기 (D-09, UI-SPEC §StudioScreen)
│   ├── UploadPostScreen.tsx             # 영상 검증 + 업로드 (D-03, D-04)
│   └── PhotographerProfileScreen.tsx    # 등급 배지 헤더 (D-18)
├── services/
│   ├── photographerApi.ts               # 신규 함수 추가 + 기존 시그니처 수정
│   └── r2Upload.ts                      # uploadPostVideos 그대로 활용
├── types/
│   ├── photographer.ts                  # PhotoPost에 videos/thumbnail_urls/grade 추가
│   └── cheerleader.ts                   # DB schema 기준으로 재정의
└── utils/
    └── photographerGrade.ts             # 신규 (D-17)

supabase/
├── migrations/
│   ├── 029_photo_posts_videos.sql       # 신규 (D-01)
│   ├── 030_photographer_approval_trigger.sql  # 신규 (D-06, D-11)
│   ├── 031_photographer_apps_extend.sql # 신규 (D-07)
│   └── 032_photo_posts_thumbnails.sql   # 신규 (D-12)
├── functions/
│   ├── get-upload-url/index.ts          # SIZE_LIMIT 변경 (50MB 영상)
│   └── generate-thumbnails/             # 신규 폴더
│       ├── index.ts
│       └── deno.json (옵션)
├── tests/
│   ├── photographer-approval-trigger.sql    # 신규 pgTAP 테스트
│   └── photo-posts-videos-check.sql         # 신규 pgTAP 테스트
└── config.toml                          # WASM 정적 파일 등록 (magick-wasm)
```

### Pattern 1: 영상 재생 (`expo-video` + FlatList viewport-aware)

**What:** `useVideoPlayer` 훅으로 인스턴스 생성 → `VideoView`로 렌더. 컴포넌트 unmount 시 자동 cleanup.

**When to use:** UI-SPEC §VideoPlayer 모드 표 참조 — feed (자동재생/muted/loop), detail (수동 재생/native controls), studio (정지/poster).

**Example:**

```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/video/ (CITED)
import { useVideoPlayer, VideoView } from 'expo-video';

interface VideoPlayerProps {
  uri: string;
  mode: 'feed' | 'detail' | 'studio';
  width: number;
  height: number;
}

export function VideoPlayer({ uri, mode, width, height }: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    if (mode === 'feed') {
      p.muted = true;
      p.loop = true;
      p.play();
    } else {
      p.muted = false;
      p.loop = false;
      // detail/studio: 사용자 탭으로 재생
    }
  });

  return (
    <VideoView
      player={player}
      style={{ width, height }}
      nativeControls={mode === 'detail'}
      allowsPictureInPicture={mode === 'detail'}
    />
  );
}
```

> **중요 (FlatList):** Android는 동일 player 인스턴스를 여러 VideoView에 마운트할 수 없음 [VERIFIED: WebSearch — expo/expo Issue #29950]. 각 리스트 아이템은 독립 player 인스턴스 사용. `windowSize={5}` 정도로 가시 영역 위/아래 2개 viewport만 mount + `viewabilityConfigCallbackPairs`로 가시 아이템에서만 `player.play()`, 비가시는 `player.pause()`.

**FlatList viewport-aware 자동재생 패턴:**

```typescript
// Source: medium.com/@jenshandersson "Optimized FlatList of videos" (CITED)
const viewabilityConfig = { itemVisiblePercentThreshold: 70 };

const onViewableItemsChanged = useCallback(({ viewableItems }) => {
  const visibleIds = new Set(viewableItems.map(v => v.item.id));
  // 가시 아이템에만 play, 나머지는 pause — VideoPlayer 컴포넌트 내부 ref로 처리
}, []);

<FlatList
  data={posts}
  renderItem={({ item }) => <PhotoPostCard post={item} isVisible={visibleIds.has(item.id)} />}
  viewabilityConfig={viewabilityConfig}
  onViewableItemsChanged={onViewableItemsChanged}
  windowSize={5}  // viewport ±2개만 mount (default 21 → 5로 축소)
  removeClippedSubviews
/>
```

### Pattern 2: 심사 트리거 (`AFTER UPDATE OF status`)

**What:** `photographer_applications.status`가 `'pending'` → `'approved'` 또는 `'rejected'`로 전환될 때 트리거 함수가 동일 트랜잭션 내에서 ① `photographers` INSERT (approved만) ② `users.role` UPDATE (approved만, CHECK 제약 변경 후) 또는 `users.is_photographer = true` ③ `notifications` INSERT (approved/rejected 모두) 수행.

**When to use:** 신규 마이그레이션 `030_photographer_approval_trigger.sql`. SECURITY DEFINER 사용 (어드민 client는 service role이 아닌 인증 토큰으로 호출).

**Example:**

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/triggers (CITED)
-- Source: https://www.postgresql.org/docs/current/sql-createtrigger.html WHEN (CITED)

-- 사전 조건 (D-06 충돌 해결): users.role CHECK 제약 확장
-- 011_users.sql의 CHECK (role IN ('user', 'admin')) → ('user', 'admin', 'photographer') 로 변경
ALTER TABLE public.users DROP CONSTRAINT users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin', 'photographer'));

CREATE OR REPLACE FUNCTION public.handle_photographer_application_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_team_id UUID;
  v_display_name TEXT;
BEGIN
  -- 거절 처리
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'photographer_rejected',
      '포토그래퍼 신청이 거절되었습니다',
      COALESCE(NEW.rejection_reason, '제출된 자료가 요구사항을 충족하지 못했습니다.'),
      jsonb_build_object('application_id', NEW.id)
    );
    RETURN NEW;
  END IF;

  -- 승인 처리
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- 1) photographers 행 자동 생성 (D-06)
    SELECT COALESCE(NEW.team_id, u.my_team_id), u.nickname
    INTO v_team_id, v_display_name
    FROM public.users u WHERE u.id = NEW.user_id;

    INSERT INTO public.photographers (
      user_id, display_name, team_id, is_verified, bio, follower_count, post_count
    ) VALUES (
      NEW.user_id,
      COALESCE(v_display_name, 'Photographer'),
      v_team_id,
      FALSE,
      COALESCE(NEW.bio, ''),
      0,
      0
    )
    ON CONFLICT (user_id) DO NOTHING;  -- 재신청 후 승인 시에도 안전

    -- 2) users.role 업데이트 (또는 is_photographer = true; D-06과 충돌 분석 §"Common Pitfalls" 참조)
    UPDATE public.users
       SET role = 'photographer',
           is_photographer = TRUE
     WHERE id = NEW.user_id;

    -- 3) 승인 알림 INSERT (D-11)
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'photographer_approved',
      '포토그래퍼 신청이 승인되었습니다',
      '지금부터 사진과 영상을 업로드할 수 있어요.',
      jsonb_build_object('application_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_photographer_application_decision
  AFTER UPDATE OF status ON public.photographer_applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_photographer_application_decision();
```

> **트랜잭션 보장 [VERIFIED: PostgreSQL docs CREATE TRIGGER]:** AFTER 트리거 함수의 모든 INSERT/UPDATE는 원본 UPDATE와 동일 트랜잭션. 일부 실패 시 전체 ROLLBACK. notifications INSERT가 RLS 위반(`notifications_admin_insert` 정책 — admin만 INSERT 허용)으로 실패하지 않도록 `SECURITY DEFINER`로 service-level 권한 사용.

### Pattern 3: Edge Function `generate-thumbnails` (magick-wasm)

**What:** R2에서 원본 이미지 다운로드 → magick-wasm으로 400×400 cover crop + JPEG 변환 → R2에 `${key}_thumb.jpg` 업로드 → photo_posts.thumbnail_urls UPDATE.

**Why magick-wasm (not sharp):** Sharp는 native libvips 의존 → Deno Edge Functions 미지원. magick-wasm은 WASM, Deno 호환, ImageMagick의 모든 기능 (crop center gravity, JPEG quality 등) 사용 가능 [VERIFIED: Supabase docs Image Manipulation example].

**When to use:** UploadPostScreen이 createPhotoPost 성공 직후 fire-and-forget으로 호출 (await 없음).

**Example (Edge Function index.ts):**

```typescript
// Source: https://supabase.com/docs/guides/functions/examples/image-manipulation (CITED)
// Source: https://github.com/dlemstra/magick-wasm demo/demo.ts (CITED)
import { initialize, ImageMagick, MagickFormat, MagickGeometry, Gravity } from 'npm:@imagemagick/magick-wasm@0.0.39';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { S3Client, GetObjectCommand, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3';

// WASM 1회 초기화 (cold start 시 1.5~3초)
const wasmBytes = await Deno.readFile(new URL('./magick.wasm', import.meta.url));
await initialize(wasmBytes);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${Deno.env.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
const BUCKET = Deno.env.get('R2_BUCKET_NAME')!;
const PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')!;

interface ThumbnailRequest {
  postId: string;
  imageUrls: string[];  // public R2 URLs from photo_posts.images
}

Deno.serve(async (req: Request) => {
  // CORS 처리 — 기존 get-upload-url 패턴 동일
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Auth 검증 — service role로 동작하므로 admin/owner/service 토큰 모두 허용
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { postId, imageUrls } = await req.json() as ThumbnailRequest;
  if (!postId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return new Response('Bad request', { status: 400 });
  }

  const thumbnailUrls: string[] = [];
  const failures: string[] = [];

  for (const imageUrl of imageUrls) {
    try {
      // 1) 원본 다운로드 (R2 public read)
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());

      // 2) magick-wasm: cover crop 400×400 JPEG
      let outBytes: Uint8Array | null = null;
      ImageMagick.read(buf, (image) => {
        // Resize to fill 400×400 (aspect-fit), then center crop
        const fitGeometry = new MagickGeometry(400, 400);
        fitGeometry.fillArea = true;       // cover behavior
        image.resize(fitGeometry);
        const cropGeometry = new MagickGeometry(400, 400);
        image.crop(cropGeometry, Gravity.Center);
        image.format = MagickFormat.Jpeg;
        image.quality = 80;
        image.write((data) => { outBytes = data; });
      });

      if (!outBytes) throw new Error('encode failed');

      // 3) R2 업로드 (key는 원본 key + _thumb.jpg)
      // imageUrl: https://pub-xxx.r2.dev/photo-posts/userid/timestamp_random.jpg
      const key = new URL(imageUrl).pathname.slice(1);  // photo-posts/userid/...jpg
      const thumbKey = key.replace(/\.[^.]+$/, '_thumb.jpg');

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: thumbKey,
        Body: outBytes,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      thumbnailUrls.push(`${PUBLIC_URL}/${thumbKey}`);
    } catch (e) {
      console.error('[Thumbnail] failed for', imageUrl, e);
      failures.push(imageUrl);
      // D-15 fallback: 실패 시 원본 URL을 그대로 두지 않음 — 아예 thumbnail_urls에서 제외
      // 클라이언트는 thumbnail_urls.length < images.length 이면 images[i] fallback
    }
  }

  // 4) photo_posts UPDATE (service role)
  if (thumbnailUrls.length > 0) {
    const { error } = await supabase
      .from('photo_posts')
      .update({ thumbnail_urls: thumbnailUrls })
      .eq('id', postId);
    if (error) console.error('[Thumbnail] DB update failed', error);
  }

  return new Response(
    JSON.stringify({ thumbnailUrls, failures }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
```

**config.toml WASM 등록 [CITED: Supabase docs Wasm modules]:**

```toml
# supabase/config.toml
[functions.generate-thumbnails]
verify_jwt = true
[[functions.generate-thumbnails.static_files]]
files = ['./functions/generate-thumbnails/magick.wasm']
```

> WASM 파일은 `node_modules/@imagemagick/magick-wasm/dist/magick.wasm`에서 복사하여 함수 폴더에 두는 방식 [CITED: github.com/supabase/supabase apps/docs/content/guides/functions/wasm.mdx].

**클라이언트 fire-and-forget 호출 패턴 (UploadPostScreen.doPublish 내):**

```typescript
// post creation 성공 직후
fetch(`${SUPABASE_URL}/functions/v1/generate-thumbnails`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ postId: postResult.data.id, imageUrls: postResult.data.images }),
}).catch((e) => console.warn('[Thumbnail] fire-and-forget failed', e));
// await 없음 — 사용자는 즉시 navigation.goBack
```

### Pattern 4: 페이지네이션 (Phase 3 D-05 동일)

```typescript
// Source: app/src/services/communityApi.ts:168-220 (CITED — internal Phase 3 pattern)
export async function fetchPhotoPosts(params: {
  teamSlug?: string;
  page: number;
  pageSize: number;
}): Promise<ApiResult<PhotoPost[]>> {
  try {
    await ensureSlugMaps();
    const from = params.page * params.pageSize;
    const to = from + params.pageSize - 1;

    let query = supabase
      .from('photo_posts')
      .select(`
        *,
        photographer:photographers(display_name, avatar_url, is_verified),
        team:teams(name_ko),
        player:players(name_ko, number),
        cheerleader:cheerleaders(name_ko)
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params.teamSlug && params.teamSlug !== 'all') {
      const teamUuid = teamSlugToUuid(params.teamSlug);
      if (teamUuid) query = query.eq('team_id', teamUuid);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []).map(mapPhotoPost), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchPhotoPosts failed';
    return { data: null, error: msg };
  }
}
```

**Context onEndReached 가드 (스크롤 위치 보존):**

```typescript
// PhotographerContext or screen-level state
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const loadingMoreRef = useRef(false);

const loadMore = useCallback(async () => {
  if (loadingMoreRef.current || !hasMore) return;
  loadingMoreRef.current = true;
  const next = page + 1;
  const result = await photographerApi.fetchPhotoPosts({ teamSlug, page: next, pageSize: 20 });
  if (result.data) {
    setPosts((prev) => [...prev, ...result.data!]);
    setHasMore(result.data.length === 20);
    setPage(next);
  }
  loadingMoreRef.current = false;
}, [teamSlug, page, hasMore]);
```

> FlatList scroll position은 React Navigation이 자동 보존 (screen unmount 안 함). page state도 Context에 두어 화면 재진입 시 그대로.

### Anti-Patterns to Avoid

- **`expo-av` 신규 설치/사용** — SDK 55에서 완전 제거. 신규 코드는 무조건 `expo-video` [VERIFIED: Expensify Issue #64846 — 2026-02-04 마감 마이그레이션 Bounty]
- **하나의 `useVideoPlayer` 인스턴스를 여러 `VideoView`에 공유** — Android 제한, black screen 또는 충돌 [VERIFIED: expo/expo Issue #35012]
- **클라이언트에서 비디오 트랜스코딩** — expo-image-picker가 iOS에서 MOV 반환하더라도 트랜스코딩은 시도하지 않음. D-03의 "video/mp4 고정"은 picker 결과의 `mimeType.startsWith('video/mp4')` 체크로 차단 (사용자에게 다시 선택 안내) [VERIFIED: expo/expo Issue #29918, #42739]
- **`createPhotoPost`에 token 직접 전달** — Supabase 클라이언트 싱글톤이 인증 세션을 자동 attach. r2Upload만 access_token 명시 (Edge Function 호출 시 필수)
- **트리거 없이 `photographers` row를 클라이언트에서 INSERT** — D-06 위반. `users.role` 변경도 클라이언트에서 직접 안 함. 모두 트리거 단일 책임
- **mockPhotographers/mockCheerleaders 부분 보존** — Phase 3 D-16 패턴 위반. 일괄 삭제 (또는 `_legacy/` 격리). 부분 잔존은 디버깅 함정
- **이미지 업로드 후 post INSERT 실패 시 R2 cleanup 시도** — Phase 3 D-09 deferred. 고아 파일은 v2 cron으로 정리. 클라이언트는 폼 retain만
- **`magick-wasm` WASM 파일을 npm import 자동 fetch에 의존** — Deno deploy 시 cold start 매번 발생. 정적 파일로 등록 (`config.toml [[functions.generate-thumbnails.static_files]]`)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 영상 재생 (RN/Expo) | 자체 VideoView (AVPlayer/MediaPlayer 브리지) | `expo-video` (`useVideoPlayer` + `VideoView`) | iOS/Android 미디어 lifecycle, picture-in-picture, audio session, background playback, error retry, codec 호환성 — 직접 구현 시 수개월 |
| 이미지 resize/crop on Edge Function | Canvas/픽셀 직접 계산 | `magick-wasm` | EXIF 회전, JPEG quality, color profile, 100+ 포맷 — ImageMagick은 검증된 c-lib의 WASM 포팅 [VERIFIED: Supabase docs] |
| presigned URL 생성 (R2) | 자체 SigV4 서명 | `@aws-sdk/s3-request-presigner` | SigV4 canonical request, 헤더 정렬, sigtime — Phase 3에서 이미 구현 (`get-upload-url/index.ts`) |
| FlatList viewport-aware 자동재생 | `onScroll` + scroll offset 계산 | `viewabilityConfig` + `onViewableItemsChanged` | itemVisiblePercentThreshold 등 RN 내장 메커니즘 [CITED: medium.com/@jenshandersson Optimized FlatList of videos] |
| Trigger 동작 검증 | console.log + 수동 클릭 테스트 | pgTAP (`supabase/tests/*.sql`) | 트리거 SECURITY DEFINER + RLS + 트랜잭션 의존성을 SQL 단위로 격리 검증 [VERIFIED: Supabase docs pgTAP] |
| 영상 압축/트랜스코딩 (클라이언트) | ffmpeg-react-native | (생략 — D-03에서 picker 결과 거부) | ffmpeg 통합은 binary size 50MB+ 추가, build complexity 증가. v1 엄격 mp4 검증으로 우회 |
| 등급 임계값 동적 관리 | DB site_settings 조회 | 클라이언트 상수 (`app/src/utils/photographerGrade.ts`) | v1은 임계값 정적, 변경 시 클라이언트만 (D-17). DB 조회는 매 렌더마다 발생 시 비용 |
| 썸네일 backfill 스크립트 (Phase 4 내) | bash + curl 일괄 호출 | (deferred to v2 — D-15) | 신규 게시물만 적용, 기존은 fallback. 백필은 후속 이슈 |
| 영상 썸네일 (frame capture) | expo-video API | (skip — D-16) | v1 미지원, ▶ 아이콘 오버레이로 대체 |

**Key insight:** Phase 4는 "video + thumbnail + trigger + grade + 마이그레이션" 등 새로운 영역이 많아 보이지만, 각 영역마다 검증된 라이브러리/패턴을 활용. **자체 구현해야 하는 것은 트리거 SQL 본문, GradeBadge 컴포넌트, VideoPlayer wrapper(약 80LOC), Edge Function index.ts(약 120LOC), 등급 utility (약 50LOC) — 모두 합쳐 신규 코드 \~500LOC 수준.**

---

## Runtime State Inventory

> Phase 4는 일부 schema migration + Mock 제거 + Context 재작성을 포함하므로 본 섹션을 적용한다.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | (1) 기존 `photo_posts` row들의 `thumbnail_urls` 컬럼은 `'{}'` 으로 채워짐 (D-15) → 백필 없음. (2) 기존 `photo_posts` 의 `images` 배열이 7개 초과한 경우 D-01의 `1~7` CHECK 실패 가능. (3) `photographer_applications` 기존 row 없음 (Phase 1 17번 마이그레이션에서 생성, 시드 없음 — pgsql 검증 권장). (4) `cheerleaders` 시드는 022에서 10명 leader 만 생성됨 — 사진 게시 시 유효 cheerleader_id 보장됨. | **DB 마이그레이션 029 작성 시 ALTER 직전 SELECT max(array_length(images, 1)) FROM photo_posts**; 초과 row 있으면 마이그레이션 실패. 시드 환경(또는 prod)에서 실측 후 진행. |
| **Live service config** | (1) Supabase Edge Function `generate-thumbnails` 는 신규 — 기존 운영 함수 충돌 없음. (2) `get-upload-url` 의 SIZE_LIMIT 30MB 변경 시 production 영향 — 영상이 30MB 초과면 401/400 발생. (3) Supabase pg_cron (Phase 3 트렌딩 잡 동작 중) → Phase 4와 무관. (4) R2 버킷 `udamon-media` CORS 설정 — Phase 3 OK, 영상도 동일 origin/method 허용. | get-upload-url 마이그레이션 시 SIZE_LIMIT를 photo-posts에서 50MB로 상향 (영상 50MB + 이미지 30MB 차이 처리는 prefix 분리 또는 함수 내부에서 contentType별 분기 — §"R2 영상 업로드 보강" 참조). |
| **OS-registered state** | None — 클라이언트 앱 코드 변경 + 서버 마이그레이션만. EAS 빌드/설치 후 OTA 업데이트 가능 영역 (네이티브 모듈 추가 시 native build 필요). `expo-video`는 expo-modules-core 기반 — `expo install` + `npx expo prebuild` (필요 시) | EAS development 빌드 1회 실행 (Wave 0 또는 Wave 3 직전) — 신규 native 모듈 검증. |
| **Secrets/env vars** | None 신규. 기존 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL — 모두 `generate-thumbnails`에서 그대로 재사용. EXPO_PUBLIC_SUPABASE_URL/_KEY 는 클라이언트에서 그대로. | Edge Function 신규 배포 시 `supabase secrets list`로 위 변수 등록 확인. |
| **Build artifacts** | (1) `node_modules/@imagemagick/magick-wasm/dist/magick.wasm` 파일을 `supabase/functions/generate-thumbnails/magick.wasm`으로 복사. (2) `app/node_modules/expo-video` 신규 추가 → `package-lock.json` 변경, lockfile commit 필수. (3) Phase 3에서 추가된 `_legacy/` 디렉토리 패턴 (mockCommunity.ts) 일관성 — Phase 4 mockPhotographers/mockCheerleaders 는 즉시 삭제 권장 (D-19 명시 "삭제 또는 _legacy 이동"). | 마이그레이션 029 작성 후 typecheck — 기존 파일이 mockPhotographers의 export를 import하지 않는지 확인 (`grep -r "from '.*mockPhotographers'"`). |

**Nothing found in category — 명시:**
- OS-registered state: **None — 검증 완료** (Windows Task Scheduler / launchd / systemd 사용 안 함, EAS Build만)
- Secrets: **None 신규 — 검증 완료** (Phase 3에서 R2/Supabase 키 모두 등록됨, Phase 4는 동일 키 재사용)

---

## Common Pitfalls

### Pitfall 1: `users.role` CHECK 제약 ('user', 'admin') vs D-06 트리거
**What goes wrong:** D-06 트리거가 `UPDATE users SET role = 'photographer'` 실행 시 `users_role_check` 위반 → 트리거 실패 → 전체 트랜잭션 ROLLBACK → 어드민 승인이 영구히 차단. 한 번 발생하면 디버깅 어려움 (어드민이 "승인 안 됨" 메시지 본 후 재시도 → 같은 실패 반복).

**Why it happens:** Phase 1 011_users.sql:14의 `CHECK (role IN ('user', 'admin'))` 가 photographer 값 미허용. CONTEXT.md D-06이 schema 충돌을 미검토.

**How to avoid:**
- **선택지 A (권장)**: 마이그레이션 030 본문에서 CHECK 제약 확장 — `ALTER TABLE users DROP CONSTRAINT users_role_check; ADD CONSTRAINT ... CHECK (role IN ('user', 'admin', 'photographer'));`
- **선택지 B**: `users.role` 은 `'user'`/`'admin'` 그대로 두고, `is_photographer BOOLEAN` 만 사용. 클라이언트는 `is_photographer === true`로 권한 판단. RLS는 `is_photographer = true` 체크. 단, 어드민 RLS(`is_admin()` 함수, 012_rls_helpers.sql)는 그대로.
- **결정 권장**: B (is_photographer 단독 사용). 이유: ① CHECK 제약 변경은 011 마이그레이션 변경처럼 보여 git history 혼탁. ② Phase 1 D-10에서 `role IN ('user','admin')`을 명시했음 (어드민/일반 2분할 모델) — photographer는 직교 속성. ③ 추후 PG가 admin이 될 수도 있음 (역할 OR 관계). **B로 가면 D-06 트리거 본문은 `UPDATE users SET is_photographer = TRUE WHERE id = NEW.user_id`**.

**Warning signs:** 어드민이 어드민 패널(Phase 5) 또는 SQL 직접 `UPDATE photographer_applications SET status = 'approved'` 후 photographers 테이블에 row 없음 / users.role/is_photographer 변경 없음 → 트리거 함수 에러 로그 (Supabase Dashboard → Logs → Postgres → 'role_check' 키워드).

### Pitfall 2: Edge Function `photo-posts` SIZE_LIMIT 30MB vs D-03 50MB 영상
**What goes wrong:** D-03은 영상 최대 50MB 허용. 그러나 `get-upload-url/index.ts:19`의 `SIZE_LIMITS["photo-posts"] = 30 * 1024 * 1024`. 30MB 초과 영상 업로드 시 (R2 부하/비용) 별도 차단 안 됨 — 현재 코드에서 SIZE_LIMITS는 **참고용 상수일 뿐 실제 검증 안 함** (line 60-61 주석 "Size enforcement is handled at the R2 bucket level").

**Why it happens:** SIZE_LIMITS 상수는 client-side 검증 가이드용. R2 bucket-level 제한은 별도 설정 (현재 0byte~? 미설정 가능). D-03 50MB 검증은 client에서만 1차 가능, server 보장 없음.

**How to avoid:**
- 클라이언트 D-03 검증을 Alert 단계에서 강하게 (50MB 정확히 검사)
- Edge Function `get-upload-url`에서 SIZE_LIMITS["photo-posts"] = 50MB 로 상향 + (선택) contentType별 분기 (image=30MB / video=50MB)
- R2 bucket lifecycle rule 또는 Cloudflare Worker로 R2 PUT object size 검증 추가 (Phase 4 범위 밖이지만 v1 안전망 권장)
- **마이그레이션 직전 Edge Function 코드 변경 + 재배포 필수** (CONTEXT.md D-02에 "contentType 검증만 확장" 명시되어 있으므로 size 상향도 함께 처리)

**Warning signs:** 사용자가 50MB+ 영상 업로드 시도 → 클라이언트 Alert 차단 OK. 그러나 클라이언트 검증 우회 (debugger) 시 무한 업로드 가능 → R2 비용 폭증.

### Pitfall 3: `expo-image-picker` 가 iOS에서 영상을 MOV로 변환
**What goes wrong:** iOS 사용자가 갤러리에서 MP4 영상을 선택해도 expo-image-picker가 .MOV로 변환해서 반환 → D-03 `mimeType.startsWith('video/mp4')` 체크 실패 → 사용자가 "MP4 형식 영상만 업로드할 수 있어요" 알림 받고 혼란.

**Why it happens:** iOS PHPickerViewController가 export 시 H.264 MOV로 트랜스코딩 (videoExportPreset 'Passthrough' 도 SDK 54/55에서 무시됨) [VERIFIED: expo/expo Issue #29918, #42739].

**How to avoid:**
- **선택지 A (CONTEXT.md D-03 그대로)**: `video/mp4` 만 허용 → iOS 사용자 영상 선택 시 약 50% 거부. 사용자에게 명확한 안내 필수 ("iOS는 갤러리 저장 시 MP4로 직접 export된 파일만 가능").
- **선택지 B (권장 추가)**: `video/mp4`, `video/quicktime` 모두 허용. Edge Function `get-upload-url`은 이미 `video/mp4`, `video/quicktime`, `video/webm` 모두 허용 중 (line 9-12). 클라이언트 검증만 `video/mp4` 또는 `video/quicktime` 으로 완화. 클라이언트 D-03의 "MP4 고정" 은 사용자 직관 보호용이므로 picker가 자동 변환한 .mov는 받아들임.
- **결정 권장**: B. 이유: ① iOS 사용자 UX 차단은 큰 손해. ② Edge Function이 이미 quicktime 허용. ③ R2/expo-video 둘 다 .mov 재생/저장 OK. ④ D-03의 "video/mp4 고정"은 R2 비용/UX 안정 명분 — quicktime은 동일 H.264이므로 비용 차이 없음.

**Warning signs:** iOS QA 시 약 절반 영상이 "지원하지 않는 형식" Alert → 사용자 이탈. Android QA만 진행 시 발견 불가능 — **iOS 디바이스 QA 필수**.

### Pitfall 4: Cloudflare R2 public bucket의 Range Request 미응답
**What goes wrong:** `<video>` 또는 expo-video의 native player가 `Range: bytes=0-1` 등으로 부분 요청 시 R2 가 `Content-Range` 헤더 없이 200 OK 전체 응답 → 모바일에서 50MB 영상 시작 시 50MB 전체 다운로드 후 재생 → UX 끔찍.

**Why it happens:** Cloudflare R2 public bucket이 일부 케이스에서 Range header 미정상 응답 [VERIFIED: Cloudflare Community — community.cloudflare.com/t/public-r2-bucket-doesnt-handle-range-requests-well/434221].

**How to avoid:**
- **MP4 faststart 인코딩 필수**: moov atom이 파일 끝에 있으면 전체 다운로드 필요. expo-image-picker 가 export하는 영상은 대부분 faststart 아님 → 클라이언트 인코딩 옵션 없음 (D-03 상 트랜스코딩 안 함).
- **단기 대안 (Phase 4)**: 30초/50MB 엄격 제약 자체가 mitigation (50MB는 LTE 5초~10초). 사용자가 큰 화면 풀스크린 재생 시에도 빠른 시작.
- **장기 (v2)**: Cloudflare Stream 마이그레이션 (HLS adaptive, faststart 자동) — CONTEXT.md deferred로 명시.
- **테스트 권장 (Wave 3 QA)**: iOS Safari 시뮬레이터 또는 실기기에서 50MB MP4 업로드 → expo-video 재생 시 첫 프레임까지 시간 측정. 5초 초과 시 R2 custom domain (`media.udamonfan.com`) + Cloudflare Worker로 Range 강화 검토.

**Warning signs:** 사용자가 영상을 탭한 후 검은 화면 + ActivityIndicator 가 5초+ 지속 → "재생 안 됨" 인상. 네트워크 패널에서 Status 200 + Content-Length=전체 사이즈 (Content-Range 없음) 확인.

### Pitfall 5: `notifications_admin_insert` RLS 정책 위반 (트리거 내 INSERT)
**What goes wrong:** 023의 `notifications_admin_insert`는 `WITH CHECK (public.is_admin())` — 즉 `auth.uid()`가 admin인 경우만 INSERT 허용. D-11 트리거가 `INSERT INTO notifications` 시 트리거 실행 컨텍스트의 `auth.uid()`가 어드민이 아닌 경우 (예: 어드민 패널이 service role 미사용) RLS 위반 → 트리거 실패.

**Why it happens:** 트리거 함수가 SECURITY DEFINER 없이 호출자 권한으로 실행되면 RLS가 적용. SECURITY DEFINER 추가 시 함수 소유자(보통 postgres) 권한으로 우회 가능.

**How to avoid:**
- 트리거 함수에 `SECURITY DEFINER SET search_path = ''` 명시 (Phase 1 handle_new_user 패턴과 동일)
- 함수 소유자가 service role / postgres 인지 확인 (`ALTER FUNCTION public.handle_photographer_application_decision OWNER TO postgres;`)
- 또는 RLS bypass FORCE — `ALTER TABLE notifications DISABLE ROW LEVEL SECURITY` 는 보안 위반이므로 절대 금지

**Warning signs:** 어드민이 승인 후 photographers 행은 생성됐는데 notifications 행 없음 → Postgres 로그에서 'new row violates row-level security policy' 메시지. 또는 트랜잭션 전체 롤백되어 photographers 도 생성 안 됨 (모두 또는 전무).

### Pitfall 6: `Cheerleader` 타입과 DB schema 불일치 (D-20)
**What goes wrong:** 기존 `app/src/types/cheerleader.ts` 는 `{ id, name, description, team_id, image_url }` (slug 기준). DB 017_cheerleaders.sql 은 `{ id, team_id (UUID FK), name_ko, name_en, position ('leader'|'member'), status, image_url }`. `fetchCheerleaders()` 가 DB row를 그대로 반환하면 클라이언트의 `cheerleader.name` 접근이 undefined → 화면 깨짐.

**Why it happens:** Phase 1에서 `cheerleaders` DB 생성 시 클라이언트 타입 동기화 누락. mockCheerleaders는 자체 schema로 동작.

**How to avoid:**
- D-20 작업 첫 단계: `app/src/types/cheerleader.ts` 를 DB schema 기준으로 재정의 — `{ id, team_id (slug, mapper로 변환), name_ko, name_en?, position, status, image_url? }`
- 모든 사용처 (`UploadPostScreen`, `PhotographerContext`, `CommunityWriteScreen` 등) 검색해서 `cheerleader.name` → `cheerleader.name_ko` 일괄 변경
- `mapPhotoPost` 의 `cheerleader: { name: ... }` 도 `name_ko: ...` 로 통일 (또는 클라이언트 alias 유지)
- 영상 첨부와 무관하므로 타입 변경은 typecheck로 미사용처 발견 가능

**Warning signs:** 빌드 후 cheerleader 표시 화면이 빈칸 / "undefined" 출력. typecheck 로 ts-error 미발생 시 (`row: any` 의존) — RESEARCH.md §"strict typing" 항목과도 연결, `mapCheerleader` 타입 명시 필수.

### Pitfall 7: 트리거 후 클라이언트 `users.role` / `is_photographer` 캐시 stale
**What goes wrong:** D-06 트리거가 `users.role = 'photographer'` (또는 `is_photographer = TRUE`) 업데이트 후, 클라이언트 `AuthContext.user` 는 여전히 'user'/false. 사용자가 Studio 진입해도 "신청 없음" 화면 표시.

**Why it happens:** Supabase Auth session JWT는 `users` row 변경을 자동 반영 안 함 (next refresh 시까지). `AuthContext.user` 는 앱 시작/login 시 `fetchUserProfile` 호출로 채워짐. 그 이후 photo_posts.user_id 같은 외래 변경에는 반응하지 않음.

**How to avoid:**
- StudioScreen mount 시 항상 최신 application status를 `fetchMyPhotographerApplication(user.id)` 로 직접 조회 (D-09). user.role 캐시 의존 안 함.
- 승인 알림 (D-11 notifications) 수신 후 (Phase 6 NotificationContext에서) `refreshUser()` 자동 호출 → 그 다음부터 `user.is_photographer = true` 반영.
- Phase 4 단독에서는: 어드민 승인 후 사용자가 앱을 종료 후 재시작하면 `getSession` → `fetchUserProfile` → 최신 데이터. **앱 내에서 즉시 반영하려면 StudioScreen이 fetch + UI 분기**. 이는 D-09에 이미 포함됨.

**Warning signs:** 어드민 패널에서 "승인 완료" 후 앱 새로 고침 안 한 사용자가 Studio 들어가도 가입 화면 → 앱 재시작 후 정상 → "지연" 으로 인식. 해결: 폴링 또는 Realtime subscription (v2).

---

## Code Examples

### Example 1: photographerApi - submitPhotographerApplication (D-08)

```typescript
// Source: 신규 — Phase 3 communityApi.ts:create* 패턴 미러
// File: app/src/services/photographerApi.ts (추가)

interface SubmitApplicationParams {
  user_id: string;
  team_slug: string;
  activity_links: string[];
  activity_plan: string;
  portfolio_url?: string | null;
  bio?: string;
}

export async function submitPhotographerApplication(
  params: SubmitApplicationParams,
): Promise<ApiResult<PhotographerApplication>> {
  try {
    await ensureSlugMaps();
    const teamUuid = teamSlugToUuid(params.team_slug);
    if (!teamUuid) return { data: null, error: 'Invalid team slug' };

    const { data, error } = await supabase
      .from('photographer_applications')
      .insert({
        user_id: params.user_id,
        team_id: teamUuid,
        activity_links: params.activity_links,
        activity_plan: params.activity_plan,
        portfolio_url: params.portfolio_url ?? null,
        bio: params.bio ?? '',
        // status는 DEFAULT 'pending'
      })
      .select('*')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: mapApplication(data), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'submitPhotographerApplication failed';
    return { data: null, error: msg };
  }
}
```

### Example 2: fetchMyPhotographerApplication (D-09)

```typescript
// File: app/src/services/photographerApi.ts (추가)

export async function fetchMyPhotographerApplication(
  userId: string,
): Promise<ApiResult<PhotographerApplication | null>> {
  try {
    const { data, error } = await supabase
      .from('photographer_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })  // 재신청 시 최신 우선
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!data) return { data: null, error: null };  // 신청 없음
    return { data: mapApplication(data), error: null };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'fetchMyPhotographerApplication failed';
    return { data: null, error: msg };
  }
}
```

### Example 3: 등급 계산 유틸 (D-17)

```typescript
// File: app/src/utils/photographerGrade.ts (신규)

export interface GradeInfo {
  grade: number;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  label: string;
  iconColor: string;
  iconName: 'medal-outline' | 'medal' | 'diamond';
}

export function calculateGrade(postCount: number, followerCount: number): number {
  const safePostCount = Math.max(0, Math.floor(postCount));
  const safeFollowerCount = Math.max(0, Math.floor(followerCount));
  return safePostCount + Math.floor(safeFollowerCount / 10);
}

export function gradeToBadge(grade: number): GradeInfo {
  // 임계값: UI-SPEC §GradeBadge tier table 기준
  if (grade >= 50) {
    return { grade, tier: 'diamond', label: '다이아', iconColor: '#1B2A4A', iconName: 'diamond' };
  }
  if (grade >= 20) {
    return { grade, tier: 'gold', label: '골드', iconColor: '#FACC15', iconName: 'medal' };
  }
  if (grade >= 5) {
    return { grade, tier: 'silver', label: '실버', iconColor: '#6B7280', iconName: 'medal-outline' };
  }
  return { grade, tier: 'bronze', label: '브론즈', iconColor: '#A97142', iconName: 'medal-outline' };
}
```

### Example 4: GradeBadge 컴포넌트 (UI-SPEC §GradeBadge)

```typescript
// File: app/src/components/photographer/GradeBadge.tsx (신규)
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, fontWeight, radius, spacing } from '../../styles/theme';
import { gradeToBadge, type GradeInfo } from '../../utils/photographerGrade';

interface GradeBadgeProps {
  grade: number;
  variant?: 'icon' | 'icon-label';
  size?: 'sm' | 'md';
}

export default function GradeBadge({ grade, variant = 'icon-label', size = 'sm' }: GradeBadgeProps) {
  const { t } = useTranslation();
  const info = gradeToBadge(grade);
  const isMd = size === 'md';
  const iconSize = variant === 'icon' ? 20 : isMd ? 16 : 12;
  const fontSizeKey = isMd ? fontSize.meta : fontSize.badge;

  if (variant === 'icon') {
    return (
      <Ionicons
        name={info.iconName}
        size={iconSize}
        color={info.iconColor}
        accessibilityLabel={t('grade_a11y_label', { tier: info.label })}
      />
    );
  }

  return (
    <View
      style={[
        styles.pill,
        isMd ? styles.pillMd : styles.pillSm,
        { backgroundColor: gradeBgColor(info.tier) },
      ]}
      accessibilityLabel={t('grade_a11y_label', { tier: info.label })}
    >
      <Ionicons name={info.iconName} size={iconSize} color={info.iconColor} />
      <Text style={[styles.label, { fontSize: fontSizeKey, color: gradeLabelColor(info.tier) }]}>
        {info.label}
      </Text>
    </View>
  );
}

function gradeBgColor(tier: GradeInfo['tier']) {
  if (tier === 'gold') return colors.featuredAlpha20;
  if (tier === 'diamond') return colors.primaryAlpha8;
  return colors.surfaceLight;
}

function gradeLabelColor(tier: GradeInfo['tier']) {
  if (tier === 'gold') return colors.featuredAccent;
  if (tier === 'diamond') return colors.primary;
  if (tier === 'bronze') return colors.textSecondary;
  return colors.textPrimary;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.round,
  },
  pillSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    fontWeight: fontWeight.name,
  },
});
```

### Example 5: 영상 클라이언트 검증 (D-03)

```typescript
// File: app/src/screens/photographer/UploadPostScreen.tsx (handleAddVideo 확장)

const VIDEO_MAX_DURATION_MS = 30_000;
const VIDEO_MAX_SIZE_BYTES = 50 * 1024 * 1024;
// Pitfall 3 권장: mp4 + quicktime 모두 허용 (iOS 자동 변환 대응)
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime'];

const handleAddVideo = async () => {
  if (videos.length >= MAX_VIDEOS) {
    Alert.alert(t('upload_max_videos'), t('upload_max_videos_desc', { max: MAX_VIDEOS }));
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsMultipleSelection: false,
    quality: 0.7,  // expo-image-picker quality는 영상 압축 prefs (iOS 한정)
  });

  if (result.canceled || result.assets.length === 0) return;
  const asset = result.assets[0];

  // 1) Duration 검증
  if (typeof asset.duration === 'number' && asset.duration > VIDEO_MAX_DURATION_MS) {
    Alert.alert(t('upload_video_too_long_title'), t('upload_video_too_long_desc'));
    return;
  }

  // 2) FileSize 검증 (Android 일부 기기에서 'filesize' lowercase로 반환됨 — 두 키 모두 체크)
  // [VERIFIED: expo/expo Issue #28768]
  const fileSize = asset.fileSize ?? (asset as any).filesize ?? 0;
  if (fileSize > VIDEO_MAX_SIZE_BYTES) {
    Alert.alert(t('upload_video_too_large_title'), t('upload_video_too_large_desc'));
    return;
  }

  // 3) MIME 검증 (iOS .mov 자동 변환 대응 — Pitfall 3)
  if (asset.mimeType && !ALLOWED_VIDEO_MIME.some(m => asset.mimeType!.startsWith(m))) {
    Alert.alert(t('upload_video_unsupported_format_title'), t('upload_video_unsupported_format_desc'));
    return;
  }

  setVideos((prev) => [...prev, asset.uri].slice(0, MAX_VIDEOS));
};
```

### Example 6: pgTAP 트리거 테스트 (D-06 검증, Pitfall 1 + 5 방어)

```sql
-- Source: https://supabase.com/docs/guides/database/extensions/pgtap (CITED)
-- File: supabase/tests/photographer-approval-trigger.sql (신규)

BEGIN;
SELECT plan(8);

-- Setup: 테스트 user + application
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'pg-test@example.com');
-- handle_new_user 트리거가 public.users INSERT
INSERT INTO public.photographer_applications (user_id, team_id, status, activity_plan)
  VALUES (
    '11111111-1111-1111-1111-111111111111',
    (SELECT id FROM teams WHERE slug = 'ssg'),
    'pending',
    'test plan'
  );

-- Test 1: pending 상태에서 photographers 행 없음
SELECT is(
  (SELECT count(*) FROM photographers WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'pending 상태에서는 photographers 행이 생성되지 않는다'
);

-- Test 2: status = approved 업데이트 시 photographers row 생성
UPDATE public.photographer_applications
   SET status = 'approved'
 WHERE user_id = '11111111-1111-1111-1111-111111111111';

SELECT is(
  (SELECT count(*) FROM photographers WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'approved 트리거가 photographers 행을 자동 생성한다'
);

-- Test 3: photographers.team_id 가 application.team_id 와 일치
SELECT is(
  (SELECT team_id FROM photographers WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  (SELECT id FROM teams WHERE slug = 'ssg'),
  'photographers.team_id 가 application.team_id 와 일치한다'
);

-- Test 4: users.is_photographer = TRUE (또는 role = 'photographer' — Pitfall 1 결정에 따라)
SELECT is(
  (SELECT is_photographer FROM users WHERE id = '11111111-1111-1111-1111-111111111111'),
  TRUE,
  'users.is_photographer 가 TRUE 로 업데이트된다'
);

-- Test 5: notifications 행 생성 (approved type)
SELECT is(
  (SELECT type FROM notifications WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  'photographer_approved',
  'approved 트리거가 photographer_approved 알림을 생성한다'
);

-- Test 6: 거절 케이스 — 새 user + application
INSERT INTO auth.users (id, email) VALUES ('22222222-2222-2222-2222-222222222222', 'pg-test2@example.com');
INSERT INTO public.photographer_applications (user_id, team_id, status, rejection_reason, activity_plan)
  VALUES (
    '22222222-2222-2222-2222-222222222222',
    (SELECT id FROM teams WHERE slug = 'lg'),
    'pending',
    '자료 부족',
    'test'
  );

UPDATE public.photographer_applications
   SET status = 'rejected', rejection_reason = '자료 부족'
 WHERE user_id = '22222222-2222-2222-2222-222222222222';

SELECT is(
  (SELECT count(*) FROM photographers WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'rejected 트리거는 photographers 행을 생성하지 않는다'
);

SELECT is(
  (SELECT type FROM notifications WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  'photographer_rejected',
  'rejected 트리거가 photographer_rejected 알림을 생성한다'
);

-- Test 7: 재신청 후 다시 승인 — ON CONFLICT DO NOTHING 동작
UPDATE public.photographer_applications
   SET status = 'approved'
 WHERE user_id = '22222222-2222-2222-2222-222222222222';
-- (재신청 전이라 status는 rejected → approved 로 직접 가는 케이스 — 또는 신규 application row insert 후 approve)

SELECT is(
  (SELECT count(*) FROM photographers WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  '재승인 시 ON CONFLICT 로 중복 INSERT 안 된다'
);

SELECT * FROM finish();
ROLLBACK;
```

실행: `supabase test db` (로컬 stack `supabase start` 후) [CITED: supabase/docs supabase-test-db].

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-av` `<Video>` 컴포넌트 | `expo-video` `useVideoPlayer` + `VideoView` | SDK 52 (2025-04 발표), SDK 54에서 expo-av deprecated | 신규 개발 코드는 무조건 expo-video [VERIFIED: Expo SDK 54 changelog] |
| Sharp on Edge Function | magick-wasm (Deno WASM) | Supabase Edge Runtime Deno 채택 후 (2024년부터 sharp 미지원) | 모든 Edge Function 이미지 처리는 WASM 기반 [VERIFIED: Supabase docs] |
| 클라이언트 트렌딩 스코어 계산 | DB pg_cron + scheduled function | Phase 3 D-06 | Phase 4 등급 계산은 클라이언트 유지 (D-17, 단순 공식 + 캐시 트리거 의존) |
| 클라이언트 mock + 부분 Supabase merge | 일괄 Supabase 전환, mock 즉시 삭제 | Phase 3 D-16 | Phase 4 D-19 — 동일 패턴 photographer에 적용 |
| `is_photographer` boolean | (Phase 4 D-06 트리거가 role 컬럼 변경) | Phase 4 (Pitfall 1 결정 후) | **결정 권장: is_photographer 단독 유지** |
| Supabase Auth `<2.x` JWT HS256 | ES256 asymmetric | Phase 3 03-04에서 발견 (rotation됨) | get-upload-url Edge Function `--no-verify-jwt` 배포 패턴 그대로. generate-thumbnails 도 동일 처리 필요. |

**Deprecated/outdated:**
- `expo-av` Video API: SDK 55에서 완전 제거. 신규 코드 금지.
- Phase 3 mockCommunity.ts 패턴: 삭제됨. Phase 4도 mockPhotographers/mockCheerleaders 동일 처리.
- `PhotographerContext.isRemote` / `isRemoteRef`: D-19 명시 — 일괄 제거. mock fallback 분기는 더 이상 필요 없음.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-video` SDK 54 호환 버전이 `npx expo install` 로 자동 선택된다 (정확 버전 미특정) | §Standard Stack | 잘못된 버전 설치 시 build error 또는 runtime crash. 검증: install 후 `expo-doctor` 실행. |
| A2 | `magick-wasm` 의 `MagickGeometry.fillArea = true` + `image.crop(geometry, Gravity.Center)` 조합이 cover-crop을 정확히 구현한다 | §Pattern 3 | 실제 출력이 contain (letterbox) 일 수 있음. 검증: Wave 0에서 샘플 이미지 (가로/세로/정사각형) 3종 변환 후 ImageMagick CLI 결과와 비교. |
| A3 | Cloudflare R2 public bucket이 `Range: bytes=...` 요청에 정상 응답 (Content-Range 헤더 포함) — 50MB MP4 영상의 streaming 시작 시간이 5초 이내 | §Common Pitfalls Pitfall 4 | 시작 시간이 5초 초과 시 사용자 이탈. Wave 3 QA에서 실측 필요 — 초과 시 v2 Cloudflare Stream 조기 마이그레이션 검토. |
| A4 | Supabase Edge Function Deno runtime 이 `npm:@imagemagick/magick-wasm@0.0.39` 를 정상 import 한다 (deno deploy 호환성) | §Pattern 3 | npm: import 해석 실패 시 함수 배포 실패. 대안: `https://deno.land/x/imagemagick_deno@0.0.27/mod.ts` 사용 (Deno-native fork). |
| A5 | `users.role` 변경 대신 `is_photographer` boolean 단독 사용이 RLS 헬퍼 함수(`is_admin()`)와 충돌하지 않는다 | §Pitfall 1 | 어드민 + photographer 동시 권한 사용자 케이스에서 정책 충돌 가능. 검증: 012_rls_helpers.sql의 `is_admin()` 본문 확인 (role = 'admin' 만 검사) → photographer는 별도 boolean이므로 충돌 없음. |
| A6 | `expo-image-picker` 가 iOS에서 `quality: 0.7` 영상에 대해 동일하게 H.264 MOV 트랜스코딩 (MP4 보존 안 됨) | §Pitfall 3 | 일부 케이스에서 MP4 보존 가능성 — Pitfall 3 권장 해결책(quicktime 허용)이 over-permissive 일 수 있음. iOS 14/15/16/17 별 동작 차이 존재. |
| A7 | `photographer_applications.team_id` 가 D-07에서 추가되며, NULL 허용 시 트리거에서 `users.my_team_id` fallback 가능 | §Pattern 2 | 신청자가 my_team_id도 NULL인 경우 photographers.team_id가 NULL → photographer 프로필 표시 시 팀 표시 누락. UI 영향만, 기능 차단 안 됨. |
| A8 | mockPhotographers/mockCheerleaders 삭제 후 모든 import 가 typecheck 실패로 나타난다 | §Mock 제거 | 부분 import (`import * as mock from '../data/mockPhotographers'`) 시 typecheck 통과 가능. 안전: `git grep "from.*mockPhotographers"` 와 동시 검증. |
| A9 | UI-SPEC의 GradeBadge 임계값 (0/5/20/50)이 PRD/디자인 가이드와 일치한다 (별도 가이드 없음) | §등급 임계값 | 비즈니스 요구사항 추후 변경 시 utility만 수정 OK (D-17 의도). 영향 격리됨. |

**Empty 검증:** 위 9개 모두 `[ASSUMED]` 표시 — Phase 4는 검증 안 된 영역이 일부 있음 (특히 R2 streaming 성능, magick-wasm cover-crop 정확성, iOS picker 동작). Wave 0/3 QA에서 실측으로 결정 가능.

---

## Open Questions

1. **`users.role` CHECK 제약 변경 vs `is_photographer` 단독 사용 (Pitfall 1)**
   - What we know: Phase 1 D-10이 `role IN ('user','admin')` 명시. CONTEXT.md D-06이 `role = 'photographer'` 변경 의도.
   - What's unclear: photographer가 admin이 될 수 있는지, role + boolean 이중 표현이 비즈니스적으로 의미 있는지.
   - Recommendation: **`is_photographer = TRUE` 단독 사용**. Phase 1 D-10 schema 무수정. 트리거 본문 단순. 클라이언트 권한 체크는 `user.is_photographer === true`.

2. **iOS `expo-image-picker` MOV 자동 변환 (Pitfall 3)**
   - What we know: iOS PHPickerViewController가 MP4 → MOV 변환. CONTEXT.md D-03은 MP4 고정.
   - What's unclear: 사용자 갤러리에 원본 MP4가 그대로 저장되어 있어도 picker가 강제 변환하는지.
   - Recommendation: **`video/mp4` + `video/quicktime` 모두 허용**. UI 메시지는 "MP4 영상" 통일, 내부 검증은 두 MIME 모두.

3. **R2 public bucket의 Range Request 동작 (Pitfall 4)**
   - What we know: Cloudflare Community에서 일부 케이스 미정상 응답 보고.
   - What's unclear: r2.dev public URL vs custom domain (media.udamonfan.com — STATE.md 도메인 미구매 블로커) 차이.
   - Recommendation: **Wave 3 QA에서 실측**. 5초 이내 첫 프레임 OK 시 그대로, 초과 시 v2에서 Cloudflare Worker로 Range 정정 미들웨어 추가.

4. **`generate-thumbnails` Edge Function Auth 모드 (`verify_jwt`)**
   - What we know: get-upload-url은 `--no-verify-jwt`로 배포됨 (Phase 3 03-04 결정 — ES256 rotation 이슈).
   - What's unclear: generate-thumbnails도 동일 패턴 필요한지, 아니면 service role key로만 호출되도록 제한할지.
   - Recommendation: **`--no-verify-jwt`로 배포 + 함수 내부에서 `supabase.auth.getUser(token)`로 사용자 검증** (get-upload-url 패턴 동일). 이렇게 하면 사용자 본인 게시물에만 썸네일 생성 가능 (postId 의 photographers.user_id 일치 확인 추가 가능).

5. **Edge Function memory limit (cold start + 7장 동시 처리)**
   - What we know: Supabase Edge Functions는 메모리 제한 있음 (정확 limit 비공개, 보통 256MB).
   - What's unclear: magick-wasm WASM (10MB binary) + 7장 × 10MB 원본 동시 처리 시 OOM 가능성.
   - Recommendation: **Edge Function 내부에서 이미지 한 장씩 순차 처리** (현재 Pattern 3 example 그대로). 병렬 처리 안 함. 실측 후 OOM 발생 시 후속 작업 (queue 분할).

6. **신청자 프로필 사진/포트폴리오 첨부 (D-07 ALTER)**
   - What we know: D-07이 team_id, activity_links, activity_plan만 명시. portfolio_url은 016에 이미 있음.
   - What's unclear: 신청 시 portfolio image 업로드 (포트폴리오 사진 첨부) 필요 여부 — UI-SPEC에 미정의.
   - Recommendation: **v1 Phase 4 범위 밖**. 텍스트 링크 (activity_links)만 지원. 이미지 첨부는 v2.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | 마이그레이션 push, Edge Function deploy, pgTAP test | (CONTEXT.md에서 미명시 — 확인 필요) | 2.7.0+ for static_files | `supabase --version` 으로 검증; 미설치 시 `npm install -g supabase` |
| Supabase local (Docker + supabase start) | pgTAP 테스트 실행 | (개발자 환경 의존) | latest | Skip pgTAP, manual test against staging |
| Node.js | npm 의존성 설치 (expo install, magick-wasm 패키지 다운로드) | ✓ (Phase 3에서 동작 확인) | 추정 18+ | — |
| Deno | (Edge Function은 Supabase 관리 runtime, 로컬 deno 불필요) | (managed) | — | — |
| EAS CLI | development 빌드 (expo-video native module 검증 시) | ✓ (Phase 3 EAS 빌드 성공 기록) | latest | — |
| iOS 시뮬레이터 / 실기기 | 영상 업로드 + 재생 QA (Pitfall 3, 4 검증 필수) | ✓ (Phase 3 QA에서 사용) | iOS 16+ | Android 단독 QA 시 Pitfall 3 발견 불가 |
| Android 에뮬레이터 / 실기기 | 영상 업로드 + 재생 QA | ✓ | API 30+ | — |
| `node_modules/@imagemagick/magick-wasm/dist/magick.wasm` | Edge Function 정적 파일 등록 | (npm install 후 자동) | 0.0.39 | `cp` 명령으로 supabase/functions/generate-thumbnails/magick.wasm 복사 |

**Missing dependencies with no fallback:**
- 없음 — 모든 의존성이 설치 가능하거나 fallback 존재.

**Missing dependencies with fallback:**
- Supabase local Docker stack 미설치 시: pgTAP 트리거 테스트는 staging Supabase에서 manual SQL 실행으로 대체 가능. 단, `BEGIN;...ROLLBACK;` 패턴으로 격리 (Pattern 6 example).

---

## Validation Architecture

> `workflow.nyquist_validation: true` 확인됨 (`.planning/config.json:19`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework (mobile app) | Jest 29.7 + jest-expo 55.0.13 + ts-jest 29.4.9 (이미 설치, `app/package.json:42-46`) |
| Framework (DB triggers) | pgTAP (Supabase 기본 포함) — `supabase test db` |
| Framework (Edge Function) | `supabase functions serve` 로컬 실행 + `curl` / fetch 통합 테스트 (Jest 통합 가능) |
| Config file (mobile) | (jest.config 미확인 — 추정 jest-expo preset 사용; Phase 3에서 `npm test:auth` 동작) |
| Config file (DB) | `supabase/tests/*.sql` (확장자 .sql, 알파벳 순 실행) |
| Quick run command (mobile, 단위) | `cd app && npm test -- --testPathPattern=photographerGrade` |
| Quick run command (DB) | `supabase test db --file photographer-approval-trigger.sql` (특정 파일) |
| Full suite command (mobile) | `cd app && npm test` |
| Full suite command (DB) | `supabase test db` (모든 supabase/tests/*.sql) |
| Full suite command (Edge Function) | `supabase functions serve generate-thumbnails` 로컬 + sample image POST (Wave 0 manual QA) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHOT-01 | mockPhotographers/mockCheerleaders import 0건 | unit (typecheck) | `cd app && npx tsc --noEmit` 후 `git grep -l "mockPhotographers\|mockCheerleaders" app/src/` 결과 비어야 함 | manual ✗ Wave 0 |
| PHOT-01 | PhotographerContext가 mock 없이 부팅 (loading=true → 빈 배열 또는 fetch 결과) | integration | jest test: PhotographerProvider mount 후 useEffect → photographerApi mock 반환 검증 | ❌ Wave 2 |
| PHOT-02 | 트리거 — pending → approved 시 photographers + users.is_photographer + notifications 모두 INSERT | unit (pgTAP) | `supabase test db --file photographer-approval-trigger.sql` (Pattern 6) | ❌ Wave 0 |
| PHOT-02 | 트리거 — pending → rejected 시 photographers 미생성 + photographer_rejected notification INSERT | unit (pgTAP) | 동일 파일, Test 6/7 | ❌ Wave 0 |
| PHOT-02 | 재신청 후 재승인 — ON CONFLICT DO NOTHING | unit (pgTAP) | 동일 파일, Test 8 | ❌ Wave 0 |
| PHOT-02 | submitPhotographerApplication() → DB INSERT + status='pending' DEFAULT | integration | jest test (Supabase mock) | ❌ Wave 1 |
| PHOT-02 | StudioScreen state machine — null/pending/approved/rejected 4분기 렌더링 | snapshot | jest @testing-library/react-native — fetchMyPhotographerApplication mock 별 분기 | ❌ Wave 3 |
| PHOT-03 | 영상 업로드 — D-03 검증 (30s, 50MB, video/mp4 또는 quicktime) | unit | jest test handleAddVideo helper 추출 → asset 객체 mock 입력별 출력 | ❌ Wave 3 |
| PHOT-03 | 영상 업로드 — uploadPostVideos() R2 PUT 성공 시 publicUrl 반환 | manual / integration | EAS dev 빌드 + 실기기 30초 영상 업로드 (Wave 3 QA matrix) | manual ✗ Wave 3 |
| PHOT-03 | 영상 업로드 — Edge Function get-upload-url contentType 'video/mp4' 또는 'video/quicktime' 정상 응답 | manual / integration | `curl` POST to staging Edge Function | manual ✗ Wave 0 |
| PHOT-04 | VideoPlayer 컴포넌트 — feed mode 자동 muted 재생, detail mode 수동 재생 | manual (RNTL hooks 제한) | jest로는 expo-video native bridge mock 한계 — manual QA matrix (iOS+Android) | manual ✗ Wave 3 |
| PHOT-04 | FlatList viewport-aware 자동재생 (가시 아이템만 play) | manual | iOS+Android scroll behavior QA | manual ✗ Wave 3 |
| PHOT-05 | generate-thumbnails Edge Function — 400×400 cover crop JPEG 출력 | unit (manual) | `supabase functions serve generate-thumbnails` + `curl` 샘플 PNG (가로/세로/정사각형 3종) → 출력 dimensions imagemagick CLI 검증 | manual ✗ Wave 0 |
| PHOT-05 | photo_posts.thumbnail_urls UPDATE 정상 동작 + RLS 통과 (service role) | integration | manual: staging에서 createPhotoPost 후 5초 대기 후 SELECT thumbnail_urls 확인 | manual ✗ Wave 0 |
| PHOT-05 | thumbnail_urls 빈 경우 fallback to images[0] | unit (snapshot) | jest test PhotoPostCard with mock post (thumbnail_urls=[]) | ❌ Wave 3 |
| PHOT-06 | calculateGrade(post, follower) 공식 정확성 + edge cases (0, 음수) | unit | jest test app/src/utils/photographerGrade.ts | ❌ Wave 1 |
| PHOT-06 | gradeToBadge(grade) 임계값 매핑 (0/5/20/50) | unit | jest test 위 동일 | ❌ Wave 1 |
| PHOT-06 | GradeBadge 컴포넌트 — variant/size별 렌더 (UI-SPEC 일치) | snapshot | jest @testing-library/react-native | ❌ Wave 3 |
| PHOT-07 | fetchCheerleaders() — DB row → Cheerleader 타입 매핑 정확 | unit | jest test mapCheerleader 함수 | ❌ Wave 1 |
| PHOT-07 | UploadPostScreen 치어리더 selector — DB fetch 결과 표시 | manual | manual QA: SSG 팀 선택 → '박기량' 표시 확인 | manual ✗ Wave 3 |
| PHOT-08 | createCollection / addPostToCollection - await 패턴 (Phase 3 D-21) | unit | jest test (Supabase mock) — optimistic state 변경 없음 확인 | ❌ Wave 2 |
| PHOT-08 | CollectionDetailScreen — 컬렉션의 posts fetch 정확 | manual | manual QA (Wave 3 QA matrix) | manual ✗ Wave 3 |

### Sampling Rate

- **Per task commit:** `cd app && npm test -- --testPathPattern=photographerGrade` (관련 unit test) + `npx tsc --noEmit` (typecheck)
- **Per wave merge:**
  - Wave 0 merge 전: `supabase test db` (모든 pgTAP) + `supabase functions serve generate-thumbnails` 로컬 sample 검증 + `cd app && npm test`
  - Wave 1/2/3 merge 전: `cd app && npm test` 풀 + manual QA matrix 진행도 체크
- **Phase gate:** 모든 자동화 테스트 green + UI-SPEC 매핑 (manual QA matrix Wave 3) 100% 통과 + `/gsd-verify-work` 의 verifier verdict ≥ PASS-WITH-NOTES.

### Wave 0 Gaps

신규 작성 필요:
- [ ] `supabase/tests/photographer-approval-trigger.sql` — Pattern 6 example 그대로
- [ ] `supabase/tests/photo-posts-videos-check.sql` — videos CHECK 제약 (1~3, NULL 허용) 검증
- [ ] `supabase/tests/photo-posts-images-1-7-check.sql` — images CHECK 제약 변경 (1~7) 검증, 8장 INSERT 시 실패
- [ ] `app/src/utils/__tests__/photographerGrade.test.ts` — calculateGrade + gradeToBadge unit
- [ ] `supabase/functions/generate-thumbnails/__tests__/sample/` — 3종 샘플 (가로 800×600, 세로 600×800, 정사각형 1000×1000) — Wave 0 manual 변환 결과 비교용
- [ ] manual QA matrix script (markdown) — Wave 3에서 사용 (영상 업로드 iOS/Android, VideoPlayer mode, Studio state machine, GradeBadge variants, Cheerleader selector)

기존 활용:
- jest config: jest-expo preset (Phase 3에서 `npm test:auth` 검증 완료)
- pgTAP: Supabase 기본 포함 (`supabase test db` 명령 사용 가능)

---

## Security Domain

> `security_enforcement` 항목 미명시 (`.planning/config.json` 확인) → 기본 enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth JWT (Phase 2 완비). Edge Function auth는 Bearer token + `supabase.auth.getUser(token)` 검증 (get-upload-url 패턴 동일) |
| V3 Session Management | yes | AsyncStorage 세션 (Phase 2). Phase 4 신규 없음 |
| V4 Access Control | yes | RLS (`pg_insert_own`, `posts_insert_own EXISTS`, `photographer_apps_insert_own`, `notifications_admin_insert`). 트리거 SECURITY DEFINER 로 RLS 우회 — Pitfall 5 참조 |
| V5 Input Validation | yes | client-side: D-03 영상 검증 + UploadPostScreen 기존 패턴 / server-side: get-upload-url contentType 화이트리스트 + photo_posts.images CHECK 제약 (1~7) + videos CHECK 제약 (1~3) + photographer_applications status enum CHECK |
| V6 Cryptography | no | 직접 암호화 없음. Supabase auth/SSL이 처리 |
| V7 Errors & Logging | yes | console prefix 컨벤션 (Phase 4: `[VideoUpload]`, `[Thumbnail]`). Sentry는 Phase 6 |
| V8 Data Protection | yes | R2 photo-posts prefix는 user_id 기반 (storage path validation in get-upload-url), public read OK (사진은 공개 게시물) |
| V11 Business Logic | yes | 트리거 단일 책임 (D-06: applications status 변경 → 후속 처리 모두 atomic). 클라이언트에서 photographers row 직접 INSERT 금지 |
| V12 File / Resource | yes | 영상 50MB / 30s 제한 (D-03), 이미지 7장 제한 (D-01). MIME whitelist (D-02) |
| V13 API & Web Service | yes | Edge Function CORS — get-upload-url 패턴 (ALLOWED_ORIGINS 또는 native app empty origin) 그대로 generate-thumbnails 에 적용 |

### Known Threat Patterns for {Expo + Supabase + R2}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 사용자가 다른 user_id로 영상 업로드 | Tampering | get-upload-url Edge Function이 token에서 userId 추출 → key 생성 시 강제 (`${prefix}/${userId}/...`). 클라이언트가 임의 path 지정 불가 (이미 구현됨) |
| 50MB 초과 영상으로 R2 비용 폭증 | DoS | 클라이언트 D-03 + Edge Function SIZE_LIMITS 변경 + R2 lifecycle policy (v1 권장 추가) |
| 트리거 ROLLBACK으로 어드민 승인 영구 차단 | DoS | Pattern 2의 SECURITY DEFINER + Pitfall 1/5 검증 + pgTAP 테스트 (Pattern 6) |
| photographer_applications 본인 외 조회 (개인정보 leak) | Information disclosure | 023 RLS `photographer_apps_read` (`auth.uid() = user_id OR is_admin()`) 이미 적용 |
| 임의 사용자가 generate-thumbnails 호출하여 R2 비용 폭증 | DoS | Edge Function 내부에서 `postId`의 owner 검증 — `SELECT user_id FROM photo_posts JOIN photographers ON ... WHERE photo_posts.id = postId`. 본인 게시물 외 거부 |
| iOS .mov 영상 업로드 시도 → 클라이언트 차단 우회 | Tampering | Edge Function `get-upload-url` 의 contentType whitelist (`video/mp4`, `video/quicktime`) 가 server-side 안전망 |
| pending 신청 사용자가 photo_posts 직접 INSERT 시도 | Bypass | RLS `posts_insert_own` (photographers EXISTS 체크) — D-06 트리거가 photographers 행 생성 안 했으므로 INSERT 자동 차단 |
| 신청 폼의 activity_links에 javascript: URL 삽입 | XSS | 클라이언트 PhotographerRegisterScreen에서 `https://`/`http://` prefix 검증 (이미 line 60-63 구현). Phase 4 추가 변경 없음 |

---

## Sources

### Primary (HIGH confidence)

- [Supabase docs — Postgres Triggers](https://supabase.com/docs/guides/database/postgres/triggers) — AFTER UPDATE WHEN, SECURITY DEFINER, atomic transaction
- [Supabase docs — Image Manipulation Edge Function](https://supabase.com/docs/guides/functions/examples/image-manipulation) — magick-wasm 채택 근거
- [Supabase docs — Wasm modules](https://supabase.com/docs/guides/functions/wasm) — config.toml static_files 등록
- [Supabase docs — pgTAP Unit Testing](https://supabase.com/docs/guides/database/extensions/pgtap) — 트리거 테스트 패턴
- [Supabase CLI — Run tests (pgTAP)](https://supabase.com/docs/reference/cli/supabase-test-db) — `supabase test db`
- [Expo docs — Video (expo-video)](https://docs.expo.dev/versions/latest/sdk/video/) — useVideoPlayer + VideoView 패턴
- [Expo docs — ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) — ImagePickerAsset 타입 정의 (duration, fileSize, mimeType)
- [PostgreSQL 18 docs — CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html) — WHEN condition, AFTER trigger 트랜잭션 보장
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) — expo-av deprecation, expo-video 권장
- [Internal: app/src/services/communityApi.ts](app/src/services/communityApi.ts) — Phase 3 페이지네이션 패턴 (D-05 그대로 미러)
- [Internal: supabase/functions/get-upload-url/index.ts](supabase/functions/get-upload-url/index.ts) — Edge Function CORS, auth, presigned URL 패턴
- [Internal: supabase/migrations/011_users.sql](supabase/migrations/011_users.sql) — users.role CHECK 제약 (Pitfall 1 근거)
- [Internal: supabase/migrations/008_photographer_rls.sql](supabase/migrations/008_photographer_rls.sql) — RLS posts_insert_own EXISTS 패턴

### Secondary (MEDIUM confidence — official source 단일)

- [Expensify Bounty: Migrate from expo-av to expo-video (2026-02-04)](https://github.com/Expensify/App/issues/64846) — 마이그레이션 timing 검증
- [Software Mansion Blog — The Future of Video in React Native](https://swmansion.com/blog/the-future-of-video-in-react-native-moving-from-expo-av-to-expo-video-6f4f78e51196) — expo-video 아키텍처 설명
- [Expo Issue #29918 — iOS .MOV 자동 변환](https://github.com/expo/expo/issues/29918) — Pitfall 3 근거
- [Expo Issue #42739 — videoExportPreset 'Passthrough' 무시](https://github.com/expo/expo/issues/42739) — SDK 54/55 동작
- [Expo Issue #28768 — fileSize vs filesize 키 불일치](https://github.com/expo/expo/issues/28768) — Example 5 근거
- [Expo Issue #35012 — expo-video black screen on Android player reuse](https://github.com/expo/expo/issues/35012) — Anti-pattern 근거
- [Cloudflare Community — Public R2 bucket Range Request 미응답](https://community.cloudflare.com/t/public-r2-bucket-doesnt-handle-range-requests-well/434221) — Pitfall 4 근거
- [Cloudflare Community — Range Request Support for Videos in R2](https://community.cloudflare.com/t/range-request-support-for-videos-in-r2-buckets/776059) — Pitfall 4 보강
- [Convertio — MP4 Faststart](https://convertio.com/mov-to-mp4/faststart-web-video) — moov atom 설명
- [Medium @jenshandersson — Optimized FlatList of videos](https://medium.com/@jenshandersson/react-native-optimized-flatlist-of-videos-bb048cb696db) — viewport-aware 자동재생 패턴

### Tertiary (LOW confidence — verification needed at Wave QA)

- [Reactnativerelay — Expo SDK 55 Migration Guide (2026)](https://reactnativerelay.com/article/expo-sdk-55-migration-guide-breaking-changes-sdk-53-to-55) — SDK 55 expo-av 완전 제거 (별도 1차 source 검증 필요)
- [magick-wasm GitHub demo](https://github.com/dlemstra/magick-wasm) — 데모 코드 미확인 (Wave 0에서 실제 빌드 검증)
- [Supabase Discord/Forum — magick-wasm Edge Function 메모리 issue](https://www.answeroverflow.com/m/1387160483110326423) — Open Question 5 근거
- [imagemagick_deno@0.0.27 (Deno-native fork)](https://deno.land/x/imagemagick_deno@0.0.27) — Assumption A4 fallback 옵션

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `expo-video` SDK 54 권장 + `magick-wasm` Supabase 공식 권장 모두 1차 source 다중 확인
- Architecture: HIGH — 트리거 패턴 PostgreSQL/Supabase docs + Phase 3 communityApi 페이지네이션 내부 검증
- Pitfalls: HIGH — Pitfall 1 (users.role CHECK)는 코드베이스 직접 검증, Pitfall 2/3/4는 GitHub Issues + Cloudflare Community 다중 source
- Validation Architecture: HIGH — pgTAP/jest-expo 모두 기존 인프라 (Phase 3 동작 확인됨)
- Edge Function generate-thumbnails: MEDIUM — Pattern 3 example은 Supabase docs + magick-wasm README 종합. Wave 0에서 실제 빌드/배포로 final 검증 필요

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30일) — 단, expo-video는 fast-moving (SDK 55 출시 전 권장 — 7일 단위 재검증 권장)
