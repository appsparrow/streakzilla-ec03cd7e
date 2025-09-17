-- Fix check-ins 500 error by creating RPC function
-- This resolves the RLS recursion issue when fetching check-ins

-- Create RPC function to get user check-ins for a specific group
CREATE OR REPLACE FUNCTION get_user_checkins(
  p_group_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  day_number INTEGER,
  points_earned INTEGER,
  photo_path TEXT,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.day_number,
    c.points_earned,
    c.photo_path,
    c.note,
    c.created_at
  FROM public.checkins c
  WHERE c.group_id = p_group_id 
    AND c.user_id = p_user_id
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_checkins(UUID, UUID, INTEGER) TO authenticated;

-- Create RPC function to get group check-ins (for feed)
CREATE OR REPLACE FUNCTION get_group_checkins(
  p_group_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  day_number INTEGER,
  points_earned INTEGER,
  photo_path TEXT,
  note TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.day_number,
    c.points_earned,
    c.photo_path,
    c.note,
    c.created_at,
    c.user_id,
    p.display_name,
    p.avatar_url
  FROM public.checkins c
  JOIN public.profiles p ON c.user_id = p.id
  WHERE c.group_id = p_group_id
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_group_checkins(UUID, INTEGER) TO authenticated;

-- Update terminology in comments
COMMENT ON FUNCTION get_user_checkins IS 'Get user check-ins for a specific streak (formerly group)';
COMMENT ON FUNCTION get_group_checkins IS 'Get all check-ins for a streak feed (formerly group)';
