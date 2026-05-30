-- Helpriderss Database Schema Configuration
-- Paste and run this script in your Supabase SQL Editor (https://supabase.com)

-- 1. Create Profiles Table (linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT NOT NULL,
  name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  level TEXT DEFAULT 'Rookie Rider',
  unique_id TEXT UNIQUE,
  username TEXT,
  referred_by TEXT,
  active_bike TEXT DEFAULT '',
  garage JSONB DEFAULT '[]'::jsonb,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  penalty_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  joined_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Migration: Add security_pin column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_pin TEXT DEFAULT NULL;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. Create Rides Table (to store biker itineraries)
CREATE TABLE IF NOT EXISTS public.rides (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  creator TEXT NOT NULL DEFAULT 'You (Host)',
  creator_phone TEXT DEFAULT '',
  title TEXT NOT NULL,
  route TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  distance TEXT DEFAULT '0 KM',
  bike_type TEXT DEFAULT 'All Bikes Welcome',
  description TEXT DEFAULT '',
  joined_count INTEGER DEFAULT 1,
  join_requests JSONB DEFAULT '[]'::jsonb,
  max_slots INTEGER DEFAULT 50,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Rides
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rides are viewable by everyone" ON public.rides;
CREATE POLICY "Rides are viewable by everyone" ON public.rides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert rides" ON public.rides;
CREATE POLICY "Authenticated users can insert rides" ON public.rides
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update or delete their own rides" ON public.rides;
CREATE POLICY "Users can update or delete their own rides" ON public.rides
  FOR ALL USING (auth.uid() = user_id);


-- 3. Create Dev Contacts Table (for Contact Developer form submissions)
CREATE TABLE IF NOT EXISTS public.dev_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on dev_contacts
ALTER TABLE public.dev_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_policy" ON public.dev_contacts;
DROP POLICY IF EXISTS "select_policy" ON public.dev_contacts;
DROP POLICY IF EXISTS "update_policy" ON public.dev_contacts;
DROP POLICY IF EXISTS "delete_policy" ON public.dev_contacts;

CREATE POLICY "insert_policy" ON public.dev_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "select_policy" ON public.dev_contacts FOR SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.jwt() ->> 'email' = 'admin@helpriderss.com')
);
CREATE POLICY "update_policy" ON public.dev_contacts FOR UPDATE USING (auth.jwt() ->> 'email' = 'admin@helpriderss.com');
CREATE POLICY "delete_policy" ON public.dev_contacts FOR DELETE USING (auth.jwt() ->> 'email' = 'admin@helpriderss.com');


-- 4. Create Friend Requests Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_id, to_id)
);

-- Enable RLS on friend_requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their requests" ON public.friend_requests;
CREATE POLICY "Users can manage their requests" ON public.friend_requests
  FOR ALL TO authenticated 
  USING (auth.uid() = from_id OR auth.uid() = to_id)
  WITH CHECK (auth.uid() = from_id OR auth.uid() = to_id);


-- 5. Create Messages (Chat) Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
CREATE POLICY "Users can read their own messages" ON public.messages
  FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);


-- 6. Password Recovery RPC function (with Recovery PIN verification)
DROP FUNCTION IF EXISTS public.recover_user_password(text,text,text,text);
DROP FUNCTION IF EXISTS public.recover_user_password(text,text,text);

CREATE OR REPLACE FUNCTION public.recover_user_password(
  p_email TEXT,
  p_mobile TEXT,
  p_new_password TEXT,
  p_pin TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_db_pin TEXT;
  v_clean_p_mobile TEXT;
BEGIN
  v_clean_p_mobile := regexp_replace(p_mobile, '\D', '', 'g');
  IF length(v_clean_p_mobile) = 10 THEN
    v_clean_p_mobile := '91' || v_clean_p_mobile;
  END IF;

  SELECT id, security_pin INTO v_user_id, v_db_pin
  FROM public.profiles
  WHERE LOWER(email) = LOWER(p_email)
    AND regexp_replace(mobile, '\D', '', 'g') = v_clean_p_mobile;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- If the user has configured a security recovery PIN, verify it matches
  IF v_db_pin IS NOT NULL AND COALESCE(v_db_pin, '') <> '' THEN
    IF p_pin IS NULL OR p_pin <> v_db_pin THEN
      RETURN FALSE;
    END IF;
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- 7. Automatic Profile Seeding on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_unique_id TEXT;
  v_level TEXT;
BEGIN
  IF new.email = 'admin@helpriderss.com' THEN
    v_unique_id := 'HR-ADMIN';
    v_level := 'System Administrator';
  ELSE
    -- Generate a unique 5-digit number unique_id
    v_unique_id := 'HR-' || floor(10000 + random() * 90000)::text;
    -- Make sure it is unique
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE unique_id = v_unique_id) LOOP
      v_unique_id := 'HR-' || floor(10000 + random() * 90000)::text;
    END LOOP;
    v_level := 'Rookie Rider';
  END IF;

  INSERT INTO public.profiles (id, email, mobile, name, level, unique_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'mobile', ''),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    v_level,
    v_unique_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to avoid duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

