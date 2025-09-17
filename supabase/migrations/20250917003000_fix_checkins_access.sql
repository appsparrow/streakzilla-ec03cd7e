-- Fix infinite recursion by creating a proper policy for checkins access
-- The issue is that checkins table needs to access group_members, but group_members policy causes recursion

-- First, let's ensure we have a proper checkins table policy
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Group members can view checkins" ON public.checkins;

-- Create a simple policy for checkins that doesn't cause recursion
CREATE POLICY "Users can view their own checkins" ON public.checkins
  FOR SELECT USING (auth.uid() = user_id);

-- Create a policy for group members to view checkins in their groups
-- This uses a direct join approach to avoid recursion
CREATE POLICY "Group members can view checkins" ON public.checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid() 
        AND gm.group_id = checkins.group_id
    )
  );

-- Also ensure users can insert their own checkins
CREATE POLICY "Users can insert their own checkins" ON public.checkins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a function to get checkin history that bypasses RLS issues
CREATE OR REPLACE FUNCTION get_user_checkin_history(
  p_group_id UUID,
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  day_number INTEGER,
  logged BOOLEAN,
  checkin_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE;
BEGIN
  -- Calculate start date
  start_date := CURRENT_DATE - INTERVAL '1 day' * p_days_back;
  
  RETURN QUERY
  SELECT 
    c.day_number,
    CASE WHEN c.id IS NOT NULL THEN true ELSE false END as logged,
    (CURRENT_DATE - INTERVAL '1 day' * (p_days_back - generate_series(0, p_days_back - 1)))::DATE as checkin_date
  FROM generate_series(0, p_days_back - 1) as day_offset
  LEFT JOIN public.checkins c ON 
    c.group_id = p_group_id 
    AND c.user_id = p_user_id
    AND c.day_number = (
      SELECT EXTRACT(DAY FROM AGE(CURRENT_DATE - INTERVAL '1 day' * day_offset, g.start_date))::INTEGER + 1
      FROM public.groups g 
      WHERE g.id = p_group_id
    )
  ORDER BY day_offset DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_checkin_history(UUID, UUID, INTEGER) TO authenticated;
