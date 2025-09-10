-- Add automatic event creator participation functionality with extra players support
-- Run this in your Supabase SQL editor

-- Step 1: Add extra_participants_count field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS extra_participants_count INTEGER DEFAULT 0 NOT NULL;

-- Step 2: Update existing events to have 0 extra participants
UPDATE events SET extra_participants_count = 0 WHERE extra_participants_count IS NULL;

-- Step 3: Function to create event with automatic creator participation
CREATE OR REPLACE FUNCTION create_event_with_creator_participation(
    event_title TEXT,
    event_description TEXT,
    event_place_id UUID,
    event_sport sport_type,
    event_date DATE,
    event_time TIME,
    event_min_players INTEGER,
    event_max_players INTEGER,
    event_skill_level skill_level,
    event_creator_id UUID,
    extra_players INTEGER DEFAULT 0
)
RETURNS TABLE (
    event_id UUID,
    participant_count BIGINT
) AS $$
DECLARE
    new_event_id UUID;
    total_participants INTEGER;
BEGIN
    -- Calculate total participants (creator + extra players)
    total_participants := 1 + extra_players;
    
    -- Validate that total participants don't exceed max_players
    IF total_participants > event_max_players THEN
        RAISE EXCEPTION 'Total participants (creator + extra players: %) exceeds maximum players (%)', total_participants, event_max_players;
    END IF;
    
    -- Create the event with extra participants count
    INSERT INTO events (
        title, description, place_id, sport, event_date, event_time,
        min_players, max_players, skill_level, creator_id, status, extra_participants_count
    ) VALUES (
        event_title, event_description, event_place_id, event_sport, event_date, event_time,
        event_min_players, event_max_players, event_skill_level, event_creator_id, 'active', extra_players
    ) RETURNING id INTO new_event_id;
    
    -- Add creator as participant (only once)
    INSERT INTO event_participants (event_id, user_id)
    VALUES (new_event_id, event_creator_id);
    
    -- Return event details
    RETURN QUERY
    SELECT 
        new_event_id as event_id,
        total_participants::BIGINT as participant_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update can_join_event function to account for extra participants
CREATE OR REPLACE FUNCTION can_join_event(event_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_record RECORD;
    participant_count INTEGER;
    total_participants INTEGER;
BEGIN
    -- Get event details including extra participants count
    SELECT id, status, max_players, extra_participants_count INTO event_record
    FROM events 
    WHERE id = event_id_param;
    
    -- Check if event exists and is active
    IF event_record IS NULL OR event_record.status != 'active' THEN
        RETURN FALSE;
    END IF;
    
    -- Count current participants (bypass RLS)
    SELECT COUNT(*) INTO participant_count
    FROM event_participants 
    WHERE event_id = event_id_param;
    
    -- Calculate total participants including extra participants
    total_participants := participant_count + event_record.extra_participants_count;
    
    -- Check if there's space
    RETURN total_participants < event_record.max_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Update get_events_with_details function to include extra participants in count
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
    participant_count BIGINT,
    user_joined BOOLEAN,
    creator_name TEXT,
    creator_avatar TEXT,
    place_name TEXT,
    place_latitude FLOAT8,
    place_longitude FLOAT8
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
        COALESCE(ep_count.count, 0) + e.extra_participants_count as participant_count,
        COALESCE(user_participation.joined, FALSE) as user_joined,
        creator.name as creator_name,
        creator.avatar as creator_avatar,
        p.name as place_name,
        p.latitude as place_latitude,
        p.longitude as place_longitude
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) as count
        FROM event_participants
        GROUP BY event_id
    ) ep_count ON e.id = ep_count.event_id
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