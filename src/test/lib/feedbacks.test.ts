import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveFeedback, getSavedFeedbacks, type SaveFeedbackInput } from '@/lib/feedbacks';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('feedbacks lib', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveFeedback', () => {
    const validInput: SaveFeedbackInput = {
      createdBy: 'user-123',
      recipientName: 'João Silva',
      context: 'trabalho',
      feedbackType: 'construtivo',
      objective: 'Melhorar comunicação',
      tone: 'formal',
      format: 'escrito',
      structure: 'sbi',
      lengthPreference: 'medio',
      generatedFeedback: 'Texto do feedback',
      generatedStructure: 'Estrutura SBI',
    };

    it('should successfully save a feedback', async () => {
      const mockData = { id: 'fb-1', ...validInput };
      const fromSpy = vi.spyOn(supabase, 'from');
      const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });

      fromSpy.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: mockSingle,
      } as any);

      const result = await saveFeedback(validInput);

      expect(supabase.from).toHaveBeenCalledWith('saved_feedbacks');
      expect(result).toEqual(mockData);
    });

    it('should throw error if recipient name is too short', async () => {
      const invalidInput = { ...validInput, recipientName: 'J' };

      await expect(saveFeedback(invalidInput)).rejects.toThrow('Destinatário inválido.');
    });

    it('should throw error if supabase returns error', async () => {
      const fromSpy = vi.spyOn(supabase, 'from');
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });

      fromSpy.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: mockSingle,
      } as any);

      await expect(saveFeedback(validInput)).rejects.toThrow('Database error');
    });
  });

  describe('getSavedFeedbacks', () => {
    it('should return list of feedbacks', async () => {
      const mockList = [{ id: '1', objective: 'Test' }];
      const fromSpy = vi.spyOn(supabase, 'from');

      fromSpy.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockList, error: null }),
      } as any);

      const result = await getSavedFeedbacks();
      expect(result).toEqual(mockList);
    });

    it('should return empty array if table does not exist (code 42P01)', async () => {
      const fromSpy = vi.spyOn(supabase, 'from');

      fromSpy.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { code: '42P01' } }),
      } as any);

      const result = await getSavedFeedbacks();
      expect(result).toEqual([]);
    });

    it('should throw error for other database errors', async () => {
      const fromSpy = vi.spyOn(supabase, 'from');

      fromSpy.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fatal error' } }),
      } as any);

      await expect(getSavedFeedbacks()).rejects.toThrow('Fatal error');
    });
  });
});
