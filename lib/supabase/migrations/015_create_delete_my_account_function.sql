-- Migration: Create function to allow users to delete their own account
-- This function allows self-deletion, unlike delete_user_completely which is admin-only

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Delete all related data first
  
  -- 1. Delete client_farms (farms linked to clients owned by this user)
  DELETE FROM public.client_farms 
  WHERE client_id IN (
    SELECT id FROM public.clients WHERE analyst_id = current_user_id
  );
  
  -- 2. Delete analyst_farms (farms linked to this analyst)
  DELETE FROM public.analyst_farms WHERE analyst_id = current_user_id;
  
  -- 3. Delete clients where user is the analyst
  DELETE FROM public.clients WHERE analyst_id = current_user_id;
  
  -- 4. Delete cattle_scenarios
  DELETE FROM public.cattle_scenarios WHERE user_id = current_user_id;
  
  -- 5. Delete ai_token_usage
  DELETE FROM public.ai_token_usage WHERE user_id = current_user_id;
  
  -- 6. Delete calculations (if exists)
  DELETE FROM public.calculations WHERE user_id = current_user_id;
  
  -- 7. Delete chat_messages
  DELETE FROM public.chat_messages WHERE user_id = current_user_id;
  
  -- 8. Delete organizations where user is owner
  DELETE FROM public.organizations WHERE owner_id = current_user_id;
  
  -- 9. Delete user_profile
  DELETE FROM public.user_profiles WHERE id = current_user_id;
  
  -- 10. Delete from auth.users (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = current_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao excluir conta: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

COMMENT ON FUNCTION public.delete_my_account IS 'Permite que um usuário autenticado exclua sua própria conta e todos os dados relacionados. Esta função só pode ser executada pelo próprio usuário.';
