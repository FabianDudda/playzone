-- RPC: get_isolated_pending_ids
-- Returns IDs of pending places that have no nearby place (within radius_meters) sharing at least one sport.
-- Replaces the client-side O(n×m) JavaScript haversine loop.
-- Uses plain SQL haversine — no PostGIS required.

CREATE OR REPLACE FUNCTION get_isolated_pending_ids(radius_meters float8, include_pending boolean)
RETURNS TABLE(id uuid)
LANGUAGE sql STABLE
AS $$
  SELECT p.id
  FROM places p
  WHERE p.moderation_status = 'pending'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM places r
      WHERE r.id != p.id
        AND r.latitude IS NOT NULL
        AND r.longitude IS NOT NULL
        AND (
          r.moderation_status = 'approved'
          OR (include_pending AND r.moderation_status = 'pending')
        )
        -- Sports overlap: if either place has no sports listed, treat as matching (same as JS fallback).
        AND (
          p.sports IS NULL OR array_length(p.sports, 1) IS NULL
          OR r.sports IS NULL OR array_length(r.sports, 1) IS NULL
          OR p.sports && r.sports
        )
        -- Haversine distance < radius_meters (pure SQL, no PostGIS)
        AND (
          2 * 6371000.0 * asin(sqrt(
            pow(sin(radians(r.latitude - p.latitude) / 2.0), 2)
            + cos(radians(p.latitude)) * cos(radians(r.latitude))
              * pow(sin(radians(r.longitude - p.longitude) / 2.0), 2)
          ))
        ) < radius_meters
    )
$$;
