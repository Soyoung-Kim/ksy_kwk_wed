import { APP_CONFIG } from './config.js';

export const hasSupabaseConfig =
  Boolean(APP_CONFIG.supabaseUrl) &&
  APP_CONFIG.supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  Boolean(APP_CONFIG.supabasePublishableKey) &&
  APP_CONFIG.supabasePublishableKey !== 'YOUR_PUBLISHABLE_KEY';

export const supabaseClient =
  hasSupabaseConfig && window.supabase
    ? window.supabase.createClient(
        APP_CONFIG.supabaseUrl,
        APP_CONFIG.supabasePublishableKey
      )
    : null;

export function getFunctionHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    apikey: APP_CONFIG.supabasePublishableKey
  };

  // 구형 anon JWT 형식과의 호환용
  if (APP_CONFIG.supabasePublishableKey?.includes('.')) {
    headers.Authorization = `Bearer ${APP_CONFIG.supabasePublishableKey}`;
  }

  return headers;
}
