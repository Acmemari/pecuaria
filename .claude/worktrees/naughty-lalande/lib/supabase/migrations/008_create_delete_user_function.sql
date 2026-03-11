-- Migration: Create function to delete user and all related data
-- This function ensures complete deletion of user data including auth.users

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Delete all related data first
  
  -- 1. Delete cattle_scenarios (has CASCADE but being explicit)
  DELETE FROM public.cattle_scenarios WHERE user_id = user_id_to_delete;
  
  -- 2. Delete ai_token_usage
  DELETE FROM public.ai_token_usage WHERE user_id = user_id_to_delete;
  
  -- 3. Delete calculations (if exists and has FK)
  DELETE FROM public.calculations WHERE user_id = user_id_to_delete;
  
  -- 4. Delete chat_messages (has CASCADE but being explicit)
  DELETE FROM public.chat_messages WHERE user_id = user_id_to_delete;
  
  -- 5. Delete organizations where user is owner
  DELETE FROM public.organizations WHERE owner_id = user_id_to_delete;
  
  -- 6. Delete user_profile (this may cascade to other tables)
  DELETE FROM public.user_profiles WHERE id = user_id_to_delete;
  
  -- 7. Delete from auth.users (requires admin privileges)
  -- Note: This requires the function to run with SECURITY DEFINER
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user %: %', user_id_to_delete, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (admins will use this)
-- In practice, you should restrict this to admins only via RLS or application logic
COMMENT ON FUNCTION public.delete_user_completely IS 'Deletes a user and all related data including auth.users. Requires admin privileges.';

