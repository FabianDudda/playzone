-- Fix unique constraint on courts table to account for custom sport names.
-- Previously: UNIQUE (place_id, sport, surface)
-- Problem: two custom sports (sport='other') with the same surface would conflict.
-- Fix: use a unique index on (place_id, sport, surface, COALESCE(custom_sport_name, ''))
-- This allows multiple 'other' courts with different custom_sport_name values,
-- while still deduplicating regular sports by (place_id, sport, surface).

DROP INDEX IF EXISTS courts_place_id_sport_surface_key;
ALTER TABLE public.courts DROP CONSTRAINT IF EXISTS courts_place_id_sport_surface_key;

CREATE UNIQUE INDEX courts_place_id_sport_surface_custom_sport_key
ON public.courts (place_id, sport, surface, COALESCE(custom_sport_name, ''));
