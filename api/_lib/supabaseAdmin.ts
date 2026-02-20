import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from './env';

let _client: ReturnType<typeof createClient> | null = null;

/**
 * Lazily creates and caches the Supabase Admin client.
 * Accepts both SUPABASE_URL and VITE_SUPABASE_URL via getServerEnv().
 */
function getClient(): ReturnType<typeof createClient> {
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
 * Supabase Admin client (service-role).
 * Uses a lazy getter so the module can be imported without crashing if
 * env vars are missing — the error surfaces when the client is first used.
 */
export const supabaseAdmin: ReturnType<typeof createClient> = new Proxy(
  {} as ReturnType<typeof createClient>,
  {
    get(_target, prop, receiver) {
      const client = getClient();
      const value = Reflect.get(client, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    },
  },
);
