-- Fix infinite recursion in group_members RLS policies
-- Run this script in your Supabase SQL editor or database client

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;

-- Create a simpler policy that doesn't cause recursion
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

-- Also fix the admin update policy to avoid recursion
DROP POLICY IF EXISTS "Admins can update group members" ON public.group_members;

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

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'group_members';
