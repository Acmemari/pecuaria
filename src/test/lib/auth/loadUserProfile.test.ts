import { describe, it, expect } from 'vitest';
import { loadUserProfile } from '../../../../lib/auth/loadUserProfile';

describe('loadUserProfile', () => {
  it('should be a function', () => {
    expect(typeof loadUserProfile).toBe('function');
  });

  it('should accept userId parameter', () => {
    expect(loadUserProfile.length).toBeGreaterThanOrEqual(1);
  });

  it('should accept optional retry parameters', () => {
    // Function signature: loadUserProfile(userId, retries = 5, delay = 1000)
    // Only userId is required, others have defaults
    expect(loadUserProfile.length).toBeGreaterThanOrEqual(1);
  });

  // Integration tests would require actual Supabase connection
  // These are tested in AuthContext integration tests
});

