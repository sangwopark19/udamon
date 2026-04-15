# Phase 4 — Manual QA Matrix

> Wave 3 완료 전 반드시 통과해야 하는 실기기 검증.
> 작성: Plan 04-01 (2026-04-15)
> Target: EAS development 빌드 (iOS + Android)

## A. 영상 업로드 (PHOT-03, T-4-02/06)

- [ ] iOS 16+: 갤러리에서 25초 H.264 MOV 영상 선택 → Alert 없음 → 업로드 성공 → 피드 썸네일 + 재생 OK
- [ ] iOS 16+: 45초 영상 선택 → "영상 길이 초과" Alert 표시, 업로드 차단
- [ ] iOS 16+: 60MB 영상 선택 → "파일 크기 초과" Alert, 업로드 차단
- [ ] Android API 30+: 25초 MP4 영상 업로드 성공
- [ ] Android API 30+: 3개 업로드 후 4번째 시도 → "최대 3개" Alert
- [ ] 네트워크 끊김 상황: 업로드 실패 Alert + 폼 유지
- [ ] iOS: .mov 파일 → get-upload-url contentType=video/quicktime 으로 presigned URL 정상 발급
- [ ] Android: .mp4 파일 → get-upload-url contentType=video/mp4 으로 presigned URL 정상 발급
- [ ] 지원하지 않는 포맷 (.avi, .mkv) 선택 시 클라이언트측 필터링 or 서버 400 응답

## B. VideoPlayer (PHOT-04)

- [ ] iOS: feed 모드 자동 muted 재생, 탭 시 상세 화면 이동
- [ ] iOS: detail 모드 탭 → native controls 노출, 정지/재생/seek OK
- [ ] iOS: PiP 지원 (detail 모드)
- [ ] Android: feed scroll 중 viewport 벗어난 아이템 pause 확인
- [ ] Android: Back 버튼 누를 시 player cleanup 됨 (메모리 leak 없음)
- [ ] 긴 영상 seek 동작 (25초 영상 중간 지점 jump)
- [ ] detail 모드에서 화면 회전 시 player 유지 or 적절한 복구
- [ ] 백그라운드 진입 → 포그라운드 복귀 시 player 복원

## C. Studio state machine (PHOT-02, D-09)

- [ ] No application: Studio 탭 진입 → "포토그래퍼로 활동하기" CTA 표시 → Register 화면 이동
- [ ] Pending: Studio 탭 → "심사 대기 중" 화면 + 예상 시간 안내
- [ ] Approved: Studio 탭 → 기존 스튜디오 UI + 상단 GradeBadge 노출
- [ ] Rejected: Studio 탭 → "거절됨" 화면 + rejection_reason + 재신청 버튼
- [ ] 어드민이 approved → rejected 전환 시 앱 재시작 후 상태 반영

## D. GradeBadge (PHOT-06)

- [ ] 0 posts, 0 followers → 브론즈 (#A97142)
- [ ] 10 posts, 0 followers → 실버
- [ ] 30 posts, 0 followers → 골드 (#FACC15)
- [ ] 50 posts, 0 followers → 다이아 (#1B2A4A)
- [ ] PhotographerProfileScreen header 에 `icon-label` `md`, PhotographerCard 에 `icon` 20px
- [ ] 등급 전환 애니메이션 (선택) — 포스트 업로드 직후 승급 시 인디케이터

## E. Cheerleader selector (PHOT-07)

- [ ] my_team=SSG 로 UploadPostScreen 진입 → 치어리더 selector 에 '박기량' 등 SSG 치어리더만 표시
- [ ] my_team=두산 으로 전환 후 selector 리로드 → 두산 치어리더만 표시
- [ ] 선택한 cheerleader_id 가 photo_posts.cheerleader_id 에 저장됨
- [ ] 선택 해제 (null) 저장 정상

## F. CollectionDetail (PHOT-08)

- [ ] 컬렉션 생성 → await 이후 state 반영 (optimistic 없음)
- [ ] CollectionDetailScreen 진입 → photo_collection_posts JOIN 으로 posts 표시
- [ ] 빈 컬렉션 empty state 렌더링
- [ ] 다른 사용자 컬렉션도 조회 가능 (public_read)

## G. 어드민 승인 → 사용자 반영 (PHOT-02, 트리거)

- [ ] 스테이징 DB 에서 `UPDATE photographer_applications SET status='approved' WHERE user_id=X` 수동 실행
- [ ] 테스트 사용자 앱 재실행 → Studio 탭 진입 시 approved 상태 반영 (AuthContext.user.is_photographer)
- [ ] 알림 수신: "포토그래퍼 신청이 승인되었습니다" notifications row 확인
- [ ] 거절 케이스도 동일 — rejection_reason 앱 UI 에 표시
- [ ] ADJ-01 확인: users.role 은 'user' 유지, users.is_photographer=TRUE 만 변경됨 (DB 쿼리로 수동 검증)

## H. Range Request 성능 (Open Question 3)

- [ ] iOS: 50MB MP4 업로드 후 feed 재생 → 첫 프레임까지 5초 이내 OK 여부 기록
- [ ] Android: 동일 시나리오 — 첫 프레임 지연 측정
- [ ] 5초 초과 시 → Phase 6 또는 v2 에 Cloudflare Worker Range 보정 이슈 생성

## I. Edge Function Smoke (Task 7 staging)

- [ ] generate-thumbnails: 샘플 800x600 PNG 업로드 → 400x400 JPEG 응답 + photo_posts.thumbnail_urls UPDATE
- [ ] generate-thumbnails: 타인의 postId 로 호출 → 403 Forbidden (T-4-05)
- [ ] generate-thumbnails: 인증 토큰 없이 호출 → 401 Unauthorized
- [ ] get-upload-url: video/quicktime presigned URL 정상 발급 + 실제 PUT 업로드 성공
- [ ] get-upload-url: video/avi 요청 → 400 Bad Request (T-4-06)

---

*Wave 3 QA 실기기 세션 일자:* _____
*통과율:* __ / __
*담당자:* _____
*빌드 버전:* _____
