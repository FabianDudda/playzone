-- Fix extra participants support for event joiners
-- Run this in your Supabase SQL editor

-- Step 1: Add extra_participants_count field to event_participants table
ALTER TABLE event_participants ADD COLUMN IF NOT EXISTS extra_participants_count INTEGER DEFAULT 0 NOT NULL;

-- Step 2: Update existing event_participants to have 0 extra participants
UPDATE event_participants SET extra_participants_count = 0 WHERE extra_participants_count IS NULL;

-- Step 3: Drop the existing function first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_events_with_details(uuid);

-- Step 4: Recreate get_events_with_details function to include all extra participants
CREATE OR REPLACE FUNCTION get_events_with_details(user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    title TEXT,
    description TEXT,
    place_id UUID,
    sport sport_type,
    event_date DATE,
    event_time TIME,
    min_players INTEGER,
    max_players INTEGER,
    skill_level skill_level,
    creator_id UUID,
    status event_status,
    extra_participants_count INTEGER,
    participant_count BIGINT,
    user_joined BOOLEAN,
    creator_name TEXT,
    creator_avatar TEXT,
    place_name TEXT,
    place_latitude FLOAT8,
    place_longitude FLOAT8,
    place_street TEXT,
    place_house_number TEXT,
    place_city TEXT,
    place_postcode TEXT,
    place_district TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.created_at,
        e.updated_at,
        e.title,
        e.description,
        e.place_id,
        e.sport,
        e.event_date,
        e.event_time,
        e.min_players,
        e.max_players,
        e.skill_level,
        e.creator_id,
        e.status,
        e.extra_participants_count,
        -- Total participants = individual participants + creator extra + all joiner extras
        COALESCE(ep_count.count, 0) + COALESCE(e.extra_participants_count, 0) + COALESCE(ep_extras.total_extras, 0) as participant_count,
        COALESCE(user_participation.joined, FALSE) as user_joined,
        creator.name as creator_name,
        creator.avatar as creator_avatar,
        p.name as place_name,
        p.latitude as place_latitude,
        p.longitude as place_longitude,
        p.street as place_street,
        p.house_number as place_house_number,
        p.city as place_city,
        p.postcode as place_postcode,
        p.district as place_district
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as count
        FROM event_participants
        GROUP BY event_id
    ) ep_count ON e.id = ep_count.event_id
    LEFT JOIN (
        SELECT event_id, SUM(extra_participants_count) as total_extras
        FROM event_participants
        GROUP BY event_id
    ) ep_extras ON e.id = ep_extras.event_id
    LEFT JOIN (
        SELECT event_id, TRUE as joined
        FROM event_participants
        WHERE user_id = user_id_param
    ) user_participation ON e.id = user_participation.event_id
    LEFT JOIN profiles creator ON e.creator_id = creator.id
    LEFT JOIN places p ON e.place_id = p.id
    ORDER BY e.event_date, e.event_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update can_join_event function to account for all extra participants
CREATE OR REPLACE FUNCTION can_join_event(event_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_record RECORD;
    participant_count INTEGER;
    joiner_extras INTEGER;
    total_participants INTEGER;
BEGIN
    -- Get event details including creator extra participants count
    SELECT id, status, max_players, extra_participants_count INTO event_record
    FROM events 
    WHERE id = event_id_param;
    
    -- Check if event exists and is active
    IF event_record IS NULL OR event_record.status != 'active' THEN
        RETURN FALSE;
    END IF;
    
    -- Count current individual participants (bypass RLS)
    SELECT COUNT(*) INTO participant_count
    FROM event_participants 
    WHERE event_id = event_id_param;
    
    -- Count total extra participants from joiners (bypass RLS)
    SELECT COALESCE(SUM(extra_participants_count), 0) INTO joiner_extras
    FROM event_participants 
    WHERE event_id = event_id_param;
    
    -- Calculate total participants including all extras
    total_participants := participant_count + COALESCE(event_record.extra_participants_count, 0) + joiner_extras;
    
    -- Check if there's space
    RETURN total_participants < event_record.max_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;