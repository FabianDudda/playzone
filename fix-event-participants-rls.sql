-- Fix infinite recursion in event_participants RLS policy
-- Run this in your Supabase SQL editor

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Users can join events" ON event_participants;

-- Function to check if user can join event (bypasses RLS for participant count)
CREATE OR REPLACE FUNCTION can_join_event(event_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_record RECORD;
    participant_count INTEGER;
BEGIN
    -- Get event details
    SELECT id, status, max_players INTO event_record
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
    
    -- Check if there's space
    RETURN participant_count < event_record.max_players;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new INSERT policy that uses the secure function
CREATE POLICY "Users can join events" ON event_participants
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND auth.uid() = user_id
        AND can_join_event(event_id, auth.uid())
    );