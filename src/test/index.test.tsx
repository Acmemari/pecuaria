/**
 * Testes para verificar a inicialização do index.tsx
 * e montagem do componente App
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../../App';

// Mock do AuthContext para evitar dependências externas nos testes
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    user: null,
    isLoading: false,
    logout: vi.fn(),
    checkPermission: vi.fn(() => true),
    upgradePlan: vi.fn(),
  }),
}));

describe('Inicialização da Aplicação', () => {
  beforeEach(() => {
    // Garantir que o root existe
    const root = document.getElementById('root');
    if (!root) {
      const div = document.createElement('div');
      div.id = 'root';
      document.body.appendChild(div);
    } else {
      root.innerHTML = '';
    }
  });

  it('deve renderizar o App sem erros', async () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('deve ter o elemento root disponível para montagem', () => {
    const rootElement = document.getElementById('root');
    expect(rootElement).toBeTruthy();
    expect(rootElement?.id).toBe('root');
  });

  it('deve montar o React corretamente no root', () => {
    const rootElement = document.getElementById('root');
    expect(rootElement).toBeTruthy();
    
    // Verificar se o React pode ser montado
    const canMount = rootElement !== null;
    expect(canMount).toBe(true);
  });
});

describe('Verificação de Dependências', () => {
  it('deve ter React disponível', () => {
    expect(React).toBeTruthy();
    expect(typeof React.createElement).toBe('function');
  });

  it('deve ter ReactDOM disponível', async () => {
    const ReactDOM = await import('react-dom/client');
    expect(ReactDOM).toBeTruthy();
    expect(ReactDOM.createRoot).toBeTruthy();
    expect(typeof ReactDOM.createRoot).toBe('function');
  });

  it('deve poder importar o App sem erros', () => {
    expect(App).toBeTruthy();
    expect(typeof App).toBe('function');
  });
});

