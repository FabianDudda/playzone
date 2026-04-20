-- Create organizers table for event organizers (e.g. "BasKIDball")
CREATE TABLE IF NOT EXISTS public.organizers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  logo_url    text,
  color       text DEFAULT '#6366F1',
  website     text,
  instagram   text,
  created_by  uuid REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Add organizer_id to places (nullable — only set for organizer venues)
ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id);

-- Add organizer_id to events (nullable — auto-inherited from the linked place)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id);

-- RLS: anyone can read organizers
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizers_select_all"
  ON public.organizers FOR SELECT
  USING (true);

-- Only admins (user_role = 'admin') can insert/update/delete organizers
CREATE POLICY "organizers_insert_admin"
  ON public.organizers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "organizers_update_admin"
  ON public.organizers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );

CREATE POLICY "organizers_delete_admin"
  ON public.organizers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND user_role = 'admin'
    )
  );
