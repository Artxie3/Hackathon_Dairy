import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to wait for authentication
export async function waitForAuth(timeout = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before next check
  }
  
  return false;
}

// Initialize storage bucket for voice notes
export async function initializeStorage() {
  try {
    // Wait for auth to be ready
    const isAuthenticated = await waitForAuth();
    if (!isAuthenticated) {
      console.warn('No authenticated user found after waiting. Storage operations may fail.');
      return;
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found. Storage operations may fail.');
      return;
    }

    // Test bucket access by trying to list files
    const { error: testError } = await supabase.storage
      .from('voice-notes')
      .list(user.id); // List files in user's directory

    if (testError) {
      console.warn('Storage test failed:', testError.message);
      console.info('Make sure the voice-notes bucket exists and RLS policies are set up correctly');
    } else {
      console.log('Storage initialized successfully');
    }
  } catch (err) {
    console.error('Error initializing storage:', err);
    // Don't throw - let the app continue even if storage init fails
  }
}

// Helper function to get a storage path for a user's audio file
export function getUserAudioPath(userId: string, filename: string) {
  return `${userId}/${filename}`;
}

// Audio storage functions
export const audioStorage = {
  async uploadAudio(audioBlob: Blob, userId: string): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const extension = audioBlob.type.includes('webm') ? 'webm' : 'wav';
      const filename = `voice_note_${timestamp}.${extension}`;
      const filePath = getUserAudioPath(user.id, filename);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type,
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(filePath);

      console.log('Audio uploaded successfully:', publicUrl);
      return publicUrl;
    } catch (err) {
      console.error('Error uploading audio:', err);
      return null;
    }
  },

  async deleteAudio(audioUrl: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Extract file path from URL
      const urlParts = audioUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = getUserAudioPath(user.id, fileName);

      const { error } = await supabase.storage
        .from('voice-notes')
        .remove([filePath]);

      if (error) {
        console.error('Storage delete error:', error);
        return false;
      }

      console.log('Audio deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting audio:', err);
      return false;
    }
  },

  async listUserAudio(userId: string) {
    try {
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .list(userId);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error listing audio files:', err);
      return [];
    }
  }
};

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