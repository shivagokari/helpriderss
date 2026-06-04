-- ====================================================================
-- HELPRIDERSS SUPABASE SETUP SCRIPT
-- Run this script in your Supabase SQL Editor to add columns and configure policies.
-- ====================================================================

-- 1. Alter profiles table to add columns for document URLs
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rc_front_url TEXT,
ADD COLUMN IF NOT EXISTS rc_back_url TEXT,
ADD COLUMN IF NOT EXISTS license_front_url TEXT,
ADD COLUMN IF NOT EXISTS license_back_url TEXT;

-- 2. Recreate policies for 'Documents' bucket
-- Drop existing policies if they exist to avoid collision
DROP POLICY IF EXISTS "Allow owner select documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner insert documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner delete documents" ON storage.objects;

-- SELECT POLICY: Authenticated users can read their own files in the 'Documents' bucket
CREATE POLICY "Allow owner select documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'Documents' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- INSERT POLICY: Authenticated users can upload files to their own folder path in the 'Documents' bucket
CREATE POLICY "Allow owner insert documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Documents' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- UPDATE POLICY: Authenticated users can update files in their own folder path in the 'Documents' bucket
CREATE POLICY "Allow owner update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'Documents' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- DELETE POLICY: Authenticated users can delete files in their own folder path in the 'Documents' bucket
CREATE POLICY "Allow owner delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'Documents' AND (auth.uid()::text = (storage.foldername(name))[1]));
