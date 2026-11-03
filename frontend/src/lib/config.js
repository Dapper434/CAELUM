/**
 * Runtime configuration read from Vite env vars (VITE_*).
 * The console talks only to CAELUM_API. In a dev build with no
 * VITE_API_BASE_URL we fall back to the local API; a production build never does.
 */

// Statically replaced by Vite, so production bundles don't even contain the local URL.
const DEV_API_FALLBACK = import.meta.env.DEV ? 'http://localhost:5000' : '';

export function resolveApiOrigin(env = import.meta.env) {
  const raw = (env.VITE_API_BASE_URL || '').trim();
  if (raw) {
    // Accept the API origin, or a URL that already ends with /api/v1 (or /api).
    return raw.replace(/\/+$/, '').replace(/\/api(\/v1)?$/, '');
  }
  return env.DEV ? DEV_API_FALLBACK : '';
}

export function readConfig(env = import.meta.env) {
  const apiOrigin = resolveApiOrigin(env);
  return {
    apiOrigin,
    apiBaseUrl: apiOrigin ? `${apiOrigin}/api/v1` : '',
    supabaseUrl: (env.VITE_SUPABASE_URL || '').trim(),
    // Publishable key (sb_publishable_…); the legacy anon key name is still read as a fallback.
    supabaseKey: (env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim(),
    demoMode: String(env.VITE_DEMO_MODE || '').toLowerCase() === 'true',
  };
}

export const config = readConfig();
