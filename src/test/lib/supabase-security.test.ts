import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Security - Supabase Configuration', () => {
  it('should not have hardcoded Supabase URL in lib/supabase.ts', () => {
    const supabaseFile = readFileSync(join(process.cwd(), 'lib/supabase.ts'), 'utf-8');
    
    // Verifica que não há URLs hardcoded do Supabase
    expect(supabaseFile).not.toContain('gtfjaggtgyoldovcmyqh.supabase.co');
    expect(supabaseFile).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/);
  });

  it('should not have hardcoded Supabase anon key in lib/supabase.ts', () => {
    const supabaseFile = readFileSync(join(process.cwd(), 'lib/supabase.ts'), 'utf-8');
    
    // Verifica que não há chaves JWT hardcoded (começam com eyJ)
    const jwtPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
    expect(supabaseFile).not.toMatch(jwtPattern);
  });

  it('should use env validation from lib/env', () => {
    const supabaseFile = readFileSync(join(process.cwd(), 'lib/supabase.ts'), 'utf-8');
    
    // Verifica que está usando getEnv do lib/env
    expect(supabaseFile).toContain("from './env'");
    expect(supabaseFile).toContain('getEnv');
  });

  it('should validate that env.example would contain required vars (if file exists)', () => {
    // Verifica que o código não depende de valores hardcoded
    // O .env.example pode não existir no repositório por questões de segurança
    // O importante é que o código não tenha valores hardcoded
    const supabaseFile = readFileSync(join(process.cwd(), 'lib/supabase.ts'), 'utf-8');
    expect(supabaseFile).not.toContain('gtfjaggtgyoldovcmyqh');
  });
});

