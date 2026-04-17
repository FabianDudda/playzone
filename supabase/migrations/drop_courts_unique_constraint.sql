-- Drop the unique constraint that prevented multiple courts with the same sport/surface
-- per place. Courts are now stored as individual records (quantity=1 each), so this
-- constraint is no longer valid.
alter table public.courts
  drop constraint if exists "courts_place_id_sport_surface_ucstom_sport_key";
