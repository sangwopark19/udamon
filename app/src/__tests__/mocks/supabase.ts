// ─── Supabase Client Mock ───
// jest.config.ts의 moduleNameMapper를 통해 실제 supabase 클라이언트 대신 주입된다.
// 모든 auth/from 메서드를 jest.fn()으로 제공하여 테스트에서 호출 검증 가능.

export const mockAuth = {
  signInWithOAuth: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
  getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
  exchangeCodeForSession: jest.fn(),
  setSession: jest.fn(),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  })),
  startAutoRefresh: jest.fn(),
  stopAutoRefresh: jest.fn(),
  resetPasswordForEmail: jest.fn(),
};

const createMockQueryBuilder = () => {
  const builder: Record<string, jest.Mock> = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'in', 'is', 'like', 'ilike',
    'order', 'limit', 'range',
    'filter', 'match', 'not',
  ];

  for (const method of chainMethods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  // Terminal methods
  builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  builder.single = jest.fn().mockResolvedValue({ data: null, error: null });
  builder.then = undefined; // thenable 방지 -- await 시 terminal 메서드 사용 강제

  return builder;
};

export const mockQueryBuilder = createMockQueryBuilder();
export const mockFrom = jest.fn(() => mockQueryBuilder);

export const supabase = {
  auth: mockAuth,
  from: mockFrom,
  functions: {
    invoke: jest.fn(),
  },
};

export const isSupabaseConfigured = true;

/** 각 테스트 전에 모든 mock을 초기화하는 헬퍼 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
  // Restore default implementations
  mockAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockAuth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });

  const builder = mockQueryBuilder;
  for (const key of Object.keys(builder)) {
    if (typeof builder[key]?.mockReturnValue === 'function') {
      builder[key].mockReturnValue(builder);
    }
  }
  builder.maybeSingle.mockResolvedValue({ data: null, error: null });
  builder.single.mockResolvedValue({ data: null, error: null });
}
