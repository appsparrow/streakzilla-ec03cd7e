-- Create function to handle leaving a group safely
CREATE OR REPLACE FUNCTION public.leave_group(p_group_id UUID, p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is in the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this streak';
  END IF;

  -- Check if user is admin
  SELECT role = 'admin' INTO v_is_admin
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  -- Get count of remaining members
  SELECT COUNT(*) INTO v_member_count
  FROM public.group_members
  WHERE group_id = p_group_id;

  -- If user is the last member or the only admin, archive the group
  IF v_member_count = 1 OR (v_is_admin AND (
    SELECT COUNT(*) FROM public.group_members 
    WHERE group_id = p_group_id AND role = 'admin'
  ) = 1) THEN
    UPDATE public.groups
    SET is_active = false,
        archived_at = NOW()
    WHERE id = p_group_id;
  -- If user is admin but not the last admin, transfer admin role if needed
  ELSIF v_is_admin THEN
    -- Transfer admin role to another member if this admin is leaving
    UPDATE public.group_members
    SET role = 'admin'
    WHERE group_id = p_group_id 
    AND user_id != p_user_id 
    AND role != 'admin'
    LIMIT 1;
  END IF;

  -- Remove the member
  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.leave_group(UUID, UUID) TO authenticated;
