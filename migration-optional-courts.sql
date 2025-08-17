-- Migration to make court_id optional in matches table
-- Run this if you already have the database set up with the previous schema

-- Update the matches table to allow null court_id
ALTER TABLE public.matches 
ALTER COLUMN court_id DROP NOT NULL;

-- Update the foreign key constraint to use SET NULL instead of CASCADE
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_court_id_fkey,
ADD CONSTRAINT matches_court_id_fkey 
FOREIGN KEY (court_id) 
REFERENCES public.courts(id) 
ON DELETE SET NULL;