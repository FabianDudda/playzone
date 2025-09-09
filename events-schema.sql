-- Events Feature Database Schema
-- Run this in your Supabase SQL editor

-- Create event_status enum
CREATE TYPE event_status AS ENUM ('active', 'cancelled', 'full', 'completed');

-- Create skill_level enum  
CREATE TYPE skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'any');

-- Create events table
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Location and sport
    place_id UUID REFERENCES places(id) ON DELETE CASCADE NOT NULL,
    sport sport_type NOT NULL,
    
    -- Timing
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    
    -- Participants
    min_players INTEGER DEFAULT 2 NOT NULL,
    max_players INTEGER DEFAULT 10 NOT NULL,
    skill_level skill_level DEFAULT 'any' NOT NULL,
    
    -- Event management
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status event_status DEFAULT 'active' NOT NULL,
    
    -- Ensure valid player limits
    CONSTRAINT valid_player_limits CHECK (min_players > 0 AND max_players >= min_players),
    -- Ensure future events only
    CONSTRAINT future_events CHECK (event_date >= CURRENT_DATE OR (event_date = CURRENT_DATE AND event_time >= CURRENT_TIME))
);

-- Create event_participants table
CREATE TABLE event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Prevent duplicate participants
    UNIQUE(event_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX events_place_id_idx ON events(place_id);
CREATE INDEX events_creator_id_idx ON events(creator_id);
CREATE INDEX events_sport_idx ON events(sport);
CREATE INDEX events_date_idx ON events(event_date);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX event_participants_event_id_idx ON event_participants(event_id);
CREATE INDEX event_participants_user_id_idx ON event_participants(user_id);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table

-- Anyone can view active events
CREATE POLICY "Anyone can view active events" ON events
    FOR SELECT
    USING (status = 'active');

-- Users can view their own events regardless of status
CREATE POLICY "Users can view their own events" ON events
    FOR SELECT
    USING (auth.uid() = creator_id);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON events
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = creator_id);

-- Users can update their own events
CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE
    USING (auth.uid() = creator_id);

-- Users can delete their own events
CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE
    USING (auth.uid() = creator_id);

-- RLS Policies for event_participants table

-- Anyone can view participants of active events
CREATE POLICY "Anyone can view participants of active events" ON event_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_participants.event_id 
            AND events.status = 'active'
        )
    );

-- Event creators can view all participants of their events
CREATE POLICY "Event creators can view all participants" ON event_participants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_participants.event_id 
            AND events.creator_id = auth.uid()
        )
    );

-- Users can view their own participation
CREATE POLICY "Users can view their own participation" ON event_participants
    FOR SELECT
    USING (auth.uid() = user_id);

-- Authenticated users can join events (if not full)
CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_participants.event_id 
            AND events.status = 'active'
            AND (
                SELECT COUNT(*) FROM event_participants 
                WHERE event_participants.event_id = events.id
            ) < events.max_players
        )
    );

-- Users can leave events they joined
CREATE POLICY "Users can leave events" ON event_participants
    FOR DELETE
    USING (auth.uid() = user_id);

-- Event creators can remove participants
CREATE POLICY "Event creators can remove participants" ON event_participants
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_participants.event_id 
            AND events.creator_id = auth.uid()
        )
    );

-- Function to automatically update event status when full
CREATE OR REPLACE FUNCTION update_event_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update event to 'full' if max players reached
    UPDATE events 
    SET status = 'full'
    WHERE id = NEW.event_id 
    AND status = 'active'
    AND (
        SELECT COUNT(*) FROM event_participants 
        WHERE event_id = NEW.event_id
    ) >= max_players;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update event status when participant leaves
CREATE OR REPLACE FUNCTION update_event_status_on_leave()
RETURNS TRIGGER AS $$
BEGIN
    -- Update event back to 'active' if was full and now has space
    UPDATE events 
    SET status = 'active'
    WHERE id = OLD.event_id 
    AND status = 'full'
    AND (
        SELECT COUNT(*) FROM event_participants 
        WHERE event_id = OLD.event_id
    ) < max_players;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically manage event status
CREATE TRIGGER trigger_update_event_status_on_join
    AFTER INSERT ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_event_status();

CREATE TRIGGER trigger_update_event_status_on_leave
    AFTER DELETE ON event_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_event_status_on_leave();

-- Function to get events with participant count and user join status
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
        COALESCE(ep_count.count, 0) as participant_count,
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