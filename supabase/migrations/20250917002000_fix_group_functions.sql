-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_group_details(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_group_members_details(UUID);
DROP FUNCTION IF EXISTS public.checkin(UUID, INTEGER, UUID[], TEXT, TEXT);

-- Create function to get group details with member info
CREATE OR REPLACE FUNCTION get_group_details(p_group_id UUID, p_user_id UUID)
RETURNS TABLE (
    group_id UUID,
    name TEXT,
    code TEXT,
    start_date DATE,
    duration_days INTEGER,
    mode TEXT,
    is_active BOOLEAN,
    user_role TEXT,
    user_total_points INTEGER,
    user_current_streak INTEGER,
    user_lives_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as group_id,
        g.name,
        g.code,
        g.start_date,
        g.duration_days,
        g.mode,
        g.is_active,
        gm.role as user_role,
        gm.total_points as user_total_points,
        gm.current_streak as user_current_streak,
        gm.lives_remaining as user_lives_remaining
    FROM public.groups g
    JOIN public.group_members gm ON g.id = gm.group_id
    WHERE g.id = p_group_id AND gm.user_id = p_user_id;
END;
$$;

-- Create function to get group members
CREATE OR REPLACE FUNCTION get_group_members_details(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT,
    total_points INTEGER,
    current_streak INTEGER,
    lives_remaining INTEGER,
    is_out BOOLEAN
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
        gm.is_out
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    ORDER BY gm.total_points DESC;
END;
$$;

-- Create checkin function with better error handling
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
GRANT EXECUTE ON FUNCTION get_group_details(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION checkin(UUID, INTEGER, UUID[], TEXT, TEXT) TO authenticated;