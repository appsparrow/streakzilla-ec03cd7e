-- Add email column to profiles table for convenience
-- This duplicates auth.users.email but makes queries easier

ALTER TABLE public.profiles 
ADD COLUMN email TEXT;

-- Create index for email lookups
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Update existing profiles with email from auth.users
UPDATE public.profiles 
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id;

-- Update the profile creation trigger to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, display_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'display_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
