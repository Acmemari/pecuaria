import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackAgent from '@/agents/FeedbackAgent';
import { useAuth } from '@/contexts/AuthContext';
import { useFarm } from '@/contexts/FarmContext';
import { supabase } from '@/lib/supabase';
import { fetchPeople } from '@/lib/people';
import { saveFeedback } from '@/lib/feedbacks';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/FarmContext');
vi.mock('@/lib/people');
vi.mock('@/lib/feedbacks');

// Mock global fetch
global.fetch = vi.fn();

describe('FeedbackAgent Component', () => {
  const mockOnToast = vi.fn();
  const mockUser = { id: 'user-1', role: 'admin' };
  const mockFarm = { id: 'farm-1', name: 'Fazenda Teste' };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({ user: mockUser });
    (useFarm as any).mockReturnValue({ selectedFarm: mockFarm });
    (fetchPeople as any).mockResolvedValue([{ id: 'person-1', full_name: 'Person One', preferred_name: 'P1' }]);
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    });
  });

  it('renders correctly', () => {
    render(<FeedbackAgent onToast={mockOnToast} />);
    expect(screen.getByText('Assistente de Feedback')).toBeInTheDocument();
  });

  it('updates form fields and handles generation', async () => {
    render(<FeedbackAgent onToast={mockOnToast} />);

    // Fill the required fields
    const objectiveInput = screen.getByPlaceholderText(/Ex: reforçar pontos fortes/i);
    fireEvent.change(objectiveInput, { target: { value: 'Melhorar performance no manejo' } });

    const recipientInput = screen.getByPlaceholderText(/Digite o nome de quem receberá o feedback/i);
    fireEvent.change(recipientInput, { target: { value: 'João Silva' } });

    // Mock API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            success: true,
            data: {
              feedback: 'Bom trabalho, João!',
              structure: 'SBI',
              tips: ['Dica 1'],
            },
          }),
        ),
    });

    const generateButton = screen.getByText('Gerar feedback');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Bom trabalho, João!')).toBeInTheDocument();
      expect(mockOnToast).toHaveBeenCalledWith('Feedback gerado com sucesso.', 'success');
    });
  });

  it('has generate button disabled when fields are empty', async () => {
    render(<FeedbackAgent onToast={mockOnToast} />);

    const generateButton = screen.getByRole('button', { name: /Gerar feedback/i });
    expect(generateButton).toBeDisabled();
  });

  it('saves the generated feedback', async () => {
    // Mock successful generation first
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            success: true,
            data: {
              feedback: 'Bom trabalho!',
              structure: 'SBI',
              tips: [],
            },
          }),
        ),
    });

    render(<FeedbackAgent onToast={mockOnToast} />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: reforçar pontos fortes/i), {
      target: { value: 'Valid objective text' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Digite o nome de quem receberá o feedback/i), {
      target: { value: 'João' },
    });

    fireEvent.click(screen.getByText('Gerar feedback'));

    await waitFor(() => {
      expect(screen.getByText('Salvar')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Salvar');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveFeedback).toHaveBeenCalled();
      expect(mockOnToast).toHaveBeenCalledWith('Feedback salvo com sucesso.', 'success');
    });
  });

  it('handles API errors', async () => {
    render(<FeedbackAgent onToast={mockOnToast} />);

    fireEvent.change(screen.getByPlaceholderText(/Ex: reforçar pontos fortes/i), {
      target: { value: 'Valid objective text' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Digite o nome de quem receberá o feedback/i), {
      target: { value: 'João' },
    });

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ error: 'Erro no servidor' })),
    });

    fireEvent.click(screen.getByText('Gerar feedback'));

    await waitFor(() => {
      expect(screen.getByText('Erro no servidor')).toBeInTheDocument();
    });
  });
});
