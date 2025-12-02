import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { createMockSupabase } from './mocks/supabase';

// Mock Supabase before importing AuthContext
vi.mock('../lib/supabase', () => {
  const mockSupabase = createMockSupabase();
  return {
    supabase: mockSupabase,
  };
});

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return <AuthProvider>{children}</AuthProvider>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

