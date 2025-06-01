import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, className = '' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('AudioPlayer: Loading audio from:', src);
    setHasError(false);
    setIsLoading(true);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);

    const handleLoadedMetadata = () => {
      console.log('AudioPlayer: Metadata loaded');
      console.log('Duration:', audio.duration);
      console.log('ReadyState:', audio.readyState);
      
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setIsLoading(false);
        console.log('AudioPlayer: Duration set to:', audio.duration);
      }
    };

    const handleCanPlay = () => {
      console.log('AudioPlayer: Can play - duration:', audio.duration);
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Fallback: try to get duration during playback
      if (duration === 0 && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        console.log('AudioPlayer: Got duration during playback:', audio.duration);
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('AudioPlayer: Error loading audio:', e);
      console.error('Audio error details:', audio.error);
      setIsLoading(false);
      setHasError(true);
    };

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        console.log('AudioPlayer: Buffered:', audio.buffered.end(0));
      }
    };

    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('progress', handleProgress);

    // Force load
    audio.load();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('progress', handleProgress);
    };
  }, [src]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        
        // Try to get duration after starting playback
        setTimeout(() => {
          const audio = audioRef.current;
          if (audio && duration === 0 && audio.duration && isFinite(audio.duration)) {
            console.log('AudioPlayer: Got duration after play start:', audio.duration);
            setDuration(audio.duration);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    
    const newMutedState = !isMuted;
    audioRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || !duration) return;

    const progressBar = progressBarRef.current;
    const rect = progressBar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, x / width));
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time) || time < 0) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className={`flex items-center gap-3 w-full min-w-0 ${className}`}>
        <div className="text-sm text-red-500 dark:text-red-400">
          Audio failed to load
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 w-full min-w-0 ${className}`}>
      <audio 
        ref={audioRef} 
        src={src} 
        preload="metadata"
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading && duration === 0 ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-gray-600"></div>
        ) : isPlaying ? (
          <Pause size={18} />
        ) : (
          <Play size={18} />
        )}
      </button>

      {/* Progress Bar Container */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* Time Display */}
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
          {formatTime(currentTime)}
        </span>

        {/* Progress Bar */}
        <div 
          ref={progressBarRef}
          className="flex-1 relative h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full cursor-pointer hover:h-2 transition-all duration-150"
          onClick={handleProgressClick}
        >
          {/* Progress Fill */}
          <div 
            className="absolute h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-100 ease-out"
            style={{ 
              width: `${Math.min(100, Math.max(0, progressPercentage))}%`,
              transition: isPlaying ? 'none' : 'width 0.1s ease-out'
            }}
          />
          
          {/* Progress Thumb */}
          {progressPercentage > 0 && (
            <div 
              className="absolute w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full transform -translate-y-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-150"
              style={{ 
                left: `${Math.min(100, Math.max(0, progressPercentage))}%`,
                top: '50%'
              }}
            />
          )}
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap">
          {duration > 0 ? formatTime(duration) : '--:--'}
        </span>
      </div>

      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className="flex-shrink-0 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>
    </div>
  );
}; 