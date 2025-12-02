import { supabase } from '../supabase';

/**
 * Cria perfil de usuário se não existir
 * @param userId ID do usuário
 * @returns true se criado com sucesso, false caso contrário
 */
export const createUserProfileIfMissing = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('create_user_profile_if_missing', {
      user_id: userId
    });
    
    if (error) {
      console.error('Error creating user profile:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error calling create_user_profile_if_missing:', error);
    return false;
  }
};

