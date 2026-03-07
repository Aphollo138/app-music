import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Song {
  id: string;
  title: string;
  filename: string;
  duration: number;
  thumbnail: string;
}

interface PlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Player({ currentSong, isPlaying, onPlayPause, onNext, onPrev }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentSong && audioRef.current) {
      // Use the static public path now
      audioRef.current.src = `/downloads/${currentSong.filename}`;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play error:", e));
      }
    }
  }, [currentSong]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Play error:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    onNext();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (audioRef.current) {
      const duration = audioRef.current.duration || 1;
      audioRef.current.currentTime = (value / 100) * duration;
      setProgress(value);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-gradient-to-b from-[#0f0f1a] to-[#000000] z-50 flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-8 pt-8">
              <button onClick={() => setIsExpanded(false)} className="text-white/70 hover:text-white p-2">
                <ChevronDown size={32} />
              </button>
              <span className="text-white/50 text-sm uppercase tracking-widest font-bold">Now Playing</span>
              <div className="w-8"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center mb-12">
              <motion.div 
                className="relative w-72 h-72 rounded-full shadow-2xl shadow-purple-900/40 border-4 border-[#2a2a2a] overflow-hidden flex items-center justify-center bg-black"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear", paused: !isPlaying }}
              >
                 <img
                    src={currentSong.thumbnail}
                    alt={currentSong.title}
                    className="w-full h-full object-cover opacity-80"
                 />
                 <div className="absolute w-24 h-24 bg-[#121212] rounded-full border-4 border-[#333] z-10"></div>
              </motion.div>
              
              <div className="mt-12 text-center w-full px-8">
                <h2 className="text-2xl font-bold text-white mb-2 line-clamp-1">{currentSong.title}</h2>
                <p className="text-purple-400 font-medium">NeonWaves</p>
              </div>
            </div>

            <div className="mb-12 w-full px-4">
              <div className="flex justify-between text-xs text-white/50 font-mono mb-3">
                <span>{audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}</span>
                <span>{formatTime(currentSong.duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/50"
              />
            </div>

            <div className="flex justify-between items-center px-8 mb-12">
              <button onClick={onPrev} className="text-white/70 hover:text-white transition-transform active:scale-90">
                <SkipBack size={36} />
              </button>
              <button
                onClick={onPlayPause}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-700 flex items-center justify-center shadow-xl shadow-purple-600/30 transition-transform active:scale-95 border border-white/10"
              >
                {isPlaying ? <Pause size={40} fill="white" /> : <Play size={40} fill="white" className="ml-2" />}
              </button>
              <button onClick={onNext} className="text-white/70 hover:text-white transition-transform active:scale-90">
                <SkipForward size={36} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="fixed bottom-0 left-0 right-0 h-20 bg-[#181820]/95 backdrop-blur-xl border-t border-white/5 px-4 flex items-center justify-between z-40 cursor-pointer shadow-2xl"
            onClick={() => setIsExpanded(true)}
          >
            <div className="flex items-center space-x-3 overflow-hidden flex-1">
              <div className={`w-12 h-12 rounded-full overflow-hidden border border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                 <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate text-sm">{currentSong.title}</h4>
                <p className="text-xs text-purple-400 truncate">Tap to expand</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 ml-4">
              <button
                onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
              </button>
            </div>
            
            <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" style={{ width: `${progress}%` }} />
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        .animate-spin-slow {
            animation: spin 8s linear infinite;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
