-- Fix the ambiguous column reference error in checkin function
-- The issue is that 'current_streak' is both a column name and variable name

-- Drop the existing checkin function to avoid conflicts
DROP FUNCTION IF EXISTS public.checkin(UUID, INTEGER, UUID[], TEXT, TEXT);

-- Create a fixed checkin function with proper column qualification
CREATE OR REPLACE FUNCTION checkin(
    p_group_id UUID,
    p_day_number INTEGER,
    p_completed_habit_ids UUID[],
    p_photo_path TEXT,
    p_note TEXT
)
RETURNS TABLE (points_earned INTEGER, current_streak INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_points INTEGER := 0;
    v_current_streak INTEGER;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    -- Check if user has already checked in for this day
    IF EXISTS (
        SELECT 1 FROM checkins 
        WHERE group_id = p_group_id 
        AND user_id = v_user_id 
        AND day_number = p_day_number
    ) THEN
        RAISE EXCEPTION 'already_checked_in';
    END IF;

    -- Calculate points from completed habits
    SELECT COALESCE(SUM(h.points), 0)
    INTO v_points
    FROM habits h
    WHERE h.id = ANY(p_completed_habit_ids);

    -- Create checkin record
    INSERT INTO checkins (
        group_id,
        user_id,
        day_number,
        completed_habit_ids,
        points_earned,
        photo_path,
        note
    ) VALUES (
        p_group_id,
        v_user_id,
        p_day_number,
        p_completed_habit_ids,
        v_points,
        p_photo_path,
        p_note
    );

    -- Update user's points and streak in group_members
    -- Fix: Use explicit column qualification to avoid ambiguity
    UPDATE group_members
    SET 
        total_points = group_members.total_points + v_points,
        current_streak = group_members.current_streak + 1
    WHERE group_id = p_group_id AND user_id = v_user_id
    RETURNING group_members.current_streak INTO v_current_streak;

    RETURN QUERY
    SELECT v_points as points_earned, v_current_streak as current_streak;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION checkin(UUID, INTEGER, UUID[], TEXT, TEXT) TO authenticated;

-- Also fix the get_group_leaderboard issue by creating a simple function
-- This is what the frontend is trying to call
CREATE OR REPLACE FUNCTION get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT,
    total_points INTEGER,
    current_streak INTEGER,
    lives_remaining INTEGER,
    is_out BOOLEAN,
    rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.display_name,
        p.avatar_url,
        gm.role,
        gm.total_points,
        gm.current_streak,
        gm.lives_remaining,
        gm.is_out,
        ROW_NUMBER() OVER (ORDER BY gm.total_points DESC) as rank
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    ORDER BY gm.total_points DESC;
END;
$$;

-- Grant execute permissions for leaderboard function
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO anon;

SELECT 'Checkin function fixed and leaderboard function created!' as status;
