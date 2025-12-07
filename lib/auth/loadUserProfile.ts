import { User } from '../../types';
import { supabase } from '../supabase';
import { mapUserProfile } from './mapUserProfile';
import { createUserProfileIfMissing } from './createProfile';

/**
 * Carrega perfil de usuário do Supabase com lógica de retry
 * @param userId ID do usuário
 * @param retries Número de tentativas
 * @param delay Delay entre tentativas em ms
 * @returns Perfil do usuário ou null se não encontrado
 */
export const loadUserProfile = async (
  userId: string,
  retries = 3,
  delay = 500
): Promise<User | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Não logar erro completo em produção para evitar poluição do console
        if (process.env.NODE_ENV === 'development') {
          console.error(`Error loading user profile (attempt ${i + 1}/${retries}):`, {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
        } else {
          console.warn(`Error loading user profile (attempt ${i + 1}/${retries}):`, error.message);
        }

        // If profile doesn't exist (PGRST116), try to create it
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          if (i === 0) {
            // Get user info from auth
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              console.log('Profile not found, attempting to create...');
              await createUserProfileIfMissing(userId);
              // Wait a bit for the profile to be created
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }

          if (i < retries - 1) {
            console.log(`Profile not found for user ${userId}, retrying... (${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // If it's a 500 error (server error), it might be RLS or trigger issue
        // Try again with more delay
        if (i < retries - 1 && (error.code === 'PGRST301' || error.message?.includes('500'))) {
          console.log(`Server error (possibly RLS), retrying with longer delay... (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay * 2));
          continue;
        }

        return null;
      }

      if (profile) {
        console.log('Profile loaded successfully:', profile.email);
        return mapUserProfile(profile);
      }
    } catch (error: any) {
      console.error('Error loading user profile:', error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.warn(`Failed to load profile after ${retries} attempts`);
  return null;
};

