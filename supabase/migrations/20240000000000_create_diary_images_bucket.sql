-- Create the diary-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('diary-images', 'diary-images', true);

-- Allow public access to images (read-only)
CREATE POLICY "Give public access to diary-images" ON storage.objects
FOR SELECT
USING (bucket_id = 'diary-images');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'diary-images' AND
    (storage.foldername(name))[1] = 'images'
);

-- Allow users to update their own images
CREATE POLICY "Allow users to update their own images" ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'diary-images' AND
    owner = auth.uid()
);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own images" ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'diary-images' AND
    owner = auth.uid()
);

-- Set up file size limits and allowed MIME types
UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ]
WHERE id = 'diary-images'; 