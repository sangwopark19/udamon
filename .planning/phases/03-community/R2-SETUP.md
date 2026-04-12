# Cloudflare R2 + Supabase Edge Function 설정 가이드

> **이 문서의 목적.** Phase 3 Wave 4 QA 중 발견된 "이미지 업로드 실패" 블로커를 해결하기 위한 공식 절차 가이드. 코드는 모두 완성되어 있고, 문제는 **인프라 설정 2건 누락** 이다. 이 가이드를 끝까지 따르면 앱 내 글쓰기 → 이미지 3장 업로드 → 게시가 동작한다.

---

## 0. 증상 및 근본 원인

### 증상
- 글쓰기 화면에서 이미지 첨부 + 제출 → Alert `이미지 업로드 실패 / 일부 이미지를 업로드하지 못했어요 / 다시 시도` 표시
- 글은 등록되지 않음, form 데이터는 유지됨 (D-18 의도 동작)

### 진단으로 확인된 2가지 블로커

| # | 블로커 | 확인 방법 | 결과 |
|---|---|---|---|
| 1 | **Supabase Edge Function `get-upload-url` 미배포** | `supabase functions list --project-ref jfynfapkbpkwyrjulsed` | `delete-account` 1건만 존재 |
| 2 | **R2 관련 Supabase secrets 5개 누락** | `supabase secrets list --project-ref jfynfapkbpkwyrjulsed` | 기본 4개(`SUPABASE_URL`, `_ANON_KEY`, `_SERVICE_ROLE_KEY`, `_DB_URL`)만 존재 |

### 필요한 환경변수 (`supabase/functions/get-upload-url/index.ts` 133-137줄)

```ts
const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;
const bucketName = Deno.env.get("R2_BUCKET_NAME")!;
const publicUrl = Deno.env.get("R2_PUBLIC_URL")!;
```

이 5개 값을 Cloudflare에서 확보한 뒤 Supabase secrets로 주입하고, Edge Function을 배포하면 된다.

### 코드는 완성되어 있음 (참고)

- 클라이언트: `app/src/services/r2Upload.ts` — `uploadCommunityImages(userId, localUris, accessToken)` 구현 완료
- 엣지 함수: `supabase/functions/get-upload-url/index.ts` — AWS SDK v3 S3Client + `getSignedUrl` 로 presigned PUT URL 발급
- 클라이언트 쓰기 스크린: `app/src/screens/community/CommunityWriteScreen.tsx` — D-09 R2-first flow + D-18 Alert-retain-form 에러 복구

---

## 1. Cloudflare R2 준비 (Cloudflare 대시보드)

### 사전 요구사항

- Cloudflare 계정 (무료 플랜도 가능)
- R2 활성화 (결제 정보 등록 필요, 10GB/월 무료 할당량 내에서는 과금 없음)

### 1-1. R2 버킷 생성

1. Cloudflare 대시보드 → **R2 Object Storage** 선택
2. **Create bucket** 클릭
3. 버킷 이름 입력: `udamon-media` (권장, Edge Function의 `R2_BUCKET_NAME` 값이 됨)
4. **Location**: 기본(Automatic) 또는 APAC 선택
5. **Create bucket** 완료

### 1-2. Account ID 기록

1. R2 대시보드 우측 사이드바 **Account details** 에서 **Account ID** 복사
2. 이 값이 `R2_ACCOUNT_ID` secret 값이 됨
3. 예: `a1b2c3d4e5f6g7h8i9j0` (실제 32자 hex)

### 1-3. R2 API 토큰 생성 (Access Key)

**공식 문서 기준 절차** (https://developers.cloudflare.com/r2/api/tokens/):

1. R2 대시보드 → **Account Details** 섹션 → **API Tokens** 옆 **Manage**
2. **Create API Token** 클릭 (Account API token 권장)
3. **Token name**: `udamon-edge-function`
4. **Permissions**:
   - **Object Read & Write** 선택 (Admin Read & Write도 가능하지만 최소 권한 원칙상 Object Read & Write 권장)
5. **Specify bucket(s)**: `Apply to specific buckets only` 선택 → `udamon-media` 지정
   - 계정 내 다른 버킷에 대한 접근을 막는 최소 권한 스코프
6. **TTL**: 기본값(Forever) 또는 필요 시 만료일 지정
7. **Create API Token** 클릭

### 1-4. 발급된 자격 증명 기록 (한 번만 표시됨!)

토큰 생성 완료 화면에서 다음 4개 값을 즉시 복사:

| 표시 이름 | secret 이름 | 비고 |
|---|---|---|
| **Access Key ID** | `R2_ACCESS_KEY_ID` | ≈32자 hex |
| **Secret Access Key** | `R2_SECRET_ACCESS_KEY` | ≈64자 hex — **페이지를 떠나면 다시 볼 수 없음** |
| **Endpoint** (Use jurisdiction-specific endpoint 아래) | 참고용 | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` 형식 |
| **Account ID** | `R2_ACCOUNT_ID` | 위 1-2에서 기록한 값과 동일 |

> **경고**: Secret Access Key는 이 화면에서만 평문으로 볼 수 있다. 반드시 비밀번호 관리자에 즉시 저장하거나 이 문서 작업이 끝날 때까지 브라우저 탭을 열어둘 것. 분실 시 토큰을 새로 만들어야 함.

### 1-5. 버킷 Public URL 설정

Edge Function이 생성하는 `publicUrl`은 업로드된 파일의 공개 다운로드 URL이다. R2 버킷 자체는 기본 private이며, 다음 2가지 방법 중 하나로 public read를 허용한다.

#### 옵션 A — r2.dev 서브도메인 (개발/QA용, 권장 — v1 단계)

**공식 문서 기준** (https://developers.cloudflare.com/r2/buckets/public-buckets/):

1. R2 → `udamon-media` 버킷 → **Settings** 탭
2. **Public Development URL** 섹션 → **Enable** 클릭
3. 확인 프롬프트에 `allow` 입력 → **Allow** 클릭
4. 표시되는 URL 복사: `https://pub-<random>.r2.dev` 형식

이 URL이 `R2_PUBLIC_URL` secret 값이 된다.

> **주의 (공식 문서 인용)**: "Public access through `r2.dev` subdomains are rate limited and should only be used for development purposes." → v1 런칭 직전에 옵션 B로 전환 권장. 현 Phase 3 QA 단계는 옵션 A로 충분.

#### 옵션 B — Custom domain (v1 런칭 후 권장)

1. Cloudflare에 `udamonfan.com` 도메인 등록 (PROJECT.md blocker)
2. R2 → 버킷 → **Settings** → **Custom Domains** → **Add**
3. `media.udamonfan.com` 등 서브도메인 입력
4. DNS 레코드 자동 생성 확인 → **Connect Domain**
5. **Active** 상태 대기 (수 분 내)

이 경우 `R2_PUBLIC_URL` = `https://media.udamonfan.com`

---

## 2. Supabase Edge Function 배포 (로컬 CLI)

### 2-1. Supabase CLI 링크 확인

이미 linked 상태지만 안전성 검증:

```bash
cd /Users/sangwopark19/workspace/udamon
supabase projects list | grep udamon
# 기대 출력: 라인 앞쪽에 ● 마커가 붙은 "udamon" 행 (ref: jfynfapkbpkwyrjulsed)
```

### 2-2. Secrets 일괄 등록

5개 값을 한 번에 등록 (공식 문서: https://supabase.com/docs/guides/functions/secrets):

```bash
supabase secrets set \
  R2_ACCOUNT_ID='<위 1-2에서 기록한 Account ID>' \
  R2_ACCESS_KEY_ID='<위 1-4의 Access Key ID>' \
  R2_SECRET_ACCESS_KEY='<위 1-4의 Secret Access Key>' \
  R2_BUCKET_NAME='udamon-media' \
  R2_PUBLIC_URL='<위 1-5의 r2.dev URL 또는 custom domain>' \
  --project-ref jfynfapkbpkwyrjulsed
```

> **보안 주의**: 위 명령을 shell history에 남기고 싶지 않으면 `.env.secrets` 파일을 임시로 만든 뒤 `--env-file` 옵션 사용:
> ```bash
> cat > /tmp/r2.env.secrets <<'EOF'
> R2_ACCOUNT_ID=...
> R2_ACCESS_KEY_ID=...
> R2_SECRET_ACCESS_KEY=...
> R2_BUCKET_NAME=udamon-media
> R2_PUBLIC_URL=https://pub-xxxx.r2.dev
> EOF
> supabase secrets set --env-file /tmp/r2.env.secrets --project-ref jfynfapkbpkwyrjulsed
> rm /tmp/r2.env.secrets   # 즉시 삭제
> ```

### 2-3. Secrets 등록 검증

```bash
supabase secrets list --project-ref jfynfapkbpkwyrjulsed
```

**기대 결과**: 다음 9개 secret이 모두 나와야 한다 (값은 digest만 표시됨):
- `SUPABASE_ANON_KEY` (기존)
- `SUPABASE_DB_URL` (기존)
- `SUPABASE_SERVICE_ROLE_KEY` (기존)
- `SUPABASE_URL` (기존)
- `R2_ACCOUNT_ID` ✨ 신규
- `R2_ACCESS_KEY_ID` ✨ 신규
- `R2_SECRET_ACCESS_KEY` ✨ 신규
- `R2_BUCKET_NAME` ✨ 신규
- `R2_PUBLIC_URL` ✨ 신규

> Supabase는 secrets 업데이트 후 **재배포 없이 즉시 반영**된다 (공식 문서 인용: "They're available immediately in your functions").

### 2-4. Edge Function 배포

공식 문서: https://supabase.com/docs/guides/functions/deploy

```bash
cd /Users/sangwopark19/workspace/udamon
supabase functions deploy get-upload-url --project-ref jfynfapkbpkwyrjulsed
```

> `get-upload-url` 함수는 JWT 검증이 필요하므로 `--no-verify-jwt` 플래그를 **절대 붙이지 말 것** (Edge Function 내부에서 `supabase.auth.getUser(token)`로 사용자 검증을 수행하며, anonymous 업로드를 차단하는 것이 보안 요구사항).

### 2-5. 배포 검증

```bash
supabase functions list --project-ref jfynfapkbpkwyrjulsed
```

**기대 결과**: 
```
ID        | NAME              | SLUG              | STATUS | VERSION | UPDATED_AT
----------|-------------------|-------------------|--------|---------|-----------
...       | delete-account    | delete-account    | ACTIVE | 1       | 2026-04-07
...       | get-upload-url    | get-upload-url    | ACTIVE | 1       | 오늘 날짜
```

---

## 3. 동작 검증

### 3-1. curl로 직접 검증 (권장)

Supabase 세션 토큰 한 개를 준비하여 Edge Function이 정상 응답하는지 확인:

```bash
# 1. ANON_KEY 확보 (app/.env에서 복사)
ANON_KEY='eyJhbGciOiJIUzI1NiIs...'

# 2. Supabase Auth로 test 계정 로그인하여 access_token 취득 (필요 시 /gsd-quick으로 헬퍼 작성)
# 또는 시뮬레이터 앱에서 로그인 상태로 AsyncStorage의 supabase.auth.token을 꺼내서 사용
ACCESS_TOKEN='eyJhbGciOi...'

# 3. get-upload-url 호출
curl -X POST \
  'https://jfynfapkbpkwyrjulsed.supabase.co/functions/v1/get-upload-url' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prefix":"community-posts","contentType":"image/jpeg","count":1}'
```

**기대 응답 (200 OK)**:
```json
{
  "uploads": [
    {
      "uploadUrl": "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/udamon-media/community-posts/<USER_UUID>/<timestamp>_<random>.jpg?X-Amz-Algorithm=...",
      "publicUrl": "https://pub-xxxx.r2.dev/community-posts/<USER_UUID>/<timestamp>_<random>.jpg",
      "key": "community-posts/<USER_UUID>/<timestamp>_<random>.jpg"
    }
  ]
}
```

**실패 진단**:
- `401 Unauthorized` → access_token 만료 또는 형식 오류 → 앱 재로그인
- `400 Invalid prefix` → Edge Function 정상 작동, 요청 body 오류
- `500 Internal Server Error` → R2 secret 누락 또는 자격증명 오류 → 로그 확인 (아래 3-3)

### 3-2. 앱에서 최종 QA (C7 + D3 + D4)

1. Android 시뮬레이터에서 Expo dev-client 재시작 (metro cache 완전 초기화 권장):
   ```bash
   cd /Users/sangwopark19/workspace/udamon/app
   npx expo start --clear
   ```
2. 로그인 → 커뮤니티 탭 → ✏️ FAB
3. 팀 선택 → 제목/본문 입력 → 이미지 3장 첨부 → 투표 2개 추가 → 제출
4. **기대**: UploadingOverlay 표시 ("이미지 업로드 중" + "1/3, 2/3, 3/3") → 목록 복귀 → 토스트 "게시물이 등록되었습니다" → 최상단에 새 글

### 3-3. Edge Function 런타임 로그 (문제 시)

Supabase 대시보드 → **Edge Functions** → `get-upload-url` → **Logs** 탭에서 최근 호출 로그 확인. CLI로도 가능:

```bash
supabase functions logs get-upload-url --project-ref jfynfapkbpkwyrjulsed
```

---

## 4. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `401 Unauthorized` from Edge Function | `supabase.auth.getUser(token)` 실패 | 앱에서 재로그인, 세션 만료 확인 |
| `500 Internal Server Error` + "Missing credentials" | secrets 누락 또는 오타 | `supabase secrets list`로 5개 신규 secret digest 확인, 누락 시 재등록 |
| presigned URL 발급 성공 but PUT 403 | R2 API 토큰 권한 부족 | Cloudflare 토큰 권한이 `Object Read & Write` 이상인지 확인, 버킷 스코프 일치 확인 |
| presigned URL PUT 성공 but 이미지 접근 403/404 | Public URL 미설정 | R2 버킷 Settings → Public Development URL 활성화 또는 Custom Domain 확인 |
| presigned URL PUT 성공 but `publicUrl` 로 접근 시 호스트가 `https://undefined/...` | `R2_PUBLIC_URL` secret 미설정 | secrets 재등록 후 Edge Function 재호출 (재배포 불필요) |
| 앱 로그에 `R2 upload failed: 400` | ContentLength/ContentType 불일치 | `r2Upload.ts`의 `contentType`과 Edge Function `ALLOWED_TYPES` 매칭 확인 — community는 `image/jpeg`, `image/png`, `image/webp` 허용 |
| Expo dev-client에서 old Edge Function URL이 캐시됨 | Metro 캐시 | `npx expo start --clear` 로 재시작 |

---

## 5. v1 런칭 전 체크리스트

- [ ] 옵션 A (r2.dev) 에서 옵션 B (custom domain)로 전환 — rate limit 회피
- [ ] R2 버킷에 CORS 규칙 추가 — 웹 어드민에서 직접 업로드할 경우 필요
- [ ] Edge Function `ALLOWED_ORIGINS` (index.ts 33-37줄)에 실제 도메인 추가
- [ ] R2 버킷 Lifecycle rule 설정 — 고아 파일(D-09 로 인해 DB INSERT 실패 시 생기는 orphan) 자동 삭제 (v2 예정이지만 수동 정책 가능)
- [ ] Cloudflare R2 무료 티어(10GB/월) 사용량 모니터링 설정

---

## 6. 커밋 및 추적

이 가이드 자체는 `.planning/phases/03-community/R2-SETUP.md`에 저장됨. 설정 완료 후:

1. Edge Function 배포는 **코드 변경 없이 배포만** 됨 → 별도 커밋 불필요
2. Secrets 값은 repo에 들어가지 않음 → `.gitignore` 에 `.env.secrets` 패턴 추가 권장
3. R2 setup 완료 후 HANDOFF.md의 "Blockers/Concerns" 섹션에서 R2 관련 항목 제거 및 "Wave 4 QA pending (C7 + D3 + D4)" 상태로 업데이트

---

## 7. 한 줄 요약

**현재 문제는 Phase 3 코드 완성도가 아니라 v1 런칭 전 인프라 설정 누락이다. 위 절차대로 (1) Cloudflare R2 버킷 + API 토큰 발급, (2) Supabase에 R2 secrets 5개 등록, (3) `supabase functions deploy get-upload-url` 를 실행하면 이미지 업로드가 정상 동작한다.**
