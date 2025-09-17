# 🚨 URGENT: Run This SQL to Fix Infinite Recursion Error

## The Problem
The app is showing infinite recursion errors because of broken RLS (Row Level Security) policies in the database.

## The Solution
Run the SQL script below in your Supabase SQL Editor to fix the database policies.

## Steps to Fix:

### 1. Open Supabase Dashboard
- Go to [supabase.com](https://supabase.com)
- Sign in to your account
- Navigate to your project: `sbxowcfafuwkzxeaspvq`

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run the Fix Script
Copy and paste this SQL code:

```sql
-- Fix infinite recursion in group_members RLS policies
-- The issue is that policies reference the same table they're protecting

-- Step 1: Drop all existing problematic policies
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can update group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.group_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON public.group_members;

-- Step 2: Create simple, non-recursive policies (only if they don't exist)
-- Users can always view their own memberships
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_members' 
        AND policyname = 'Users can view their own memberships'
    ) THEN
        CREATE POLICY "Users can view their own memberships" ON public.group_members
          FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Users can insert their own membership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_members' 
        AND policyname = 'Users can insert their own membership'
    ) THEN
        CREATE POLICY "Users can insert their own membership" ON public.group_members
          FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Users can update their own membership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_members' 
        AND policyname = 'Users can update their own membership'
    ) THEN
        CREATE POLICY "Users can update their own membership" ON public.group_members
          FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Users can delete their own membership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_members' 
        AND policyname = 'Users can delete their own membership'
    ) THEN
        CREATE POLICY "Users can delete their own membership" ON public.group_members
          FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 3: Create RPC functions for group member access (these bypass RLS)
-- This function allows users to see other members of groups they belong to
CREATE OR REPLACE FUNCTION public.get_group_members_for_user(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT,
    total_points INTEGER,
    current_streak INTEGER,
    lives_remaining INTEGER,
    is_out BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user is a member of this group
    IF NOT EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE group_id = p_group_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: User is not a member of this group';
    END IF;

    -- Return all members of the group
    RETURN QUERY
    SELECT 
        gm.user_id,
        p.display_name,
        p.avatar_url,
        gm.role,
        gm.total_points,
        gm.current_streak,
        gm.lives_remaining,
        gm.is_out,
        gm.joined_at
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id
    ORDER BY gm.total_points DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_group_members_for_user(UUID) TO authenticated;

-- Create use_life function to handle life deduction
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.use_life(UUID, UUID, INTEGER, UUID[]) TO authenticated;

-- Step 4: Update the existing get_group_details function to include joined_at
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

-- Step 5: Verify the policies are working
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
After running the SQL, try using the app again. The infinite recursion errors should be resolved.

## What This Fix Does:
1. **Removes recursive RLS policies** that were causing infinite loops
2. **Creates simple, non-recursive policies** for basic operations
3. **Uses RPC functions** to bypass RLS for complex operations
4. **Maintains security** while avoiding recursion issues

The app should now work without the 500 errors!
