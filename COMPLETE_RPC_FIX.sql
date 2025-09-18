-- Complete fix for all RPC function issues
-- This addresses: leaderboard missing members, 404 errors, and checkin history

-- 1. Fix get_group_leaderboard function with all required fields
DROP FUNCTION IF EXISTS public.get_group_leaderboard(UUID);

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
        ROW_NUMBER() OVER (ORDER BY gm.total_points DESC, gm.current_streak DESC) as rank
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    ORDER BY gm.total_points DESC, gm.current_streak DESC;
END;
$$;

-- Grant execute permissions for leaderboard function
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_leaderboard(UUID) TO anon;

-- 2. Ensure get_user_checkin_history function exists and works
DROP FUNCTION IF EXISTS public.get_user_checkin_history(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_user_checkin_history(
  p_group_id UUID,
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  checkin_date DATE,
  logged BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE;
  v_current_date DATE;
BEGIN
  -- Get the group start date
  SELECT start_date INTO v_start_date
  FROM public.groups
  WHERE id = p_group_id;
  
  -- Calculate the date range (going backwards from today)
  v_current_date := CURRENT_DATE;
  
  -- Loop through each day for the specified number of days back
  FOR i IN 0..(p_days_back - 1) LOOP
    DECLARE
      v_check_date DATE := v_current_date - i;
      v_day_number INTEGER;
      v_has_checkin BOOLEAN := false;
    BEGIN
      -- Calculate the day number relative to start date
      v_day_number := (v_check_date - v_start_date) + 1;
      
      -- Only check for checkins if this date is after the start date
      IF v_check_date >= v_start_date THEN
        -- Check if there's a checkin for this day
        SELECT EXISTS(
          SELECT 1 FROM public.checkins
          WHERE group_id = p_group_id
            AND user_id = p_user_id
            AND created_at::DATE = v_check_date
        ) INTO v_has_checkin;
      END IF;
      
      -- Return the result for this day
      checkin_date := v_check_date;
      logged := v_has_checkin;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- Grant execute permissions for checkin history function
GRANT EXECUTE ON FUNCTION get_user_checkin_history(UUID, UUID, INTEGER) TO authenticated;

-- 3. Fix checkin function with proper column qualification
DROP FUNCTION IF EXISTS public.checkin(UUID, INTEGER, UUID[], TEXT, TEXT);

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

-- Grant execute permissions for checkin function
GRANT EXECUTE ON FUNCTION checkin(UUID, INTEGER, UUID[], TEXT, TEXT) TO authenticated;

-- 4. Ensure get_group_members_details function exists for watcher page
DROP FUNCTION IF EXISTS public.get_group_members_details(UUID);

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

-- Grant execute permissions for group members details function
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO anon;

SELECT 'All RPC functions fixed and created successfully!' as status;
