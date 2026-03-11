import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env';

// Valida e obtém variáveis de ambiente
const env = getEnv();

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Configurações de robustez para auth
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'pecuaria-web',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
