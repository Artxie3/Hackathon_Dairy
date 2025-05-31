import React, { useState, useRef } from 'react';
import { Mic, Square, Loader } from 'lucide-react';
import { supabase } from '../utils/supabase';

interface VoiceRecorderProps {
  onRecordingComplete: (url: string) => void;
  onError: (error: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await uploadAudio(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      onError('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const uploadAudio = async (audioBlob: Blob) => {
    try {
      setIsUploading(true);
      
      // Generate a unique filename
      const filename = `audio-${Date.now()}.webm`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-notes')
        .upload(filename, audioBlob);

      if (error) throw error;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(filename);

      onRecordingComplete(publicUrl);
    } catch (err) {
      console.error('Error uploading audio:', err);
      onError('Failed to upload audio recording.');
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
        >
          <Mic size={20} />
        </button>
      ) : (
        <button
          onClick={stopRecording}
          className="p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors"
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