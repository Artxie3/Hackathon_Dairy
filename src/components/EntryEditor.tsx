import React, { useState, useCallback } from 'react';
import { Save, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';
import { AudioPlayer } from './AudioPlayer';
import { ImageViewer } from './ImageViewer';
import { DiaryEntry } from '../utils/supabase';
import { uploadImage } from '../utils/supabase';

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
  const [images, setImages] = useState<string[]>(entry.images || []);
  const [error, setError] = useState<string | null>(null);

  // Image viewer state
  const [imageViewerState, setImageViewerState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
    title?: string;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
    title: ''
  });

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const imageUrl = await uploadImage(file);
          setImages(prev => [...prev, imageUrl]);
          setError(null);
        } catch (err) {
          console.error('Error uploading image:', err);
          setError('Failed to upload image. Please try again.');
        }
      }
    }
  }, []);

  const handleRemoveImage = (imageUrl: string) => {
    setImages(prev => prev.filter(url => url !== imageUrl));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your entry');
      return;
    }

    try {
      await onSave({
        ...entry,
        title: title.trim(),
        content: content.trim(),
        mood,
        audio_url: audioUrl,
        images,
        is_draft: false,
      });
      setError(null);
    } catch (err) {
      console.error('Error saving entry:', err);
      setError('Failed to save entry. Please try again.');
    }
  };

  const handleAudioComplete = (url: string) => {
    setAudioUrl(url);
    setError(null);
  };

  const handleAudioError = (errorMessage: string) => {
    console.error('Audio recording error:', errorMessage);
    setError(errorMessage);
  };

  const handleRemoveAudio = () => {
    setAudioUrl('');
  };

  const handleImageClick = (imageIndex: number) => {
    setImageViewerState({
      isOpen: true,
      images: images,
      initialIndex: imageIndex,
      title: title || 'Entry Images'
    });
  };

  const closeImageViewer = () => {
    setImageViewerState(prev => ({ ...prev, isOpen: false }));
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

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onPaste={handlePaste}
        placeholder="Write your thoughts..."
        rows={6}
        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:outline-none resize-none"
      />

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <ImageIcon size={16} />
            Images
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {images.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <img
                  src={imageUrl}
                  alt={`Entry image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(index)}
                />
                <button
                  onClick={() => handleRemoveImage(imageUrl)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        >
          <Save size={20} />
          Save Entry
        </button>
      </div>

      {/* Image Viewer */}
      {imageViewerState.isOpen && (
        <ImageViewer
          images={imageViewerState.images}
          initialIndex={imageViewerState.initialIndex}
          isOpen={imageViewerState.isOpen}
          onClose={closeImageViewer}
          title={imageViewerState.title}
        />
      )}
    </div>
  );
}; 