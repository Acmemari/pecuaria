import { User } from '../../types';

/**
 * Converte perfil do Supabase para o tipo User da aplicação
 */
export const mapUserProfile = (profile: any): User | null => {
  if (!profile) return null;
  
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as 'admin' | 'client',
    avatar: profile.avatar,
    plan: profile.plan as 'basic' | 'pro' | 'enterprise' | undefined,
    status: profile.status as 'active' | 'inactive' | undefined,
    lastLogin: profile.last_login ? new Date(profile.last_login).toISOString() : undefined,
    organizationId: profile.organization_id
  };
};

