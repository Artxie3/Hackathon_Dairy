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

// Types for our database tables
export interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: string;
  commit_hash?: string;
  commit_repo?: string;
  commit_message?: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
  is_draft: boolean;
  tags: string[];
}

export interface HackathonEntry {
  id: string;
  user_id: string;
  title: string;
  organizer: string;
  description: string;
  start_date: string;
  end_date: string;
  submission_deadline: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'submitted';
  devpost_url?: string;
  project_title?: string;
  project_description?: string;
  project_url?: string;
  team_members: string[];
  technologies: string[];
  prizes: string[];
  notes: string;
  timezone?: string;
  attachments?: string[]; // URLs to uploaded files
  created_at: string;
  updated_at: string;
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

// Helper functions for hackathon entries
export const hackathonEntries = {
  async create(entry: Partial<HackathonEntry>) {
    const { data, error } = await supabase
      .from('hackathon_entries')
      .insert(entry)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<HackathonEntry>) {
    const { data, error } = await supabase
      .from('hackathon_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    // Also delete associated files if any
    const { data: hackathon } = await supabase
      .from('hackathon_entries')
      .select('attachments')
      .eq('id', id)
      .single();

    if (hackathon?.attachments?.length) {
      // Delete files from storage
      for (const attachment of hackathon.attachments) {
        try {
          const path = attachment.replace(`${supabaseUrl}/storage/v1/object/public/hackathon-files/`, '');
          await supabase.storage.from('hackathon-files').remove([path]);
        } catch (err) {
          console.warn('Failed to delete attachment:', err);
        }
      }
    }

    const { error } = await supabase
      .from('hackathon_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getByUser(userId: string) {
    const { data, error } = await supabase
      .from('hackathon_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByStatus(userId: string, status: string) {
    const { data, error } = await supabase
      .from('hackathon_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

// Initialize storage buckets for hackathon files
export async function initializeHackathonStorage() {
  try {
    // Wait for auth to be ready
    const isAuthenticated = await waitForAuth();
    if (!isAuthenticated) {
      console.warn('No authenticated user found after waiting. Hackathon storage operations may fail.');
      return;
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No authenticated user found. Hackathon storage operations may fail.');
      return;
    }

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      // If we get a permission error, the bucket might exist but we can't list it
      if (listError.message.includes('Permission denied')) {
        console.info('Cannot list buckets, assuming hackathon-files exists');
        return;
      }
      throw listError;
    }

    const hackathonFilesBucket = buckets?.find(bucket => bucket.name === 'hackathon-files');

    if (!hackathonFilesBucket) {
      console.info('Creating hackathon-files bucket...');
      const { error: createError } = await supabase.storage.createBucket('hackathon-files', {
        public: true, // Make public for easy access to attachments
        fileSizeLimit: 104857600, // 100MB limit
        allowedMimeTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
          'application/pdf',
          'text/plain', 'text/markdown',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/zip', 'application/x-rar-compressed',
          'video/mp4', 'video/webm', 'video/quicktime',
          'audio/mpeg', 'audio/wav', 'audio/ogg'
        ]
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
      .from('hackathon-files')
      .list(user.id);

    if (testError && !testError.message.includes('Permission denied')) {
      console.warn('Hackathon storage test failed:', testError.message);
    }
  } catch (err) {
    console.error('Error initializing hackathon storage:', err);
    // Don't throw - let the app continue even if storage init fails
  }
}

// Helper function to upload hackathon files
export async function uploadHackathonFile(file: File, hackathonId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Generate unique filename
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const filename = `${hackathonId}-${timestamp}.${fileExtension}`;
  const filePath = `${user.id}/${filename}`;

  const { data, error } = await supabase.storage
    .from('hackathon-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('hackathon-files')
    .getPublicUrl(filePath);

  return publicUrl;
}

// Helper function to delete hackathon file
export async function deleteHackathonFile(fileUrl: string): Promise<void> {
  try {
    const path = fileUrl.replace(`${supabaseUrl}/storage/v1/object/public/hackathon-files/`, '');
    const { error } = await supabase.storage
      .from('hackathon-files')
      .remove([path]);

    if (error) throw error;
  } catch (err) {
    console.error('Error deleting hackathon file:', err);
    throw err;
  }
}

// Initialize both storage systems when the app starts
Promise.all([initializeStorage(), initializeHackathonStorage()]); 