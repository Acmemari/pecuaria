import { User } from '../../types';
import { supabase } from '../supabase';
import { mapUserProfile } from './mapUserProfile';
import { logger } from '../logger';

/**
 * Loads a user profile from the database.
 *
 * @param userId  - The user's auth ID
 * @param retries - How many attempts before giving up (default: 3)
 * @param delay   - Milliseconds between attempts (default: 500)
 * @returns The mapped User object, or null if not found after all retries
 *
 * Note: Profile *creation* is NOT handled here. Use loadProfileWithRetry in
 * AuthContext for flows that need automatic creation (login, signup, OAuth).
 * Keeping creation out of this utility prevents duplicate RPC calls when
 * the function is called from multiple places concurrently.
 */
export const loadUserProfile = async (userId: string, retries = 3, delay = 500): Promise<User | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        const notFound = error.code === 'PGRST116' || error.message?.includes('No rows');
        const serverError = error.code === 'PGRST301' || error.message?.includes('500');

        logger.warn(`loadUserProfile attempt ${i + 1}/${retries}`, {
          component: 'loadUserProfile',
          errorCode: error.code,
          notFound,
          serverError,
        });

        if (i < retries - 1) {
          const waitMs = serverError ? delay * 2 : delay;
          await new Promise(r => setTimeout(r, waitMs));
        }
        continue;
      }

      if (profile) {
        logger.debug('Profile loaded successfully', { component: 'loadUserProfile' });
        return mapUserProfile(profile);
      }
    } catch (err: unknown) {
      logger.error(
        'loadUserProfile unexpected error',
        err instanceof Error ? err : new Error(String(err)),
        { component: 'loadUserProfile' },
      );
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  logger.warn(`loadUserProfile: failed after ${retries} attempts`, { component: 'loadUserProfile', userId });
  return null;
};
