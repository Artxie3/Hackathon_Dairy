import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader } from 'lucide-react';
import { supabase, getUserAudioPath } from '../utils/supabase';

interface VoiceRecorderProps {
  onRecordingComplete: (url: string) => void;
  onError: (error: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsChecking(true);
      setRecordingDuration(0);

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
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        await uploadAudio(audioBlob, mimeType);
      };

      mediaRecorder.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onError('An error occurred while recording. Please try again.');
        stopRecording();
      };

      // Start recording and duration counter
      mediaRecorder.current.start(1000);
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        onError('Microphone access was denied. Please allow microphone access and try again.');
      } else {
        onError('Failed to start recording. Please check your microphone settings.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      try {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
          durationInterval.current = null;
        }
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
      setIsRecording(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const uploadAudio = async (audioBlob: Blob, mimeType: string) => {
    try {
      setIsUploading(true);
      
      // Get the current Supabase user (anonymous user)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onError('Authentication required. Please refresh the page and try again.');
        return;
      }

      // Generate a unique filename with timestamp and random string
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const fileExtension = mimeType.split('/')[1];
      const filename = `audio-${timestamp}-${random}.${fileExtension}`;
      
      // Get the full storage path including user ID
      const storagePath = getUserAudioPath(user.id, filename);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(storagePath, audioBlob, {
          contentType: mimeType,
          cacheControl: '3600'
        });

      if (error) {
        throw error;
      }

      // Get the URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(storagePath);

      onRecordingComplete(publicUrl);
    } catch (err) {
      console.error('Error uploading audio:', err);
      if (err instanceof Error) {
        if (err.message.includes('storage/bucket-not-found')) {
          onError('Storage not configured. Please contact support.');
        } else if (err.message.includes('storage/object-too-large')) {
          onError('Recording is too large. Please try a shorter recording.');
        } else if (err.message.includes('Permission denied')) {
          onError('You do not have permission to upload audio. Please refresh and try again.');
        } else {
          onError('Failed to upload audio recording. Please try again.');
        }
      } else {
        onError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {!isRecording ? (
        <button
          onClick={startRecording}
          className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          disabled={isUploading || isChecking}
          title="Start recording"
        >
          {isChecking ? (
            <Loader className="animate-spin" size={20} />
          ) : (
            <Mic size={20} />
          )}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={stopRecording}
            className="p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors"
            title="Stop recording"
          >
            <Square size={20} />
          </button>
          
          {/* Recording Indicator */}
          <div className="flex items-center gap-3 py-1 px-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            {/* Animated Waveform */}
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 h-3 bg-red-500 dark:bg-red-400 animate-pulse"
                  style={{
                    animation: `pulse 1s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`
                  }}
                />
              ))}
            </div>
            
            {/* Duration */}
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        </div>
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