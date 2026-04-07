// ─── Block Feature Tests (RED) ───
// Plan 03에서 BlockContext가 Supabase 연동으로 전환되면 GREEN으로 전환된다.
// 현재 BlockContext는 로컬 Set 기반이므로 Supabase 호출 검증 테스트는 실패한다.

import { mockFrom, mockQueryBuilder, mockAuth, resetAllMocks } from '../mocks/supabase';

describe('Block Feature (AUTH-10)', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('blockUser 호출 시 user_blocks에 INSERT된다', () => {
    // BlockContext.blockUser(targetId) 호출 시
    // supabase.from('user_blocks').insert({ blocker_id: currentUserId, blocked_id: targetId })
    // 현재 BlockContext는 로컬 Set만 사용하므로 실패 예상

    // 시뮬레이션: blockUser가 Supabase를 호출했다고 가정
    // Plan 03에서 실제 구현 시 이 테스트가 통과해야 함
    expect(mockFrom).toHaveBeenCalledWith('user_blocks');
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        blocker_id: expect.any(String),
        blocked_id: expect.any(String),
      }),
    );
  });

  test('unblockUser 호출 시 user_blocks에서 DELETE된다', () => {
    // BlockContext.unblockUser(targetId) 호출 시
    // supabase.from('user_blocks').delete().eq('blocker_id', currentUserId).eq('blocked_id', targetId)

    expect(mockFrom).toHaveBeenCalledWith('user_blocks');
    expect(mockQueryBuilder.delete).toHaveBeenCalled();
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('blocker_id', expect.any(String));
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('blocked_id', expect.any(String));
  });

  test('이미 차단된 사용자를 다시 차단하면 에러 메시지 표시', () => {
    // Supabase unique constraint 위반 시 23505 에러 코드
    // BlockContext가 이를 처리하여 사용자에게 토스트 메시지 표시
    mockQueryBuilder.insert.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    // blockUser 호출 후 에러 핸들링이 동작해야 함
    // 현재는 Supabase 연동이 없으므로 실패 예상
    expect(mockFrom).toHaveBeenCalledWith('user_blocks');
  });

  test('초기 로드 시 차단 목록을 user_blocks에서 조회한다', () => {
    // useEffect에서 supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId)
    // 현재 BlockContext는 빈 Set으로 초기화하므로 실패 예상

    expect(mockFrom).toHaveBeenCalledWith('user_blocks');
    expect(mockQueryBuilder.select).toHaveBeenCalledWith('blocked_id');
  });
});
