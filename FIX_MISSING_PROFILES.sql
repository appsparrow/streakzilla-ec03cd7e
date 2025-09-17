-- FIX MISSING PROFILES SCRIPT
-- This script recreates profiles for auth users who lost their profiles
-- Run this after accidentally deleting profiles

-- Create profiles for any auth users who don't have profiles
INSERT INTO profiles (
  id,
  full_name,
  display_name,
  email,
  max_groups,
  created_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
  COALESCE(au.raw_user_meta_data->>'display_name', 'User') as display_name,
  au.email,
  1 as max_groups,  -- Default free plan
  NOW() as created_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
AND au.email_confirmed_at IS NOT NULL;

-- Verify the fix
SELECT 
  'auth_users' as table_name,
  COUNT(*) as total_count
FROM auth.users
WHERE email_confirmed_at IS NOT NULL
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_count
FROM profiles
UNION ALL
SELECT 
  'missing_profiles' as table_name,
  COUNT(*) as total_count
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
AND au.email_confirmed_at IS NOT NULL;

-- Show created profiles
SELECT 
  p.id,
  p.full_name,
  p.display_name,
  p.email,
  p.max_groups,
  'Profile restored' as status
FROM profiles p
WHERE p.created_at > NOW() - INTERVAL '1 minute';

NOTIFY profile_fix_complete, 'Missing profiles have been restored for all authenticated users';
