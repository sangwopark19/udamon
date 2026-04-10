# Phase 3: Community - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 03-community
**Areas discussed:** 서비스 레이어 & 조인 전략, 페이지네이션·트렌딩·검색, 이미지 업로드 & Optimistic Update, CommunityContext 리팩토링 & UX, Poll 처리, 신고·차단 흐름, 엣지 케이스 & 게스트 모드

---

## 서비스 레이어 & 조인 전략

### Q1: community_posts와 public.users를 어떻게 조인해서 nickname/avatar_url을 가져올까요?

| Option | Description | Selected |
|--------|-------------|----------|
| FK 명시 + embedded select | community_posts.user_id에 public.users FK 명시 + PostgREST embedded select. 1 query, 네이티브 지원 | ✓ |
| 별도 쿼리 후 클라이언트 병합 | posts fetch → user_id 수집 → public.users.in('id', ids) → Map 병합. 2 round-trip | |
| Postgres VIEW 생성 | v_community_posts_with_author VIEW — 단순 호출. 마이그레이션 추가 | |
| RPC 함수 | 전체 로직을 Postgres 함수로. 캡슐화 최상이지만 추론 어려움 | |

**User's choice:** FK 명시 + embedded select (Recommended)
**Notes:** 성능 + 단순성 최상, photographerApi 패턴과 일관

### Q2: communityApi.ts 구조를 photographerApi.ts 패턴과 동일하게 만들까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 동일 패턴 유지 | ApiResult<T>, ensureSlugMaps 재사용, mapRow, try/catch | ✓ |
| 공유 helper로 추출 후 재사용 | services/_shared/ 로 분리 | |
| 간소화된 독립 구조 | team slug 매핑 없이 uuid 직접 사용 | |

**User's choice:** 동일 패턴 유지 (Recommended)
**Notes:** 일관성, 리뷰 용이, 학습 비용 최소

### Q3: 탈퇴한 사용자 표시를 어디서 처리할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 클라이언트 렌더링 시 처리 | CommunityPostCard 등에서 is_deleted 체크 | ✓ |
| mapRow에서 변환 | mapCommunityPost에서 user placeholder로 교체 | |
| DB VIEW에서 처리 | CASE WHEN is_deleted로 VIEW | |

**User's choice:** 클라이언트 렌더링 시 처리 (Recommended)
**Notes:** DB 데이터 불변, UI 레이어에서만 가공

### Q4: comment tree 로딩을 어떻게 처리할까요?

| Option | Description | Selected |
|--------|-------------|----------|
| 게시글 상세 진입 시 전체 fetch | 모든 댓글 + 대댓글 한 번에 | ✓ |
| 부모 댓글 pagination + 대댓글 lazy | 초기 로드 빠르지만 복잡 | |
| 게시글 + 댓글 한 번에 fetch | fetchPostDetail에서 합쳐서 리턴 | |

**User's choice:** 게시글 상세 진입 시 전체 fetch (Recommended)
**Notes:** 1-depth, 양 적음 → pagination 오버엔지니어링

---

## 페이지네이션 · 트렌딩 · 검색

### Q1: 게시글 목록 pagination을 어떤 방식으로?

| Option | Description | Selected |
|--------|-------------|----------|
| Range 기반 (.range()) | 20개씩, 구현 쉬움 | ✓ |
| Cursor-based (created_at) | 새 게시글 삽입 시에도 중복 없음 | |
| Offset-based | .limit + .offset — 가장 단순 | |

**User's choice:** Range 기반 (Supabase .range()) (Recommended)
**Notes:** photographerApi에도 동일 패턴 적용 가능

### Q2: 트렌딩 계산을 어디서?

| Option | Description | Selected |
|--------|-------------|----------|
| DB Scheduled Function (pg_cron) | 10분 주기 is_trending 업데이트 | ✓ |
| RPC 함수 on-demand | 매 호출마다 계산, 스케줄러 불필요 | |
| 클라이언트 스코어링 유지 | 현재 로직 유지, 전체 로드 필요 | |
| Materialized View | REFRESH 주기 필요, 성능 최상 | |

**User's choice:** DB Scheduled Function (Recommended)
**Notes:** 서버 계산 + 인덱스 활용 + pagination 호환

### Q3: 검색 기능을 어떻게 구현?

| Option | Description | Selected |
|--------|-------------|----------|
| ILIKE 기반 단순 검색 | title/content ILIKE + players별도 검색 | ✓ |
| Postgres Full-Text Search | tsvector + GIN, 한국어 파싱 필요 | |
| 통합 RPC 함수 | search_community(q) — 서버 1회 | |
| pg_trgm | trigram 유사도, 한국어 제한적 | |

**User's choice:** ILIKE 기반 단순 검색 (Recommended)
**Notes:** 초기 사용자 수에 적합, FTS는 v2

### Q4: 최근 검색어를 어디에 저장?

| Option | Description | Selected |
|--------|-------------|----------|
| DB (recent_searches 테이블) | Phase 1에서 이미 준비됨, RLS + 트리거 | ✓ |
| AsyncStorage (로컬) | 오프라인 동작, 기기 간 싱크 없음 | |
| DB + AsyncStorage 병행 | 복잡도 증가 | |

**User's choice:** DB (recent_searches 테이블) (Recommended)
**Notes:** Phase 1 기반 재사용

---

## 이미지 업로드 & Optimistic Update

### Q1: 게시글 작성 시 이미지 업로드 순서?

| Option | Description | Selected |
|--------|-------------|----------|
| R2 업로드 먼저 → posts INSERT | 성공 시 URL 포함 INSERT, R2 고아 파일 가능 | ✓ |
| posts INSERT 먼저 → R2 → UPDATE | 고아 레코드 가능, ID를 key에 포함 | |
| Draft 상태 패턴 | status 컬럼 필요, 복잡도 증가 | |

**User's choice:** R2 업로드 먼저 → posts INSERT (Recommended)
**Notes:** 고아 파일은 v1 방치, v2에서 cleanup cron 고려

### Q2: 좋아요/댓글 작성 시 Optimistic Update 전략은?

| Option | Description | Selected |
|--------|-------------|----------|
| 좋아요만 optimistic + 실패 롤백 | 즉각 반응, 댓글은 안전하게 await | ✓ |
| 모두 optimistic + 롤백 | 최대 UX, 댓글 ID 매칭 복잡 | |
| 모두 await (안전한 방식) | 단순, 네트워크 지연 UX 저하 | |

**User's choice:** 좋아요만 optimistic + 실패 롤백 (Recommended)
**Notes:** 사용자 입력 있는 인터랙션 vs 토글 구분

### Q3: 게시글 view_count 증가를 어떻게?

| Option | Description | Selected |
|--------|-------------|----------|
| RPC 함수 increment_post_view(post_id) | atomic, race condition 없음 | ✓ |
| 클라이언트 UPDATE .update | read-modify-write 패턴 | |
| v1에서 생략 | view_count 컬럼 유지, 증가 안 함 | |

**User's choice:** RPC 함수 increment_post_view(post_id) (Recommended)
**Notes:** DB 함수 하나 추가로 atomic 보장

---

## CommunityContext 리팩토링 & UX

### Q1: 현재 mock 기반 CommunityContext를 어떻게 교체?

| Option | Description | Selected |
|--------|-------------|----------|
| 일괄 교체 (전체 Supabase 전환) | 한 번에 완전 전환, mock import 제거 | ✓ |
| 점진적 교체 (feature flag) | USE_SUPABASE_COMMUNITY flag, PhotographerContext 패턴 | |
| CommunityContext 새로 작성 | _old_ 남기고 새 파일 | |

**User's choice:** 일괄 교체 (전체 Supabase 전환) (Recommended)
**Notes:** Phase 분리된 이유 — 한 번에 완전전환 권장

### Q2: 로딩 상태와 에러 UI 처리?

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton + Toast + Pull-to-refresh | 기존 CommunitySkeleton, showToast, RefreshControl 재사용 | ✓ |
| 전체 화면 로딩 스피너 | 단순하지만 깜박임 | |
| Error Boundary + 자동 재시도 | 복잡도 증가, 과잉 | |

**User's choice:** Skeleton + Toast + Pull-to-refresh (Recommended)
**Notes:** 기존 컴포넌트 재사용

### Q3: 로그인/차단 상태 변경 시 이미 로드된 게시글 목록 반영?

| Option | Description | Selected |
|--------|-------------|----------|
| 다음 fetch에서 반영 (단순) | RLS 자동 필터, refreshPosts 호출 | ✓ |
| 즉시 클라이언트 필터 | BlockContext 구독 → 즉각 제거 | |
| 화면 전환 시 전체 refresh | 매번 fetch, 네트워크 낭비 | |

**User's choice:** 다음 fetch에서 반영 (Recommended)
**Notes:** RLS가 전담, 단순성

---

## Poll (투표) 처리

### Q1: 사용자가 이미 투표했는지 확인 방법?

| Option | Description | Selected |
|--------|-------------|----------|
| posts fetch 시 poll + user votes 함께 조인 | embedded select로 1 query | ✓ |
| 로그인 시 전체 투표 이력 로드 | 메모리 Map, 데이터 커질 수 있음 | |
| 게시글 상세 진입 시 별도 쿼리 | 2 round-trip | |

**User's choice:** posts fetch 시 poll + user votes 함께 조인 (Recommended)

### Q2: 만료된 투표 UI 처리?

| Option | Description | Selected |
|--------|-------------|----------|
| 결과만 표시 + 투표 불가 | 버튼 비활성, 안내 + % 표시 | ✓ |
| 결과 + 내 투표 체크마크 | is_closed + my_votes join 필요 | |
| 만료 날짜 표시만 | 결과 숨김, 최소 구현 | |

**User's choice:** 결과만 표시 + 투표 불가 (Recommended)

---

## 신고 · 차단 흐름

### Q1: 신고 중복 방지와 피드백 처리?

| Option | Description | Selected |
|--------|-------------|----------|
| DB 트리거에 전적 의존 + 에러 파싱 | DB UNIQUE + check_self_report, 에러 메시지 토스트 | ✓ |
| 클라이언트 사전 체크 + DB 재확인 | reportedIds Set + user_id 비교 | |
| 로그인 시 reportedIds 전체 로드 | 정확하지만 데이터 큼 | |

**User's choice:** DB 트리거에 전적 의존 + 에러 파싱 (Recommended)

### Q2: 차단 후 클라이언트 BlockContext 연계?

| Option | Description | Selected |
|--------|-------------|----------|
| RLS만 사용 + 차단 후 refresh | blockUser → refreshPosts 호출 | ✓ |
| RLS + 클라이언트 동기화 | posts state에서 즉각 제거 | |
| BlockContext 구독 + useMemo 필터 | 매 render 시 filter | |

**User's choice:** RLS만 사용 + 차단 후 refresh (Recommended)

---

## 엣지 케이스 & 에러 처리

### Q1: R2 업로드 성공 + post INSERT 실패 시 고아 파일 처리?

| Option | Description | Selected |
|--------|-------------|----------|
| v1에서는 그대로 방치 | v2 cleanup cron 고려 | ✓ |
| 클라이언트에서 즉시 삭제 시도 | DELETE presigned URL 필요, Edge Function 변경 | |
| Draft 패턴 + cleanup job | 복잡도 높음 | |

**User's choice:** v1에서는 그대로 방치 (Recommended)

### Q2: 게시글 조회/작성 실패 시 자동 재시도?

| Option | Description | Selected |
|--------|-------------|----------|
| 조회: 버튼 재시도 / 작성: Alert | 사용자 명시적 액션 | ✓ |
| 모두 자동 재시도 (3회, exponential backoff) | v1 범위 오버스펙 | |
| 네트워크 에러만 1회 재시도 | 부분 자동화 | |

**User's choice:** 조회: 버튼 재시도 / 작성: Alert 경고 (Recommended)

### Q3: 게스트 모드에서 Phase 3 기능 접근 제한?

| Option | Description | Selected |
|--------|-------------|----------|
| 조회만 허용, 액션은 로그인 게이트 | useLoginGate 호출 | ✓ |
| 게스트 모드 완전 제거 | D-11 완전 일치, 오버 범위 | |
| 일부 목록·상세 존재만 | 구현 복잡 | |

**User's choice:** 조회만 허용, 액션은 로그인 게이트 (Recommended)
**Notes:** Phase 1 D-11과 충돌하여 별도 후속 질문 진행

---

## 중요 충돌 해결: Phase 1 D-11 보완

### Q: Phase 1 D-11 (비인증 완전 차단) 충돌 해결?

| Option | Description | Selected |
|--------|-------------|----------|
| Community는 anon SELECT 부활 (D-11 일부 완화) | 공개 게시판만 허용, 민감 테이블 유지 | ✓ |
| Community 탐색도 로그인 강제 (D-11 유지) | 일관성 유지, 탐색성 손실 | |
| 게스트 모드 완전 제거 | 범위 외 | |

**User's choice:** Community는 anon SELECT 부활 (D-11 일부 완화) (Recommended)
**Notes:** D-19로 기록됨. community_posts/comments/polls/poll_options/players만 anon SELECT 부활, 민감 테이블은 D-11 그대로 유지.

---

## Claude's Discretion

- `communityApi.ts` 함수 시그니처 세부
- `ensureSlugMaps()` 공유 helper 추출 여부
- pg_cron 스케줄 주기 (기본 10분)
- `update_trending_posts()` 함수의 트렌딩 스코어 공식 세부
- ILIKE 검색 결과 정렬 기준
- `mapCommunityPost` / `mapCommunityComment` 세부
- `CommunityContext` state shape
- 에러 메시지 i18n 키

---

## Deferred Ideas

- Orphan R2 파일 cleanup cron → v2
- Full-text search (tsvector) / pg_trgm → v2
- Poll 실시간 업데이트 → v1 Realtime 미사용 확정 → v2
- 댓글 pagination → v2
- 댓글 optimistic update → v2
- 신고 이력 전체 로드 → v2
- 게시글 수정 시 이미지 부분 교체 → v2
- Materialized view 기반 트렌딩 → v2

---
