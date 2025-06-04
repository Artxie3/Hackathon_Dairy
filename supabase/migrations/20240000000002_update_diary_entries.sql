-- Add missing columns
ALTER TABLE public.diary_entries
ADD COLUMN IF NOT EXISTS commit_message text,
ADD COLUMN IF NOT EXISTS images text[];

-- Make created_at and updated_at NOT NULL if they aren't already
ALTER TABLE public.diary_entries
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_diary_entries_updated_at ON public.diary_entries;
CREATE TRIGGER update_diary_entries_updated_at
    BEFORE UPDATE ON public.diary_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS if not already enabled
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own entries" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can create entries" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON public.diary_entries;
DROP POLICY IF EXISTS "Users can delete their own entries" ON public.diary_entries;

-- Create policies with proper type casting
CREATE POLICY "Users can view their own entries"
    ON public.diary_entries
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create entries"
    ON public.diary_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own entries"
    ON public.diary_entries
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own entries"
    ON public.diary_entries
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON public.diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON public.diary_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_diary_entries_commit_hash ON public.diary_entries(commit_hash); 

-- Proving new commit