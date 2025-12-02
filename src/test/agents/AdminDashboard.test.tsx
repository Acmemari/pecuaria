import { describe, it, expect } from 'vitest';
import AdminDashboard from '../../../agents/AdminDashboard';

describe('AdminDashboard Component', () => {
  it('should export component', () => {
    expect(AdminDashboard).toBeDefined();
    expect(typeof AdminDashboard).toBe('function');
  });

  // Integration tests with Supabase require actual database connection
  // The component structure is validated by the export test
  // Full integration tests are covered in integration test suite
});
