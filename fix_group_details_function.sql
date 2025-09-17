-- Fix the get_group_details function to match the actual database schema
-- The start_date column in groups table is DATE, not TIMESTAMPTZ

DROP FUNCTION IF EXISTS public.get_group_details(UUID, UUID);

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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_group_details(UUID, UUID) TO authenticated;
