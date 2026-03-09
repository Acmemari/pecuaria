import { supabase } from '../supabase';
import { logger } from '../logger';

export const createUserProfileIfMissing = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('create_user_profile_if_missing', {
      user_id: userId,
    });

    if (error) {
      logger.error('Error creating user profile', error instanceof Error ? error : new Error(String(error)), {
        component: 'createProfile',
      });
      return false;
    }

    return data === true;
  } catch (error) {
    logger.error('Error calling create_user_profile_if_missing', error instanceof Error ? error : new Error(String(error)), {
      component: 'createProfile',
    });
    return false;
  }
};
