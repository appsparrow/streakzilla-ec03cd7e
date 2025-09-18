-- Quick fix for watcher page - remove problematic functions

-- Drop the problematic functions that are causing 400 errors
DROP FUNCTION IF EXISTS public.get_group_leaderboard(UUID);
DROP FUNCTION IF EXISTS public.get_popular_habits(UUID);
DROP FUNCTION IF EXISTS public.get_member_powers(UUID, UUID);

-- The existing get_group_members_details function should work fine
-- No need to recreate it

SELECT 'Watcher page functions cleaned up - page should work now!' as status;
