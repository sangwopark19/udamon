import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// 환경변수 미설정 시에도 createClient가 크래시하지 않도록
// 유효한 형식의 더미 URL을 사용한다 (실제 네트워크 요청은 발생하지 않음).
const DUMMY_URL = 'https://localhost.invalid';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.placeholder';

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || DUMMY_URL,
  SUPABASE_ANON_KEY || DUMMY_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // detectSessionInUrl은 false — getUser() 호출이 401을 반환하는 환경에서
      // 세션 수립이 실패한다. 콜백 처리는 AuthContext의 init()에서 수동으로 한다.
      detectSessionInUrl: false,
      // implicit flow — PKCE의 code_challenge에 WebCrypto 미지원 환경(JSC)에서
      // plain fallback 시 생성되는 특수문자가 iOS ASWebAuthenticationSession에서
      // URL 파싱 오류를 일으킨다. implicit flow는 code_challenge 없이 동작한다.
      flowType: 'implicit',
    },
  },
);

// ─── AppState Auto-Refresh ───
// 앱이 foreground로 돌아오면 세션 자동 갱신 시작, background로 가면 중단
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
