import { User } from '../../types';
import { supabase } from '../supabase';
import { mapUserProfile } from './mapUserProfile';
import { createUserProfileIfMissing } from './createProfile';
import { logger } from '../logger';

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
        logger.warn(`Error loading user profile (attempt ${i + 1}/${retries})`, {
          component: 'loadUserProfile',
          errorCode: error.code,
          errorMessage: error.message,
        });

        // If profile doesn't exist (PGRST116), try to create it
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          if (i === 0) {
            // Get user info from auth
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              logger.info('Profile not found, attempting to create...', { component: 'loadUserProfile' });
              await createUserProfileIfMissing(userId);
              // Wait a bit for the profile to be created
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          }

          if (i < retries - 1) {
            logger.debug(`Profile not found for user, retrying... (${i + 1}/${retries})`, {
              component: 'loadUserProfile',
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        // If it's a 500 error (server error), it might be RLS or trigger issue
        // Try again with more delay
        if (i < retries - 1 && (error.code === 'PGRST301' || error.message?.includes('500'))) {
          logger.debug(`Server error (possibly RLS), retrying with longer delay... (${i + 1}/${retries})`, {
            component: 'loadUserProfile',
          });
          await new Promise(resolve => setTimeout(resolve, delay * 2));
          continue;
        }

        return null;
      }

      if (profile) {
        logger.debug('Profile loaded successfully', { component: 'loadUserProfile' });
        return mapUserProfile(profile);
      }
    } catch (err: unknown) {
      logger.error('Error loading user profile', err instanceof Error ? err : new Error(String(err)), {
        component: 'loadUserProfile',
      });
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.warn(`Failed to load profile after ${retries} attempts`);
  return null;
};

