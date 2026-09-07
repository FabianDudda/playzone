-- Create the organizers storage bucket (public so logo URLs work without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizers', 'organizers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop any existing restrictive policies on the organizers bucket
-- (Supabase template policies often restrict uploads to own-folder by user UUID,
--  which breaks for organizers imported via script that have no created_by user)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual ILIKE '%organizers%' OR with_check ILIKE '%organizers%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Public read — anyone can view logos and cover images
CREATE POLICY "organizers_storage_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'organizers');

-- Admins can upload files (INSERT covers new uploads)
CREATE POLICY "organizers_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'organizers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Admins can overwrite files (UPDATE covers upsert = true)
CREATE POLICY "organizers_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'organizers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

-- Admins can delete files
CREATE POLICY "organizers_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'organizers'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );
