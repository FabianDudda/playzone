-- Fix RLS policies for places table moderation
-- This script should be run in your Supabase SQL editor

-- First, let's see what RLS policies currently exist for places
-- You can run this query first to check: SELECT * FROM pg_policies WHERE tablename = 'places';

-- Enable RLS on places table if not already enabled
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (be careful in production!)
-- DROP POLICY IF EXISTS "Places are viewable by everyone" ON public.places;
-- DROP POLICY IF EXISTS "Authenticated users can insert places" ON public.places;
-- DROP POLICY IF EXISTS "Users can update their own places" ON public.places;
-- DROP POLICY IF EXISTS "Admins can update all places" ON public.places;

-- Policy 1: Everyone can view approved places, users can view their own places regardless of status
CREATE POLICY "Places are viewable by appropriate users" ON public.places
  FOR SELECT USING (
    moderation_status = 'approved' OR 
    added_by_user = auth.uid()
  );

-- Policy 2: Authenticated users can insert places (they start as pending)
CREATE POLICY "Authenticated users can insert places" ON public.places
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    added_by_user = auth.uid()
  );

-- Policy 3: Users can update their own places
CREATE POLICY "Users can update their own places" ON public.places
  FOR UPDATE USING (added_by_user = auth.uid())
  WITH CHECK (
    added_by_user = auth.uid() AND
    -- Don't allow users to change their own moderation status
    moderation_status = OLD.moderation_status AND
    moderated_by = OLD.moderated_by AND
    moderated_at = OLD.moderated_at
  );

-- Policy 4: Admins can approve/reject places (the key missing policy!)
CREATE POLICY "Admins can moderate places" ON public.places
  FOR UPDATE USING (
    -- User must be authenticated and have admin role in profiles table
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  )
  WITH CHECK (
    -- Admins can update moderation fields but shouldn't change other core data
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Policy 5: Admins can delete places if needed
CREATE POLICY "Admins can delete places" ON public.places
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_role = 'admin'
    )
  );

-- Also ensure we have proper RLS for courts table
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- Courts should be visible when their parent place is visible
CREATE POLICY "Courts are viewable when place is viewable" ON public.courts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.places 
      WHERE places.id = courts.place_id 
      AND (
        places.moderation_status = 'approved' OR 
        places.added_by_user = auth.uid()
      )
    )
  );

-- Users can insert courts for their own places
CREATE POLICY "Users can insert courts for their places" ON public.courts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.places 
      WHERE places.id = courts.place_id 
      AND places.added_by_user = auth.uid()
    )
  );

-- Users can update courts for their own places
CREATE POLICY "Users can update courts for their places" ON public.courts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.places 
      WHERE places.id = courts.place_id 
      AND places.added_by_user = auth.uid()
    )
  );

-- Users can delete courts for their own places
CREATE POLICY "Users can delete courts for their places" ON public.courts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.places 
      WHERE places.id = courts.place_id 
      AND places.added_by_user = auth.uid()
    )
  );