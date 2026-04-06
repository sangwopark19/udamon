# Phase 1: Database Foundation & Security -- 테스트 가이드

> Phase 1 코드 검증은 완료되었으나 실제 DB 적용, 트리거 동작, RLS 차단 등
> 3개 항목이 미검증 상태입니다. 이 가이드를 따라 환경을 설정하고 모든 항목을 검증하세요.
>
> **참고 문서 출처:**
> - [Supabase Expo React Native Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
> - [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
> - [Supabase Agent Skills](https://github.com/supabase/agent-skills) (`.agents/skills/supabase/SKILL.md`)

---

## 목차

1. [사전 준비 (Prerequisites)](#1-사전-준비-prerequisites)
2. [Supabase CLI 프로젝트 링크](#2-supabase-cli-프로젝트-링크)
3. [환경변수 설정](#3-환경변수-설정)
4. [마이그레이션 적용](#4-마이그레이션-적용)
5. [Phase 1 Success Criteria 테스트 절차](#5-phase-1-success-criteria-테스트-절차)
6. [Edge Function 배포 및 테스트](#6-edge-function-배포-및-테스트)
7. [앱 실행 및 동작 확인](#7-앱-실행-및-동작-확인)
8. [트러블슈팅](#8-트러블슈팅)
9. [테스트 완료 체크리스트](#9-테스트-완료-체크리스트)

---

## 1. 사전 준비 (Prerequisites)

### 1.1 필수 소프트웨어

| 소프트웨어 | 최소 버전 | 확인 명령 | 비고 |
|-----------|----------|----------|------|
| Node.js | 18.x 이상 | `node --version` | |
| npm | 9.x 이상 | `npm --version` | |
| Supabase CLI | 2.x 이상 | `supabase --version` | 2.79.0+ 권장 (`db query` 지원) |

> **Docker Desktop은 불필요합니다.** 원격 Supabase 프로젝트에 직접 마이그레이션을
> 적용하므로 로컬 Supabase 실행이 필요하지 않습니다.

Supabase CLI 설치:

```bash
# Homebrew (macOS) -- 권장
brew install supabase/tap/supabase

# 또는 npm
npm install -g supabase

# 업그레이드 (최신 버전 권장)
brew upgrade supabase
```

> **CLI 버전 참고:** CLI는 자주 변경됩니다. 명령어가 예상대로 동작하지 않으면
> `supabase <command> --help`로 최신 플래그를 확인하세요.
> ([CLI 릴리스](https://github.com/supabase/cli/releases))

### 1.2 Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 에 접속하여 로그인
2. **New Project** 클릭
3. Organization 선택 후 프로젝트 정보 입력:
   - **Name:** `udamon` (또는 원하는 이름)
   - **Database Password:** 안전한 비밀번호 설정 (나중에 `supabase link`에 필요하니 기록)
   - **Region:** Northeast Asia (Tokyo) -- 한국 사용자 대상
4. **Create new project** 클릭 후 프로비저닝 완료 대기 (약 1-2분)

### 1.3 키 확인 위치

프로젝트 생성 완료 후 Supabase Dashboard에서 확인:

**Project Settings > API 탭:**

| 항목 | 설명 | 용도 |
|-----|------|------|
| **Project URL** | `https://<ref>.supabase.co` | 앱에서 Supabase 연결 |
| **Publishable key** (`sb_publishable_*`) | 퍼블릭 API 키 | 클라이언트 SDK 인증 |
| **Secret key** (`sb_secret_*`) | 서버 전용 키 | Edge Function 서버측 인증 |

> **보안 주의 (Supabase Agent Skill 기준):**
> - `secret` 키(구 `service_role`)는 RLS를 무시하는 관리자 키. **절대 클라이언트 코드에 노출 금지**
> - `publishable` 키(구 `anon`)가 프론트엔드용. Expo에서는 `EXPO_PUBLIC_` 접두사 변수에 저장
> - Legacy `anon` 키 형식(`eyJhbGciOi...`)은 호환용. 신규 프로젝트는 `sb_publishable_*` 형식 사용

**Project Settings > General 탭:**

| 항목 | 용도 |
|-----|------|
| **Reference ID** | CLI 프로젝트 링크 (`supabase link --project-ref`) |

---

## 2. Supabase CLI 프로젝트 링크

### 2.1 CLI 로그인

```bash
supabase login
```

브라우저가 열리면 Supabase 계정으로 로그인하여 CLI 접근을 허용합니다.

### 2.2 프로젝트 링크

프로젝트 루트에서 실행:

```bash
cd /path/to/udamon
supabase link --project-ref <your-project-ref>
```

Database password를 물으면 프로젝트 생성 시 설정한 비밀번호를 입력합니다.

> **환경변수로도 가능** (CI/CD 등):
> ```bash
> export SUPABASE_DB_PASSWORD=<your-db-password>
> supabase link --project-ref <your-project-ref>
> ```

### 2.3 링크 성공 확인

```bash
supabase migration list
```

원격 DB에 적용된 마이그레이션은 `REMOTE` 컬럼에 표시됩니다.
`supabase/config.toml`이 생성되었는지도 확인하세요.

---

## 3. 환경변수 설정

### 3.1 모바일 앱 (app/.env)

> **출처:** [Supabase Expo Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)

#### 파일 생성

```bash
cp app/.env.example app/.env
```

#### 필수 변수 설정

`app/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your-publishable-key>
```

| 변수 | 값 확인 위치 | 설명 |
|-----|-------------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Dashboard > Settings > API > Project URL | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | Dashboard > Settings > API > Publishable key | `sb_publishable_*` 형식 |

#### 환경변수 미설정 시 동작

```
Error: Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and
EXPO_PUBLIC_SUPABASE_KEY. Copy app/.env.example to app/.env and fill in
your Supabase project credentials.
```

이 에러는 `app/src/services/supabase.ts`의 필수 환경변수 검증 로직에 의한 것이며,
하드코딩된 키로 앱이 실행되는 것을 방지합니다.

### 3.2 어드민 웹 (admin/.env)

```bash
cp admin/.env.example admin/.env
```

`admin/.env`:

```env
VITE_ADMIN_EMAIL=your-admin@email.com
VITE_ADMIN_PASSWORD=your-secure-password
```

> **참고:** 이 값들은 사용자가 직접 정하는 임시 로그인 자격증명입니다.
> Phase 5 (ADM-01)에서 Supabase Auth 기반 인증으로 전환 예정입니다.

### 3.3 Edge Function Secrets (R2 업로드용 -- 선택)

> **Phase 1 테스트에서 선택 사항입니다.** Phase 1의 주요 목표는 DB 스키마 검증이며,
> Edge Function은 R2 업로드 기능에 해당합니다.

```bash
supabase secrets set \
  R2_ACCOUNT_ID=your-cloudflare-account-id \
  R2_ACCESS_KEY_ID=your-r2-access-key-id \
  R2_SECRET_ACCESS_KEY=your-r2-secret-access-key \
  R2_BUCKET_NAME=your-bucket-name \
  R2_PUBLIC_URL=https://your-r2-public-url.com
```

| 변수 | Cloudflare Dashboard 위치 |
|-----|--------------------------|
| `R2_ACCOUNT_ID` | Dashboard 우측 사이드바 > Account ID |
| `R2_ACCESS_KEY_ID` | R2 > Manage R2 API Tokens > Create API token |
| `R2_SECRET_ACCESS_KEY` | 토큰 생성 시 함께 표시 (최초 1회만 확인 가능) |
| `R2_BUCKET_NAME` | R2 > 버킷 목록에서 버킷 이름 |
| `R2_PUBLIC_URL` | R2 > 버킷 선택 > Settings > Public access URL |

---

## 4. 마이그레이션 적용

> **출처:** [Supabase CLI `db push`](https://supabase.com/docs/reference/cli/supabase-db-push),
> [Migration repair](https://supabase.com/docs/reference/cli/supabase-migration-repair)

### 4.1 첫 실행 (`supabase db push`)

```bash
npx supabase db push
```

22개 마이그레이션이 순서대로 적용됩니다. `Y`를 입력하여 확인합니다.

> `db push`는 처음 실행 시 `supabase_migrations.schema_migrations` 테이블을 생성합니다.
> 이후 push에서는 이미 적용된 마이그레이션을 자동으로 건너뜁니다.

### 4.2 "relation already exists" 에러 해결

이미 일부 테이블이 원격 DB에 존재하는 경우 발생합니다:

```
ERROR: relation "teams" already exists (SQLSTATE 42P07)
```

**해결: `migration repair`로 이미 적용된 마이그레이션을 마킹**

```bash
# 1. 현재 마이그레이션 상태 확인
supabase migration list
```

`LOCAL`에만 있고 `REMOTE`에 없는 마이그레이션 중, 실제로 DB에 이미 반영된 것들을 repair 합니다.

```bash
# 2. 이미 적용된 마이그레이션을 applied로 마킹
#    (각 마이그레이션의 타임스탬프를 사용)
supabase migration repair --status applied <migration_timestamp>
```

마이그레이션 파일명에서 타임스탬프를 확인할 수 있습니다.
예를 들어 `20240101000001_001_teams_players.sql`이면 `20240101000001`이 타임스탬프입니다.

```bash
# 3. 실제 파일의 타임스탬프 확인
ls supabase/migrations/

# 4. 각 이미 적용된 마이그레이션에 대해 repair 실행
#    예시 (실제 타임스탬프로 교체하세요):
supabase migration repair --status applied 20240101000001
supabase migration repair --status applied 20240101000002
# ... 이미 적용된 모든 마이그레이션에 대해 반복

# 5. repair 후 다시 push (남은 마이그레이션만 적용됨)
npx supabase db push
```

> **팁:** `supabase migration list`로 확인했을 때 `REMOTE`에 체크된 마이그레이션은
> 이미 적용된 것이므로 repair할 필요 없습니다. `LOCAL`에만 있는 것 중 실제로 DB에
> 반영된 것들만 repair하세요.

### 4.3 대안: 빈 DB에서 처음부터

원격 DB에 기존 테이블이 없는 깨끗한 상태라면 `supabase db push`만으로 충분합니다.
Supabase Dashboard > **Database** > **Tables**에서 기존 테이블을 확인하세요.

### 4.4 마이그레이션 목록

**기존 (001~010):**

| 번호 | 파일 | 내용 |
|-----|------|------|
| 001 | `001_teams_players.sql` | teams, players 테이블 |
| 002 | `002_community.sql` | community_posts, community_comments 등 |
| 003 | `003_polls.sql` | community_polls 테이블 |
| 004 | `004_spam_filter.sql` | spam_filter_words (021에서 DROP) |
| 005 | `005_rls_policies.sql` | 기존 RLS 정책 |
| 006 | `006_seed_teams.sql` | KBO 10개 구단 시드 |
| 007 | `007_photographer.sql` | photographers, photo_posts 등 |
| 008 | `008_photographer_rls.sql` | 포토그래퍼 RLS |
| 009 | `009_seed_photographer.sql` | 포토그래퍼 시드 |
| 010 | `010_deprecate_storage_policies.sql` | 스토리지 정책 정리 |

**Phase 1 신규 (011~022):**

| 번호 | 파일 | 내용 |
|-----|------|------|
| 011 | `011_users.sql` | public.users + handle_new_user 트리거 |
| 012 | `012_rls_helpers.sql` | is_admin(), is_owner() + 8개 테이블 RLS |
| 013 | `013_notifications.sql` | notifications 테이블 |
| 014 | `014_announcements.sql` | announcements 테이블 |
| 015 | `015_inquiries.sql` | inquiries 테이블 |
| 016 | `016_photographer_apps.sql` | photographer_applications 테이블 |
| 017 | `017_cheerleaders.sql` | cheerleaders 테이블 |
| 018 | `018_audit_logs.sql` | audit_logs 테이블 |
| 019 | `019_site_settings.sql` | site_settings 테이블 |
| 020 | `020_photo_posts_alter.sql` | photo_posts에 status, rejection_reason, cheerleader_id |
| 021 | `021_drop_spam_and_cleanup.sql` | spam_filter DROP + anon 정책 제거 |
| 022 | `022_seed_cheerleaders.sql` | KBO 10개 구단 치어리더 시드 |

---

## 5. Phase 1 Success Criteria 테스트 절차

> 이 섹션은 `01-VERIFICATION.md`의 human_needed 3개 항목에 대한 구체적 테스트입니다.

### 5.1 테스트 1: auth.users 트리거 동작 확인

**검증 대상:** auth.users에 사용자 생성 시 public.users에 자동으로 행이 생성되는가?

**단계:**

1. Supabase Dashboard > **Authentication** > **Users** 탭
2. **Add user** > **Create new user**
3. 테스트 사용자 정보 입력:
   - Email: `test-phase1@example.com`
   - Password: `TestPass123!`
   - **Auto Confirm User** 체크
4. **Create user** 클릭

**트리거 동작 확인:**

5. Dashboard > **SQL Editor**에서 아래 쿼리 실행:

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

**기대 결과:**

| 칼럼 | 기대 값 |
|------|--------|
| `id` | auth.users UUID와 동일 |
| `email` | `test-phase1@example.com` |
| `role` | `user` (기본값) |
| `nickname` | `user_` + UUID 앞 8자 (handle_new_user 트리거 기본값) |
| `is_deleted` | `false` |

### 5.2 테스트 2: RLS 비인증 차단 확인

**검증 대상:** 인증되지 않은 사용자(anon)가 보호된 테이블을 조회하면 빈 결과가 반환되는가?

> **Supabase Agent Skill 참고:** RLS는 exposed 스키마(특히 `public`)의 모든 테이블에
> 활성화되어야 합니다. 테이블이 Data API를 통해 접근 가능하기 때문입니다.

#### 방법 A: SQL Editor에서 테스트

Dashboard > **SQL Editor**에서 실행:

```sql
-- anon role로 전환하여 RLS 테스트
-- 중요: SET ROLE과 SELECT를 같은 쿼리 블록에서 실행해야 합니다
SET ROLE anon;
SELECT * FROM public.users;
-- 기대 결과: 0 rows (빈 결과)
```

```sql
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

테스트 후 role 복원:

```sql
RESET ROLE;
```

#### 방법 B: JavaScript로 테스트

```javascript
// test-rls.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://<your-project-ref>.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_...'; // publishable key

// 로그인하지 않은 상태의 클라이언트
const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY);

async function testRLS() {
  const tables = [
    'users', 'notifications', 'announcements',
    'inquiries', 'audit_logs', 'site_settings',
    'photographer_applications', 'cheerleaders'
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    const status = (data?.length === 0 && !error) ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${table}: rows=${data?.length ?? 'null'}, error=${error?.message ?? 'none'}`);
  }
}

testRLS();
```

```bash
node test-rls.mjs
```

기대 결과: 모든 테이블에서 `[PASS]`, `rows=0`, `error=none`.

### 5.3 테스트 3: 전체 테이블 존재 확인

Dashboard > **SQL Editor**:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Phase 1 신규 테이블 (8개) -- 모두 포함 확인:**

- `announcements`
- `audit_logs`
- `cheerleaders`
- `inquiries`
- `notifications`
- `photographer_applications`
- `site_settings`
- `users`

**cheerleaders 시드 데이터 확인:**

```sql
SELECT slug, name_ko, name_en, position
FROM public.cheerleaders
ORDER BY slug;
```

기대: KBO 10개 구단:

| slug | name_ko |
|------|---------|
| doosan | 두산 베어스 치어리더 |
| hanwha | 한화 이글스 치어리더 |
| kia | KIA 타이거즈 치어리더 |
| kiwoom | 키움 히어로즈 치어리더 |
| kt | KT 위즈 치어리더 |
| lg | LG 트윈스 치어리더 |
| lotte | 롯데 자이언츠 치어리더 |
| nc | NC 다이노스 치어리더 |
| samsung | 삼성 라이온즈 치어리더 |
| ssg | SSG 랜더스 치어리더 |

### 5.4 테스트 4: 보안 코드 검증

이미 자동 검증 완료. 로컬에서 재확인:

```bash
# 테스트 계정 잔존 확인
grep -rn "test@udamon\|TEST_ACCOUNTS\|admin1234" app/src/ admin/src/
# 기대: 결과 없음

# 더미 키 잔존 확인
grep -rn "DUMMY_URL\|DUMMY_KEY\|isSupabaseConfigured" app/src/
# 기대: 결과 없음

# AuthContext console.log 제거 확인
grep -n "console.log" app/src/contexts/AuthContext.tsx
# 기대: 결과 없음

# CORS 와일드카드 직접 할당 확인
grep -n '"Access-Control-Allow-Origin": "\*"' supabase/functions/get-upload-url/index.ts
# 기대: 결과 없음
```

### 5.5 테스트 5: 환경변수 필수 검증 동작

```bash
cd app
EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_KEY= npx expo start --web
# 기대: "Missing required environment variables" 에러 표시
```

Ctrl+C로 종료.

---

## 6. Edge Function 배포 및 테스트

> **선택 사항.** Phase 1 주요 목표는 DB 스키마 검증. R2 미설정이면 건너뛰세요.

### 6.1 배포

```bash
supabase functions deploy get-upload-url
```

### 6.2 인증 없이 호출 (401 확인)

```bash
curl -s -X POST \
  'https://<your-project-ref>.supabase.co/functions/v1/get-upload-url' \
  -H 'Content-Type: application/json' \
  -d '{"prefix":"avatars","contentType":"image/jpeg","count":1}'
```

기대: `{"error":"Missing or invalid Authorization header"}` (401)

### 6.3 인증 후 호출

```bash
# 1. JWT 토큰 획득 (5.1에서 생성한 테스트 사용자 사용)
curl -s -X POST \
  'https://<your-project-ref>.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <your-publishable-key>' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test-phase1@example.com",
    "password": "TestPass123!"
  }'
```

응답에서 `access_token` 복사 후:

```bash
# 2. Edge Function 호출
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

기대 (R2 secrets 설정 시):
```json
{
  "uploads": [{
    "uploadUrl": "https://<account-id>.r2.cloudflarestorage.com/...",
    "publicUrl": "https://<r2-public-url>/avatars/<user-id>/...",
    "key": "avatars/<user-id>/1712345678_abc123.jpg"
  }]
}
```

> R2 secrets 미설정 시 500 에러. Phase 1 DB 검증과 무관.

---

## 7. 앱 실행 및 동작 확인

### 7.1 모바일 앱 (Expo)

```bash
cd app
npm install
npx expo start
```

- `w` 키: 웹 브라우저에서 확인
- QR 코드: Expo Go 앱에서 스캔
- `.env` 올바르게 설정되어 있으면 앱이 정상 부팅

> **참고:** Phase 1은 DB 스키마 + 보안 정리 단계.
> Auth(소셜 로그인)는 Phase 2에서 완성. 앱이 부팅되고 UI가 표시되면 성공.

> **Expo 환경변수 변경 후 반영 안 될 때:**
> `npx expo start --clear`로 캐시 클리어 후 재시작

### 7.2 어드민 웹 (Vite)

```bash
cd admin
npm install
npm run dev
```

1. [http://localhost:5173](http://localhost:5173) 접속
2. `admin/.env`에 설정한 자격증명으로 로그인
3. 대시보드 표시되면 정상

> 어드민 웹은 아직 mock 데이터 기반. Phase 5에서 Supabase 연동 전환.
>
> **Vite 환경변수 주의:** `VITE_` 접두사가 없으면 클라이언트에 노출되지 않습니다.

---

## 8. 트러블슈팅

### 8.1 `supabase db push` 실패

#### "relation already exists" (SQLSTATE 42P07)

**원인:** 테이블이 이미 존재하지만 마이그레이션 이력에 기록되지 않음.

**해결:**

```bash
# 1. 마이그레이션 상태 확인
supabase migration list

# 2. 이미 적용된 마이그레이션을 applied로 마킹
supabase migration repair --status applied <timestamp>

# 3. 다시 push
npx supabase db push
```

자세한 절차는 [섹션 4.2](#42-relation-already-exists-에러-해결) 참조.

#### "supabase is not linked to a project"

```bash
supabase link --project-ref <your-project-ref>
```

#### "permission denied"

Database password가 올바른지 확인:
```bash
supabase link --project-ref <your-project-ref>
# Password 재입력
```

#### Docker 관련 에러

`supabase db push`는 원격 프로젝트에 직접 연결하므로 Docker 불필요.
이 에러는 `supabase start` (로컬 개발)에서만 발생.

### 8.2 환경변수 관련

#### "Missing required environment variables"

1. `ls -la app/.env` -- 파일 존재 확인
2. 변수명이 `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`인지 확인
3. 값이 비어있지 않은지 확인

#### Expo 환경변수 변경 후 반영 안 됨

```bash
# 캐시 클리어 후 재시작
npx expo start --clear
```

### 8.3 RLS 관련

#### "new row violates row-level security policy"

인증되지 않은 상태에서 INSERT 시도. 모든 테이블의 RLS 정책이 `TO authenticated`로 설정.

> **Supabase Agent Skill 참고:** UPDATE는 SELECT 정책도 필요합니다.
> Postgres RLS에서 UPDATE는 먼저 행을 SELECT해야 합니다. SELECT 정책 없이
> UPDATE하면 에러 없이 0 rows 반환됩니다.

#### 테이블 조회가 항상 빈 배열

**정상 동작입니다.** RLS가 비인증 사용자의 접근을 차단하고 있다는 의미.

### 8.4 Edge Function 관련

#### "Failed to deploy function"

1. CLI 버전 확인: `supabase --version`
2. 프로젝트 링크 확인: `supabase migration list`가 동작하는지
3. 함수 파일 확인: `supabase/functions/get-upload-url/index.ts` 존재 여부

#### 500 Internal Server Error

R2 secrets 미설정. 확인:

```bash
supabase secrets list
```

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` 확인.

#### CORS 에러 (브라우저 테스트 시)

Edge Function은 `ALLOWED_ORIGINS`에 설정된 도메인만 CORS 허용.
- curl은 CORS 제한 없음
- 네이티브 앱은 origin 헤더 없으므로 CORS 무관
- 도메인 구매 후 실제 도메인을 `ALLOWED_ORIGINS`에 추가 필요

---

## 9. 테스트 완료 체크리스트

### 필수 항목

- [ ] Supabase CLI 로그인 완료 (`supabase login`)
- [ ] 프로젝트 링크 완료 (`supabase link --project-ref`)
- [ ] 마이그레이션 전체 적용 (001~022, `supabase db push` 또는 `migration repair` + `db push`)
- [ ] public.users 테이블 존재 확인
- [ ] auth.users INSERT 시 public.users 자동 생성 확인 (handle_new_user 트리거)
- [ ] RLS 비인증 차단 확인 (`SET ROLE anon; SELECT * FROM users;` -> 빈 결과)
- [ ] Phase 1 신규 테이블 8개 전부 존재 확인
- [ ] cheerleaders 시드 데이터 10개 구단 확인
- [ ] app/.env 설정 완료 및 앱 부팅 확인
- [ ] admin/.env 설정 완료 및 웹 접속 확인

### 선택 항목

- [ ] Edge Function 배포 (`supabase functions deploy get-upload-url`)
- [ ] Edge Function presigned URL 생성 테스트
- [ ] R2 secrets 설정 확인

---

## 검증 완료 후

모든 필수 체크리스트를 통과하면 Phase 1이 완전히 검증된 것입니다.

다음 단계:
1. `.planning/phases/01-database-foundation-security/01-HUMAN-UAT.md`에 테스트 결과 기록
2. Phase 2 (Authentication) 진행 시작

> **테스트 사용자 정리:** 검증 완료 후 `test-phase1@example.com` 사용자는
> Dashboard > Authentication > Users에서 삭제 가능.
> (public.users 행은 ON DELETE CASCADE로 자동 삭제됨 -- 011_users.sql 참조)
