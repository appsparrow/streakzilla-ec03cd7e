-- OPTION 1: If email column doesn't exist yet, add it first
-- ALTER TABLE public.profiles ADD COLUMN email TEXT;

-- OPTION 2: Fix your profile with email included
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

-- Check if it worked
SELECT id, full_name, display_name, email FROM profiles;
