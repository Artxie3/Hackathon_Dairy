-- Enable RLS if not already enabled
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
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

-- Proving new commit