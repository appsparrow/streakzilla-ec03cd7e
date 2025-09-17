# 🚨 SIMPLE FIX: Run This SQL Instead

## The Problem
The previous script failed because some policies already exist. This simpler version just removes the problematic ones and ensures the right ones are in place.

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to [supabase.com](https://supabase.com)
- Sign in to your account
- Navigate to your project: `sbxowcfafuwkzxeaspvq`

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run This Simple Fix Script
Copy and paste this SQL code:

```sql
-- SIMPLE FIX: Just remove the problematic policies and create the essential ones

-- Step 1: Remove ONLY the problematic recursive policies
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can update group members" ON public.group_members;

-- Step 2: Ensure we have the basic policies (these should already exist)
-- If they don't exist, create them
CREATE POLICY IF NOT EXISTS "Users can view their own memberships" ON public.group_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own membership" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own membership" ON public.group_members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own membership" ON public.group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Step 3: Create/Update the RPC functions
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
    user_lives_remaining INTEGER,
    user_joined_at TIMESTAMPTZ
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
        gm.lives_remaining as user_lives_remaining,
        gm.joined_at as user_joined_at
    FROM public.groups g
    JOIN public.group_members gm ON g.id = gm.group_id
    WHERE g.id = p_group_id AND gm.user_id = p_user_id;
END;
$$;

-- Create use_life function
CREATE OR REPLACE FUNCTION public.use_life(
  p_group_id UUID,
  p_user_id UUID,
  p_day_number INTEGER,
  p_completed_habit_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Deduct a life
  UPDATE public.group_members
  SET lives_remaining = lives_remaining - 1
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- Check if user has lives remaining
  IF (SELECT lives_remaining FROM public.group_members WHERE group_id = p_group_id AND user_id = p_user_id) < 0 THEN
    RAISE EXCEPTION 'No lives remaining';
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.use_life(UUID, UUID, INTEGER, UUID[]) TO authenticated;

-- Step 4: Verify the fix
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd
FROM pg_policies 
WHERE tablename = 'group_members'
ORDER BY policyname;
```

### 4. Test the Fix
After running this SQL, try using the app again. The infinite recursion errors should be resolved.

## What This Fix Does:
1. **Removes ONLY the problematic recursive policies** that were causing infinite loops
2. **Keeps existing good policies** (or creates them if missing)
3. **Updates RPC functions** to handle complex operations safely
4. **Maintains security** while avoiding recursion issues

This should work without any "already exists" errors!
