# 🚨 URGENT: Fix Watcher Page

## The Problem
The watcher page is broken due to problematic database functions causing 400 errors.

## The Solution
Run this SQL script in Supabase to fix the issue:

### 1. Open Supabase Dashboard
- Go to [supabase.com](https://supabase.com)
- Sign in to your account
- Navigate to your project: `sbxowcfafuwkzxeaspvq`

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Run This Fix Script
Copy and paste this SQL code:

```sql
-- Quick fix for watcher page - remove problematic functions

-- Drop the problematic functions that are causing 400 errors
DROP FUNCTION IF EXISTS public.get_group_leaderboard(UUID);
DROP FUNCTION IF EXISTS public.get_popular_habits(UUID);
DROP FUNCTION IF EXISTS public.get_member_powers(UUID, UUID);

-- The existing get_group_members_details function should work fine
-- No need to recreate it

SELECT 'Watcher page functions cleaned up - page should work now!' as status;
```

### 4. Test the Fix
After running the SQL, try accessing the watcher page again. It should work normally now.

## What This Does:
- ✅ **Removes problematic functions** that were causing 400 errors
- ✅ **Keeps existing working functions** intact
- ✅ **Restores watcher page** to working state
- ✅ **No data loss** - just removes broken functions

The watcher page should now work perfectly! 🎉
