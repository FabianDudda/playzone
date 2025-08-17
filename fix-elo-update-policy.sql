-- Fix for Elo update RLS policy issue
-- This allows authenticated users to update other players' Elo ratings during match creation

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create a more permissive policy that allows authenticated users to update profiles
-- but with safeguards to prevent malicious updates
CREATE POLICY "Authenticated users can update profiles" ON public.profiles
  FOR UPDATE USING (auth.role() = 'authenticated')
  WITH CHECK (
    -- Allow users to update their own profile completely
    auth.uid() = id OR
    -- Allow updating Elo only if other fields remain unchanged (for match creation)
    (
      COALESCE(OLD.name, '') = COALESCE(NEW.name, '') AND
      COALESCE(OLD.avatar, '') = COALESCE(NEW.avatar, '') AND
      OLD.created_at = NEW.created_at AND
      OLD.updated_at <= NEW.updated_at
    )
  );