import React, { useState, useRef } from 'react';
import { Mic, Square, Loader } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface VoiceRecorderProps {
  onRecordingComplete: (url: string) => void;
  onError: (error: string) => void;
}

interface StorageError {
  message?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Try to use a supported MIME type
      const mimeType = [
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
        'audio/wav'
      ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';

      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        await uploadAudio(audioBlob, mimeType);
      };

      mediaRecorder.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onError('An error occurred while recording. Please try again.');
        stopRecording();
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        onError('Microphone access was denied. Please allow microphone access and try again.');
      } else {
        onError('Failed to start recording. Please check your microphone settings.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      try {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
      setIsRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob, mimeType: string) => {
    try {
      setIsUploading(true);
      
      // Convert to MP3 if possible for better compatibility
      let uploadBlob = audioBlob;
      const fileExtension = mimeType.split('/')[1];
      
      // Generate a unique filename with timestamp and random string
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const filename = `audio-${timestamp}-${random}.${fileExtension}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(filename, uploadBlob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(filename);

      onRecordingComplete(publicUrl);
    } catch (err) {
      console.error('Error uploading audio:', err);
      const error = err as StorageError;
      if (error.message?.includes('storage/bucket-not-found')) {
        onError('Storage not configured. Please contact support.');
      } else if (error.message?.includes('storage/object-too-large')) {
        onError('Recording is too large. Please try a shorter recording.');
      } else {
        onError('Failed to upload audio recording. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          disabled={isUploading}
          title="Start recording"
        >
          <Mic size={20} />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors animate-pulse"
          title="Stop recording"
        >
          <Square size={20} />
        </button>
      )}
      
      {isUploading && (
        <div className="flex items-center text-sm text-gray-500">
          <Loader className="animate-spin mr-2" size={16} />
          Uploading...
        </div>
      )}
    </div>
  );
};