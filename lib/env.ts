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

/**
 * Valida se todas as variáveis de ambiente obrigatórias estão definidas
 * @throws {Error} Se alguma variável obrigatória estiver faltando
 */
export function validateEnv(): EnvConfig {
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

  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY,
  };
}

/**
 * Obtém variáveis de ambiente com validação
 * Retorna valores validados ou lança erro se faltar algo obrigatório
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

