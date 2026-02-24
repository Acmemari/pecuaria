import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchInitiatives, fetchInitiativeDetail } from '@/lib/initiatives';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('initiatives lib (Refactored Queries)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchInitiatives', () => {
    it('should map nested joined data correctly and calculate progress', async () => {
      const mockInitiativeRaw = {
        id: 'init-1',
        name: 'Iniciativa Teste',
        created_by: 'user-1',
        start_date: '2026-01-01',
        initiative_milestones: [
          {
            id: 'mil-1',
            title: 'Marco 1',
            percent: 50,
            completed: true,
            sort_order: 1,
            initiative_tasks: [{ id: 'task-1', title: 'Task 1', sort_order: 1 }],
          },
          {
            id: 'mil-2',
            title: 'Marco 2',
            percent: 50,
            completed: false,
            sort_order: 2,
            initiative_tasks: [],
          },
        ],
      };

      const fromSpy = vi.spyOn(supabase, 'from');
      fromSpy.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [mockInitiativeRaw], error: null }),
      } as any);

      const result = await fetchInitiatives('user-1');

      expect(supabase.from).toHaveBeenCalledWith('initiatives');
      expect(result).toHaveLength(1);

      const res = result[0];
      expect(res.name).toBe('Iniciativa Teste');
      // Progress calculation: 1 milstone completed (50%) + 1 pending (0%) = 50
      expect(res.progress).toBe(50);
      expect(res.milestones).toHaveLength(2);
      expect(res.milestones![0].tasks).toHaveLength(1);
      // Verify cleanup of nested keys
      expect((res as any).initiative_milestones).toBeUndefined();
    });

    it('should return empty if no effectiveUserId', async () => {
      const result = await fetchInitiatives('');
      expect(result).toEqual([]);
    });
  });

  describe('fetchInitiativeDetail', () => {
    it('should fetch single initiative with full nested tree', async () => {
      const mockSingleRaw = {
        id: 'init-2',
        name: 'Detail Init',
        initiative_team: [{ name: 'Líder', role: 'LÍDER', sort_order: 0 }],
        initiative_milestones: [
          {
            id: 'mil-3',
            percent: 100,
            completed: true,
            initiative_tasks: [{ id: 't-100', sort_order: 0 }],
          },
        ],
      };

      const fromSpy = vi.spyOn(supabase, 'from');
      fromSpy.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSingleRaw, error: null }),
      } as any);

      const result = await fetchInitiativeDetail('init-2');

      expect(result.id).toBe('init-2');
      expect(result.progress).toBe(100);
      expect(result.team).toHaveLength(1);
      expect(result.milestones![0].tasks).toHaveLength(1);
    });
  });
});
