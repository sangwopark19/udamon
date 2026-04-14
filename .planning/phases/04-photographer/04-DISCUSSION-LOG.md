# Phase 4: Photographer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 04-photographer
**Areas discussed:** 영상 업로드 & 스키마, 심사 프로세스 (application), 이미지 리사이징 / 썸네일 전략, 등급 & Mock 제거 + 치어리더/컬렉션

---

## 영상 업로드 & 스키마

### Q1. photo_posts에 영상을 어떻게 담을까요? (현재 images TEXT[] CHECK 1~10)

| Option | Description | Selected |
|--------|-------------|----------|
| videos TEXT[] 컬럼 분리 | ALTER photo_posts ADD COLUMN videos TEXT[], CHECK 1~3. images는 1~7로 다운 조정. type 명확. | ✓ |
| images TEXT[]에 합치고 type 프러미트 | URL 확장자(.mp4/.mov)로 클라이언트 type 구분, CHECK 1~10 유지. 렌더링 분기 복잡. | |
| photo_post_media 다형 테이블 분리 | CREATE TABLE photo_post_media — 정규화. 조인 복잡, over-engineering. | |

**User's choice:** videos TEXT[] 컬럼 분리 (추천)
**Notes:** Phase 3 패턴 연속성. images/videos 분리 + CHECK 제약 정리로 타입 안전성 확보.

### Q2. 영상 업로드 R2 prefix는?

| Option | Description | Selected |
|--------|-------------|----------|
| photo-posts 한 곳으로 유지 | Edge Function prefix 3종 유지, contentType 검증만 확장. | ✓ |
| photo-videos prefix 분리 | R2 소비 통계/라이프사이클 분리 이점, Edge Function 수정 + CORS/정책 업데이트. | |

**User's choice:** photo-posts 한 곳으로 유지 (추천)
**Notes:** Edge Function 수정 최소화. 영상이 photo-posts 하위에 들어가도 확장자로 구분 가능.

### Q3. 영상 파일 제약 (포맷/크기/길이)은?

| Option | Description | Selected |
|--------|-------------|----------|
| MP4 + 액션 미만 | 포맷 고정, 하드 제약 없이 사용자 안내만. | |
| 60초 + 100MB | 클라이언트에서 확인 후 차단. R2 비용/재생 UX 균형. | |
| 30초 + 50MB 엄격 제약 | 모바일 데이터/재생 부담 중심. v1 취지 엄격. | ✓ |

**User's choice:** 30초 + 50MB 엄격 제약
**Notes:** 비용/UX 안정성 우선. 사용자 선택 시점에 즉시 안내.

### Q4. 영상 업로드 타이밍과 순서는?

| Option | Description | Selected |
|--------|-------------|----------|
| 이미지+영상 순차 업로드 → INSERT | Phase 3 D-09 확장. 실패 시 Alert+폼 유지, 고아 파일 deferred. | ✓ |
| 병렬 업로드 (Promise.all) | 속도 개선 ↑, 한 쪽 실패 시 다른 쪽 성공 → 고아 파일 증가. | |

**User's choice:** 이미지+영상 순차 업로드 → INSERT (추천)
**Notes:** Phase 3 패턴 유지. 로직 단순, 에러 추적 용이.

---

## 심사 프로세스 (application)

### Q1. 신청 제출 시 photographers row는 언제 생성되나요?

| Option | Description | Selected |
|--------|-------------|----------|
| 승인 시 자동 생성 (DB 트리거) | approved UPDATE → photographers INSERT + users.role='photographer'. RLS가 자연스러운 가드. | ✓ |
| 신청 즉시 photographers 생성 + is_verified=false | pending에도 프로필 생성. 노출 필터링 쿼리 복잡. | |
| 승인 시 클라이언트 수동 생성 | 어드민 권한 추가 필요, 누락 위험. | |

**User's choice:** 승인 시 자동 생성 (DB 트리거)
**Notes:** RLS가 업로드 차단을 자연스럽게 수행 — 추가 권한 로직 불필요.

### Q2. 심사중 상태에서 사용자 UI는?

| Option | Description | Selected |
|--------|-------------|----------|
| 신청 완료 화면 + 프로필 미노출 | PhotographerRegister Step 4 = 심사 대기 메시지. 다른 활동 정상. | ✓ |
| 업로드 허용 + 본인만 pending 가시성 | 생산성 ↑이지만 구현 복잡 — photographers 없으면 업로드 불가. | |

**User's choice:** 신청 완료 화면 + 프로필 미노출 (추천)
**Notes:** D-06과 일관. 간결, 오류 여지 최소.

### Q3. 게시물 심사(photo_posts.status) 정책은?

| Option | Description | Selected |
|--------|-------------|----------|
| 승인 PG는 업로드 즉시 approved | DEFAULT approved 유지. 어드민 수동 rejected만. | ✓ |
| 승인 PG 게시물도 심사 대기 (pending) | 매건 승인 — 운영 부담 증가. | |

**User's choice:** 승인 PG는 업로드 즉시 approved (추천)
**Notes:** 운영 인원 1~2명 제약과 일치. 관리자 수동 처리는 신고 기반.

### Q4. 심사 결과 사용자 알림 경로?

| Option | Description | Selected |
|--------|-------------|----------|
| notifications 테이블 in-app 알림만 | Phase 6에서 UI 소비. INSERT만 Phase 4 담당. | ✓ |
| in-app + 이메일 (Supabase Auth) | 확실한 도달이지만 SMTP 설정 필요, v1 범위 확대. | |
| 알림 없음 | UX 열악. | |

**User's choice:** notifications 테이블 in-app 알림만 (추천)
**Notes:** Phase 6과의 명확한 경계. 이메일/푸시는 블로커 해소 후.

---

## 이미지 리사이징 / 썸네일 전략

### Q1. 썸네일 생성 전략은?

| Option | Description | Selected |
|--------|-------------|----------|
| 신규 Edge Function + thumbnail_urls 컬럼 | generate-thumbnails Edge Function 신설, fire-and-forget. | ✓ |
| Cloudflare Image Resizing (URL 파라미터) | 인프라 내장, DB 변경 불필요. 과금 주의. | |
| 클라이언트 썸네일 생성 후 함께 업로드 | 트래픽 2배 + CPU 부담. | |

**User's choice:** 신규 Edge Function + thumbnail_urls 컬럼 (추천)
**Notes:** 서버 생성 = 신뢰 가능한 단일 경로, 관찰성 ↑. Cloudflare Image는 v2에서 재평가 deferred.

### Q2. 적용 범위 (지금 만들기 vs 나중)?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4에서 신규 게시물만 적용 | fallback: images[0]. 범위 통제. | ✓ |
| 기존 게시물도 백필 스크립트로 생성 | R2 사용량 일시 증가, 버그 복구 복잡. | |

**User's choice:** Phase 4에서 신규 게시물만 적용 (추천)
**Notes:** 위험 최소화. 백필은 후속 이슈 deferred.

### Q3. 썸네일 크기/개수는?

| Option | Description | Selected |
|--------|-------------|----------|
| 400px 단일 사이즈 | 피드/갤러리 공용. storage 최소. | ✓ |
| 다중 사이즈 (200/400/800) | 반응형 대응. storage 3배, 복잡도 ↑. | |

**User's choice:** 400px 단일 사이즈 (추천)
**Notes:** v1 단일 사이즈로 충분. 다중 사이즈는 v2 deferred.

### Q4. 업로드 시 인프라 시퀀스는?

| Option | Description | Selected |
|--------|-------------|----------|
| Edge Function 기동으로 | 클라이언트 fire-and-forget 호출. 관찰성 높음. | ✓ |
| DB trigger → pg_net으로 Edge Function 호출 | 클라이언트 단순, 관찰성 낮음. over-engineering. | |

**User's choice:** Edge Function 기동으로 (추천)
**Notes:** 서버 빠른 로그인. 실패해도 원본 images[0] fallback 이므로 UX 안정.

---

## 등급 & Mock 제거 + 치어리더/컬렉션

### Q1. 등급 계산 위치는?

| Option | Description | Selected |
|--------|-------------|----------|
| 클라이언트에서 계산 | DB 스키마 변경 불필요. 공식 변경 시 클라이언트만. | ✓ |
| DB generated column | 정렬/필터 가능. v1 오버엔지니어링. | |
| API 응답 시 계산 (view/RPC) | 중간 층 추가 복잡도. | |

**User's choice:** 클라이언트에서 계산 (추천)
**Notes:** photographers.post_count / follower_count 는 DB 트리거로 자동 증감. 클라이언트 매 fetch 최신 계산 가능.

### Q2. 등급 표시 UI는?

| Option | Description | Selected |
|--------|-------------|----------|
| 구간별 등급명 배지 (브론즈/실버/골드/다이아) | 게이미피케이션 느낌. 프로필 헤더 중심. | ✓ |
| 숫자 레벨만 표시 (Lv. 15) | 단순, 투명. 미감 부족. | |
| 검증 배지만 표시 (is_verified) | 디자인 단순, PHOT-06 미충족. | |

**User's choice:** 구간별 등급명 배지 (추천)
**Notes:** 임계값 초안: 0-4/5-19/20-49/50+. 세부는 planner 재량.

### Q3. PhotographerContext Mock 제거 전략은?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 3 D-16 패턴 그대로 | 일괄 제거, merge 로직 삭제. 일관성 ↑. | ✓ |
| 점진 제거 (photographers 먼저, cheerleaders 나중) | 안전하지만 Phase 3 패턴과 불일치. | |

**User's choice:** Phase 3 D-16 패턴 그대로 (추천)
**Notes:** 일관된 리팩토링 = 디자인 리뷰 용이.

### Q4. 기존 버그 (togglePhotoLike 빈 userId)는?

| Option | Description | Selected |
|--------|-------------|----------|
| 이번 Phase에서 모두 수정 | PHOT-01 "Supabase 연동 완성" 범위 내. | ✓ |
| quick task로 분리 | Phase 4 범위 제한, 이후 별도 처리. 미교정 출발. | |

**User's choice:** 이번 Phase에서 모두 수정 (추천)
**Notes:** useAuth().user.id 주입으로 근본 수정.

---

## Claude's Discretion

- 마이그레이션 번호/파일명 (029~032 초안)
- Edge Function 구현 라이브러리 (imagescript vs sharp-wasm)
- 등급 임계값/아이콘 (초안 브론즈/실버/골드/다이아)
- RLS 추가 수정 여부 (photographer_applications 거절 사유 조회)
- pending/approved Studio 화면 UI 세부
- expo-av vs expo-video 라이브러리 결정 (SDK 54 권장)
- 영상 재생 자동재생 정책
- mockPhotographers/mockCheerleaders 제거 vs _legacy/ 이동

## Deferred Ideas

- 기존 photo_posts 썸네일 백필
- 영상 썸네일 (프레임 캡처)
- 다중 사이즈 썸네일
- Cloudflare Image Resizing 대안 평가
- Orphan 파일 cleanup cron
- 심사 자동화
- 포토그래퍼 게시물 pending 심사
- 이메일/FCM 알림
- 등급 임계값 데이터 기반 튜닝 / 어워드 시스템
- 영상 해상도 프리셋
- ImageEditorModal 영상 지원
- 컬렉션 공개/비공개 설정
