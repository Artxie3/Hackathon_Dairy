-- Create the calendar_notes table
CREATE TABLE IF NOT EXISTS public.calendar_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    note_date DATE NOT NULL,
    note_type TEXT DEFAULT 'note' CHECK (note_type IN ('note', 'task', 'reminder')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_completed BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create updated_at trigger for calendar_notes
CREATE TRIGGER update_calendar_notes_updated_at
    BEFORE UPDATE ON public.calendar_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS (Row Level Security)
ALTER TABLE public.calendar_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own notes
CREATE POLICY "Users can view their own calendar notes"
    ON public.calendar_notes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to create notes
CREATE POLICY "Users can create calendar notes"
    ON public.calendar_notes
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own notes
CREATE POLICY "Users can update their own calendar notes"
    ON public.calendar_notes
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow users to delete their own notes
CREATE POLICY "Users can delete their own calendar notes"
    ON public.calendar_notes
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_notes_user_id ON public.calendar_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_note_date ON public.calendar_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_note_type ON public.calendar_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_calendar_notes_is_completed ON public.calendar_notes(is_completed);
