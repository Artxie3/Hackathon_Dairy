-- Supabase Setup for Voice Notes Storage
-- Run these commands in your Supabase SQL Editor

-- 1. Enable anonymous sign-ins (if you want to use that method)
-- Go to Authentication > Settings in your Supabase dashboard and enable "Allow anonymous sign-ins"

-- 2. Create the voice-notes storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  false,
  52428800, -- 50MB limit
  ARRAY['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/mp4']
) ON CONFLICT (id) DO NOTHING;

-- 3. Create RLS policies for the voice-notes bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'voice-notes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Enable RLS on storage.objects (should already be enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; 