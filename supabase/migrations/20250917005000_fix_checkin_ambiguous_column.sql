-- Fix ambiguous column reference in checkin function
-- The issue was that 'current_streak' was both a column name and variable name

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
    UPDATE group_members
    SET 
        total_points = total_points + v_points,
        current_streak = current_streak + 1
    WHERE group_id = p_group_id AND user_id = v_user_id
    RETURNING current_streak INTO v_current_streak;

    RETURN QUERY
    SELECT v_points as points_earned, v_current_streak as current_streak;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION checkin(UUID, INTEGER, UUID[], TEXT, TEXT) TO authenticated;
