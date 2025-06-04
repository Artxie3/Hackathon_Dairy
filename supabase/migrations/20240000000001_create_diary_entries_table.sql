-- Create the diary_entries table
CREATE TABLE IF NOT EXISTS public.diary_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    mood TEXT,
    commit_hash TEXT,
    commit_repo TEXT,
    commit_message TEXT,
    audio_url TEXT,
    images TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_draft BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_diary_entries_updated_at
    BEFORE UPDATE ON public.diary_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS (Row Level Security)
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own entries
CREATE POLICY "Users can view their own entries"
    ON public.diary_entries
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to create entries
CREATE POLICY "Users can create entries"
    ON public.diary_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own entries
CREATE POLICY "Users can update their own entries"
    ON public.diary_entries
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to delete their own entries
CREATE POLICY "Users can delete their own entries"
    ON public.diary_entries
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON public.diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_created_at ON public.diary_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_diary_entries_commit_hash ON public.diary_entries(commit_hash); 