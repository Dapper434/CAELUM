/**
 * Supabase is used for sign-in only (Supabase Auth). All data goes through
 * CAELUM_API; the console never reads or writes Supabase tables directly.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const isSupabaseConfigured = Boolean(config.supabaseUrl && config.supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'caelum-admin-auth' },
    })
  : null;
