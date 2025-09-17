-- Fix user_habits table to prevent duplicates and clean existing duplicates

-- First, remove duplicate entries (keep the oldest one for each user/group/habit combination)
DELETE FROM public.user_habits 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, group_id, habit_id) id
  FROM public.user_habits
  ORDER BY user_id, group_id, habit_id, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE public.user_habits 
ADD CONSTRAINT user_habits_unique_user_group_habit 
UNIQUE (user_id, group_id, habit_id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_habits_user_group 
ON public.user_habits (user_id, group_id);
