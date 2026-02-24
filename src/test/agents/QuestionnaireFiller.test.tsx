import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionnaireFiller from '../../../agents/QuestionnaireFiller';
import { LocationProvider } from '../../../contexts/LocationContext';

const STORAGE_KEY = 'agro-farms';

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test User' };

const mockQuestions = [
  {
    id: 'q1',
    category: 'Gente',
    group: 'Domínio',
    question: 'P1?',
    positive_answer: 'Sim',
    applicable_types: ['Ciclo Completo'],
    perg_number: 1,
  },
  {
    id: 'q2',
    category: 'Gestão',
    group: 'Projeto',
    question: 'P2?',
    positive_answer: 'Sim',
    applicable_types: ['Ciclo Completo'],
    perg_number: 2,
  },
  {
    id: 'q3',
    category: 'Produção',
    group: 'Manejo de Pastagens',
    question: 'P3?',
    positive_answer: 'Não',
    applicable_types: ['Ciclo Completo'],
    perg_number: 3,
  },
];

const mockFarm = {
  id: 'farm-1',
  name: 'Fazenda Teste',
  country: 'BR',
  state: 'SP',
  city: 'São Paulo',
  propertyType: 'Própria' as const,
  weightMetric: 'Arroba (@)' as const,
  commercializesGenetics: false,
  productionSystem: 'Ciclo Completo' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../../contexts/AnalystContext', () => ({
  AnalystProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAnalyst: () => ({ selectedAnalyst: null, setSelectedAnalyst: vi.fn() }),
}));

vi.mock('../../../contexts/ClientContext', () => ({
  ClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useClient: () => ({ selectedClient: null, setSelectedClient: vi.fn() }),
}));

vi.mock('../../../contexts/FarmContext', () => ({
  FarmProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFarm: () => ({ selectedFarm: null, setSelectedFarm: vi.fn(), clearFarm: vi.fn() }),
}));

vi.mock('../../../lib/supabase', () => {
  const createChain = (response: any) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      or: vi.fn(() => chain),
      single: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      then: vi.fn(resolve => {
        return Promise.resolve(response).then(resolve);
      }),
    };
    return chain;
  };
  return {
    supabase: {
      from: vi.fn(table => {
        if (table === 'saved_questionnaires') {
          return createChain({ data: [], error: null });
        }
        return createChain({ data: mockQuestions, error: null });
      }),
    },
  };
});

describe('QuestionnaireFiller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([mockFarm]));

    // Mock ResizeObserver for Recharts
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    // Mock Math.random to be deterministic (prevents shuffling by returning high value so j=i)
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
  });

  it('deve exportar o componente', () => {
    expect(QuestionnaireFiller).toBeDefined();
    expect(typeof QuestionnaireFiller).toBe('function');
  });

  it('deve permitir preencher o questionário e enviar com sucesso', async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <LocationProvider>
        <QuestionnaireFiller />
      </LocationProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument();
    });

    const farmButton = await screen.findByRole('button', { name: /Fazenda Teste/i });
    await user.click(farmButton);

    const startButton = await screen.findByRole('button', { name: /Responder Questionário/i });
    await user.click(startButton);

    await waitFor(() => {
      expect(screen.getByText(/P1\?/)).toBeInTheDocument();
    });

    for (let i = 0; i < 3; i++) {
      const simButton = screen.getByRole('button', { name: /^Sim$/i });
      const naoButton = screen.getByRole('button', { name: /^Não$/i });
      if (i === 2) {
        await user.click(naoButton);
      } else {
        await user.click(simButton);
      }
      await new Promise(r => setTimeout(r, 400));
    }

    const submitButton = await screen.findByRole('button', { name: /Enviar Questionário/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/Diagnóstico de Alta Performance/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 15000);
});
