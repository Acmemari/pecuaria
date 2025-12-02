import { describe, it, expect } from 'vitest';
import { mapUserProfile } from '../../../../lib/auth/mapUserProfile';

describe('mapUserProfile', () => {
  it('should return null for null/undefined profile', () => {
    expect(mapUserProfile(null)).toBeNull();
    expect(mapUserProfile(undefined as any)).toBeNull();
  });

  it('should map profile correctly', () => {
    const profile = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'client',
      avatar: 'T',
      plan: 'pro',
      status: 'active',
      last_login: '2024-01-01T00:00:00Z',
      organization_id: 'org-123',
    };

    const result = mapUserProfile(profile);
    expect(result).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'client',
      avatar: 'T',
      plan: 'pro',
      status: 'active',
      lastLogin: '2024-01-01T00:00:00.000Z',
      organizationId: 'org-123',
    });
  });

  it('should handle missing optional fields', () => {
    const profile = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    };

    const result = mapUserProfile(profile);
    expect(result).toEqual({
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
      avatar: undefined,
      plan: undefined,
      status: undefined,
      lastLogin: undefined,
      organizationId: undefined,
    });
  });

  it('should convert last_login to ISO string', () => {
    const profile = {
      id: 'user-123',
      name: 'Test',
      email: 'test@example.com',
      role: 'client',
      last_login: '2024-01-01T00:00:00Z',
    };

    const result = mapUserProfile(profile);
    expect(result?.lastLogin).toBe('2024-01-01T00:00:00.000Z');
  });
});

