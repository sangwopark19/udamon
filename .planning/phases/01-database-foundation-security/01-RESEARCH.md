# Phase 1: Database Foundation & Security - Research

**Researched:** 2026-04-06
**Domain:** Supabase PostgreSQL schema, RLS, triggers, security hardening
**Confidence:** HIGH

## Summary

Phase 1은 UDAMON 앱의 전체 기반이 되는 데이터베이스 스키마 완성과 보안 정리 작업이다. 현재 10개의 마이그레이션 파일(001~010)이 존재하며, `public.users` 테이블이 없는 상태에서 `auth.users`를 직접 참조하고 있다. 새로 7개 테이블(users, notifications, announcements, inquiries, photographer_applications, cheerleaders, audit_logs, site_settings)을 생성하고, 기존 `photo_posts`에 컬럼을 추가하며, `spam_filter_words`를 DROP하고, 자동 블라인드 트리거를 제거해야 한다.

보안 측면에서는 앱 코드에 하드코딩된 테스트 계정 3개(test@udamon.com, test2@udamon.com, admin@udamon.com), console.log 3곳, console.error 6곳, console.warn 3곳이 존재한다. `supabase.ts`에는 더미 URL/키 fallback이 있고, 어드민 웹에는 비밀번호가 하드코딩되어 있다. Edge Function의 CORS가 `*` 와일드카드로 열려 있어 origin 제한이 필요하다.

RLS 정책은 기존 패턴(005, 008)을 따르되, D-11 결정에 따라 비인증 사용자를 완전 차단하는 방향으로 전환해야 한다. 기존 `posts_anon_read`, `comments_anon_read` 정책은 Phase 1에서 직접 수정 범위가 아니나(기존 테이블 RLS 변경), 신규 테이블에서는 처음부터 인증 필수로 작성한다.

**Primary recommendation:** Supabase 공식 패턴에 따라 `security definer set search_path = ''` 함수와 `auth.users` INSERT 트리거로 `public.users`를 자동 생성하고, `(select auth.uid())` 래핑으로 RLS 성능을 최적화하며, 기능별 분리 마이그레이션(011~)으로 관리한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** public.users에 DB-01 필수 칼럼 + Phase 2~6에서 필요한 예측 칼럼(bio, push_token, blocked_users 등)을 미리 포함. ALTER TABLE 횟수 최소화
- **D-02:** auth.users INSERT 시 PostgreSQL 트리거로 public.users 행 자동 생성. 클라이언트 코드 불필요, 누락 방지
- **D-03:** 회원 탈퇴는 soft delete -- is_deleted=true, deleted_at 기록. 게시글/댓글은 그대로 유지하되 작성자를 "탈퇴한 사용자"로 표시 (AUTH-09 일치)
- **D-04:** 테스트 계정 3개(test@udamon.com, test2@udamon.com, admin@udamon.com) 코드에서 완전 삭제. __DEV__ 게이트 없이 완전 제거. 개발 테스트는 Supabase Auth로만
- **D-05:** console.log 13곳 전량 제거. babel 플러그인 없이 코드에서 직접 삭제
- **D-06:** 환경변수 미설정 시 앱 시작 에러 표시 후 중단. isSupabaseConfigured 플래그와 더미 키 fallback 제거. 필수 환경변수 목록 명확화
- **D-07:** 기능별 분리 마이그레이션 -- 011_users.sql, 012_notifications.sql 등 테이블/기능별로 개별 파일. 리뷰와 롤백 용이
- **D-08:** spam_filter 테이블 DROP TABLE 마이그레이션 추가. Out of Scope 확정된 기능의 테이블 정리
- **D-09:** 기존 시드(teams, photographer) 유지. cheerleaders 시드 데이터 신규 추가
- **D-10:** 어드민 권한은 public.users.role = 'admin' 직접 확인 (DB-14 일치). JWT custom claim 불사용
- **D-11:** 비인증 사용자 완전 차단 -- 모든 테이블에 인증 필수. 로그인 없이는 데이터 조회 불가
- **D-12:** community_reports 자동 블라인드 트리거 제거 (DB-12). 관리자 수동 처리로 전환

### Claude's Discretion
- RLS 헬퍼 함수 패턴 채택 (is_admin(), is_owner() 등) -- 프로덕션 유지보수성과 감사 용이성 기준으로 결정
- 마이그레이션 번호 배정 및 순서
- 각 테이블의 인덱스 설계
- photo_posts ALTER 구문 구체 설계 (status, rejection_reason, cheerleader_id)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | public.users 테이블 생성 (role, nickname, avatar_url, my_team_id, nickname_changed_at, is_deleted, deleted_at) | Supabase 공식 패턴: handle_new_user() 트리거 + security definer 함수 |
| DB-02 | auth.users INSERT 시 public.users 자동 생성 트리거 | Supabase 공식 문서 verified -- AFTER INSERT trigger on auth.users |
| DB-03 | notifications 테이블 생성 | 표준 CREATE TABLE + RLS, 인덱스 설계 포함 |
| DB-04 | announcements 테이블 생성 | 표준 CREATE TABLE + is_admin() RLS 헬퍼 활용 |
| DB-05 | inquiries 테이블 생성 | 본인 조회 + 어드민 조회 RLS 패턴 |
| DB-06 | photographer_applications 테이블 생성 | 기존 admin.ts PhotographerApplication 타입과 일치 |
| DB-07 | cheerleaders 테이블 생성 | teams FK + 시드 데이터 필요 |
| DB-08 | audit_logs 테이블 생성 | 어드민 전용 INSERT/SELECT, service_role 패턴 |
| DB-09 | site_settings 테이블 생성 | key-value JSON 패턴, 어드민 전용 |
| DB-10 | photo_posts에 status/rejection_reason 컬럼 추가 | ALTER TABLE + DEFAULT 'approved' (기존 데이터 호환) |
| DB-11 | photo_posts에 cheerleader_id 컬럼 추가 | ALTER TABLE + FK to cheerleaders |
| DB-12 | community_reports 자동 블라인드 트리거 제거 | DROP TRIGGER + DROP FUNCTION |
| DB-13 | 모든 신규 테이블에 RLS 정책 적용 | (select auth.uid()) 래핑 + is_admin() 헬퍼 함수 |
| DB-14 | 어드민 RLS 정책 (public.users.role = 'admin' 기반) | security definer 헬퍼 함수로 구현 -- D-10 결정 |
| SEC-01 | 테스트 계정 3개 제거 | app/src/contexts/AuthContext.tsx lines 55-112, 176-188, 277-288 |
| SEC-02 | 환경변수 정리 (.env 생성, 더미 키/fallback 제거) | app/src/services/supabase.ts 전면 수정 |
| SEC-03 | 어드민 하드코딩 비밀번호 제거 | admin/src/contexts/AuthContext.tsx -- Phase 5에서 Supabase Auth 전환하지만, Phase 1에서 하드코딩 정리 |
| SEC-04 | console.log 프로덕션 빌드 시 제거 | AuthContext.tsx에 console.log 3곳 + console.error 6곳 + console.warn 3곳, ErrorBoundary 1곳 |
| SEC-05 | Edge Function CORS origin 제한 | supabase/functions/get-upload-url/index.ts corsHeaders 수정 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase PostgreSQL | 15.x (Supabase managed) | 데이터베이스 엔진 | Supabase 호스팅 기본 [VERIFIED: Supabase docs] |
| @supabase/supabase-js | ^2.100.0 (latest: 2.101.1) | 클라이언트 SDK | 프로젝트에서 이미 사용 중 [VERIFIED: npm registry] |
| Supabase CLI | 2.84.10 (npx), 2.75.0 (global) | 마이그레이션 관리 | 로컬에 설치됨 [VERIFIED: local check] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| plpgsql | PostgreSQL built-in | 트리거/함수 작성 | 모든 DB 함수에 사용 [VERIFIED: existing migrations] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| public.users.role 직접 확인 | JWT custom claims (app_metadata) | 사용자 결정으로 직접 확인 채택 (D-10). JWT claims는 갱신 지연 문제 있음 |
| 개별 마이그레이션 파일 | 단일 대형 마이그레이션 | 사용자 결정으로 기능별 분리 채택 (D-07). 리뷰/롤백 용이 |

## Architecture Patterns

### Recommended Migration Structure
```
supabase/migrations/
  001_teams_players.sql          # (existing)
  002_community.sql              # (existing)
  003_polls.sql                  # (existing)
  004_spam_filter.sql            # (existing)
  005_rls_policies.sql           # (existing)
  006_seed_teams.sql             # (existing)
  007_photographer.sql           # (existing)
  008_photographer_rls.sql       # (existing)
  009_seed_photographer.sql      # (existing)
  010_deprecate_storage_policies.sql # (existing)
  011_users.sql                  # NEW: public.users + trigger
  012_rls_helpers.sql            # NEW: is_admin(), is_owner() 헬퍼 함수
  013_notifications.sql          # NEW: notifications 테이블 + RLS
  014_announcements.sql          # NEW: announcements 테이블 + RLS
  015_inquiries.sql              # NEW: inquiries 테이블 + RLS
  016_photographer_apps.sql      # NEW: photographer_applications + RLS
  017_cheerleaders.sql           # NEW: cheerleaders 테이블 + RLS
  018_audit_logs.sql             # NEW: audit_logs 테이블 + RLS
  019_site_settings.sql          # NEW: site_settings 테이블 + RLS
  020_photo_posts_alter.sql      # NEW: status, rejection_reason, cheerleader_id
  021_drop_spam_filter.sql       # NEW: DROP spam_filter_words + 자동 블라인드 트리거 제거
  022_seed_cheerleaders.sql      # NEW: cheerleaders 시드 데이터
```

### Pattern 1: auth.users INSERT 트리거 (public.users 자동 생성)
**What:** Supabase 공식 패턴. auth.users에 새 행 INSERT 시 public.users에 자동으로 행 생성
**When to use:** DB-01, DB-02 구현 시
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/auth/managing-user-data
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (
    id,
    email,
    nickname,
    avatar_url,
    role
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || left(new.id::text, 8)),
    new.raw_user_meta_data ->> 'avatar_url',
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```
[VERIFIED: Supabase official docs -- https://supabase.com/docs/guides/auth/managing-user-data]

**Critical note:** `security definer set search_path = ''`는 Supabase Security Advisor에서 요구하는 패턴이다. search_path를 빈 문자열로 설정하면 모든 테이블 참조를 `public.users`처럼 스키마를 명시해야 한다. [VERIFIED: Supabase Security Advisor docs]

### Pattern 2: RLS 헬퍼 함수 (is_admin)
**What:** 어드민 권한 확인을 중앙화하는 security definer 함수
**When to use:** DB-14, 어드민 전용 테이블 RLS에 사용
**Example:**
```sql
-- Source: Supabase RLS best practices
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  return exists (
    select 1
    from public.users
    where id = (select auth.uid())
    and role = 'admin'
    and is_deleted = false
  );
end;
$$;
```
[CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

### Pattern 3: (select auth.uid()) 래핑을 통한 RLS 성능 최적화
**What:** auth.uid()를 SELECT로 래핑하면 PostgreSQL이 결과를 쿼리 단위로 캐싱하여 행별 호출을 방지
**When to use:** 모든 RLS 정책에서 auth.uid() 사용 시
**Example:**
```sql
-- Bad: 행마다 auth.uid() 호출
create policy "read_own" on notifications
  for select using (auth.uid() = user_id);

-- Good: 쿼리당 1회만 auth.uid() 호출 (99.94% 성능 개선)
create policy "read_own" on notifications
  for select using ((select auth.uid()) = user_id);
```
[VERIFIED: https://supabase.com/docs/guides/database/postgres/row-level-security]

### Pattern 4: CORS Origin 제한
**What:** Edge Function에서 와일드카드 `*` 대신 특정 도메인만 허용
**When to use:** SEC-05 구현 시
**Example:**
```typescript
// Source: Supabase Edge Functions CORS docs
const ALLOWED_ORIGINS = [
  'https://udamonfan.com',
  'https://www.udamonfan.com',
  'https://admin.udamonfan.com',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
  };
}
```
[CITED: https://supabase.com/docs/guides/functions/cors]

**Note:** 도메인이 아직 미구매 상태(STATE.md blocker)이므로, 플레이스홀더 도메인으로 작성하고 TODO 주석을 남겨야 한다. 모바일 앱에서의 Edge Function 호출은 origin 헤더가 없을 수 있으므로, origin이 없는 경우(네이티브 앱)도 허용하는 로직이 필요하다.

### Pattern 5: 환경변수 필수 검증 패턴
**What:** 앱 시작 시 필수 환경변수 존재를 확인하고 없으면 에러를 표시하며 중단
**When to use:** SEC-02, D-06 구현 시
**Example:**
```typescript
// app/src/services/supabase.ts -- 교체 패턴
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copy app/.env.example to app/.env and fill in your Supabase project credentials.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```
[ASSUMED]

### Anti-Patterns to Avoid
- **raw_user_meta_data로 권한 확인:** 사용자가 직접 수정할 수 있어 보안에 취약하다. role은 반드시 `public.users.role` 칼럼에서 확인해야 한다. [VERIFIED: Supabase RLS docs]
- **search_path 미설정:** `security definer` 함수에서 `set search_path = ''`를 생략하면 Supabase Security Advisor 경고가 발생한다. [VERIFIED: Supabase Security Advisor]
- **트리거 함수에서 RAISE EXCEPTION:** `handle_new_user()` 트리거 함수가 실패하면 회원가입 자체가 차단된다. INSERT 실패 시 조용히 처리하거나, 최소한의 필수 칼럼만 넣어야 한다. [VERIFIED: Supabase official docs]
- **RLS에서 서브쿼리 남용:** `NOT IN (SELECT ...)` 패턴은 성능 저하를 유발할 수 있다. 가능하면 `NOT EXISTS`를 사용한다. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| auth.users -> public.users 동기화 | 클라이언트 코드에서 INSERT | PostgreSQL AFTER INSERT 트리거 | 누락 방지, 모든 OAuth 경로 커버 |
| 어드민 권한 확인 | 각 RLS 정책에서 직접 JOIN | is_admin() security definer 함수 | 중앙화, 캐싱, 유지보수 용이 |
| UUID 생성 | 클라이언트에서 UUID 생성 | gen_random_uuid() (PostgreSQL built-in) | DB 기본값으로 일관성 보장 |
| 타임스탬프 관리 | 클라이언트에서 NOW() 전달 | DEFAULT NOW() + updated_at 트리거 | 시간대 일관성 보장 |
| 환경변수 타입 검증 | 런타임에 undefined 체크 분산 | 앱 초기화 시점에서 한 번에 검증 후 throw | 누락 시 명확한 에러 |

**Key insight:** Supabase 트리거와 RLS 함수는 DB 레벨에서 보안을 강제하므로, 클라이언트 코드의 버그나 우회와 무관하게 데이터 무결성을 보장한다.

## Common Pitfalls

### Pitfall 1: 트리거 함수 실패 시 회원가입 차단
**What goes wrong:** `handle_new_user()` 트리거에서 NOT NULL 위반이나 FK 위반이 발생하면 auth.users INSERT 자체가 롤백되어 회원가입이 실패한다
**Why it happens:** 트리거가 AFTER INSERT이므로 같은 트랜잭션 안에서 실행됨
**How to avoid:** 트리거 함수에서 최소한의 필수 칼럼만 INSERT하고, nullable 칼럼은 DEFAULT 값을 활용한다. EXCEPTION 핸들러로 감싸는 것도 고려
**Warning signs:** OAuth 가입 후 "Database error" 메시지

### Pitfall 2: 기존 RLS 정책과 신규 정책 충돌
**What goes wrong:** 같은 테이블에 여러 SELECT 정책이 있으면 OR로 결합됨. anon_read 정책이 있으면 비인증 사용자도 데이터를 볼 수 있음
**Why it happens:** PostgreSQL RLS는 같은 operation type의 정책을 OR로 결합
**How to avoid:** D-11 결정에 따라 기존 `posts_anon_read`, `comments_anon_read` 정책을 DROP해야 하지만, 이는 기존 마이그레이션 수정이므로 별도 마이그레이션으로 처리
**Warning signs:** 비인증 상태에서 `supabase.from('community_posts').select()`가 데이터를 반환

### Pitfall 3: security definer 함수의 search_path
**What goes wrong:** search_path가 설정되지 않으면 악의적 스키마의 동명 테이블을 참조할 수 있음
**Why it happens:** PostgreSQL이 current search_path에서 테이블을 찾기 때문
**How to avoid:** 모든 security definer 함수에 `set search_path = ''`를 추가하고, 함수 본문에서 `public.users`처럼 스키마를 명시
**Warning signs:** Supabase Dashboard의 Security Advisor에서 "function_search_path_mutable" 경고

### Pitfall 4: console.log 제거 범위 착오
**What goes wrong:** CONTEXT.md에서 "console.log 13곳"이라고 언급했지만, 실제 코드 검색 결과는 다르다
**Why it happens:** discuss 단계에서의 카운트가 부정확하거나, console.error/warn을 포함한 수치
**How to avoid:** 정확한 현황 확인 필요 -- 실제 app/src 내 console 사용:
- `console.log`: 3곳 (AuthContext.tsx -- OAuth/Deep Link)
- `console.error`: 7곳 (AuthContext.tsx 6곳 + ErrorBoundary 1곳)
- `console.warn`: 3곳 (AuthContext.tsx 3곳)
- D-05 결정은 "console.log 전량 제거"이므로 console.log 3곳을 제거한다
- console.error/warn은 에러 핸들링 용도이므로 제거 여부는 별도 판단 필요
**Warning signs:** 프로덕션 빌드에서 민감한 토큰/URL이 콘솔에 출력

### Pitfall 5: 어드민 하드코딩 제거의 범위
**What goes wrong:** SEC-03은 어드민 하드코딩 비밀번호 제거를 요구하지만, 어드민 Supabase Auth 전환은 Phase 5(ADM-01)
**Why it happens:** Phase 1은 보안 취약점 제거, Phase 5는 기능 구현
**How to avoid:** Phase 1에서는 하드코딩된 비밀번호를 환경변수로 이동하거나, 최소한 코드에서 하드코딩을 제거하는 정도로 처리. 완전한 Supabase Auth 전환은 Phase 5에서 수행
**Warning signs:** 어드민 웹이 Phase 1 이후 로그인 불가능

### Pitfall 6: DROP TABLE 시 FK 참조
**What goes wrong:** `spam_filter_words`를 DROP할 때 다른 테이블에서 FK 참조가 있으면 실패
**Why it happens:** `004_spam_filter.sql`에서 `spam_filter_words` 테이블은 다른 테이블에서 참조되지 않으므로 안전하게 DROP 가능. 같은 파일의 `user_restrictions`, `user_blocks`, `recent_searches`는 DROP하면 안 됨
**How to avoid:** DROP은 `spam_filter_words` 테이블과 관련 RLS 정책/인덱스만 대상으로 한다
**Warning signs:** FK constraint violation 에러

## Code Examples

### public.users 테이블 스키마 (D-01 + 예측 칼럼)
```sql
-- Source: CONTEXT.md D-01, DB-01 requirements, AuthContext.tsx UserProfile 타입
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nickname text not null default '',
  avatar_url text,
  bio text default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  my_team_id uuid references public.teams(id),
  push_token text,
  blocked_users uuid[] default '{}',
  nickname_changed_at timestamptz,
  is_photographer boolean default false,
  is_deleted boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index idx_users_nickname on public.users(nickname)
  where is_deleted = false and nickname != '';
create index idx_users_role on public.users(role) where role = 'admin';
create index idx_users_team on public.users(my_team_id);
```
[ASSUMED -- 칼럼 목록은 D-01 결정과 기존 UserProfile 타입에서 추론]

### RLS 헬퍼 함수 모음
```sql
-- is_admin: 관리자 여부 확인
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  return exists (
    select 1 from public.users
    where id = (select auth.uid())
    and role = 'admin'
    and is_deleted = false
  );
end;
$$;

-- is_owner: 리소스 소유자 여부 확인
create or replace function public.is_owner(resource_user_id uuid)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
begin
  return (select auth.uid()) = resource_user_id;
end;
$$;
```
[CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

### notifications 테이블 예시 (RLS 포함)
```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'announcement', 'system')),
  title text not null,
  body text not null default '',
  data jsonb default '{}',
  is_read boolean default false,
  created_at timestamptz default now()
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id, is_read)
  where is_read = false;

alter table public.notifications enable row level security;

create policy "notifications_read_own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id);

-- INSERT는 서버 사이드(service_role)에서만
-- DELETE는 본인만
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using ((select auth.uid()) = user_id);
```
[ASSUMED -- 기존 RLS 패턴과 Supabase 공식 패턴 결합]

### 자동 블라인드 트리거 제거 (DB-12)
```sql
-- Source: 002_community.sql에서 정의된 트리거/함수 제거
drop trigger if exists trg_auto_blind on community_reports;
drop function if exists auto_blind_on_report();
```
[VERIFIED: 002_community.sql 확인]

### 어드민 웹 환경변수 패턴 (SEC-03 임시 처리)
```typescript
// admin/src/contexts/AuthContext.tsx -- Phase 1 임시 처리
// Phase 5에서 Supabase Auth로 완전 전환될 때까지
// 환경변수로 비밀번호를 이동 (하드코딩 제거)
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('Missing VITE_ADMIN_PASSWORD environment variable');
}
```
[ASSUMED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| auth.uid() 직접 사용 | (select auth.uid()) 래핑 | Supabase RLS docs 2024+ | 99.94% RLS 성능 개선 |
| search_path 미설정 | security definer set search_path = '' | Supabase Security Advisor | 보안 경고 해소 |
| raw_user_meta_data 권한 확인 | public.users.role 직접 확인 | Supabase docs recommendation | 사용자가 metadata 수정 불가 |
| Access-Control-Allow-Origin: * | 특정 origin 제한 | CORS 보안 표준 | CSRF 방지 |

**Deprecated/outdated:**
- `spam_filter_words` 테이블: Out of Scope 확정, DROP 대상 (D-08)
- `auto_blind_on_report()` 트리거: 자동 블라인드 제거 확정, DROP 대상 (D-12)
- `isSupabaseConfigured` 플래그 + 더미 키: 제거 확정 (D-06)
- `posts_anon_read`, `comments_anon_read` RLS 정책: D-11에 따라 비인증 차단으로 전환 필요

## Assumptions Log

> 검증되지 않은 주장 목록. 플래너와 discuss-phase에서 사용자 확인이 필요한 항목.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | public.users 칼럼 목록 (bio, push_token, blocked_users, is_photographer 등) | Code Examples - users 스키마 | Phase 2~6에서 ALTER TABLE 추가 필요 -- 낮은 리스크 |
| A2 | notifications type enum 값 ('like', 'comment', 'follow', 'announcement', 'system') | Code Examples - notifications | type 추가/변경은 ALTER로 처리 가능 -- 낮은 리스크 |
| A3 | 어드민 웹 SEC-03은 환경변수 이동으로 임시 처리 | Code Examples - 어드민 | Phase 5까지 어드민 로그인이 동작해야 함 -- 중간 리스크 |
| A4 | console.error/warn은 제거 대상이 아님 (console.log만 제거) | Pitfalls - console.log | D-05가 "console.log 전량 제거"로 명시 -- error/warn 포함 여부 확인 필요 |
| A5 | 모바일 앱에서 Edge Function 호출 시 origin 헤더가 없을 수 있음 | Architecture - CORS | CORS 제한이 모바일 앱 동작을 방해할 수 있음 -- 높은 리스크 |
| A6 | NOT EXISTS가 NOT IN보다 성능이 좋다 | Anti-Patterns | RLS 성능에 영향 -- 낮은 리스크 |

## Open Questions

1. **console.log vs console.error/warn 제거 범위**
   - What we know: D-05는 "console.log 13곳 전량 제거"라고 명시했지만, 실제 console.log은 3곳뿐이고 console.error(7곳) + console.warn(3곳) = 13곳
   - What's unclear: D-05가 console.log만 의미하는지, console.* 전체를 의미하는지
   - Recommendation: console.log 3곳은 확실히 제거. console.error/warn은 에러 핸들링 용도이므로 유지하되, OAuth URL/토큰 정보를 출력하는 부분만 제거하거나 마스킹. ErrorBoundary의 console.error는 유지

2. **기존 anon RLS 정책 처리**
   - What we know: D-11에 따라 비인증 사용자 완전 차단이지만, 005_rls_policies.sql에 `posts_anon_read`, `comments_anon_read`가 존재
   - What's unclear: Phase 1에서 기존 정책도 DROP해야 하는지, 아니면 신규 테이블만 인증 필수로 하는지
   - Recommendation: Phase 1 범위에 기존 anon 정책 DROP을 포함시킨다. 별도 마이그레이션(예: 021번)으로 처리

3. **어드민 웹 SEC-03의 정확한 범위**
   - What we know: 어드민 Supabase Auth 전환은 Phase 5 (ADM-01), SEC-03은 Phase 1
   - What's unclear: Phase 1에서 어떤 수준까지 처리할지 -- 환경변수 이동? 로그인 비활성화?
   - Recommendation: 하드코딩된 비밀번호를 환경변수(VITE_ADMIN_PASSWORD)로 이동하고 .env.example에 문서화. Phase 5에서 완전 전환

4. **CORS origin 제한과 모바일 앱 호환성**
   - What we know: 도메인 미구매 상태, 모바일 앱은 브라우저가 아니므로 origin 헤더 동작이 다름
   - What's unclear: React Native에서 fetch 요청 시 origin 헤더가 전송되는지 여부
   - Recommendation: origin이 없는 요청(네이티브 앱)은 허용하고, 브라우저 origin만 제한하는 조건부 로직 구현

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI (npx) | 마이그레이션 실행 | Yes | 2.84.10 | -- |
| Supabase CLI (global) | 마이그레이션 실행 | Yes | 2.75.0 | npx 사용 |
| Node.js | 개발 도구 | Yes | 24.13.0 | -- |
| npm | 패키지 관리 | Yes | (Node 포함) | -- |
| PostgreSQL client | DB 직접 접속 | Not checked | -- | Supabase Dashboard SQL Editor |

**Missing dependencies with no fallback:**
- 없음

**Missing dependencies with fallback:**
- 없음 -- 모든 필수 도구 사용 가능

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 -- 프로젝트에 테스트 인프라 미구축 |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | users 테이블 존재 확인 | SQL query | `supabase db reset && supabase db dump` | N/A -- SQL 마이그레이션 |
| DB-02 | auth.users INSERT -> public.users 자동 생성 | manual (Supabase Dashboard) | manual-only: Dashboard에서 사용자 생성 후 확인 | N/A |
| DB-03~DB-09 | 테이블 존재 확인 | SQL query | `supabase db reset` 후 테이블 쿼리 | N/A |
| DB-10~DB-11 | photo_posts 칼럼 추가 확인 | SQL query | `\d photo_posts` | N/A |
| DB-12 | 자동 블라인드 트리거 제거 확인 | SQL query | `select * from pg_trigger where tgname = 'trg_auto_blind'` | N/A |
| DB-13~DB-14 | RLS 동작 확인 | manual | anon key로 SELECT 시도 -> 빈 결과 확인 | N/A |
| SEC-01 | 테스트 계정 코드 제거 | grep | `grep -r "test@udamon" app/src/` | N/A |
| SEC-02 | 더미 키 제거 확인 | grep | `grep -r "DUMMY_URL\|DUMMY_KEY\|isSupabaseConfigured" app/src/` | N/A |
| SEC-03 | 하드코딩 비밀번호 제거 | grep | `grep -r "admin1234" admin/src/` | N/A |
| SEC-04 | console.log 제거 확인 | grep | `grep -r "console.log" app/src/` | N/A |
| SEC-05 | CORS origin 제한 확인 | code review | `grep "Allow-Origin.*\*" supabase/functions/` | N/A |

### Sampling Rate
- **Per task commit:** SQL 마이그레이션은 `supabase db reset`으로 무결성 검증
- **Per wave merge:** 전체 마이그레이션 순서대로 실행 확인
- **Phase gate:** Supabase Dashboard에서 수동 검증 (트리거, RLS 동작)

### Wave 0 Gaps
- 이 Phase는 SQL 마이그레이션 + 코드 보안 정리로 구성되어 자동화된 테스트 프레임워크가 불필요
- 검증은 `supabase db reset`, grep 검색, Supabase Dashboard 수동 테스트로 수행
- Phase 2(Auth) 이후부터 단위 테스트 도입이 적절

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (부분) | Supabase Auth -- 테스트 계정/하드코딩 비밀번호 제거 |
| V3 Session Management | No | Phase 2에서 처리 |
| V4 Access Control | Yes | RLS 정책 + is_admin() 헬퍼 함수 |
| V5 Input Validation | Yes | CHECK constraints (role, type enums, 문자열 길이) |
| V6 Cryptography | No | 직접 암호화 없음 -- Supabase 위임 |

### Known Threat Patterns for Supabase + PostgreSQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| RLS 우회 (service_role 키 노출) | Elevation of Privilege | 서버 사이드에서만 service_role 사용, 클라이언트는 anon key만 |
| 하드코딩 비밀번호 | Information Disclosure | 환경변수로 이동, .env 파일 gitignore (SEC-01, SEC-03) |
| 민감 정보 콘솔 출력 | Information Disclosure | console.log 제거 (SEC-04) -- OAuth URL/토큰 포함 |
| CORS 와일드카드 | Spoofing | origin 제한 (SEC-05) |
| 비인증 데이터 접근 | Spoofing | 비인증 사용자 차단 RLS (D-11) |
| soft delete 우회 | Tampering | RLS에서 is_deleted = false 조건 포함 |
| search_path 공격 | Elevation of Privilege | security definer set search_path = '' |

## Sources

### Primary (HIGH confidence)
- [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data) -- auth.users 트리거 패턴 verified
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- (select auth.uid()) 래핑, 헬퍼 함수 패턴 verified
- [Supabase Edge Functions CORS](https://supabase.com/docs/guides/functions/cors) -- CORS 핸들링 패턴 cited
- npm registry -- @supabase/supabase-js latest version 2.101.1 verified
- 기존 마이그레이션 파일 (001~010) -- 코드베이스 직접 확인

### Secondary (MEDIUM confidence)
- [Supabase Security Advisor](https://supabase.com/docs/guides/database/database-advisors) -- search_path 경고 패턴 (docs 404이었으나 WebSearch에서 다수 확인)
- [Supabase RLS Best Practices - MakerKit](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- is_admin() 헬퍼 함수 패턴

### Tertiary (LOW confidence)
- 없음 -- 모든 주요 주장이 공식 문서 또는 코드베이스에서 검증됨

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Supabase 공식 문서와 기존 코드베이스에서 검증
- Architecture: HIGH -- 기존 마이그레이션 패턴과 공식 문서 패턴 일치
- Pitfalls: HIGH -- 공식 문서에서 명시적으로 경고하는 항목들
- Security: HIGH -- ASVS 카테고리와 STRIDE 모델에 기반

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (Supabase는 안정적인 API, 30일 유효)
