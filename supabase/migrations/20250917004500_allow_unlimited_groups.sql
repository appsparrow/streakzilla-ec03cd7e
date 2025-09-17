-- Allow users to join or create unlimited groups; enforce UI-level upsell for plans

-- Relax create_group limit check: treat NULL max_groups as unlimited
CREATE OR REPLACE FUNCTION public.create_group(
  p_name TEXT,
  p_start_date DATE,
  p_duration_days INTEGER,
  p_mode TEXT
) RETURNS TABLE (group_id UUID, join_code TEXT) AS $$
DECLARE
  v_group_id UUID;
  v_code TEXT;
  v_user_groups INTEGER;
  v_max_groups INTEGER;
BEGIN
  SELECT max_groups INTO v_max_groups FROM public.profiles WHERE id = auth.uid();
  SELECT COUNT(*) INTO v_user_groups
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND g.is_active = true;

  IF v_max_groups IS NOT NULL AND v_user_groups >= v_max_groups THEN
    RAISE EXCEPTION 'User has reached maximum number of groups';
  END IF;

  v_code := public.generate_group_code();

  INSERT INTO public.groups (id, name, code, start_date, duration_days, mode, created_by)
  VALUES (gen_random_uuid(), p_name, v_code, p_start_date, p_duration_days, p_mode, auth.uid())
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role) VALUES (v_group_id, auth.uid(), 'admin');
  RETURN QUERY SELECT v_group_id, v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Relax join_group limit check similarly
CREATE OR REPLACE FUNCTION public.join_group(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_user_groups INTEGER;
  v_max_groups INTEGER;
  v_is_member BOOLEAN;
BEGIN
  SELECT id INTO v_group_id FROM public.groups WHERE code = p_code AND is_active = true;
  IF v_group_id IS NULL THEN RAISE EXCEPTION 'Invalid or inactive group code'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.group_members WHERE group_id = v_group_id AND user_id = auth.uid()) INTO v_is_member;
  IF v_is_member THEN RAISE EXCEPTION 'User is already a member of this group'; END IF;

  SELECT max_groups INTO v_max_groups FROM public.profiles WHERE id = auth.uid();
  SELECT COUNT(*) INTO v_user_groups
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND g.is_active = true;

  IF v_max_groups IS NOT NULL AND v_user_groups >= v_max_groups THEN
    RAISE EXCEPTION 'User has reached maximum number of groups';
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role) VALUES (v_group_id, auth.uid(), 'member');
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

