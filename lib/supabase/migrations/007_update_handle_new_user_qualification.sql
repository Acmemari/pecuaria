-- Migration: Update handle_new_user function to set qualification default to 'visitante'
-- This ensures all new user registrations get 'visitante' as their default qualification

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  default_org_id UUID;
BEGIN
  -- Get user email and name from auth.users
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_user_meta_data->>'full_name', 
    split_part(user_email, '@', 1)
  );
  
  -- Create default organization for the user
  INSERT INTO public.organizations (name, plan, owner_id)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', user_name || '''s Organization'),
    COALESCE((NEW.raw_user_meta_data->>'plan')::TEXT, 'basic'),
    NEW.id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO default_org_id;
  
  -- Get org ID if it already exists
  IF default_org_id IS NULL THEN
    SELECT id INTO default_org_id 
    FROM public.organizations 
    WHERE owner_id = NEW.id 
    LIMIT 1;
  END IF;
  
  -- Create user profile with qualification default 'visitante'
  INSERT INTO public.user_profiles (
    id,
    name,
    email,
    role,
    avatar,
    plan,
    status,
    organization_id,
    qualification
  )
  VALUES (
    NEW.id,
    user_name,
    user_email,
    COALESCE((NEW.raw_user_meta_data->>'role')::TEXT, 'client'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', upper(substring(user_name, 1, 1))),
    COALESCE((NEW.raw_user_meta_data->>'plan')::TEXT, 'basic'),
    'active',
    default_org_id,
    'visitante'  -- Default qualification for all new users
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, user_profiles.name),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

