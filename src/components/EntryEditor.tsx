import React, { useState, useEffect } from 'react';
import { Save, X, Play, Pause } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { DiaryEntry } from '../utils/supabase';

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
  const [title, setTitle] = useState(entry.title || '');
  const [content, setContent] = useState(entry.content || '');
  const [mood, setMood] = useState(entry.mood || '');
  const [audioUrl, setAudioUrl] = useState(entry.audio_url || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element if we have a URL
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
    }
  }, [audioUrl]);

  const handleSave = async () => {
    await onSave({
      ...entry,
      title,
      content,
      mood,
      audio_url: audioUrl,
      is_draft: false,
    });
  };

  const handleAudioComplete = (url: string) => {
    setAudioUrl(url);
  };

  const handleAudioError = (error: string) => {
    // You might want to show this error in the UI
    console.error('Audio recording error:', error);
  };

  const toggleAudioPlayback = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
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
      <div className="flex items-center gap-4">
        <VoiceRecorder
          onRecordingComplete={handleAudioComplete}
          onError={handleAudioError}
        />

        {audioUrl && (
          <button
            onClick={toggleAudioPlayback}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play'} Recording
          </button>
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
        >
          <Save size={20} />
          Save Entry
        </button>
      </div>
    </div>
  );
}; 