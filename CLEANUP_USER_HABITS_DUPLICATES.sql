-- Clean up duplicate user habits for existing users
-- This script removes duplicate habits and keeps only the oldest entry for each user/group/habit combination

-- First, let's see how many duplicates we have
SELECT 
  user_id, 
  group_id, 
  habit_id, 
  COUNT(*) as duplicate_count
FROM public.user_habits 
GROUP BY user_id, group_id, habit_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Remove duplicates (keep the oldest entry for each combination)
DELETE FROM public.user_habits 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, group_id, habit_id) id
  FROM public.user_habits
  ORDER BY user_id, group_id, habit_id, created_at ASC
);

-- Show the cleanup results
SELECT 'Cleanup completed. Remaining user habits:' as status;
SELECT COUNT(*) as total_user_habits FROM public.user_habits;

-- Show users with their habit counts
SELECT 
  p.display_name,
  g.name as group_name,
  COUNT(uh.habit_id) as habit_count,
  SUM(h.points) as total_points
FROM public.user_habits uh
JOIN public.profiles p ON p.id = uh.user_id
JOIN public.groups g ON g.id = uh.group_id
JOIN public.habits h ON h.id = uh.habit_id
GROUP BY p.display_name, g.name
ORDER BY p.display_name, g.name;
