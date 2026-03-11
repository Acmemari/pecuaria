-- Migration: Restrict delete_user_completely function to admins only
-- This ensures only administrators can delete users

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.delete_user_completely(UUID) FROM PUBLIC;

-- Grant execute only to authenticated users (will be further restricted by application logic)
-- In practice, the application should verify admin role before calling this function
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;

-- Add a check inside the function to verify admin role
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Verify that the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir usuários';
  END IF;

  -- Prevent self-deletion
  IF auth.uid() = user_id_to_delete THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta';
  END IF;

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

