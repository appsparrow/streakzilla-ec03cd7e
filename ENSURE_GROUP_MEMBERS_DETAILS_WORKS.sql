-- Ensure get_group_members_details function works properly for leaderboard
-- This function is used by both GroupDashboard and Leaderboard components

-- Drop and recreate the function to ensure it's working
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO anon;

-- Also ensure the RLS policy allows group members to see each other
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;

CREATE POLICY "Group members can view other members" ON public.group_members
  FOR SELECT USING (
    -- Users can always view their own memberships
    user_id = auth.uid() OR
    -- Users can view other members if they are members of the same group
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid() 
        AND gm.group_id = group_members.group_id
    )
  );

SELECT 'get_group_members_details function ensured to work properly!' as status;
