import { User } from '../../types';

/**
 * Converte perfil do Supabase para o tipo User da aplicação
 * @param profile Perfil do Supabase (pode ser null, undefined ou objeto)
 * @returns User mapeado ou null se inválido
 */
export const mapUserProfile = (profile: any): User | null => {
  // Validação inicial: profile deve existir e ser um objeto
  if (!profile || typeof profile !== 'object') {
    console.warn('[mapUserProfile] Invalid profile: profile is null, undefined, or not an object', profile);
    return null;
  }

  // Validação de campos obrigatórios
  if (!profile.id) {
    console.warn('[mapUserProfile] Invalid profile: missing id', profile);
    return null;
  }

  if (!profile.email || typeof profile.email !== 'string') {
    console.warn('[mapUserProfile] Invalid profile: missing or invalid email', profile);
    return null;
  }

  // Validação de role
  const validRoles = ['admin', 'client'];
  const role = profile.role;
  if (!role || !validRoles.includes(role)) {
    console.warn('[mapUserProfile] Invalid profile: missing or invalid role', { role, profile });
    return null;
  }

  // Validação de plan (opcional, mas deve ser válido se presente)
  const validPlans = ['basic', 'pro', 'enterprise'];
  let plan: 'basic' | 'pro' | 'enterprise' | undefined = undefined;
  if (profile.plan) {
    if (validPlans.includes(profile.plan)) {
      plan = profile.plan as 'basic' | 'pro' | 'enterprise';
    } else {
      console.warn('[mapUserProfile] Invalid plan value, defaulting to undefined', { plan: profile.plan });
    }
  }

  // Validação de status (opcional, mas deve ser válido se presente)
  const validStatuses = ['active', 'inactive'];
  let status: 'active' | 'inactive' | undefined = undefined;
  if (profile.status) {
    if (validStatuses.includes(profile.status)) {
      status = profile.status as 'active' | 'inactive';
    } else {
      console.warn('[mapUserProfile] Invalid status value, defaulting to undefined', { status: profile.status });
    }
  }

  // Processamento de last_login com validação
  let lastLogin: string | undefined = undefined;
  if (profile.last_login) {
    try {
      const date = new Date(profile.last_login);
      if (!isNaN(date.getTime())) {
        lastLogin = date.toISOString();
      } else {
        console.warn('[mapUserProfile] Invalid last_login date, ignoring', { last_login: profile.last_login });
      }
    } catch (error) {
      console.warn('[mapUserProfile] Error parsing last_login', { error, last_login: profile.last_login });
    }
  }

  // Processamento de name com fallback
  const name = profile.name && typeof profile.name === 'string' && profile.name.trim()
    ? profile.name.trim()
    : profile.email.split('@')[0] || 'Usuário';

  // Processamento de avatar com fallback
  const avatar = profile.avatar && typeof profile.avatar === 'string'
    ? profile.avatar
    : name.charAt(0).toUpperCase();

  // Validação de organization_id (opcional)
  let organizationId: string | undefined = undefined;
  if (profile.organization_id) {
    if (typeof profile.organization_id === 'string' || typeof profile.organization_id === 'object') {
      // Se for objeto (UUID), converter para string
      organizationId = String(profile.organization_id);
    }
  }

  // Processamento de phone (opcional)
  const phone = profile.phone && typeof profile.phone === 'string' ? profile.phone : undefined;

  const mappedUser: User = {
    id: String(profile.id),
    name,
    email: profile.email.trim().toLowerCase(),
    role: role as 'admin' | 'client',
    avatar,
    plan,
    status,
    lastLogin,
    organizationId,
    phone
  };

  return mappedUser;
};
