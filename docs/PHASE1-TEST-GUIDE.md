# Phase 1: Database Foundation & Security -- 테스트 가이드

> Phase 1 코드 검증은 완료되었으나 실제 DB 적용 (supabase db push), 트리거 동작, RLS 차단 등
> 3개 항목이 미검증 상태입니다. 이 가이드를 따라 환경을 설정하고 모든 항목을 검증하세요.

---

## 목차

1. [사전 준비 (Prerequisites)](#1-사전-준비-prerequisites)
2. [Supabase CLI 프로젝트 링크](#2-supabase-cli-프로젝트-링크)
3. [환경변수 설정](#3-환경변수-설정)
4. [마이그레이션 적용 (supabase db push)](#4-마이그레이션-적용-supabase-db-push)
5. [Phase 1 Success Criteria 테스트 절차](#5-phase-1-success-criteria-테스트-절차)
6. [Edge Function 배포 및 테스트](#6-edge-function-배포-및-테스트)
7. [앱 실행 및 동작 확인](#7-앱-실행-및-동작-확인)
8. [트러블슈팅](#8-트러블슈팅)
9. [테스트 완료 체크리스트](#9-테스트-완료-체크리스트)

---

## 1. 사전 준비 (Prerequisites)

### 1.1 필수 소프트웨어

| 소프트웨어 | 최소 버전 | 확인 명령 |
|-----------|----------|----------|
| Node.js | 18.x 이상 | `node --version` |
| npm | 9.x 이상 | `npm --version` |
| Supabase CLI | 2.x 이상 | `supabase --version` |

> **Docker Desktop은 불필요합니다.** 이 가이드에서는 원격 Supabase 프로젝트에 직접 마이그레이션을
> 적용하므로 로컬 Supabase 실행이 필요하지 않습니다.

Supabase CLI가 설치되어 있지 않다면:

```bash
# npm으로 설치
npm install -g supabase

# 또는 Homebrew (macOS)
brew install supabase/tap/supabase
```

### 1.2 Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에 접속하여 로그인
2. **New Project** 클릭
3. Organization 선택 후 프로젝트 정보 입력:
   - **Name:** `udamon` (또는 원하는 이름)
   - **Database Password:** 안전한 비밀번호 설정 (나중에 필요하니 기록해두세요)
   - **Region:** Northeast Asia (Tokyo) -- 한국 사용자 대상이므로 가장 가까운 리전 선택
4. **Create new project** 클릭 후 프로비저닝 완료 대기 (약 1-2분)

### 1.3 키 확인 위치

프로젝트 생성 완료 후 Supabase Dashboard에서 다음 값들을 확인합니다:

1. **Project Settings** > **API** 탭으로 이동
2. 아래 3가지 값을 복사해둡니다:

| 항목 | Dashboard 위치 | 용도 |
|-----|---------------|------|
| **Project URL** | `API Settings > Project URL` | 앱에서 Supabase 연결 |
| **anon (public) key** | `API Settings > Project API keys > anon public` | 클라이언트 SDK 인증 |
| **service_role key** | `API Settings > Project API keys > service_role secret` | Edge Function 서버측 인증 |

> **주의:** `service_role` 키는 RLS를 무시하는 관리자 키입니다. 절대 클라이언트 코드에 노출하지 마세요.

3. **Project Settings** > **General** 탭에서:

| 항목 | Dashboard 위치 | 용도 |
|-----|---------------|------|
| **Reference ID** | `General Settings > Reference ID` | CLI 프로젝트 링크 |

---

## 2. Supabase CLI 프로젝트 링크

### 2.1 CLI 로그인

```bash
supabase login
```

브라우저가 열리면 Supabase 계정으로 로그인하여 CLI 접근을 허용합니다.
성공하면 터미널에 `Token saved to ~/.supabase/access-token` 메시지가 표시됩니다.

### 2.2 프로젝트 링크

프로젝트 루트 디렉터리에서 실행합니다:

```bash
cd /path/to/udamon
supabase link --project-ref <your-project-ref>
```

- `<your-project-ref>`: Dashboard > Project Settings > General의 **Reference ID** 값
- 예: `supabase link --project-ref abcdefghijklmnop`

Database password를 물으면 프로젝트 생성 시 설정한 비밀번호를 입력합니다.

### 2.3 링크 성공 확인

```bash
supabase db remote commit
```

에러 없이 완료되면 링크가 정상적으로 된 것입니다.
또는 `supabase/config.toml`이 생성되었는지 확인하세요:

```bash
ls -la supabase/config.toml
# 파일이 존재하면 링크 완료
```

---

## 3. 환경변수 설정

### 3.1 모바일 앱 (app/.env)

#### 파일 생성

```bash
cp app/.env.example app/.env
```

#### 필수 변수 설정

`app/.env` 파일을 열어 아래 값을 채웁니다:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

| 변수 | 값 확인 위치 | 설명 |
|-----|-------------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Dashboard > Project Settings > API > Project URL | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Dashboard > Project Settings > API > anon public | 퍼블릭 API 키 |

#### 환경변수 미설정 시 동작

환경변수가 비어있거나 `.env` 파일이 없으면 앱 시작 시 아래 에러가 발생합니다 (정상 동작):

```
Error: Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and
EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy app/.env.example to app/.env and fill in
your Supabase project credentials.
```

이 에러는 `app/src/services/supabase.ts`의 필수 환경변수 검증 로직에 의한 것이며,
하드코딩된 더미 키로 앱이 실행되는 것을 방지합니다.

### 3.2 어드민 웹 (admin/.env)

#### 파일 생성

```bash
cp admin/.env.example admin/.env
```

#### 필수 변수 설정

`admin/.env` 파일을 열어 아래 값을 채웁니다:

```env
VITE_ADMIN_EMAIL=your-admin@email.com
VITE_ADMIN_PASSWORD=your-secure-password
```

| 변수 | 설명 |
|-----|------|
| `VITE_ADMIN_EMAIL` | 어드민 로그인에 사용할 이메일 (사용자가 직접 설정) |
| `VITE_ADMIN_PASSWORD` | 어드민 로그인에 사용할 비밀번호 (사용자가 직접 설정) |

> **참고:** 이 값들은 사용자가 직접 정하는 임시 로그인 자격증명입니다.
> Phase 5 (ADM-01)에서 Supabase Auth 기반 인증으로 전환될 예정입니다.

### 3.3 Edge Function Secrets (R2 업로드용)

> **Phase 1 테스트에서 이 섹션은 선택 사항입니다.** Phase 1의 주요 목표는 DB 스키마 검증이며,
> Edge Function은 R2 업로드 기능에 해당합니다.

Cloudflare R2를 사용하는 경우, Supabase Edge Function에 다음 시크릿을 설정합니다:

```bash
supabase secrets set \
  R2_ACCOUNT_ID=your-cloudflare-account-id \
  R2_ACCESS_KEY_ID=your-r2-access-key-id \
  R2_SECRET_ACCESS_KEY=your-r2-secret-access-key \
  R2_BUCKET_NAME=your-bucket-name \
  R2_PUBLIC_URL=https://your-r2-public-url.com
```

각 값의 확인 위치:

| 변수 | Cloudflare Dashboard 위치 |
|-----|--------------------------|
| `R2_ACCOUNT_ID` | Cloudflare Dashboard 우측 사이드바 > Account ID |
| `R2_ACCESS_KEY_ID` | R2 > Manage R2 API Tokens > Create API token |
| `R2_SECRET_ACCESS_KEY` | 위 토큰 생성 시 함께 표시 (최초 1회만 확인 가능) |
| `R2_BUCKET_NAME` | R2 > 버킷 목록에서 버킷 이름 |
| `R2_PUBLIC_URL` | R2 > 버킷 선택 > Settings > Public access URL |

---

## 4. 마이그레이션 적용 (supabase db push)

### 4.1 실행

프로젝트 루트에서 다음 명령을 실행합니다:

```bash
npx supabase db push
```

### 4.2 예상 결과

22개 마이그레이션 파일이 순서대로 적용됩니다:

**기존 테이블 (001~010):**

| 번호 | 파일 | 내용 |
|-----|------|------|
| 001 | `001_teams_players.sql` | teams, players 테이블 |
| 002 | `002_community.sql` | community_posts, community_comments 등 |
| 003 | `003_polls.sql` | community_polls 테이블 |
| 004 | `004_spam_filter.sql` | spam_filter_words 테이블 (021에서 DROP 예정) |
| 005 | `005_rls_policies.sql` | 기존 RLS 정책 |
| 006 | `006_seed_teams.sql` | KBO 10개 구단 시드 데이터 |
| 007 | `007_photographer.sql` | photographers, photo_posts 등 |
| 008 | `008_photographer_rls.sql` | 포토그래퍼 RLS 정책 |
| 009 | `009_seed_photographer.sql` | 포토그래퍼 시드 데이터 |
| 010 | `010_deprecate_storage_policies.sql` | 스토리지 정책 정리 |

**Phase 1 신규 (011~022):**

| 번호 | 파일 | 내용 |
|-----|------|------|
| 011 | `011_users.sql` | public.users 테이블 + handle_new_user 트리거 |
| 012 | `012_rls_helpers.sql` | is_admin(), is_owner() 함수 + 8개 테이블 RLS 정책 |
| 013 | `013_notifications.sql` | notifications 테이블 |
| 014 | `014_announcements.sql` | announcements 테이블 |
| 015 | `015_inquiries.sql` | inquiries 테이블 |
| 016 | `016_photographer_apps.sql` | photographer_applications 테이블 |
| 017 | `017_cheerleaders.sql` | cheerleaders 테이블 |
| 018 | `018_audit_logs.sql` | audit_logs 테이블 |
| 019 | `019_site_settings.sql` | site_settings 테이블 |
| 020 | `020_photo_posts_alter.sql` | photo_posts에 status, rejection_reason, cheerleader_id 추가 |
| 021 | `021_drop_spam_and_cleanup.sql` | spam_filter DROP + anon 정책 제거 |
| 022 | `022_seed_cheerleaders.sql` | KBO 10개 구단 치어리더 시드 데이터 |

### 4.3 성공 시 출력 예시

```
Connecting to remote database...
Do you want to push these migrations to the remote database?
  • 20240101000001_001_teams_players.sql
  • 20240101000002_002_community.sql
  ... (중간 생략)
  • 20240101000022_022_seed_cheerleaders.sql

[Y/n] Y
Applying migration 20240101000001_001_teams_players.sql...
Applying migration 20240101000002_002_community.sql...
... (중간 생략)
Applying migration 20240101000022_022_seed_cheerleaders.sql...
Finished supabase db push.
```

> **참고:** `Y`를 입력하여 적용을 확인합니다. 에러 발생 시 [섹션 8 트러블슈팅](#8-트러블슈팅)을 참조하세요.

---

## 5. Phase 1 Success Criteria 테스트 절차

> 이 섹션은 `01-VERIFICATION.md`의 human_needed 항목 3개에 대한 구체적 테스트입니다.

### 5.1 테스트 1: auth.users 트리거 동작 확인

**검증 대상:** auth.users에 사용자 생성 시 public.users에 자동으로 행이 생성되는가?

**단계:**

1. Supabase Dashboard > **Authentication** > **Users** 탭으로 이동
2. **Add user** > **Create new user** 클릭
3. 테스트 사용자 정보 입력:
   - Email: `test-phase1@example.com`
   - Password: `TestPass123!`
   - **Auto Confirm User** 체크 (이메일 확인 건너뛰기)
4. **Create user** 클릭

**트리거 동작 확인:**

5. Dashboard > **Table Editor** > `users` 테이블 선택 (public 스키마)
6. 방금 생성한 사용자가 목록에 나타나는지 확인

**기대 결과:**

| 칼럼 | 기대 값 |
|------|--------|
| `id` | auth.users에서 생성된 UUID와 동일 |
| `email` | `test-phase1@example.com` |
| `role` | `user` (기본값) |
| `nickname` | `NULL` (아직 미설정) |
| `is_deleted` | `false` |
| `created_at` | 현재 시간 (자동 설정) |

**SQL Editor로 직접 확인:**

Dashboard > **SQL Editor**에서 아래 쿼리를 실행합니다:

```sql
-- public.users에서 최근 생성된 사용자 확인
SELECT id, email, role, nickname, is_deleted, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
```

```sql
-- auth.users와 public.users의 id 일치 여부 확인
SELECT
  a.id AS auth_id,
  a.email AS auth_email,
  u.id AS public_id,
  u.email AS public_email,
  u.role
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE a.email = 'test-phase1@example.com';
```

기대 결과: `auth_id`와 `public_id`가 동일한 UUID이고, `role`이 `user`인 행이 반환됩니다.

### 5.2 테스트 2: RLS 비인증 차단 확인

**검증 대상:** 인증되지 않은 사용자(anon)가 보호된 테이블을 조회하면 빈 결과가 반환되는가?

#### 방법 A: SQL Editor에서 테스트

Dashboard > **SQL Editor**에서 아래 쿼리를 실행합니다:

```sql
-- 1. anon role로 전환
SET ROLE anon;

-- 2. users 테이블 조회 시도
SELECT * FROM public.users;
-- 기대 결과: 0 rows (빈 결과)
```

```sql
-- 3. 다른 보호 테이블도 확인
SET ROLE anon;
SELECT count(*) AS cnt FROM public.notifications;
-- 기대: cnt = 0
```

```sql
SET ROLE anon;
SELECT count(*) AS cnt FROM public.announcements;
-- 기대: cnt = 0
```

```sql
SET ROLE anon;
SELECT count(*) AS cnt FROM public.audit_logs;
-- 기대: cnt = 0
```

```sql
SET ROLE anon;
SELECT count(*) AS cnt FROM public.inquiries;
-- 기대: cnt = 0
```

```sql
SET ROLE anon;
SELECT count(*) AS cnt FROM public.photographer_applications;
-- 기대: cnt = 0
```

```sql
SET ROLE anon;
SELECT count(*) AS cnt FROM public.site_settings;
-- 기대: cnt = 0
```

> **중요:** SQL Editor에서는 각 쿼리 실행마다 세션이 초기화될 수 있습니다.
> `SET ROLE anon;`과 `SELECT`를 **같은 쿼리 블록**에서 함께 실행해야 합니다.

테스트 후 원래 role로 복원합니다:

```sql
RESET ROLE;
```

#### 방법 B: JavaScript로 테스트

Node.js 환경에서 직접 테스트할 수도 있습니다:

```javascript
// test-rls.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIs...'; // anon key

const supabase = createClient(SUPABASE_URL, ANON_KEY);

// 로그인하지 않은 상태에서 조회 시도
async function testRLS() {
  const tables = ['users', 'notifications', 'announcements', 'inquiries', 'audit_logs'];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    console.log(`${table}: data=${JSON.stringify(data)}, error=${error?.message ?? 'none'}`);
    // 기대: data=[] (빈 배열), error=none
  }
}

testRLS();
```

실행:

```bash
# 프로젝트 루트에서 (app/node_modules의 supabase-js 사용)
node --experimental-modules test-rls.mjs
```

기대 결과: 모든 테이블에서 `data=[]` (빈 배열), `error=none`이 출력됩니다.

### 5.3 테스트 3: 전체 테이블 존재 확인

**검증 대상:** Phase 1에서 생성한 모든 테이블이 DB에 존재하는가?

Dashboard > **SQL Editor**에서:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Phase 1 신규 테이블 (8개):**

아래 테이블이 결과에 모두 포함되어야 합니다:

- `announcements`
- `audit_logs`
- `cheerleaders`
- `inquiries`
- `notifications`
- `photographer_applications`
- `site_settings`
- `users`

**기존 테이블 (기존 마이그레이션에서 생성):**

아래 테이블도 존재해야 합니다:

- `teams`
- `players`
- `community_posts`
- `community_comments`
- `community_reports`
- `community_polls`
- `poll_votes`
- `photo_posts`
- `photographers`
- `pg_collections`

**cheerleaders 시드 데이터 확인:**

```sql
SELECT slug, name_ko, name_en, position
FROM public.cheerleaders
ORDER BY slug;
```

기대 결과: KBO 10개 구단에 해당하는 행이 반환됩니다:

| slug | name_ko | name_en | position |
|------|---------|---------|----------|
| doosan | 두산 베어스 치어리더 | Doosan Bears Cheerleaders | cheerleader |
| hanwha | 한화 이글스 치어리더 | Hanwha Eagles Cheerleaders | cheerleader |
| kia | KIA 타이거즈 치어리더 | KIA Tigers Cheerleaders | cheerleader |
| kiwoom | 키움 히어로즈 치어리더 | Kiwoom Heroes Cheerleaders | cheerleader |
| kt | KT 위즈 치어리더 | KT Wiz Cheerleaders | cheerleader |
| lg | LG 트윈스 치어리더 | LG Twins Cheerleaders | cheerleader |
| lotte | 롯데 자이언츠 치어리더 | Lotte Giants Cheerleaders | cheerleader |
| nc | NC 다이노스 치어리더 | NC Dinos Cheerleaders | cheerleader |
| samsung | 삼성 라이온즈 치어리더 | Samsung Lions Cheerleaders | cheerleader |
| ssg | SSG 랜더스 치어리더 | SSG Landers Cheerleaders | cheerleader |

### 5.4 테스트 4: 보안 코드 검증

**검증 대상:** 하드코딩된 테스트 계정과 더미 키가 제거되었는가?

이 항목은 이미 자동 검증이 완료되었습니다. 로컬에서 재확인하려면:

```bash
# 테스트 계정 잔존 확인
grep -rn "test@udamon\|TEST_ACCOUNTS\|admin1234" app/src/ admin/src/
# 기대: 결과 없음 (출력 없이 종료)
```

```bash
# 더미 키 잔존 확인
grep -rn "DUMMY_URL\|DUMMY_KEY\|isSupabaseConfigured" app/src/
# 기대: 결과 없음
```

```bash
# AuthContext에서 console.log 제거 확인
grep -n "console.log" app/src/contexts/AuthContext.tsx
# 기대: 결과 없음
```

```bash
# CORS 와일드카드 직접 할당 확인
grep -n '"Access-Control-Allow-Origin": "\*"' supabase/functions/get-upload-url/index.ts
# 기대: 결과 없음 (getCorsHeaders 함수로 조건부 처리됨)
```

### 5.5 테스트 5: 환경변수 필수 검증 동작 확인

```bash
# 환경변수 없이 앱 실행 시 에러 확인
cd app
EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_ANON_KEY= npx expo start --web
# 기대: "Missing required environment variables" 에러 메시지 표시
```

> Ctrl+C로 종료합니다.

---

## 6. Edge Function 배포 및 테스트

> **이 섹션은 선택 사항입니다.** Phase 1의 주요 목표는 DB 스키마 검증이며,
> Edge Function은 R2 업로드 기능에 해당합니다. R2가 설정되지 않았다면 건너뛰세요.

### 6.1 배포

```bash
supabase functions deploy get-upload-url
```

성공 시 Edge Function URL이 표시됩니다:
```
Deployed Edge Function get-upload-url to https://<project-ref>.supabase.co/functions/v1/get-upload-url
```

### 6.2 인증 없이 호출 (401 확인)

```bash
curl -s -X POST \
  'https://<your-project-ref>.supabase.co/functions/v1/get-upload-url' \
  -H 'Content-Type: application/json' \
  -d '{"prefix":"avatars","contentType":"image/jpeg","count":1}'
```

기대 결과:
```json
{"error":"Missing or invalid Authorization header"}
```
HTTP Status: `401 Unauthorized`

### 6.3 인증 후 호출 (정상 동작 확인)

먼저 JWT 토큰을 획득합니다 (5.1에서 생성한 테스트 사용자 사용):

```bash
# 1단계: JWT 토큰 획득
curl -s -X POST \
  'https://<your-project-ref>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <your-anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test-phase1@example.com",
    "password": "TestPass123!"
  }'
```

응답에서 `access_token` 값을 복사합니다:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": { "id": "...", "email": "test-phase1@example.com" }
}
```

```bash
# 2단계: access_token으로 Edge Function 호출
curl -s -X POST \
  'https://<your-project-ref>.supabase.co/functions/v1/get-upload-url' \
  -H 'Authorization: Bearer <your-access-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "prefix": "avatars",
    "contentType": "image/jpeg",
    "count": 1
  }'
```

기대 결과 (R2 secrets가 정상 설정된 경우):
```json
{
  "uploads": [
    {
      "uploadUrl": "https://<account-id>.r2.cloudflarestorage.com/...",
      "publicUrl": "https://<r2-public-url>/avatars/<user-id>/...",
      "key": "avatars/<user-id>/1712345678_abc123.jpg"
    }
  ]
}
```

> R2 secrets가 설정되지 않은 경우 `500 Internal Server Error`가 반환됩니다.
> 이는 R2 연결 문제이며 Phase 1 DB 검증과는 무관합니다.

---

## 7. 앱 실행 및 동작 확인

### 7.1 모바일 앱 (Expo)

```bash
cd app
npm install
npx expo start
```

**정상 동작:**
- `.env`가 올바르게 설정되어 있으면 앱이 정상 부팅됩니다
- QR 코드를 스캔하여 Expo Go 앱에서 실행하거나, `w`를 눌러 웹 브라우저에서 확인할 수 있습니다

**에러 발생 시:**
- `.env`가 없거나 비어있으면 "Missing required environment variables" 에러가 표시됩니다 -- 이것은 정상 동작입니다

> **중요:** Phase 1은 DB 스키마 + 보안 정리 단계입니다.
> Auth(소셜 로그인 등)는 아직 연동되지 않았으므로 로그인 기능은 Phase 2에서 완성됩니다.
> 앱이 부팅되고 UI가 표시되는 것까지 확인하면 됩니다.

### 7.2 어드민 웹 (Vite)

```bash
cd admin
npm install
npm run dev
```

**접속 및 확인:**

1. 브라우저에서 [http://localhost:5173](http://localhost:5173) 접속
2. `admin/.env`에 설정한 `VITE_ADMIN_EMAIL`과 `VITE_ADMIN_PASSWORD`로 로그인
3. 대시보드가 표시되면 정상

> **참고:** 어드민 웹은 아직 mock 데이터 기반으로 동작합니다.
> Phase 5 (ADM-01)에서 Supabase 연동으로 전환될 예정입니다.

---

## 8. 트러블슈팅

### 8.1 `supabase db push` 실패

#### "supabase is not linked to a project"

```
Error: supabase is not linked to a project
```

**해결:** 프로젝트 링크를 먼저 수행합니다:

```bash
supabase link --project-ref <your-project-ref>
```

#### "relation already exists"

```
ERROR: relation "users" already exists (SQLSTATE 42P07)
```

**해결:** 이미 적용된 마이그레이션이 있습니다. 현재 상태를 확인합니다:

```bash
supabase migration list
```

원격 DB에 이미 적용된 마이그레이션은 `REMOTE`로 표시됩니다.
특정 마이그레이션만 재적용이 필요하면 Supabase Dashboard > SQL Editor에서
해당 테이블을 DROP 후 다시 push하거나, 마이그레이션 상태를 리셋합니다.

#### "permission denied"

```
ERROR: permission denied for schema public
```

**해결:** Database password가 올바른지 확인합니다:

```bash
supabase link --project-ref <your-project-ref>
# Database password 재입력
```

또는 Supabase Dashboard > **Database** > **Roles**에서 postgres role 권한을 확인합니다.

#### Docker 관련 에러

```
Error: Cannot connect to the Docker daemon
```

**해결:** 원격 Supabase 프로젝트에 직접 push하는 경우 Docker는 필요하지 않습니다.
`supabase link`가 정상적으로 완료되었는지 확인하세요.
이 에러는 `supabase start` (로컬 개발) 명령에서 발생할 수 있으며, `db push`와는 무관합니다.

### 8.2 환경변수 관련

#### "Missing required environment variables"

```
Error: Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and
EXPO_PUBLIC_SUPABASE_ANON_KEY.
```

**해결:**
1. `app/.env` 파일이 존재하는지 확인: `ls -la app/.env`
2. 파일 내용에 빈 값이 없는지 확인: `cat app/.env`
3. 변수 이름이 정확한지 확인 (오타 주의)

#### Expo 환경변수 변경 후 반영 안 됨

**해결:** Expo 개발 서버를 완전히 재시작합니다:
1. `Ctrl+C`로 현재 서버 종료
2. `npx expo start --clear`로 캐시를 클리어하고 재시작

#### VITE 환경변수가 undefined

**해결:**
1. `admin/.env` 파일에서 변수에 `VITE_` 접두사가 있는지 확인합니다
2. Vite는 `VITE_` 접두사가 없는 환경변수를 클라이언트에 노출하지 않습니다
3. `npm run dev`로 서버를 재시작합니다

### 8.3 RLS 관련

#### "new row violates row-level security policy"

```
ERROR: new row violates row-level security policy for table "users"
```

**해결:** 인증되지 않은 상태에서 INSERT를 시도했습니다.
- 모든 테이블의 RLS 정책이 `TO authenticated`로 설정되어 있어, 인증된 사용자만 데이터를 조작할 수 있습니다
- Supabase Auth 세션이 필요합니다 (Dashboard > SQL Editor에서 테스트할 때는 `SET ROLE authenticated`를 사용)

#### 테이블 조회 결과가 항상 빈 배열

**설명:** 이것은 정상 동작입니다.
- 인증 세션 없이 조회하면 RLS가 모든 행에 대한 접근을 차단합니다
- 이것은 Phase 1의 보안 목표 (비인증 사용자 차단)가 정상적으로 동작하고 있다는 의미입니다

### 8.4 Edge Function 관련

#### "Failed to deploy function"

**해결:**
1. Supabase CLI 버전 확인: `supabase --version` (2.x 이상 필요)
2. 프로젝트 링크 확인: `supabase link`가 완료되었는지 확인
3. 함수 디렉토리 구조 확인: `supabase/functions/get-upload-url/index.ts` 파일이 존재하는지 확인

#### "Internal Server Error" (500)

**해결:** R2 secrets가 설정되지 않았을 가능성이 높습니다.

```bash
supabase secrets list
```

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`이
모두 목록에 있어야 합니다.

#### CORS 에러 (브라우저에서 테스트 시)

**설명:** Edge Function은 `ALLOWED_ORIGINS`에 설정된 도메인에서만 CORS를 허용합니다.
현재 설정: `udamonfan.com`, `www.udamonfan.com`, `admin.udamonfan.com`

- 로컬 개발 시에는 curl로 테스트하거나 (curl은 CORS 제한 없음)
- 네이티브 앱은 origin 헤더가 없으므로 CORS 제한을 받지 않습니다
- 도메인 구매 후 실제 도메인을 ALLOWED_ORIGINS에 추가해야 합니다

---

## 9. 테스트 완료 체크리스트

Phase 1 완전 검증을 위한 체크리스트입니다. 각 항목을 확인 후 체크하세요.

### 필수 항목

- [ ] Supabase CLI 로그인 완료 (`supabase login`)
- [ ] Supabase 프로젝트 링크 완료 (`supabase link --project-ref`)
- [ ] `supabase db push` 성공 (001~022 마이그레이션 전체 적용)
- [ ] public.users 테이블 존재 확인 (Table Editor 또는 SQL)
- [ ] auth.users INSERT 시 public.users 자동 생성 확인 (handle_new_user 트리거)
- [ ] RLS 비인증 차단 확인 (`SET ROLE anon; SELECT * FROM users;` -> 빈 결과)
- [ ] Phase 1 신규 테이블 8개 전부 존재 확인 (users, notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings)
- [ ] cheerleaders 테이블에 KBO 10개 구단 시드 데이터 존재 확인
- [ ] app/.env 설정 완료 및 앱 부팅 확인
- [ ] admin/.env 설정 완료 및 웹 접속 확인

### 선택 항목

- [ ] Edge Function 배포 (`supabase functions deploy get-upload-url`)
- [ ] Edge Function presigned URL 생성 테스트 (인증 후 호출)
- [ ] R2 secrets 설정 확인 (`supabase secrets list`)

---

## 검증 완료 후

모든 필수 체크리스트를 통과하면 Phase 1 (Database Foundation & Security)이 완전히 검증된 것입니다.

다음 단계:
1. `.planning/phases/01-database-foundation-security/01-HUMAN-UAT.md`를 업데이트하여 테스트 결과를 기록합니다
2. Phase 2 (Auth System) 진행을 시작합니다

> **테스트 사용자 정리:** 검증 완료 후 `test-phase1@example.com` 사용자는
> Dashboard > Authentication > Users에서 삭제해도 됩니다.
> (public.users의 행은 별도로 정리 필요 -- CASCADE 설정이 아닌 경우)
