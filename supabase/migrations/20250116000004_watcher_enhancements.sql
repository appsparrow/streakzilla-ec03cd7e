-- Enhance watcher screen with popular habits and member power details

-- Function to get most popular habits in a group
CREATE OR REPLACE FUNCTION public.get_popular_habits(p_group_id UUID)
RETURNS TABLE (
    habit_id UUID,
    title TEXT,
    points INTEGER,
    category TEXT,
    selection_count INTEGER,
    members TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id as habit_id,
        h.title,
        h.points,
        h.category,
        COUNT(uh.habit_id) as selection_count,
        ARRAY_AGG(p.display_name ORDER BY p.display_name) as members
    FROM public.habits h
    JOIN public.user_habits uh ON h.id = uh.habit_id
    JOIN public.profiles p ON uh.user_id = p.id
    WHERE uh.group_id = p_group_id
    GROUP BY h.id, h.title, h.points, h.category
    ORDER BY selection_count DESC, h.title ASC
    LIMIT 10;
END;
$$;

-- Function to get member's selected habits/powers
CREATE OR REPLACE FUNCTION public.get_member_powers(p_group_id UUID, p_user_id UUID)
RETURNS TABLE (
    habit_id UUID,
    title TEXT,
    points INTEGER,
    category TEXT,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the group exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.groups 
        WHERE id = p_group_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Group not found or inactive';
    END IF;

    -- Return the member's selected habits
    RETURN QUERY
    SELECT 
        h.id as habit_id,
        h.title,
        h.points,
        h.category,
        h.description
    FROM public.user_habits uh
    JOIN public.habits h ON uh.habit_id = h.id
    WHERE uh.group_id = p_group_id AND uh.user_id = p_user_id
    ORDER BY h.points DESC, h.title ASC;
END;
$$;

-- Function to get group leaderboard with member details
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    total_points INTEGER,
    current_streak INTEGER,
    lives_remaining INTEGER,
    rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gm.user_id,
        p.display_name,
        p.avatar_url,
        gm.total_points,
        gm.current_streak,
        gm.lives_remaining,
        ROW_NUMBER() OVER (ORDER BY gm.total_points DESC) as rank
    FROM public.group_members gm
    JOIN public.profiles p ON gm.user_id = p.id
    WHERE gm.group_id = p_group_id
    ORDER BY gm.total_points DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_popular_habits(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_powers(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_leaderboard(UUID) TO anon, authenticated;
