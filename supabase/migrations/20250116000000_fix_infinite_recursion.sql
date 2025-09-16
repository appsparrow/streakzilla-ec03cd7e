-- Fix infinite recursion in group_members RLS policies

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can view group members if they are members of that group
CREATE POLICY "Group members can view other members" ON public.group_members
  FOR SELECT USING (
    -- Check if the current user is a member of the same group
    user_id = auth.uid() OR
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
