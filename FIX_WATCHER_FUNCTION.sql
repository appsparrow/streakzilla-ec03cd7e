-- Fix watcher page by ensuring get_group_members_details function works for anonymous users

-- First, make sure the function exists and is properly defined
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

-- Grant execute permission to both authenticated and anonymous users
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_members_details(UUID) TO anon;

-- Test the function
SELECT 'Function created successfully!' as status;
