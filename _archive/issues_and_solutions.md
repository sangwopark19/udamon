# DUGOUT 문제점 분석 및 해결 방안

> 분석일: 2026-04-01
> 심각도: CRITICAL > HIGH > MEDIUM > LOW

---

## 목차

1. [보안 이슈 (CRITICAL)](#1-보안-이슈)
2. [데이터베이스 스키마 누락 (CRITICAL)](#2-데이터베이스-스키마-누락)
3. [데이터 무결성 이슈 (HIGH)](#3-데이터-무결성-이슈)
4. [성능 이슈 (HIGH)](#4-성능-이슈)
5. [미연동 핵심 기능 (HIGH)](#5-미연동-핵심-기능)
6. [타입 안전성 이슈 (MEDIUM)](#6-타입-안전성-이슈)
7. [코드 품질 이슈 (MEDIUM)](#7-코드-품질-이슈)
8. [개발 인프라 부재 (MEDIUM)](#8-개발-인프라-부재)
9. [프로토콜 스펙 불일치 (LOW)](#9-프로토콜-스펙-불일치)
10. [우선순위별 실행 로드맵](#10-우선순위별-실행-로드맵)

---

## 1. 보안 이슈

### 1.1 [CRITICAL] 테스트 계정 프로덕션 노출

**위치:** `app/src/contexts/AuthContext.tsx:55-107`

테스트 계정 3개가 코드에 하드코딩되어 있으며, 프로덕션 빌드에서 비활성화할 메커니즘이 없다.

```typescript
// 라인 57-107: 하드코딩된 테스트 계정
const TEST_ACCOUNTS: Record<string, { password: string; profile: UserProfile; isPhotographer: boolean }> = {
  'test@dugout.com':  { password: 'test1234',  /* ... */ },
  'test2@dugout.com': { password: 'test1234',  /* ... is_photographer: true */ },
  'admin@dugout.com': { password: 'admin1234', /* ... is_admin: true, admin_role: 'super_admin' */ },
};
```

```typescript
// 라인 276-291: Supabase 인증 완전 우회
const loginWithEmail = async (email: string, password: string) => {
  const testAcct = TEST_ACCOUNTS[email];
  if (testAcct && password === testAcct.password) {
    setUser(testAcct.profile);  // 실제 인증 없이 즉시 로그인
    // ...
    return { success: true };
  }
  // ...
};
```

**위험:** 누구나 `admin@dugout.com / admin1234`로 관리자 권한을 획득할 수 있다.

**해결 방안:**
```typescript
// 환경 변수로 테스트 계정 활성화 제어
const TEST_ACCOUNTS = __DEV__ ? {
  'test@dugout.com': { /* ... */ },
  // ...
} : {};
```
또는 `app.json`의 `extra` 필드에 `enableTestAccounts: false`를 설정하고, EAS 빌드 프로필별로 분리한다.

---

### 1.2 [CRITICAL] 어드민 대시보드 하드코딩 비밀번호

**위치:** `admin/src/contexts/AuthContext.tsx:20-26`

```typescript
const ADMIN_ACCOUNTS: Record<string, { password: string; user: AdminUser }> = {
  'admin@dugout.com': {
    password: 'admin1234',  // 평문 비밀번호
    user: { id: 'admin-001', role: 'super_admin' },
  },
};
```

**위치:** `admin/src/pages/LoginPage.tsx:78` — 로그인 화면에 크레덴셜 노출:
```html
<p className="text-center text-xs text-gray-400 mt-4">
  테스트: admin@dugout.com / admin1234
</p>
```

**추가 문제:**
- 평문 비밀번호 비교 (해싱 없음) — `AuthContext.tsx:52-56`
- localStorage에 관리자 정보 평문 저장 — `AuthContext.tsx:37-50`
- 로그인 시도 횟수 제한(rate limiting) 없음
- 토큰 만료/갱신 로직 없음

**해결 방안:**
어드민도 Supabase Auth를 사용하도록 전환한다.

```typescript
// admin/src/contexts/AuthContext.tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return false;
  // Supabase users 테이블에서 is_admin 확인
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin, admin_role')
    .eq('id', data.user.id)
    .single();
  if (!profile?.is_admin) return false;
  setAdmin({ ...data.user, ...profile });
  return true;
};
```

---

### 1.3 [CRITICAL] 인앱 어드민 접근 제어 없음

**위치:** `app/src/contexts/AdminContext.tsx:54-58`

AdminProvider가 `user.is_admin` 여부를 전혀 확인하지 않는다. 일반 사용자도 어드민 함수를 호출할 수 있다.

```typescript
export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // ❌ user.is_admin 체크 없음
  // 아래 모든 함수가 누구나 호출 가능
}
```

**영향받는 함수 (라인 141-253):**
- `approvePost()`, `rejectPost()` — 포스트 승인/거절
- `resolveReport()` — 신고 처리
- `sanctionUser()`, `revokeSanction()` — 사용자 제재
- `approvePhotographer()`, `rejectPhotographer()` — 포토그래퍼 심사
- `createAnnouncement()`, `deleteAnnouncement()` — 공지 관리

**해결 방안:**
```typescript
export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const approvePost = useCallback((postId: string) => {
    if (!user?.is_admin) return;  // 권한 검증
    // ... 기존 로직
  }, [user]);

  // 모든 어드민 함수에 동일하게 적용
}
```

추가로, 네비게이션 레벨에서도 어드민 화면 접근을 차단해야 한다:
```typescript
// App.tsx 네비게이션 설정에서
{user?.is_admin && (
  <>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    {/* ... */}
  </>
)}
```

---

### 1.4 [HIGH] Supabase 더미 키 폴백

**위치:** `app/src/services/supabase.ts:10`

```typescript
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';
```

환경 변수 미설정 시 더미 JWT로 폴백되어 실제 요청은 실패하지만, 앱이 크래시 없이 동작하므로 문제를 감지하기 어렵다.

**해결 방안:**
환경 변수 미설정 시 명시적 에러를 발생시킨다:
```typescript
if (!isSupabaseConfigured && !__DEV__) {
  throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
}
```

---

## 2. 데이터베이스 스키마 누락

### 2.1 [CRITICAL] users 테이블 없음

**앱 참조 위치:**
- `app/src/contexts/AuthContext.tsx:131` — `.from('users').select('*')`
- `app/src/contexts/AuthContext.tsx:323` — `.from('users').update(updates)`

Supabase의 `auth.users`는 존재하지만, 앱이 참조하는 `public.users` 테이블은 마이그레이션에 없다. 프로필 조회/업데이트 시 에러 발생.

**해결 방안:** 새 마이그레이션 추가:
```sql
-- 010_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  is_photographer BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  admin_role TEXT CHECK (admin_role IN ('super_admin', 'moderator')),
  ticket_balance INTEGER DEFAULT 0,
  my_team_id UUID REFERENCES teams(id),
  nickname_changed_at TIMESTAMPTZ,  -- 닉네임 변경 30일 제한용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_public_read" ON users FOR SELECT USING (TRUE);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- auth.users 생성 시 자동으로 public.users 레코드 생성
CREATE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### 2.2 [CRITICAL] photo_posts 누락 컬럼 3개

**위치:** `supabase/migrations/007_photographer.sql:43-58`

앱이 사용하는 컬럼 3개가 테이블에 없다:

| 컬럼 | 앱 참조 | 현재 상태 |
|------|---------|----------|
| `status` | `photographerApi.ts:79` — `status: row.status ?? 'approved'` | 없음 |
| `rejection_reason` | `photographerApi.ts:80` — `rejection_reason: row.rejection_reason ?? null` | 없음 |
| `cheerleader_id` | `types/photographer.ts:22` — PhotoPost 인터페이스 | 없음 |

앱은 `?? 'approved'`로 디폴트 처리하여 크래시는 안 나지만, 포스트 심사 기능이 작동하지 않는다.

**해결 방안:**
```sql
-- 010_fix_photo_posts.sql
ALTER TABLE photo_posts
  ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN rejection_reason TEXT,
  ADD COLUMN cheerleader_id UUID;

CREATE INDEX idx_photo_posts_status ON photo_posts(status) WHERE status IN ('pending', 'rejected');
```

---

### 2.3 [CRITICAL] cheerleaders 테이블 없음

**앱 참조:**
- `app/src/types/cheerleader.ts` — 전체 인터페이스 정의
- `app/src/screens/cheerleader/CheerleadersAllScreen.tsx` — 치어리더 목록 화면
- `app/src/screens/cheerleader/CheerleaderProfileScreen.tsx` — 프로필 화면
- `app/src/data/mockCheerleaders.ts` — 목 데이터 존재

위의 photo_posts.cheerleader_id FK가 참조할 테이블이 없다.

**해결 방안:**
```sql
CREATE TABLE cheerleaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cheerleaders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cheerleaders_public_read" ON cheerleaders FOR SELECT USING (TRUE);

-- photo_posts FK 추가
ALTER TABLE photo_posts
  ADD CONSTRAINT fk_photo_posts_cheerleader
  FOREIGN KEY (cheerleader_id) REFERENCES cheerleaders(id) ON DELETE SET NULL;
```

---

### 2.4 [HIGH] notifications, announcements 테이블 없음

앱에서 광범위하게 사용하지만 DB 테이블이 존재하지 않는다.

- `app/src/contexts/NotificationContext.tsx` — 알림 전체 시스템
- `app/src/contexts/AdminContext.tsx:44-80` — 공지 CRUD

**해결 방안:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_follower', 'following_post', 'post_like',
    'comment', 'app_update', 'system', 'sanction'
  )),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('notice', 'event', 'maintenance')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.5 [HIGH] players 시드 데이터 없음

**위치:** `supabase/migrations/009_seed_photographer.sql`

이 마이그레이션은 `SELECT id FROM players WHERE name_ko = '김광현'` 등으로 선수를 참조하지만, players 테이블에 시드 데이터가 없어 모든 쿼리가 NULL을 반환한다.

프로토콜에서는 "구단별 주요 선수 15~20명 × 10개 구단 = 약 150~200명"을 요구한다.

**해결 방안:** 별도 시드 마이그레이션 추가:
```sql
-- 010_seed_players.sql
INSERT INTO players (team_id, name_ko, name_en, number, position, status)
SELECT t.id, '김광현', 'Kim Kwang-hyun', 29, 'pitcher', 'active'
FROM teams t WHERE t.slug = 'ssg';
-- ... 각 구단별 15-20명씩 추가
```

---

### 2.6 [HIGH] 어드민 RLS 정책 없음

**위치:** `supabase/migrations/005_rls_policies.sql`, `008_photographer_rls.sql`

관리자가 모든 신고를 조회하거나, 사용자 제재를 관리하기 위한 RLS 정책이 없다.

| 테이블 | 현재 정책 | 문제 |
|--------|----------|------|
| community_reports | reporter 본인만 읽기 | 관리자가 신고 목록 조회 불가 |
| user_restrictions | user 본인만 읽기 | 관리자가 제재 현황 조회 불가 |
| photo_posts | 전체 공개 읽기 | pending/rejected 포스트도 일반 유저에게 노출 |

**해결 방안:**
```sql
-- 관리자 확인 헬퍼 함수
CREATE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 신고: 관리자 전체 조회
CREATE POLICY "reports_admin_read" ON community_reports
  FOR SELECT USING (is_admin());

-- 제재: 관리자 전체 관리
CREATE POLICY "restrictions_admin_all" ON user_restrictions
  FOR ALL USING (is_admin());

-- 사진 포스트: 승인된 것만 일반 공개
DROP POLICY IF EXISTS "posts_public_read" ON photo_posts;
CREATE POLICY "posts_public_read" ON photo_posts
  FOR SELECT USING (status = 'approved' OR is_admin());
```

---

## 3. 데이터 무결성 이슈

### 3.1 [HIGH] Optimistic Update 실패 무시 — 10곳

**위치:** `app/src/contexts/PhotographerContext.tsx`

10곳에서 `.catch(() => {})`로 원격 API 실패를 무시한다. 로컬 상태는 변경되지만 서버에는 반영되지 않아 데이터 불일치가 발생한다.

| 라인 | 함수 | 영향 |
|------|------|------|
| 339 | togglePhotoLike | 좋아요 수 불일치 |
| 358 | toggleFollow | 팔로워 수 불일치 |
| 385 | createCollection | 컬렉션 유실 |
| 393 | deleteCollection | 삭제 미반영 |
| 409 | addPostToCollection | 컬렉션 항목 유실 |
| 419 | removePostFromCollection | 제거 미반영 |
| 441 | deletePhotoPost | 포스트 삭제 미반영 |
| 491 | createComment | 댓글 유실 |
| 506 | deleteComment | 삭제 미반영 |
| 527 | toggleCommentLike | 좋아요 수 불일치 |

**해결 방안:**
에러 발생 시 로컬 상태를 롤백하고, 사용자에게 알린다:
```typescript
const togglePhotoLike = useCallback(async (postId: string) => {
  const prevIds = new Set(photoLikedIds);  // 롤백용 스냅샷

  // 1. 낙관적 업데이트
  setPhotoLikedIds(prev => {
    const next = new Set(prev);
    next.has(postId) ? next.delete(postId) : next.add(postId);
    return next;
  });

  // 2. 원격 호출 + 실패 시 롤백
  if (isRemoteRef.current) {
    const { error } = await photographerApi.togglePhotoLike('', 'post', postId);
    if (error) {
      setPhotoLikedIds(prevIds);  // 롤백
      showToast('좋아요 처리에 실패했습니다', 'error');
    }
  }
}, [photoLikedIds, showToast]);
```

---

### 3.2 [HIGH] 이미지 업로드 부분 실패 시 고아 파일

**위치:** `app/src/services/photographerApi.ts:491-524`

이미지 3장 업로드 중 2번째에서 실패하면, 1번째 이미지는 Storage에 남지만 포스트는 생성되지 않는다.

추가로, `fetch(uri)` 응답의 `response.ok` 검증이 없다 (라인 502):
```typescript
const response = await fetch(uri);       // 404도 통과
const blob = await response.blob();      // 에러 blob
```

**해결 방안:**
```typescript
export async function uploadPostImages(userId: string, localUris: string[]): Promise<ApiResult<string[]>> {
  const uploadedPaths: string[] = [];
  try {
    for (const uri of localUris) {
      const response = await fetch(uri);
      if (!response.ok) throw new Error(`이미지 로드 실패: ${response.status}`);
      const blob = await response.blob();

      const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await supabase.storage.from('photo-posts').upload(filePath, blob, { contentType: 'image/jpeg' });
      if (error) throw new Error(error.message);

      uploadedPaths.push(filePath);
      // publicUrl은 포스트 생성 성공 후 조회
    }
    const urls = uploadedPaths.map(p =>
      supabase.storage.from('photo-posts').getPublicUrl(p).data.publicUrl
    );
    return { data: urls, error: null };
  } catch (e: any) {
    // 실패 시 이미 업로드된 파일 정리
    for (const path of uploadedPaths) {
      await supabase.storage.from('photo-posts').remove([path]).catch(() => {});
    }
    return { data: null, error: e.message ?? String(e) };
  }
}
```

---

### 3.3 [MEDIUM] Slug 맵 초기화 레이스 컨디션

**위치:** `app/src/services/photographerApi.ts:19-32`

`ensureSlugMaps()`가 동시에 여러 번 호출되면 중복 fetch가 발생한다.

```typescript
let _slugMap: Map<string, string> | null = null;

async function ensureSlugMaps(): Promise<void> {
  if (_slugMap && _uuidToSlugMap) return;  // 동시 호출 시 둘 다 null
  const { data } = await supabase.from('teams').select('id, slug');
  // ...
}
```

**해결 방안:**
```typescript
let _slugMapPromise: Promise<void> | null = null;

async function ensureSlugMaps(): Promise<void> {
  if (_slugMap && _uuidToSlugMap) return;
  if (!_slugMapPromise) {
    _slugMapPromise = (async () => {
      const { data } = await supabase.from('teams').select('id, slug');
      _slugMap = new Map(data?.map(t => [t.slug, t.id]) ?? []);
      _uuidToSlugMap = new Map(data?.map(t => [t.id, t.slug]) ?? []);
    })();
  }
  await _slugMapPromise;
}
```

---

### 3.4 [MEDIUM] Mock+Remote 데이터 병합 시 user_id 중복

**위치:** `app/src/contexts/PhotographerContext.tsx:175-200`

병합 로직이 `id` 기준으로만 중복을 제거하므로, 같은 `user_id`를 가진 목 데이터와 원격 데이터가 공존할 수 있다.

```typescript
const remoteIds = new Set(pgResult.data.map((p: Photographer) => p.id));
const localOnly = MOCK_PHOTOGRAPHERS.filter((p) => !remoteIds.has(p.id));
// ❌ user_id 기준 중복 제거 없음
```

**해결 방안:**
```typescript
const remoteIds = new Set(pgResult.data.map((p: Photographer) => p.id));
const remoteUserIds = new Set(pgResult.data.map((p: Photographer) => p.user_id));
const localOnly = MOCK_PHOTOGRAPHERS.filter(
  (p) => !remoteIds.has(p.id) && !remoteUserIds.has(p.user_id)
);
```

---

## 4. 성능 이슈

### 4.1 [HIGH] Context Provider 11단 중첩 — 리렌더링 폭포

**위치:** `app/App.tsx:245-279`

18개 Context Provider가 중첩되어 있다. 어떤 Context의 상태가 변경되면, 그 아래 모든 Provider와 Consumer가 리렌더링된다.

예: PhotographerContext에서 좋아요 토글 → RankProvider, AwardsProvider, ArchiveProvider, ThankYouWallProvider, InquiryProvider, NotificationProvider, AdminProvider, MessageProvider 전부 리렌더링.

**해결 방안 (단계적):**

**1단계 — 즉시 적용 가능:** 독립적인 Context를 중첩에서 분리:
```tsx
// 서로 의존하지 않는 Context는 병렬로 배치
function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PhotographerProvider>
        <CommunityProvider>
          {children}
        </CommunityProvider>
      </PhotographerProvider>
    </AuthProvider>
  );
}

// 독립 Context는 별도 래퍼
function IndependentProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ComingSoonProvider>
        <BlockProvider>
          <ReportProvider>
            {children}
          </ReportProvider>
        </BlockProvider>
      </ComingSoonProvider>
    </ToastProvider>
  );
}
```

**2단계 — 중기:** 큰 Context를 분할:
- PhotographerContext(617줄)를 `PhotographerDataContext`(읽기)와 `PhotographerActionsContext`(쓰기)로 분리
- AdminContext를 도메인별로 분리 (PostAdmin, UserAdmin, SettingsAdmin 등)

**3단계 — 장기:** Zustand나 Jotai 같은 원자적 상태 관리 라이브러리로 전환.

---

### 4.2 [HIGH] 앱 시작 시 전체 데이터 로드 — 페이지네이션 없음

**위치:** `app/src/contexts/PhotographerContext.tsx:166-173`

앱 초기화 시 모든 포토그래퍼, 포스트, 선수, 이벤트, 댓글, 컬렉션을 한 번에 로드한다:

```typescript
const [pgResult, postsResult, playersResult, eventsResult, commentsResult, collectionsResult] =
  await Promise.all([
    photographerApi.fetchPhotographers(),      // 전체
    photographerApi.fetchPhotoPosts(),          // 전체
    photographerApi.fetchPlayers(),             // 전체
    photographerApi.fetchEvents(),              // 전체
    photographerApi.fetchAllComments(),         // 전체 댓글!
    photographerApi.fetchCollections(),         // 전체
  ]);
```

데이터가 수천~수만 건으로 증가하면 초기 로딩 시간이 급격히 증가하고 메모리를 과다 사용한다.

**해결 방안:**
```typescript
// 1. 초기에는 필요한 최소 데이터만 로드
const INITIAL_LIMIT = 50;

async function fetchPhotoPosts(page = 0, limit = INITIAL_LIMIT) {
  const { data, error } = await supabase
    .from('photo_posts')
    .select('*, photographer:photographers(...), team:teams(...)')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);  // 페이지네이션
  return { data, error };
}

// 2. 댓글은 포스트 상세 진입 시 lazy load
async function fetchCommentsByPost(postId: string) {
  return supabase
    .from('photo_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at');
}
```

---

### 4.3 [MEDIUM] 트렌딩 전수 재계산

**위치:** `app/src/contexts/CommunityContext.tsx:88-121`

`posts` 배열이 변경될 때마다 전체 게시글의 트렌딩 점수를 재계산한다:

```typescript
useEffect(() => {
  const scored = posts                    // 전체 반복
    .filter((p) => !p.is_blinded)
    .map((p) => ({ id: p.id, score: getTrendingScore(p) }))  // 전부 계산
    .filter((s) => s.score >= TRENDING_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TRENDING);
  // ...
}, [posts]);
```

1,000개 게시글이면 좋아요 1개 추가에도 1,000번 계산이 실행된다.

**해결 방안:**
```typescript
// 변경된 포스트만 재계산
const trendingCache = useRef<Map<string, number>>(new Map());

useEffect(() => {
  // 변경 감지: 이전 posts와 diff
  for (const post of posts) {
    if (!post.is_blinded) {
      trendingCache.current.set(post.id, getTrendingScore(post));
    }
  }
  const top = [...trendingCache.current.entries()]
    .filter(([, score]) => score >= TRENDING_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_TRENDING)
    .map(([id]) => id);
  // ...
}, [posts]);
```

또는 서버 사이드 cron으로 이동 (프로토콜 원안대로):
```sql
-- Supabase Edge Function (1시간 cron)
UPDATE community_posts SET is_trending = FALSE;
UPDATE community_posts SET is_trending = TRUE
WHERE id IN (
  SELECT id FROM community_posts
  WHERE created_at > NOW() - INTERVAL '24 hours' AND NOT is_blinded
  ORDER BY (like_count * 2 + comment_count * 3 + view_count * 0.1) DESC
  LIMIT 5
);
```

---

### 4.4 [MEDIUM] PhotographerContext useMemo 의존성 40개+

**위치:** `app/src/contexts/PhotographerContext.tsx:539-604`

Context value에 40개 이상의 의존성이 있어, 어떤 하나만 변경되어도 전체 value 객체가 재생성되고 모든 Consumer가 리렌더링된다.

**해결 방안:** Context를 목적별로 분할:
```typescript
// 데이터 전용 (읽기)
const PhotographerDataContext = createContext<{
  photographers: Photographer[];
  photoPosts: PhotoPost[];
  loading: boolean;
}>(/* ... */);

// 액션 전용 (쓰기) — 참조 안정적
const PhotographerActionsContext = createContext<{
  toggleLike: (id: string) => void;
  toggleFollow: (id: string) => void;
  // ...
}>(/* ... */);
```

---

## 5. 미연동 핵심 기능

### 5.1 [HIGH] 커뮤니티 전체 — Supabase 미연동

**위치:** `app/src/contexts/CommunityContext.tsx`

v1 핵심 기능인 커뮤니티가 완전히 목 데이터로만 동작한다.

- 라인 14: `import { MOCK_POSTS, MOCK_COMMENTS } from '../data/mockCommunity'`
- 라인 236: `refreshPosts`가 no-op: `// TODO: Supabase 연결 시 서버에서 새로고침`
- 라인 380: `createPost`에 `// TODO: Supabase insert` 주석

DB 스키마(community_posts, community_comments, community_likes, community_polls 등)는 완성되어 있으나 앱 서비스 레이어가 없다.

**해결 방안:** `communityApi.ts` 서비스 파일을 생성하고 CommunityContext에서 호출:
```typescript
// app/src/services/communityApi.ts
export async function fetchCommunityPosts(teamId?: string, page = 0) {
  let query = supabase
    .from('community_posts')
    .select('*, user:users(username, avatar_url), team:teams(name_ko)')
    .eq('is_blinded', false)
    .order('created_at', { ascending: false })
    .range(page * 20, (page + 1) * 20 - 1);

  if (teamId) query = query.eq('team_id', teamId);
  return query;
}

export async function createCommunityPost(post: { user_id: string; team_id?: string; title: string; content: string; images?: string[] }) {
  return supabase.from('community_posts').insert(post).select().single();
}
// ... 댓글, 좋아요, 투표 등
```

---

### 5.2 [HIGH] 어드민 대시보드 — Supabase 미연동

**위치:** `admin/src/contexts/AdminContext.tsx` (580줄)

전체가 목 데이터 기반. 페이지 새로고침 시 모든 작업 내용이 초기화된다. 실제 운영이 불가능하다.

**해결 방안:** 어드민에 Supabase 클라이언트를 추가하고, AdminContext의 각 함수를 Supabase 쿼리로 교체:
```typescript
// admin/src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY  // 어드민은 service_role 키 사용
);
```

---

### 5.3 [HIGH] Edge Functions — 디렉토리 비어있음

**위치:** `supabase/functions/` (빈 디렉토리)

프로토콜에서 요구하는 서버사이드 기능이 전혀 없다:
- 트렌딩 갱신 cron (1시간)
- 알림 발송
- 이미지 리사이징/압축
- NSFW 필터링
- 스팸/금칙어 체크

**해결 방안 (우선순위순):**

1. **스팸 체크** — 글 작성 시 금칙어 검사 (DB trigger 또는 Edge Function)
2. **트렌딩 갱신** — pg_cron으로 1시간마다 실행
3. **이미지 처리** — Sharp 기반 리사이징 (업로드 후 비동기)
4. **알림 발송** — DB trigger → Edge Function → FCM

---

## 6. 타입 안전성 이슈

### 6.1 [MEDIUM] PlayerPosition 타입 충돌

**위치:**
- `app/src/types/photographer.ts:54` — `type PlayerPosition = 'P' | 'C' | 'IF' | 'OF'`
- `app/src/types/team.ts:15-20` — `type PlayerPosition = 'pitcher' | 'catcher' | 'infielder' | 'outfielder' | 'designated_hitter'`

동일한 이름의 타입이 완전히 다른 값을 가진다. DB 스키마는 `team.ts`의 정의와 일치한다.

**해결 방안:** `photographer.ts`의 PlayerPosition을 제거하고, `team.ts`의 정의를 공유:
```typescript
// app/src/types/team.ts (정규 정의)
export type PlayerPosition = 'pitcher' | 'catcher' | 'infielder' | 'outfielder' | 'designated_hitter';

// app/src/types/photographer.ts — 별도 정의 삭제, team.ts에서 import
import type { PlayerPosition } from './team';
```

---

### 6.2 [MEDIUM] `as any` 타입 단언 6곳

타입 체크를 우회하는 `as any` 사용:

| 위치 | 코드 |
|------|------|
| `screens/admin/AdminDashboardScreen.tsx:57` | `navigation.navigate(item.key as any)` |
| `screens/admin/AdminUserManageScreen.tsx:44` | `style: (... ? 'destructive' : 'default') as any` |
| `screens/admin/AdminReportManageScreen.tsx:40` | `style: (... ? 'destructive' : 'default') as any` |
| `screens/photographer/PhotographerProfileScreen.tsx:298` | `navigation.navigate('UploadPost' as any)` |
| `screens/photographer/StudioScreen.tsx:91` | `navigation.navigate('UploadPost' as any)` |
| `screens/photographer/RevenueManagementScreen.tsx:195` | `{t(\`revenue_status_${s.status}\` as any)}` |

**해결 방안:** 각 위치에서 올바른 타입을 사용:
```typescript
// 네비게이션 — RootStackParamList에 'UploadPost'가 정의되어 있다면:
navigation.navigate('UploadPost');  // as any 제거

// Alert 스타일 — React Native 타입
import type { AlertButton } from 'react-native';
const style: AlertButton['style'] = opt.type === 'permanent_ban' ? 'destructive' : 'default';
```

---

### 6.3 [MEDIUM] AuditTargetType 앱/어드민 불일치

- `app/src/types/admin.ts:67` — 5개 값: `'post' | 'user' | 'photographer' | 'report' | 'announcement'`
- `admin/src/types/index.ts:35` — 23개 값: `'post' | 'user' | ... | 'event'`

**해결 방안:** 공유 타입 패키지를 만들거나, 앱 측 타입을 어드민과 동기화:
```typescript
// 공유 타입 정의 (monorepo 공통)
export type AuditTargetType =
  | 'post' | 'user' | 'photographer' | 'report' | 'announcement'
  | 'team' | 'player' | 'cheerleader' | 'notification' | 'settings'
  | 'terms' | 'ad' | 'community' | 'comment' | 'poll' | 'inquiry'
  | 'dm' | 'ticket' | 'settlement' | 'award' | 'block' | 'collection' | 'event';
```

---

## 7. 코드 품질 이슈

### 7.1 [MEDIUM] console.log/error/warn 13곳 — 프로덕션 노출

**위치:** `app/src/contexts/AuthContext.tsx`

| 라인 | 레벨 | 내용 |
|------|------|------|
| 135 | error | `fetchUserProfile error` |
| 141 | log | `[OAuth] extractAndSetSession URL:` — **URL에 토큰 포함 가능** |
| 153 | log | `[OAuth] code:, accessToken:, refreshToken:` — **민감 정보** |
| 157 | error | `[OAuth] Code exchange error` |
| 164 | error | `[OAuth] Set session error` |
| 167 | warn | `[OAuth] No code or tokens found` |
| 224 | log | `[Deep Link] URL received:` |
| 252 | error | `[OAuth] signInWithOAuth error` |
| 269 | error | `[OAuth] WebBrowser error` |
| 324 | error | `updateUserProfile error` |
| 340 | warn | `Supabase update failed` |
| 342 | warn | `Supabase unreachable` |

**특히 위험:** 라인 141, 153에서 OAuth 토큰이 콘솔에 출력된다.

**해결 방안:**
```typescript
// app/src/utils/logger.ts
export const logger = {
  log: (...args: unknown[]) => { if (__DEV__) console.log(...args); },
  warn: (...args: unknown[]) => { if (__DEV__) console.warn(...args); },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error(...args);
    // 프로덕션: Sentry 등으로 전송
  },
};
```

---

### 7.2 [MEDIUM] isLoading 상태 항상 false

**위치:** `app/src/contexts/CommunityContext.tsx:86`

```typescript
const [isLoading] = useState(false);  // setter 없음 — 절대 변하지 않음
```

로딩 스피너가 표시되지 않아 UX 문제가 된다.

**해결 방안:** Supabase 연동 시 적절한 로딩 상태 관리 추가.

---

### 7.3 [LOW] 미구현 TODO 3곳

| 위치 | 내용 |
|------|------|
| `AuthContext.tsx:239` | `// TODO: implement naver native OAuth` |
| `CommunityContext.tsx:236` | `// TODO: Supabase 연결 시 서버에서 새로고침` |
| `CommunityContext.tsx:380` | `// TODO: Supabase insert` |

---

## 8. 개발 인프라 부재

### 8.1 [MEDIUM] 테스트 코드 없음

앱, 어드민 모두 테스트가 전혀 없다.

- `app/package.json` — `jest`, `@testing-library/react-native` 미설치
- `admin/package.json` — `vitest`, `@testing-library/react` 미설치
- 테스트 스크립트(`npm test`) 없음

**해결 방안:**
```bash
# 앱
cd app && npx expo install jest @testing-library/react-native

# 어드민
cd admin && npm i -D vitest @testing-library/react @testing-library/jest-dom
```

최소한 다음에 대한 테스트부터 작성:
- 인증 플로우 (로그인/로그아웃/게스트)
- 트렌딩 알고리즘 순수 함수
- photographerApi 에러 처리

---

### 8.2 [MEDIUM] 린트/포맷터 없음

- ESLint, Prettier 모두 미설치
- TypeScript strict mode는 켜져 있으나, 코드 스타일 강제 없음
- `admin/tsconfig.json`에서 `noUnusedLocals: false`, `noUnusedParameters: false` — 미사용 코드 허용

**해결 방안:**
```bash
# 앱
cd app && npm i -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier

# 어드민
cd admin && npm i -D eslint @typescript-eslint/eslint-plugin prettier
```

`admin/tsconfig.json` 수정:
```json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### 8.3 [MEDIUM] CI/CD 파이프라인 없음

GitHub Actions, EAS Build 자동화 등이 설정되어 있지 않다.

**해결 방안:** `.github/workflows/ci.yml` 추가:
```yaml
name: CI
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd app && npm ci && npx tsc --noEmit
      - run: cd admin && npm ci && npx tsc --noEmit
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd app && npm ci && npm run lint
      - run: cd admin && npm ci && npm run lint
```

---

## 9. 프로토콜 스펙 불일치

### 9.1 [LOW] Storage 파일 크기 제한

**프로토콜:** 포토그래퍼 사진 최대 30MB/장
**실제:** `supabase/migrations/007_photographer.sql:254` — 5MB 제한

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photo-posts', 'photo-posts', TRUE, 5242880, ...);
-- 5242880 = 5MB
```

**해결:** `file_size_limit`를 `31457280` (30MB)로 변경.

---

### 9.2 [LOW] 트렌딩 윈도우 불일치

**프로토콜:** 최근 24시간
**구현:** `CommunityContext.tsx:19` — 48시간

```typescript
const TRENDING_WINDOW_MS = 48 * 60 * 60 * 1000; // 48시간
```

---

### 9.3 [LOW] 포토그래퍼 등급 기준 불일치

**프로토콜:**
```
Rookie → Regular(게시물 30+, 팔로워 300+) → Pro(100+, 3000+) → Master(500+, 15000+) → Legend(1000+, 30000+, 관리자 승인)
```

**구현 (RankContext):**
```
Rookie(0점) → Amateur(10점) → Pro(30점) → Elite(70점) → Legend(150점)
점수 = post_count + floor(follower_count / 10)
```

등급 이름, 기준, 계산 방식이 모두 다르다. (v2 예정이므로 당장은 비차단)

---

### 9.4 [LOW] 닉네임 변경 30일 제한 미구현

**프로토콜:** "닉네임 변경: 30일에 1회"
**구현:** 제한 없이 자유 변경 가능. DB에 `nickname_changed_at` 컬럼도 없다.

---

### 9.5 [LOW] 스팸 방어 로직 전무

**프로토콜에 명시된 규칙:**
- 가입 후 10분 쿨다운
- 24시간 내 5개 글 제한
- 동일 내용 3분 내 재게시 차단
- 1분 내 2개 초과 쓰로틀링
- 금칙어 자동 필터

**구현:** DB 테이블(`spam_filter_words`, `user_restrictions`)만 존재하고, 검증 로직은 없다.

---

## 10. 우선순위별 실행 로드맵

### Phase 1 — 런칭 차단 이슈 (즉시)

| # | 이슈 | 섹션 |
|---|------|------|
| 1 | 테스트 계정 프로덕션 분리 | 1.1 |
| 2 | 어드민 Supabase Auth 전환 | 1.2 |
| 3 | 인앱 어드민 접근 제어 | 1.3 |
| 4 | `users` 테이블 생성 | 2.1 |
| 5 | `photo_posts` 누락 컬럼 추가 | 2.2 |
| 6 | `cheerleaders` 테이블 생성 | 2.3 |
| 7 | 커뮤니티 Supabase 연동 | 5.1 |

### Phase 2 — 안정성 확보 (1-2주)

| # | 이슈 | 섹션 |
|---|------|------|
| 8 | Optimistic Update 에러 핸들링 | 3.1 |
| 9 | 이미지 업로드 롤백 처리 | 3.2 |
| 10 | notifications, announcements 테이블 | 2.4 |
| 11 | players 시드 데이터 | 2.5 |
| 12 | 어드민 RLS 정책 추가 | 2.6 |
| 13 | 콘솔 로그 정리 (민감 정보) | 7.1 |
| 14 | 어드민 Supabase 연동 | 5.2 |

### Phase 3 — 성능 및 품질 (2-4주)

| # | 이슈 | 섹션 |
|---|------|------|
| 15 | Context 분할/리렌더링 최적화 | 4.1 |
| 16 | 데이터 페이지네이션 | 4.2 |
| 17 | 타입 충돌 해결 | 6.1, 6.2, 6.3 |
| 18 | ESLint/Prettier/테스트 도입 | 8.1, 8.2 |
| 19 | Edge Functions 구현 | 5.3 |
| 20 | CI/CD 구축 | 8.3 |

### Phase 4 — 프로토콜 준수 (장기)

| # | 이슈 | 섹션 |
|---|------|------|
| 21 | 스팸 방어 로직 | 9.5 |
| 22 | 닉네임 변경 제한 | 9.4 |
| 23 | Storage 파일 크기 조정 | 9.1 |
| 24 | 이미지 리사이징/NSFW 필터 | 5.3 |
| 25 | 트렌딩 서버사이드 이관 | 4.3 |

---

> 이 문서의 모든 파일 경로, 라인 번호, 코드 스니펫은 2026-04-01 시점의 코드베이스 기준이다.
