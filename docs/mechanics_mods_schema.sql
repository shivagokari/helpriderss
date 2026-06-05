-- SQL Database Setup Script for Help Riders New Features
-- Run these commands in your Supabase SQL Editor (https://supabase.com)

-- 1. Add lets_ride_status column to public.profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lets_ride_status TEXT DEFAULT 'Approved';

-- 2. Create Mechanics Table
CREATE TABLE IF NOT EXISTS public.mechanics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_name TEXT NOT NULL,
  owner_name TEXT DEFAULT '',
  phone TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  bike_brands TEXT[] DEFAULT '{}'::TEXT[],
  services TEXT[] DEFAULT '{}'::TEXT[],
  status TEXT DEFAULT 'Open', -- 'Open' | 'Closed'
  image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Mechanics
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mechanics are viewable by everyone" ON public.mechanics;
CREATE POLICY "Mechanics are viewable by everyone" ON public.mechanics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert mechanics" ON public.mechanics;
CREATE POLICY "Only admins can insert mechanics" ON public.mechanics
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );

DROP POLICY IF EXISTS "Only admins can update mechanics" ON public.mechanics;
CREATE POLICY "Only admins can update mechanics" ON public.mechanics
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );

DROP POLICY IF EXISTS "Only admins can delete mechanics" ON public.mechanics;
CREATE POLICY "Only admins can delete mechanics" ON public.mechanics
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );


-- 3. Create Mod Stores Table
CREATE TABLE IF NOT EXISTS public.mod_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  services TEXT[] DEFAULT '{}'::TEXT[],
  image TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Mod Stores
ALTER TABLE public.mod_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mod stores are viewable by everyone" ON public.mod_stores;
CREATE POLICY "Mod stores are viewable by everyone" ON public.mod_stores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert mod stores" ON public.mod_stores;
CREATE POLICY "Only admins can insert mod stores" ON public.mod_stores
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );

DROP POLICY IF EXISTS "Only admins can update mod stores" ON public.mod_stores;
CREATE POLICY "Only admins can update mod stores" ON public.mod_stores
  FOR UPDATE USING (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );

DROP POLICY IF EXISTS "Only admins can delete mod stores" ON public.mod_stores;
CREATE POLICY "Only admins can delete mod stores" ON public.mod_stores
  FOR DELETE USING (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );


-- 4. Create Reports Table (for users to report content/riders)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reported_item_id TEXT,
  reported_item_type TEXT, -- 'ride' | 'mechanic' | 'store' | 'user'
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'Pending', -- 'Pending' | 'Resolved'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can insert reports" ON public.reports;
CREATE POLICY "Anyone authenticated can insert reports" ON public.reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can select/update/delete reports" ON public.reports;
CREATE POLICY "Only admins can select/update/delete reports" ON public.reports
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'admin@helpriderss.com' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.level = 'System Administrator')
  );


-- 5. Create Notifications Table (for in-app broadcasts & notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means global broadcast
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'general', -- 'mechanic' | 'store' | 'ride_approved' | 'ride_rejected' | 'account'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Anyone can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
