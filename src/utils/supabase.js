import { createClient } from '@supabase/supabase-js';

// TODO: Replace these placeholder credentials with your actual project keys from Supabase:
// Project Settings (Gear icon) -> API -> Project URL and Project API Key (anon / public)
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_PUBLIC_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
