-- Create profiles table (mirrors auth.users with additional fields)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  subscription_status TEXT DEFAULT 'free', -- free | paid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  max_groups INTEGER DEFAULT 1 -- free=1, paid=2
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable" ON public.profiles
  FOR SELECT USING (true);

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- short join code
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date DATE,
  duration_days INTEGER, -- 15/30/45/60/75, null for open
  mode TEXT, -- hard|medium|soft|custom|open
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Groups policies
CREATE POLICY "Public groups listing" ON public.groups
  FOR SELECT USING (true);

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups" ON public.groups
  FOR UPDATE USING (auth.uid() = created_by);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- admin|member
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  lives_remaining INTEGER DEFAULT 3,
  skips_used INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  restart_count INTEGER DEFAULT 0,
  is_out BOOLEAN DEFAULT false -- for open streak elimination
);

-- Enable RLS on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Group members policies
CREATE POLICY "Users can view their own memberships" ON public.group_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Group members can view other members" ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.user_id = auth.uid() AND gm2.group_id = group_members.group_id
    )
  );

CREATE POLICY "Users can insert their own membership" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update group members" ON public.group_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.user_id = auth.uid()
        AND gm2.group_id = group_members.group_id
        AND gm2.role = 'admin'
    )
  );

-- Create habits table
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  title TEXT,
  description TEXT,
  points INTEGER,
  category TEXT,
  frequency TEXT DEFAULT 'daily', -- daily|weekly
  default_set TEXT -- hard|medium|soft|custom
);

-- Enable RLS on habits
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- Habits policy (public read)
CREATE POLICY "Anyone can view habits" ON public.habits
  FOR SELECT USING (true);

-- Create user_habits table
CREATE TABLE public.user_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES public.habits(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_habits
ALTER TABLE public.user_habits ENABLE ROW LEVEL SECURITY;

-- User habits policies
CREATE POLICY "Users can manage their own habits" ON public.user_habits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Group members can view group habits" ON public.user_habits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid() AND gm.group_id = user_habits.group_id
    )
  );

-- Create checkins table
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  day_number INTEGER, -- relative day (1..duration) or epoch days for open
  completed_habit_ids UUID[] DEFAULT '{}',
  points_earned INTEGER DEFAULT 0,
  photo_path TEXT, -- storage path
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on checkins
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Checkins policies
CREATE POLICY "Users can manage their own checkins" ON public.checkins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Group members can view group checkins" ON public.checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid() AND gm.group_id = checkins.group_id
    )
  );

-- Create chats table
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chats
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Chat policies
CREATE POLICY "Group members can view group chats" ON public.chats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid() AND gm.group_id = chats.group_id
    )
  );

CREATE POLICY "Group members can insert chats" ON public.chats
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid() AND gm.group_id = chats.group_id
    )
  );

-- Create payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  stripe_payment_id TEXT,
  amount_cents INTEGER,
  currency TEXT,
  type TEXT, -- subscription|donation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policy
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Insert default habits
INSERT INTO public.habits (slug, title, description, points, category, frequency, default_set) VALUES
-- Fitness & Health
('two-workouts', 'Two 45-min workouts', 'Complete 2 intense workout sessions, one preferably outdoors', 20, 'fitness', 'daily', 'hard'),
('one-workout', 'One 45-min workout', 'Complete one 45-minute workout session anywhere', 15, 'fitness', 'daily', 'medium'),
('move-30min', 'Move 30 min daily', 'Walk, yoga, or any movement for at least 30 minutes', 10, 'fitness', 'daily', 'soft'),
('steps-goal', 'Steps goal (8-10k)', 'Reach your daily step goal of 8,000-10,000 steps', 10, 'fitness', 'daily', 'soft'),
('mobility-stretch', 'Mobility/stretching', 'Complete 10 minutes of stretching or mobility work', 5, 'fitness', 'daily', 'soft'),

-- Diet & Nutrition
('strict-diet', 'Strict diet, no cheats', 'Follow strict diet with no cheat meals and no alcohol', 20, 'diet', 'daily', 'hard'),
('flexible-diet', 'Eat well, 1 treat/week', 'Maintain good nutrition with 1 treat meal allowed per week', 15, 'diet', 'daily', 'medium'),
('mindful-eating', 'Mindful eating', 'Practice flexible diet with mindful eating habits', 10, 'diet', 'daily', 'soft'),
('if-18hr', '18-hr intermittent fast', 'Complete an 18-hour intermittent fast', 15, 'diet', 'weekly', 'medium'),
('if-24hr', '24-hr fast', 'Complete a 24-hour fast', 20, 'diet', 'weekly', 'hard'),
('protein-target', 'Protein target (100g+)', 'Meet daily protein goal of 100g or more', 10, 'diet', 'daily', 'medium'),

-- Hydration
('gallon-water', 'Drink 1 gallon water', 'Stay fully hydrated with 3.8L of water throughout the day', 15, 'hydration', 'daily', 'hard'),
('3l-water', '3L water daily', 'Drink 3 liters of water throughout the day', 10, 'hydration', 'daily', 'medium'),
('2l-water', '2L water daily', 'Drink 2 liters of water throughout the day', 5, 'hydration', 'daily', 'soft'),

-- Learning
('read-nonfiction', 'Read 10 pages nonfiction', 'Read physical book pages to expand knowledge', 10, 'reading', 'daily', 'medium'),
('read-any', 'Read 10 pages (any book)', 'Read 10 pages from any book or audiobook', 8, 'reading', 'daily', 'soft'),
('language-learning', 'Language learning', 'Duolingo + shadowing + 20 min study session', 12, 'learning', 'daily', 'medium'),
('financial-education', 'Financial education', 'Study personal finance for 10-15 minutes daily', 10, 'learning', 'daily', 'medium'),
('creative-learning', 'Creative learning', 'Design, code, art tutorials for 20 minutes daily', 10, 'creativity', 'daily', 'medium'),

-- Mental Wellness
('meditation', 'Meditation (10 min)', 'Practice mindfulness to enhance mental clarity', 10, 'mental', 'daily', 'medium'),
('gratitude-journal', 'Gratitude journaling', 'Write down 3 things you''re grateful for today', 8, 'mental', 'daily', 'soft'),
('digital-detox', 'Digital detox', '30 min social media cap + reflection time', 12, 'mental', 'daily', 'medium'),
('no-phone-hours', 'No phone first/last hour', 'Keep phone away for first and last hour of day', 8, 'mental', 'daily', 'medium'),
('screen-free-day', 'Weekly screen-free day', 'Complete day without recreational screen time', 15, 'mental', 'weekly', 'hard'),

-- Creativity
('daily-micro-ship', 'Daily micro-ship', 'Create and share something small - sketch, code, photo, poem', 12, 'creativity', 'daily', 'medium'),
('weekly-creative', 'Weekly creative share', 'Share a creative project with others', 8, 'creativity', 'weekly', 'soft'),

-- Lifestyle & Environment
('progress-photo', 'Progress photo', 'Document your journey with a daily progress photo', 5, 'wellness', 'daily', 'soft'),
('sleep-hygiene', 'Sleep hygiene', 'Maintain consistent sleep and wake times', 8, 'lifestyle', 'daily', 'soft'),
('tidy-environment', 'Tidy 10 min reset', 'Spend 10 minutes organizing your environment', 5, 'lifestyle', 'daily', 'soft'),
('outdoor-exposure', 'Outdoor exposure', 'Get 10 minutes of sunlight and fresh air', 8, 'lifestyle', 'daily', 'soft'),
('accountability-post', 'Accountability post', 'Share a short update with your group', 5, 'lifestyle', 'daily', 'soft'),

-- Finance
('no-unplanned-buys', 'No unplanned purchases', 'Track every expense and avoid impulse buying', 12, 'finance', 'daily', 'medium'),
('weekly-savings', 'Weekly savings target', 'Meet your weekly savings goal', 15, 'finance', 'weekly', 'medium'),
('limit-dining-out', 'Limit dining out', 'Stick to planned restaurant visits only', 10, 'finance', 'daily', 'medium');

-- Create function to generate unique group codes
CREATE OR REPLACE FUNCTION public.generate_group_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.groups WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create group creation function
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
  -- Check user's group limit
  SELECT max_groups INTO v_max_groups 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  SELECT COUNT(*) INTO v_user_groups
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND g.is_active = true;
  
  IF v_user_groups >= v_max_groups THEN
    RAISE EXCEPTION 'User has reached maximum number of groups';
  END IF;
  
  -- Generate unique code
  v_code := public.generate_group_code();
  
  -- Create group
  INSERT INTO public.groups (id, name, code, start_date, duration_days, mode, created_by)
  VALUES (gen_random_uuid(), p_name, v_code, p_start_date, p_duration_days, p_mode, auth.uid())
  RETURNING id INTO v_group_id;
  
  -- Add creator as admin
  INSERT INTO public.group_members (group_id, user_id, role) 
  VALUES (v_group_id, auth.uid(), 'admin');
  
  RETURN QUERY SELECT v_group_id, v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create join group function
CREATE OR REPLACE FUNCTION public.join_group(p_code TEXT)
RETURNS UUID AS $$
DECLARE
  v_group_id UUID;
  v_user_groups INTEGER;
  v_max_groups INTEGER;
  v_is_member BOOLEAN;
BEGIN
  -- Get group ID
  SELECT id INTO v_group_id 
  FROM public.groups 
  WHERE code = p_code AND is_active = true;
  
  IF v_group_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or inactive group code';
  END IF;
  
  -- Check if already a member
  SELECT EXISTS(
    SELECT 1 FROM public.group_members 
    WHERE group_id = v_group_id AND user_id = auth.uid()
  ) INTO v_is_member;
  
  IF v_is_member THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;
  
  -- Check user's group limit
  SELECT max_groups INTO v_max_groups 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  SELECT COUNT(*) INTO v_user_groups
  FROM public.group_members gm
  JOIN public.groups g ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid() AND g.is_active = true;
  
  IF v_user_groups >= v_max_groups THEN
    RAISE EXCEPTION 'User has reached maximum number of groups';
  END IF;
  
  -- Add user to group
  INSERT INTO public.group_members (group_id, user_id, role) 
  VALUES (v_group_id, auth.uid(), 'member');
  
  RETURN v_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create check-in function
CREATE OR REPLACE FUNCTION public.checkin(
  p_group_id UUID,
  p_day_number INTEGER,
  p_completed_habit_ids UUID[],
  p_photo_path TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_points_earned INTEGER := 0;
  v_habit_points INTEGER;
  v_habit_id UUID;
  v_member_id UUID;
  v_current_streak INTEGER;
  v_lives_remaining INTEGER;
  v_total_points INTEGER;
  v_required_habits UUID[];
  v_missed_habits UUID[];
  result JSON;
BEGIN
  -- Get user's membership
  SELECT id, current_streak, lives_remaining, total_points 
  INTO v_member_id, v_current_streak, v_lives_remaining, v_total_points
  FROM public.group_members 
  WHERE group_id = p_group_id AND user_id = auth.uid();
  
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;
  
  -- Check if already checked in for this day
  IF EXISTS(
    SELECT 1 FROM public.checkins 
    WHERE user_id = auth.uid() AND group_id = p_group_id AND day_number = p_day_number
  ) THEN
    RAISE EXCEPTION 'User has already checked in for this day';
  END IF;
  
  -- Get user's required habits for this group
  SELECT ARRAY_AGG(habit_id) INTO v_required_habits
  FROM public.user_habits 
  WHERE user_id = auth.uid() AND group_id = p_group_id;
  
  -- Calculate points earned
  FOREACH v_habit_id IN ARRAY p_completed_habit_ids
  LOOP
    SELECT points INTO v_habit_points 
    FROM public.habits 
    WHERE id = v_habit_id;
    
    IF v_habit_points IS NOT NULL THEN
      v_points_earned := v_points_earned + v_habit_points;
    END IF;
  END LOOP;
  
  -- Find missed habits
  SELECT ARRAY(
    SELECT unnest(v_required_habits) 
    EXCEPT 
    SELECT unnest(p_completed_habit_ids)
  ) INTO v_missed_habits;
  
  -- Update streak and lives based on completion
  IF ARRAY_LENGTH(v_missed_habits, 1) > 0 THEN
    -- Missed some habits, lose a life
    v_lives_remaining := v_lives_remaining - 1;
    v_current_streak := 0; -- Reset streak
    
    -- If no lives left, restart
    IF v_lives_remaining <= 0 THEN
      UPDATE public.group_members 
      SET 
        lives_remaining = 3,
        restart_count = restart_count + 1,
        current_streak = 0,
        total_points = v_points_earned -- Reset points on restart
      WHERE id = v_member_id;
      
      v_total_points := v_points_earned;
      v_lives_remaining := 3;
    ELSE
      -- Just update lives and points
      UPDATE public.group_members 
      SET 
        lives_remaining = v_lives_remaining,
        current_streak = v_current_streak,
        total_points = total_points + v_points_earned
      WHERE id = v_member_id;
      
      v_total_points := v_total_points + v_points_earned;
    END IF;
  ELSE
    -- Completed all habits, continue streak
    v_current_streak := v_current_streak + 1;
    v_total_points := v_total_points + v_points_earned;
    
    UPDATE public.group_members 
    SET 
      current_streak = v_current_streak,
      total_points = v_total_points
    WHERE id = v_member_id;
  END IF;
  
  -- Insert check-in record
  INSERT INTO public.checkins (
    user_id, group_id, day_number, completed_habit_ids, 
    points_earned, photo_path, note
  ) VALUES (
    auth.uid(), p_group_id, p_day_number, p_completed_habit_ids,
    v_points_earned, p_photo_path, p_note
  );
  
  -- Return result
  SELECT json_build_object(
    'points_earned', v_points_earned,
    'total_points', v_total_points,
    'current_streak', v_current_streak,
    'lives_remaining', v_lives_remaining,
    'missed_habits', v_missed_habits
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create leaderboard function
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  total_points INTEGER,
  current_streak INTEGER,
  lives_remaining INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.avatar_url,
    gm.total_points,
    gm.current_streak,
    gm.lives_remaining,
    ROW_NUMBER() OVER (ORDER BY gm.total_points DESC, gm.current_streak DESC)::INTEGER as rank
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY gm.total_points DESC, gm.current_streak DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();