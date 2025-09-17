-- STREAKZILLA DATA CLEANUP SCRIPT
-- WARNING: This will delete streak data but PRESERVE user profiles
-- Use this to clean slate while keeping user accounts intact

-- Disable RLS temporarily for cleanup
SET session_replication_role = replica;

-- Delete streak-related data in reverse dependency order
-- NOTE: We do NOT delete profiles to preserve user accounts
DELETE FROM checkins;
DELETE FROM group_members;
DELETE FROM user_habits;
DELETE FROM groups;

-- Reset user profile streak-related fields but keep profile intact
UPDATE profiles SET 
  max_groups = 1  -- Reset to default free plan
WHERE id IS NOT NULL;

-- Reset sequences (if any auto-increment IDs exist)
-- Note: UUIDs don't need sequence resets

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- Verify cleanup (should show 0 for streak data, >0 for profiles)
SELECT 
  'checkins' as table_name, 
  COUNT(*) as remaining_rows 
FROM checkins
UNION ALL
SELECT 
  'group_members' as table_name, 
  COUNT(*) as remaining_rows 
FROM group_members
UNION ALL
SELECT 
  'user_habits' as table_name, 
  COUNT(*) as remaining_rows 
FROM user_habits
UNION ALL
SELECT 
  'groups' as table_name, 
  COUNT(*) as remaining_rows 
FROM groups
UNION ALL
SELECT 
  'profiles' as table_name, 
  COUNT(*) as remaining_rows 
FROM profiles;

-- Optional: Reset auth users (BE VERY CAREFUL - this deletes actual user accounts)
-- Uncomment ONLY if you want to delete all user accounts too
-- DELETE FROM auth.users;

NOTIFY cleanup_complete, 'All Streakzilla data has been cleaned up successfully';
