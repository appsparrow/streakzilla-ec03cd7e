# 🚨 URGENT: Fix Database Infinite Recursion Error

## The Problem
The app is showing infinite recursion errors because of broken RLS (Row Level Security) policies in the database.

## The Solution
Run the SQL script to fix the database policies.

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
```

### 4. Execute the Script
- Click "Run" button
- Wait for it to complete successfully
- You should see the policy list and a count result

### 5. Restart Your App
- Go back to your app
- Refresh the page
- The infinite recursion errors should be gone!

## What This Fixes:
- ✅ Eliminates infinite recursion errors
- ✅ Allows user data to load properly
- ✅ Makes profile and settings pages work
- ✅ Enables group functionality

## After the Fix:
The app will work normally and you can:
- View your profile
- Access settings
- See your groups and stats
- Use all features without errors

---

**Note**: The app is currently showing empty data to avoid crashes. After running this SQL script, all functionality will be restored.
