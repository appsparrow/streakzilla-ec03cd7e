-- QUICK PROFILE FIX
-- Run this to immediately fix your missing profile issue

INSERT INTO profiles (
  id,
  full_name,
  display_name,
  email,
  max_groups
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
  COALESCE(au.raw_user_meta_data->>'display_name', 'User') as display_name,
  au.email,
  1 as max_groups
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
AND au.email_confirmed_at IS NOT NULL;

-- Verify the fix worked
SELECT 
  'Fixed!' as status,
  COUNT(*) as profiles_created
FROM profiles p
WHERE p.created_at > NOW() - INTERVAL '1 minute';
