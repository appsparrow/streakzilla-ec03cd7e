-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON public.group_members;

-- Create new, simpler policies
CREATE POLICY "Users can view their own memberships"
ON public.group_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create RPC function to get group details with member info
CREATE OR REPLACE FUNCTION get_group_details(p_group_id UUID, p_user_id UUID)
RETURNS TABLE (
    group_id UUID,
    name TEXT,
    code TEXT,
    start_date TIMESTAMPTZ,
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

-- Create RPC function to get group members
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
GRANT EXECUTE ON FUNCTION get_group_details(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO authenticated;
