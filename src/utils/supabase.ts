import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign in to Supabase using GitHub token
export async function signInWithGitHub(token: string) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      skipBrowserRedirect: true,
      queryParams: {
        access_token: token
      }
    }
  });

  if (error) {
    console.error('Supabase auth error:', error);
    return false;
  }

  return !!data;
}

// Helper function to upload audio to Supabase storage
export async function uploadAudio(userId: string, blob: Blob): Promise<string | null> {
  try {
    const filename = `${Date.now()}.webm`;
    const filePath = getUserAudioPath(userId, filename);
    
    const { error: uploadError } = await supabase.storage
      .from('voice-notes')
      .upload(filePath, blob, {
        contentType: blob.type,
        cacheControl: '3600'
      });

    if (uploadError) throw uploadError;

    // Get the public URL
    const { data } = await supabase.storage
      .from('voice-notes')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading audio:', err);
    return null;
  }
}

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

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      // If we get a permission error, the bucket might exist but we can't list it
      if (listError.message.includes('Permission denied')) {
        console.info('Cannot list buckets, assuming voice-notes exists');
        return;
      }
      throw listError;
    }

    const voiceNotesBucket = buckets?.find(bucket => bucket.name === 'voice-notes');

    if (!voiceNotesBucket) {
      console.info('Creating voice-notes bucket...');
      const { error: createError } = await supabase.storage.createBucket('voice-notes', {
        public: false, // Keep private, we'll use RLS policies
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg']
      });

      if (createError) {
        // If bucket already exists or we don't have permission, that's okay
        if (!createError.message.includes('Permission denied') && 
            !createError.message.includes('already exists')) {
          throw createError;
        }
      }
    }

    // Test bucket access by trying to list files
    const { error: testError } = await supabase.storage
      .from('voice-notes')
      .list(user.id); // List files in user's directory

    if (testError && !testError.message.includes('Permission denied')) {
      console.warn('Storage test failed:', testError.message);
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