import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { AudioPlayer } from './AudioPlayer';
import { DiaryEntry, audioStorage } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EntryEditorProps {
  entry: Partial<DiaryEntry>;
  onSave: (entry: Partial<DiaryEntry>) => Promise<void>;
  onCancel: () => void;
}

const MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '🎉', label: 'Accomplished' },
  { emoji: '🤔', label: 'Confused' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🚀', label: 'Excited' },
  { emoji: '😌', label: 'Satisfied' },
  { emoji: '😰', label: 'Anxious' },
];

export const EntryEditor: React.FC<EntryEditorProps> = ({ entry, onSave, onCancel }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(entry.title || '');
  const [content, setContent] = useState(entry.content || '');
  const [mood, setMood] = useState(entry.mood || '');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState(entry.audio_url || '');
  const [error, setError] = useState<string | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your entry');
      return;
    }

    try {
      // Save the entry with the audio URL (either existing or newly uploaded)
      await onSave({
        ...entry,
        title: title.trim(),
        content: content.trim(),
        mood,
        audio_url: audioUrl,
        is_draft: false,
      });
      setError(null);
    } catch (err) {
      console.error('Error saving entry:', err);
      setError('Failed to save entry. Please try again.');
    }
  };

  const handleAudioComplete = async (blob: Blob) => {
    if (!user?.supabaseId) {
      setError('Please ensure you are properly authenticated to record audio');
      return;
    }

    setIsUploadingAudio(true);
    try {
      // Upload to Supabase Storage
      const uploadedUrl = await audioStorage.uploadAudio(blob, user.supabaseId);
      
      if (uploadedUrl) {
        setAudioUrl(uploadedUrl);
        setAudioBlob(blob);
        setError(null);
        console.log('Audio uploaded successfully to Supabase');
      } else {
        throw new Error('Failed to upload audio to storage');
      }
    } catch (err) {
      console.error('Error uploading audio:', err);
      setError('Failed to save audio recording. Please try again.');
      
      // Fallback to local blob URL for preview
      const localUrl = URL.createObjectURL(blob);
      setAudioUrl(localUrl);
      setAudioBlob(blob);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleAudioError = (errorMessage: string) => {
    console.error('Audio recording error:', errorMessage);
    setError(errorMessage);
  };

  const handleRemoveAudio = async () => {
    if (audioUrl && !audioUrl.startsWith('blob:')) {
      // If it's a Supabase URL, delete from storage
      try {
        await audioStorage.deleteAudio(audioUrl);
      } catch (err) {
        console.error('Error deleting audio from storage:', err);
      }
    } else if (audioUrl.startsWith('blob:')) {
      // If it's a local blob URL, revoke it
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioUrl('');
    setAudioBlob(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      {error && (
        <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Entry title"
        className="w-full px-4 py-2 text-lg font-semibold bg-transparent border-b-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none"
      />

      {/* Mood Selection */}
      <div className="flex flex-wrap gap-3">
        {MOODS.map(({ emoji, label }) => (
          <button
            key={emoji}
            onClick={() => setMood(emoji)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
              mood === emoji
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="text-xl">{emoji}</span>
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your thoughts..."
        rows={6}
        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
      />

      {/* Voice Note */}
      <div>
        <div className="flex items-center gap-4">
          <VoiceRecorder
            onRecordingComplete={handleAudioComplete}
            onError={handleAudioError}
          />
          {audioUrl && (
            <button
              onClick={handleRemoveAudio}
              className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
            >
              Remove Recording
            </button>
          )}
          {isUploadingAudio && (
            <span className="text-sm text-blue-500 dark:text-blue-400">
              Uploading audio...
            </span>
          )}
        </div>

        {audioUrl && (
          <AudioPlayer src={audioUrl} className="mt-2" />
        )}
      </div>

      {/* Commit Info */}
      {entry.commit_hash && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Commit: {entry.commit_hash.substring(0, 7)}</p>
          <p>Repository: {entry.commit_repo}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <X size={20} />
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          disabled={isUploadingAudio}
        >
          <Save size={20} />
          Save Entry
        </button>
      </div>
    </div>
  );
}; 