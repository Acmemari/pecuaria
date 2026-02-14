/**
 * Validação centralizada de variáveis de ambiente
 * Garante que todas as variáveis obrigatórias estão presentes
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  GEMINI_API_KEY?: string;
}

const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
const optionalEnvVars = ['GEMINI_API_KEY'] as const;

let _cachedEnv: EnvConfig | null = null;

/**
 * Valida se todas as variáveis de ambiente obrigatórias estão definidas
 * @throws {Error} Se alguma variável obrigatória estiver faltando
 */
export function validateEnv(): EnvConfig {
  if (_cachedEnv) return _cachedEnv;

  const missing: string[] = [];

  for (const varName of requiredEnvVars) {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não encontradas: ${missing.join(', ')}\n` +
      'Por favor, crie um arquivo .env.local com as variáveis necessárias.\n' +
      'Veja .env.example para referência.',
    );
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Validar formato da URL do Supabase
  try {
    const url = new URL(supabaseUrl);
    if (!url.hostname.includes('supabase')) {
      console.warn('VITE_SUPABASE_URL não parece ser uma URL do Supabase válida');
    }
  } catch {
    throw new Error('VITE_SUPABASE_URL não é uma URL válida');
  }

  _cachedEnv = {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY,
  };

  return _cachedEnv;
}

/**
 * Obtém variáveis de ambiente com validação (resultado é cacheado)
 */
export function getEnv(): EnvConfig {
  return validateEnv();
}

/**
 * Obtém variável de ambiente de forma segura
 * @param key Nome da variável
 * @param defaultValue Valor padrão se não encontrado
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = import.meta.env[key];
  if (!value && !defaultValue) {
    console.warn(`Variável de ambiente ${key} não encontrada`);
  }
  return value || defaultValue || '';
}

