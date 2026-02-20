import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from './env';

let _client: SupabaseClient | null = null;

/**
 * Returns a lazily-created Supabase Admin client (service-role).
 * Accepts both SUPABASE_URL and VITE_SUPABASE_URL via getServerEnv().
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const env = getServerEnv();

  _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-client-info': 'pecuaria-api-admin',
      },
    },
  });

  return _client;
}

/**
 * @deprecated Use getSupabaseAdmin() instead.
 * Kept for backward compatibility with existing imports.
 */
export const supabaseAdmin = {
  get auth() { return getSupabaseAdmin().auth; },
  from(table: string) { return getSupabaseAdmin().from(table); },
  rpc(fn: string, params?: any) { return getSupabaseAdmin().rpc(fn, params); },
  storage: { from(bucket: string) { return getSupabaseAdmin().storage.from(bucket); } },
};
