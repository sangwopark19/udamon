---
status: partial
phase: 04-photographer
source: [04-VERIFICATION.md]
started: 2026-04-15T03:34:02Z
updated: 2026-04-15T03:34:02Z
---

## Current Test

[awaiting human testing]

## Tests

본 UAT는 Phase 4 자동 검증 완료 후 남은 **실기기 QA 매트릭스 9개 섹션**입니다.
상세 체크리스트: `docs/phase4-qa-matrix.md` (Section A~I)

### 1. 영상 업로드 iOS/Android 실기기 QA (Section A)
expected: UploadPostScreen에서 video/mp4, video/quicktime 허용 / .avi·.mkv 차단 / 30초 초과 Alert / 50MB 초과 Alert / 3개 max
result: [pending]

### 2. VideoPlayer 앱 내 재생 QA (Section B)
expected: 피드 muted / 상세 controls / iOS PiP / Android viewport pause / back cleanup / seek
result: [pending]

### 3. StudioScreen state machine 실기기 QA (Section C)
expected: no_application CTA / pending 화면 / approved + GradeBadge / rejected reason + 재신청 / 승인→거절 재시작 반영
result: [pending]

### 4. GradeBadge tier 색상 실기기 QA (Section D)
expected: 4 tier 색상 (0/10/30/50 posts) / Profile icon-label md / Card icon 20px / 전환 애니메이션
result: [pending]

### 5. Cheerleader selector 실기기 QA (Section E)
expected: my_team SSG → 박기량 등 표시 / 팀 전환 시 리로드 / cheerleader_id 저장
result: [pending]

### 6. CollectionDetailScreen 실기기 QA (Section F)
expected: 컬렉션 생성 await / getCollectionPosts fetch / 타 사용자 컬렉션 public_read
result: [pending]

### 7. 어드민 승인 → 사용자 반영 E2E (Section G)
expected: 스테이징 UPDATE photographer_applications → approved → notifications row / rejection_reason 표시 / ADJ-01 users.role 유지
result: [pending]

### 8. Range Request 성능 (Section H)
expected: iOS 50MB MP4 첫 프레임 5초 이내 / Android 동일
result: [pending]
note: Section H 단독 실패 시 v2 Cloudflare Worker 범위로 이관 가능

### 9. Edge Function Smoke Test (Section I)
expected: generate-thumbnails 400x400 JPEG 생성 / 타인 postId 403 / 토큰 없음 401 / get-upload-url video/quicktime OK / video/webm 400 (CR-01 fix 검증)
result: [pending]

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0
blocked: 0

## Gaps
