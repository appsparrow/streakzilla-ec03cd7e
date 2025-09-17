-- Fix the get_user_checkin_history function to return the expected format
-- The frontend expects: checkin_date (DATE) and logged (BOOLEAN)

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_checkin_history(UUID, UUID, INTEGER) TO authenticated;
