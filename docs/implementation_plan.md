# Implementation Plan — Supabase Database Migration & Social Features Setup

This plan details the migration of user profiles, unique rider IDs, friends, blocking, chat messages, and developer contacts from `localStorage` to **Supabase**. It also includes a Postgres setup script to automatically create all missing tables, columns, and Row Level Security (RLS) policies.

---

## User Review Required

> [!IMPORTANT]
> **Database Credentials Needed**  
> To set up the database tables and columns ourselves (without you needing to copy-paste anything), we need either:
> 1. Your **Supabase Database Password** (set when you created the project), OR
> 2. Your project's **Service Role Key** (from Supabase Dashboard -> Project Settings -> API -> `service_role` secret token).
>
> If you can provide either of these in the chat, we will run the setup script automatically.
> Alternatively, you can copy the SQL script below and paste it into your **Supabase Dashboard -> SQL Editor** and click **Run**.

---

## Proposed Database SQL Schema

This SQL script creates all required tables, columns, indexes, and Row Level Security (RLS) policies.

```sql
-- 1. Create Dev Contacts Table (for Contact Developer form)
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
CREATE POLICY "select_policy" ON public.dev_contacts FOR SELECT USING (true);
CREATE POLICY "update_policy" ON public.dev_contacts FOR UPDATE USING (true);
CREATE POLICY "delete_policy" ON public.dev_contacts FOR DELETE USING (true);


-- 2. Alter profiles Table to support full name, unique ID, active bike, and referral
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unique_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_bike TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS garage JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;


-- 3. Create Friend Requests & Relationships Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'blocked'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_id, to_id)
);

-- Enable RLS on friend_requests
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their requests" ON public.friend_requests;
CREATE POLICY "Users can manage their requests" ON public.friend_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 4. Create Messages (Chat) Table
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
```

---

## Proposed frontend Changes

### 1. Database Setup Script
- **[NEW] [setup_db.js](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/setup_db.js)**: A node script using the `pg` package to connect directly to the database via PostgreSQL protocol and execute the table schema setup automatically when provided a password.

### 2. Login & Sign Up Flow
- **[MODIFY] [LoginScreen.jsx](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/src/components/LoginScreen.jsx)**:
  - When a user signs in, load their profile from Supabase and retrieve their `unique_id`.
  - If a user doesn't have a `unique_id` assigned, generate one (e.g. `HR-XXXXX`), save it to Supabase profiles, and set it in the session.
  - Insert all fields (`id`, `email`, `mobile`, `name`, `level`, `unique_id`) correctly into the `profiles` table during sign up.

### 3. Profile & Friend System Integration
- **[MODIFY] [Profile.jsx](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/src/components/Profile.jsx)**:
  - Retrieve the current user's details (`garage`, `emergency_contacts`, `unique_id`) directly from Supabase instead of `localStorage`.
  - **Search Rider**: Query Supabase `profiles` where `unique_id` matches the input.
  - **Friend Requests**: Send request by inserting into `friend_requests`. List requests by querying `friend_requests` where `to_id = auth.uid()` and status is 'pending'.
  - **Accept/Reject Request**: Update `status = 'accepted'` or delete the record.
  - **Block Rider**: Insert/update status as `'blocked'`. Filter out blocked users from any suggestions or requests.
  - **Garage & Emergency Contacts**: Sync all changes (adding/removing bikes or contacts) directly to the Supabase profiles database.
  - **Dynamic Level Calculation**: Fetch rides count and total KM from Supabase to render the rank.

### 4. Connected Chat Room
- **[MODIFY] [Profile.jsx](file:///c:/Users/ymn%20safety/OneDrive/Desktop/Anti%20grvty/bikers/src/components/Profile.jsx)**:
  - Dynamically load message history between the current user and their active chat friend from the Supabase `messages` table.
  - Listen for real-time messages using Supabase Realtime subscription so chat updates instantly.

---

## Verification Plan

### Automated Tests
- Run a node test connection script (`check_tables.js`) to verify that all tables and columns are successfully created and accessible.

### Manual Verification
- Register a new account and verify that it gets a unique `HR-XXXXX` Rider ID.
- Search for a second rider using their ID, send a friend request, accept it on the second account, and verify they are successfully connected.
- Open a chat between the two connected friends, send coordinates/toxic words/phone numbers, and verify standard filters and links render correctly.
