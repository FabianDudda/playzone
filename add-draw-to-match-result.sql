-- Add 'draw' to the match_result enum if it doesn't exist
-- This migration handles the case where the database was created without the draw option

-- First, check if 'draw' already exists in the enum
DO $$
BEGIN
    -- Try to add 'draw' to the enum, ignore if it already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'draw' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'match_result')
    ) THEN
        ALTER TYPE match_result ADD VALUE 'draw';
    END IF;
END $$;