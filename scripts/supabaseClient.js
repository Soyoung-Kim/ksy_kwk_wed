import { APP_CONFIG } from '../../config.js';

function getSupabaseGlobal() {
  return window.supabase;
}

export function hasSupabaseConfig() {
  return Boolean(
    APP_CONFIG &&
    typeof APP_CONFIG.supabaseUrl === 'string' &&
    APP_CONFIG.supabaseUrl.trim() &&
    typeof APP_CONFIG.supabasePublishableKey === 'string' &&
    APP_CONFIG.supabasePublishableKey.trim()
  );
}

export const supabaseClient = hasSupabaseConfig() && getSupabaseGlobal()?.createClient
  ? getSupabaseGlobal().createClient(
      APP_CONFIG.supabaseUrl,
      APP_CONFIG.supabasePublishableKey
    )
  : null;

export function getFunctionHeaders() {
  if (!hasSupabaseConfig()) {
    return {};
  }

  return {
    apikey: APP_CONFIG.supabasePublishableKey,
    Authorization: `Bearer ${APP_CONFIG.supabasePublishableKey}`
  };
}
