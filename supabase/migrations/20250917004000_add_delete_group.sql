-- Securely delete a group (admin or creator only)
CREATE OR REPLACE FUNCTION public.delete_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
  v_is_admin BOOLEAN := false;
  v_is_creator BOOLEAN := false;
BEGIN
  -- Check admin membership
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
  ) INTO v_is_admin;

  -- Check creator
  SELECT EXISTS (
    SELECT 1
    FROM public.groups g
    WHERE g.id = p_group_id AND g.created_by = auth.uid()
  ) INTO v_is_creator;

  IF NOT (v_is_admin OR v_is_creator) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Delete the group (FKs should cascade)
  DELETE FROM public.groups WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_group(UUID) TO authenticated;

