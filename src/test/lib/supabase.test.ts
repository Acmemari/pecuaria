import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  },
}));

describe('Supabase Client', () => {
  it('should create a Supabase client with environment variables', () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    expect(supabaseUrl).toBeDefined();
    expect(supabaseKey).toBeDefined();
    expect(typeof supabaseUrl).toBe('string');
    expect(typeof supabaseKey).toBe('string');
  });

  it('should have valid Supabase URL format', () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    expect(supabaseUrl).toMatch(/^https?:\/\//);
  });
});

