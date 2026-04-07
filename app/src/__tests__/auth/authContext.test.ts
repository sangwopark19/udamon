// ─── AuthContext Tests (RED) ───
// Plan 01에서 AuthContext가 Supabase Auth로 완전 전환되면 GREEN으로 전환된다.
// 현재는 TEST_ACCOUNTS 하드코딩이 존재하므로 일부 테스트는 의도적으로 실패한다.

import * as fs from 'fs';
import * as path from 'path';

describe('AuthContext', () => {
  const authContextPath = path.resolve(__dirname, '../../contexts/AuthContext.tsx');

  test('TEST_ACCOUNTS가 코드에서 완전히 제거되었다 (AUTH-07)', () => {
    // AuthContext 소스 파일을 읽어서 TEST_ACCOUNTS 문자열이 없는지 검증
    const source = fs.readFileSync(authContextPath, 'utf-8');
    expect(source).not.toContain('TEST_ACCOUNTS');
    expect(source).not.toContain('test@udamon.com');
    expect(source).not.toContain('admin@udamon.com');
    expect(source).not.toContain('test1234');
    expect(source).not.toContain('admin1234');
  });

  test('Google OAuth 호출 시 signInWithOAuth에 google provider가 전달된다 (AUTH-01)', () => {
    // Plan 01에서 AuthContext.login('google') 리팩토링 후 검증
    // 현재 login 함수는 TEST_ACCOUNTS 로직과 섞여 있어 단독 테스트 불가
    const { mockAuth } = require('../mocks/supabase');

    // login('google') 호출 시 signInWithOAuth가 provider: 'google'으로 호출되어야 함
    // 아직 구현되지 않았으므로 실패 예상
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  test('Kakao OAuth 호출 시 signInWithOAuth에 kakao provider가 전달된다 (AUTH-03)', () => {
    const { mockAuth } = require('../mocks/supabase');

    // login('kakao') 호출 시 signInWithOAuth가 provider: 'kakao'로 호출되어야 함
    expect(mockAuth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'kakao' }),
    );
  });

  test('이메일 로그인 시 signInWithPassword가 호출된다 (AUTH-05)', () => {
    const { mockAuth } = require('../mocks/supabase');

    // loginWithEmail(email, password) 호출 시 signInWithPassword가 호출되어야 함
    // TEST_ACCOUNTS가 제거된 후에만 Supabase 경로로 도달
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.any(String),
        password: expect.any(String),
      }),
    );
  });

  test('resetPassword 호출 시 resetPasswordForEmail이 호출된다 (AUTH-06)', () => {
    const { mockAuth } = require('../mocks/supabase');

    // resetPassword(email) 호출 시 resetPasswordForEmail이 호출되어야 함
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirectTo: expect.any(String) }),
    );
  });
});
