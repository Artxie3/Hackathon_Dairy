-- Database setup for Hackathon Journal App
-- Run this in your Supabase SQL editor

-- Function to get current user ID (must be defined before RLS policies)
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claims', true)::json->>'user_id',
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create hackathon_entries table
CREATE TABLE IF NOT EXISTS hackathon_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  organizer TEXT DEFAULT '',
  description TEXT DEFAULT '',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'ongoing', 'completed', 'submitted')),
  devpost_url TEXT,
  project_title TEXT,
  project_description TEXT,
  project_url TEXT,
  team_members TEXT[] DEFAULT ARRAY[]::TEXT[],
  technologies TEXT[] DEFAULT ARRAY[]::TEXT[],
  prizes TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT DEFAULT '',
  timezone TEXT,
  attachments TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS hackathon_entries_user_id_idx ON hackathon_entries(user_id);
CREATE INDEX IF NOT EXISTS hackathon_entries_status_idx ON hackathon_entries(status);
CREATE INDEX IF NOT EXISTS hackathon_entries_created_at_idx ON hackathon_entries(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE hackathon_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (now that current_user_id() function exists)
-- Users can only see their own hackathon entries
CREATE POLICY "Users can view own hackathon entries" ON hackathon_entries
  FOR SELECT USING (user_id = current_user_id());

-- Users can insert their own hackathon entries
CREATE POLICY "Users can insert own hackathon entries" ON hackathon_entries
  FOR INSERT WITH CHECK (user_id = current_user_id());

-- Users can update their own hackathon entries
CREATE POLICY "Users can update own hackathon entries" ON hackathon_entries
  FOR UPDATE USING (user_id = current_user_id());

-- Users can delete their own hackathon entries
CREATE POLICY "Users can delete own hackathon entries" ON hackathon_entries
  FOR DELETE USING (user_id = current_user_id());

-- Create storage bucket for hackathon files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('hackathon-files', 'hackathon-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for hackathon files
CREATE POLICY "Users can upload hackathon files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hackathon-files' AND
    (storage.foldername(name))[1] = current_user_id()
  );

CREATE POLICY "Users can view hackathon files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hackathon-files' AND
    (storage.foldername(name))[1] = current_user_id()
  );

CREATE POLICY "Users can update hackathon files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hackathon-files' AND
    (storage.foldername(name))[1] = current_user_id()
  );

CREATE POLICY "Users can delete hackathon files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'hackathon-files' AND
    (storage.foldername(name))[1] = current_user_id()
  );

-- Update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hackathon_entries_updated_at
  BEFORE UPDATE ON hackathon_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 