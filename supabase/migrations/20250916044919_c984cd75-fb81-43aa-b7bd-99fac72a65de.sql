-- Fix security warnings by setting search_path for functions

-- Update generate_group_code function
CREATE OR REPLACE FUNCTION public.generate_group_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.groups WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update create_group function
CREATE OR REPLACE FUNCTION public.create_group(
  p_name TEXT,
  p_start_date DATE,
  p_duration_days INTEGER,
  p_mode TEXT
) RETURNS TABLE (group_id UUID, join_code TEXT) AS $$
DECLARE
  v_group_id UUID;
  v_code TEXT;
  v_user_groups INTEGER;
  v_max_groups INTEGER;
BEGIN
  -- Check user's group limit
  SELECT max_groups INTO v_max_groups 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  SELECT COUNT(*) INTO v_user_groups
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND g.is_active = true;
  
  IF v_user_groups >= v_max_groups THEN
    RAISE EXCEPTION 'User has reached maximum number of groups';
  END IF;
  
  -- Generate unique code
  v_code := public.generate_group_code();
  
  -- Create group
  INSERT INTO public.groups (id, name, code, start_date, duration_days, mode, created_by)
  VALUES (gen_random_uuid(), p_name, v_code, p_start_date, p_duration_days, p_mode, auth.uid())
  RETURNING id INTO v_group_id;
  
  -- Add creator as admin
  INSERT INTO public.group_members (group_id, user_id, role) 
  VALUES (v_group_id, auth.uid(), 'admin');
  
  RETURN QUERY SELECT v_group_id, v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update join_group function
CREATE OR REPLACE FUNCTION public.join_group(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_user_groups INTEGER;
  v_max_groups INTEGER;
  v_is_member BOOLEAN;
BEGIN
  -- Get group ID
  SELECT id INTO v_group_id 
  FROM public.groups 
  WHERE code = p_code AND is_active = true;
  
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive group code';
  END IF;
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE group_id = v_group_id AND user_id = auth.uid()
  ) INTO v_is_member;
  
  IF v_is_member THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;
  
  -- Check user's group limit
  SELECT max_groups INTO v_max_groups 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  SELECT COUNT(*) INTO v_user_groups
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND g.is_active = true;
  
  IF v_user_groups >= v_max_groups THEN
    RAISE EXCEPTION 'User has reached maximum number of groups';
  END IF;
  
  -- Add user to group
  INSERT INTO public.group_members (group_id, user_id, role) 
  VALUES (v_group_id, auth.uid(), 'member');
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update checkin function
CREATE OR REPLACE FUNCTION public.checkin(
  p_group_id UUID,
  p_day_number INTEGER,
  p_completed_habit_ids UUID[],
  p_photo_path TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_points_earned INTEGER := 0;
  v_habit_points INTEGER;
  v_habit_id UUID;
  v_member_id UUID;
  v_current_streak INTEGER;
  v_lives_remaining INTEGER;
  v_total_points INTEGER;
  v_required_habits UUID[];
  v_missed_habits UUID[];
  result JSON;
BEGIN
  -- Get user's membership
  SELECT id, current_streak, lives_remaining, total_points 
  INTO v_member_id, v_current_streak, v_lives_remaining, v_total_points
  FROM public.group_members 
  WHERE group_id = p_group_id AND user_id = auth.uid();
  
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;
  
  -- Check if already checked in for this day
  IF EXISTS(
    SELECT 1 FROM public.checkins 
    WHERE user_id = auth.uid() AND group_id = p_group_id AND day_number = p_day_number
  ) THEN
    RAISE EXCEPTION 'User has already checked in for this day';
  END IF;
  
  -- Get user's required habits for this group
  SELECT ARRAY_AGG(habit_id) INTO v_required_habits
  FROM public.user_habits 
  WHERE user_id = auth.uid() AND group_id = p_group_id;
  
  -- Calculate points earned
  FOREACH v_habit_id IN ARRAY p_completed_habit_ids
  LOOP
    SELECT points INTO v_habit_points 
    FROM public.habits 
    WHERE id = v_habit_id;
    
    IF v_habit_points IS NOT NULL THEN
      v_points_earned := v_points_earned + v_habit_points;
    END IF;
  END LOOP;
  
  -- Find missed habits
  SELECT ARRAY(
    SELECT unnest(v_required_habits) 
    EXCEPT 
    SELECT unnest(p_completed_habit_ids)
  ) INTO v_missed_habits;
  
  -- Update streak and lives based on completion
  IF ARRAY_LENGTH(v_missed_habits, 1) > 0 THEN
    -- Missed some habits, lose a life
    v_lives_remaining := v_lives_remaining - 1;
    v_current_streak := 0; -- Reset streak
    
    -- If no lives left, restart
    IF v_lives_remaining <= 0 THEN
      UPDATE public.group_members 
      SET 
        lives_remaining = 3,
        restart_count = restart_count + 1,
        current_streak = 0,
        total_points = v_points_earned -- Reset points on restart
      WHERE id = v_member_id;
      
      v_total_points := v_points_earned;
      v_lives_remaining := 3;
    ELSE
      -- Just update lives and points
      UPDATE public.group_members 
      SET 
        lives_remaining = v_lives_remaining,
        current_streak = v_current_streak,
        total_points = total_points + v_points_earned
      WHERE id = v_member_id;
      
      v_total_points := v_total_points + v_points_earned;
    END IF;
  ELSE
    -- Completed all habits, continue streak
    v_current_streak := v_current_streak + 1;
    v_total_points := v_total_points + v_points_earned;
    
    UPDATE public.group_members 
    SET 
      current_streak = v_current_streak,
      total_points = v_total_points
    WHERE id = v_member_id;
  END IF;
  
  -- Insert check-in record
  INSERT INTO public.checkins (
    user_id, group_id, day_number, completed_habit_ids, 
    points_earned, photo_path, note
  ) VALUES (
    auth.uid(), p_group_id, p_day_number, p_completed_habit_ids,
    v_points_earned, p_photo_path, p_note
  );
  
  -- Return result
  SELECT json_build_object(
    'points_earned', v_points_earned,
    'total_points', v_total_points,
    'current_streak', v_current_streak,
    'lives_remaining', v_lives_remaining,
    'missed_habits', v_missed_habits
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update get_group_leaderboard function
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  current_streak INTEGER,
  lives_remaining INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    gm.total_points,
    gm.current_streak,
    gm.lives_remaining,
    ROW_NUMBER() OVER (ORDER BY gm.total_points DESC, gm.current_streak DESC)::INTEGER as rank
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY gm.total_points DESC, gm.current_streak DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;