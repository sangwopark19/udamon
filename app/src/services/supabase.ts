import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing required environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY. ' +
    'Copy app/.env.example to app/.env and fill in your Supabase project credentials.'
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
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
});

// ─── AppState Auto-Refresh ───
// 앱이 foreground로 돌아오면 세션 자동 갱신 시작, background로 가면 중단
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
