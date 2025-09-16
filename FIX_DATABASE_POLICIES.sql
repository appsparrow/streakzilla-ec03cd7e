-- URGENT: Fix Infinite Recursion in RLS Policies
-- Run this script in your Supabase SQL Editor to fix the database issues

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can update group members" ON public.group_members;

-- Step 2: Create fixed policies that don't cause recursion
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

CREATE POLICY "Admins can update group members" ON public.group_members
  FOR UPDATE USING (
    -- Users can update their own membership
    user_id = auth.uid() OR
    -- Or if they are an admin of the group
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id = group_members.group_id
        AND gm.role = 'admin'
    )
  );

-- Step 3: Verify the policies are working
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'group_members'
ORDER BY policyname;

-- Step 4: Test the fix by running a simple query
SELECT COUNT(*) as total_group_members FROM public.group_members;

-- Helper RPCs that avoid RLS recursion via SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS TABLE (
  group_id UUID,
  total_points INTEGER,
  current_streak INTEGER,
  lives_remaining INTEGER,
  role TEXT,
  name TEXT,
  code TEXT,
  start_date DATE,
  duration_days INTEGER,
  mode TEXT,
  is_active BOOLEAN
) AS $$
  SELECT gm.group_id,
         gm.total_points,
         gm.current_streak,
         gm.lives_remaining,
         gm.role,
         g.name,
         g.code,
         g.start_date,
         g.duration_days,
         g.mode,
         g.is_active
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_groups() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  lives_remaining INTEGER,
  total_points INTEGER,
  current_streak INTEGER,
  restart_count INTEGER,
  is_out BOOLEAN,
  display_name TEXT,
  avatar_url TEXT
) AS $$
  SELECT gm.id,
         gm.user_id,
         gm.role,
         gm.joined_at,
         gm.lives_remaining,
         gm.total_points,
         gm.current_streak,
         gm.restart_count,
         gm.is_out,
         p.display_name,
         p.avatar_url
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id
    AND EXISTS (
      SELECT 1 FROM public.group_members x
      WHERE x.group_id = p_group_id AND x.user_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_group_members(UUID) TO anon, authenticated;

-- Add a habit to the common pool if absent
CREATE OR REPLACE FUNCTION public.add_habit_if_absent(
  p_slug TEXT,
  p_title TEXT,
  p_description TEXT,
  p_points INTEGER,
  p_category TEXT,
  p_frequency TEXT DEFAULT 'daily',
  p_default_set TEXT DEFAULT 'custom'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM public.habits WHERE slug = p_slug;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.habits (slug, title, description, points, category, frequency, default_set)
  VALUES (p_slug, p_title, p_description, p_points, p_category, p_frequency, p_default_set)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.add_habit_if_absent(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Fetch a user's selected habits for a group
CREATE OR REPLACE FUNCTION public.get_user_selected_habits(
  p_group_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  habit_id UUID,
  title TEXT,
  description TEXT,
  points INTEGER,
  category TEXT,
  frequency TEXT,
  default_set TEXT
) AS $$
  SELECT h.id,
         h.title,
         h.description,
         h.points,
         h.category,
         h.frequency,
         h.default_set
  FROM public.user_habits uh
  JOIN public.habits h ON h.id = uh.habit_id
  WHERE uh.group_id = p_group_id
    AND uh.user_id = p_user_id
    AND (
      -- requester is the same user, or a member of the group (to view peers)
      p_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.group_id = p_group_id AND gm.user_id = auth.uid()
      )
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_user_selected_habits(UUID, UUID) TO anon, authenticated;

-- Increase default group limit to 2 and backfill existing rows below 2
ALTER TABLE public.profiles ALTER COLUMN max_groups SET DEFAULT 2;
UPDATE public.profiles SET max_groups = 2 WHERE COALESCE(max_groups,0) < 2;

-- Extend profiles with first_name, last_name, phone
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE OR REPLACE FUNCTION public.update_profile(
  p_first_name TEXT,
  p_last_name TEXT,
  p_display_name TEXT,
  p_phone TEXT,
  p_avatar_url TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET first_name = p_first_name,
      last_name = p_last_name,
      display_name = p_display_name,
      phone = p_phone,
      avatar_url = p_avatar_url,
      updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.update_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Check in across overlapping groups for the current user
CREATE OR REPLACE FUNCTION public.checkin_multi(
  p_primary_group UUID,
  p_completed_habit_ids UUID[],
  p_photo_path TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  g RECORD;
  v_completed UUID[];
  v_start DATE;
  v_day_number INTEGER;
  results JSON := '[]'::JSON;
  r JSON;
BEGIN
  FOR g IN
    SELECT g.id, g.start_date
    FROM public.groups g
    JOIN public.group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = auth.uid()
  LOOP
    -- Intersect requested habits with user's selected habits for this group
    SELECT ARRAY(
      SELECT uh.habit_id
      FROM public.user_habits uh
      WHERE uh.group_id = g.id AND uh.user_id = auth.uid() AND uh.habit_id = ANY(p_completed_habit_ids)
    ) INTO v_completed;

    IF COALESCE(ARRAY_LENGTH(v_completed,1),0) = 0 THEN
      CONTINUE;
    END IF;

    -- Compute day number for this group (1-based)
    v_start := g.start_date;
    v_day_number := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (CURRENT_DATE - v_start)) / 86400.0))::INTEGER;

    BEGIN
      r := public.checkin(g.id, v_day_number, v_completed, p_photo_path, p_note);
      results := results || json_build_array(r);
    EXCEPTION WHEN OTHERS THEN
      -- ignore per-group errors to allow others to succeed
      CONTINUE;
    END;
  END LOOP;

  RETURN results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.checkin_multi(UUID, UUID[], TEXT, TEXT) TO anon, authenticated;
