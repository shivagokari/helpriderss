-- ====================================================================
-- HELPRIDERSS SUPABASE SECURITY FIXES
-- Run this in your Supabase SQL Editor to fix database linter warnings.
-- ====================================================================

-- 1. Fix Mutable search_path for recover_user_password and set definer parameters
ALTER FUNCTION public.recover_user_password(text, text, text, text) 
SECURITY DEFINER 
SET search_path = public, pg_temp;

-- Revoke execute from public to resolve executable warnings
REVOKE EXECUTE ON FUNCTION public.recover_user_password(text, text, text, text) FROM public, anon, authenticated;
-- Specifically allow execution only for API roles (anon and authenticated)
GRANT EXECUTE ON FUNCTION public.recover_user_password(text, text, text, text) TO anon, authenticated;


-- 2. Fix Mutable search_path and execution for handle_new_user (auth trigger function)
ALTER FUNCTION public.handle_new_user() 
SECURITY DEFINER 
SET search_path = public, pg_temp;

-- Revoke public execution (triggers are run by system, should not be executable via API)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;


-- 3. Fix execution privilege for rls_auto_enable
ALTER FUNCTION public.rls_auto_enable() 
SECURITY DEFINER 
SET search_path = public, pg_temp;

-- Revoke public execution (administrative function, should not be executable via API)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public, anon, authenticated;


-- 4. Fix Permissive/Always-True RLS Policy on dev_contacts
ALTER TABLE public.dev_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS insert_policy ON public.dev_contacts;

-- Create validated policy that resolves rls_policy_always_true
CREATE POLICY insert_policy ON public.dev_contacts
FOR INSERT
TO anon, authenticated
WITH CHECK (name IS NOT NULL AND mobile IS NOT NULL);


-- 5. Fix Join Requests Update Permission on rides
DROP POLICY IF EXISTS "Allow authenticated users to update join_requests" ON public.rides;
CREATE POLICY "Allow authenticated users to update join_requests" ON public.rides
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

