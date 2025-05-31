import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize storage bucket for voice notes
export async function initializeStorage() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const voiceNotesBucket = buckets?.find(bucket => bucket.name === 'voice-notes');

    if (!voiceNotesBucket) {
      // Create the bucket if it doesn't exist
      const { data, error } = await supabase.storage.createBucket('voice-notes', {
        public: true, // Allow public access to files
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg']
      });

      if (error) {
        console.error('Error creating voice-notes bucket:', error);
        throw error;
      }

      // Set up bucket policy to allow public access
      const { error: policyError } = await supabase.storage.from('voice-notes').createSignedUrl('dummy.txt', 3600);
      if (policyError && !policyError.message.includes('does not exist')) {
        console.error('Error setting bucket policy:', policyError);
      }
    }
  } catch (err) {
    console.error('Error initializing storage:', err);
  }
}

// Call initializeStorage when the app starts
initializeStorage();

// Types for our database tables
export interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: string;
  commit_hash?: string;
  commit_repo?: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  tags: string[];
}

// Helper functions for diary entries
export const diaryEntries = {
  async create(entry: Partial<DiaryEntry>) {
    const { data, error } = await supabase
      .from('diary_entries')
      .insert(entry)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<DiaryEntry>) {
    const { data, error } = await supabase
      .from('diary_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('diary_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getDraftByCommit(userId: string, commitHash: string) {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('commit_hash', commitHash)
      .eq('is_draft', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
    return data;
  }
}; 