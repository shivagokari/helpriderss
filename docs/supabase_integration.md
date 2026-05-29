# Supabase Integration Guide - Helpriderss Database Setup

This guide provides step-by-step instructions to connect your React frontend to your Supabase database to store user authentication and ride itinerary details.

---

## Step 1: Install the Supabase JS Client Library

In your project directory, run this command in your terminal to install the official Supabase library:

```bash
npm install @supabase/supabase-js
```

---

## Step 2: Create the Database Tables in Supabase

Open your **Supabase Dashboard**, go to the **SQL Editor**, and run the following SQL script to set up your tables:

```sql
-- 1. Create a Profiles Table to store extra user information (linked to Supabase Auth users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  mobile TEXT NOT NULL,
  name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  level TEXT DEFAULT 'Rookie Rider',
  joined_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Create a Rides Table to store biker itineraries
CREATE TABLE public.rides (
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
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Rides
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Create Policies for Rides
CREATE POLICY "Rides are viewable by everyone" ON public.rides
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert rides" ON public.rides
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update or delete their own rides" ON public.rides
  FOR ALL USING (auth.uid() = user_id);
```

---

## Step 3: Initialize the Supabase Client (`supabase.js`)

Create a helper file in your source folder (e.g., `src/utils/supabase.js`) to initialize the client:

```javascript
// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

// Retrieve these keys from your Supabase Project Settings -> API
const supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Step 4: Wire Supabase into Sign Up & Sign In (`LoginScreen.jsx`)

Here is how you update your login logic to use **Supabase Auth** (which manages accounts, verification, and passwords securely for free):

### 1. Sign Up User (Email & Mobile)
```javascript
import { supabase } from '../utils/supabase';

const handleSignUp = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  // 1. Sign up the user in Supabase Auth (saves email and password)
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: newPassword, // Entered in the final step
    options: {
      data: {
        mobile: mobileNumber, // Save mobile number in user metadata
        full_name: fullName // Save full name in user metadata
      }
    }
  });

  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }

  // 2. Insert profile record into public.profiles
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email,
      mobile: mobileNumber,
      name: fullName,
      level: 'Rookie Rider'
    });

    if (profileError) {
      console.error('Profile creation failed:', profileError.message);
    }
  }

  setLoading(false);
  completeLoginFlow(data.user, mobileNumber, fullName);
};
```

### 2. Sign In User (Email & Password)
```javascript
const handleSignIn = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: password
  });

  if (error) {
    setError(error.message);
    setLoading(false);
    return;
  }

  // Fetch their profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const userData = {
    uid: data.user.id,
    email: data.user.email,
    phone: profile?.mobile || '+91 98765 43210',
    displayName: data.user.email.split('@')[0],
    level: profile?.level || 'Rookie Rider',
    authenticated: true
  };

  setLoading(false);
  onLoginSuccess(userData);
};
```

---

## Step 5: Save and Sync Rides (`App.jsx` / `LetsRide.jsx`)

When a user creates a new itinerary, insert it directly into your Supabase database:

### 1. Saving a New Ride Itinerary
```javascript
import { supabase } from '../utils/supabase';

const handleSaveRide = async (newRideData) => {
  const { data: { user } } = await supabase.auth.getUser();

  const newRecord = {
    id: 'ride-' + Date.now(),
    user_id: user?.id,
    creator: user?.email.split('@')[0] || 'You (Host)',
    creator_phone: user?.user_metadata?.mobile || '',
    title: newRideData.title,
    route: newRideData.route,
    date: newRideData.date,
    time: newRideData.time,
    distance: newRideData.distance,
    bike_type: newRideData.bikeType,
    description: newRideData.description,
    joined_count: 1,
    join_requests: []
  };

  const { error } = await supabase
    .from('rides')
    .insert([newRecord]);

  if (error) {
    console.error('Failed to sync ride to Supabase:', error.message);
  } else {
    console.log('Ride synced successfully!');
  }
};
```

### 2. Loading Rides on Startup
```javascript
const loadRidesFromSupabase = async () => {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .order('created_at', { ascending: false });

  if (!error && data) {
    setRides(data);
  }
};
```
