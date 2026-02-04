import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionnaireFiller from '../../../agents/QuestionnaireFiller';

const STORAGE_KEY = 'agro-farms';

const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Test User' };

const mockQuestions = [
  {
    id: 'q1',
    category: 'Gente',
    group: 'Domínio',
    question: 'Pergunta teste 1?',
    positive_answer: 'Sim',
    applicable_types: ['Ciclo Completo'],
  },
  {
    id: 'q2',
    category: 'Gestão',
    group: 'Projeto',
    question: 'Pergunta teste 2?',
    positive_answer: 'Sim',
    applicable_types: ['Ciclo Completo'],
  },
  {
    id: 'q3',
    category: 'Produção',
    group: 'Manejo de Pastagens',
    question: 'Pergunta teste 3?',
    positive_answer: 'Não',
    applicable_types: ['Ciclo Completo'],
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

vi.mock('../../../lib/supabase', () => {
  const questions = [
    { id: 'q1', category: 'Gente', group: 'Domínio', question: 'P1?', positive_answer: 'Sim', applicable_types: ['Ciclo Completo'] },
    { id: 'q2', category: 'Gestão', group: 'Projeto', question: 'P2?', positive_answer: 'Sim', applicable_types: ['Ciclo Completo'] },
    { id: 'q3', category: 'Produção', group: 'Manejo', question: 'P3?', positive_answer: 'Não', applicable_types: ['Ciclo Completo'] },
  ];
  const orderChain = { order: vi.fn().mockResolvedValue({ data: questions, error: null }) };
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderChain),
      })),
    },
  };
});

describe('QuestionnaireFiller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([mockFarm]));
  });

  it('deve exportar o componente', () => {
    expect(QuestionnaireFiller).toBeDefined();
    expect(typeof QuestionnaireFiller).toBe('function');
  });

  it('deve permitir preencher o questionário e enviar com sucesso', async () => {
    const user = userEvent.setup({ delay: null });
    render(<QuestionnaireFiller />);

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
      await new Promise((r) => setTimeout(r, 400));
    }

    const submitButton = await screen.findByRole('button', { name: /Enviar Questionário/i });
    await user.click(submitButton);

    await waitFor(
      () => {
        expect(screen.getByText(/Questionário enviado com sucesso!/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
