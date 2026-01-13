// Environment configuration

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Auth Worker 설정
export const AUTH_WORKER_URL = import.meta.env.VITE_AUTH_WORKER_URL;
export const APP_ID = import.meta.env.VITE_APP_ID;

// 환경변수 검증
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Config] SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.');
}

if (!AUTH_WORKER_URL || !APP_ID) {
  console.warn('[Config] AUTH_WORKER_URL 또는 APP_ID가 설정되지 않았습니다.');
}
