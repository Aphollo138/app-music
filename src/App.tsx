import { useState, useEffect } from 'react';
import Player from './components/Player';
import MainContent from './components/MainContent';

interface Song {
  id: string;
  title: string;
  filename: string;
  duration: number;
  thumbnail: string;
  artist?: string;
  genre?: string;
}

interface Playlist {
  id: string;
  name: string;
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [isConverting, setIsConverting] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchSongs();
    fetchPlaylists();
  }, []);

  const fetchSongs = async () => {
    try {
      const res = await fetch('/api/songs');
      const data = await res.json();
      setSongs(data);
    } catch (error) {
      console.error('Failed to fetch songs:', error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      const data = await res.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const handleConvert = async (url: string) => {
    setIsConverting(true);
    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!res.ok) throw new Error('Conversion failed');
      
      const data = await res.json();
      if (data.success) {
        await fetchSongs(); // Refresh list
        // Optionally play the new song immediately
        // handlePlay(data.song);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to convert video. Please check the URL.');
    } finally {
      setIsConverting(false);
    }
  };

  const handlePlay = (song: Song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    if (!currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (!currentSong) return;
    const currentIndex = songs.findIndex(s => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
  };

  const handleCreatePlaylist = async (name: string) => {
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) fetchPlaylists();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToPlaylist = async (playlistId: string, songId: string) => {
    try {
        const res = await fetch(`/api/playlists/${playlistId}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songId }),
        });
        if (res.ok) {
            // alert('Added to playlist!'); // Optional feedback
        } else {
            const err = await res.json();
            console.error('Add to playlist failed:', err);
            
            // If foreign key constraint failed, the song might be deleted
            if (err.details && err.details.includes('FOREIGN KEY constraint failed')) {
                alert('Failed to add: Song might have been deleted. Refreshing list...');
                fetchSongs(); // Refresh automatically
            } else {
                alert(`Failed to add: ${err.error || 'Unknown error'}`);
            }
        }
    } catch (error) {
        console.error(error);
        alert('Network error adding to playlist');
    }
  };

  const handleDeleteSong = async (songId: string) => {
    try {
        // Add timestamp to bypass potential service worker caches
        const res = await fetch(`/api/songs/${songId}?t=${Date.now()}`, {
            method: 'DELETE',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (res.ok) {
            setSongs(songs.filter(s => s.id !== songId));
            if (currentSong?.id === songId) {
                setCurrentSong(null);
                setIsPlaying(false);
            }
        } else {
            const status = res.status;
            const statusText = res.statusText;
            console.error(`Delete failed: ${status} ${statusText}`);
            try {
                const err = await res.json();
                alert(`Failed to delete song: ${err.error || statusText}`);
            } catch (e) {
                alert(`Failed to delete song: ${status} ${statusText}`);
            }
        }
    } catch (error) {
        console.error('Failed to delete song:', error);
        alert('Network error deleting song');
    }
  };

  // Filter songs based on view
  const getDisplaySongs = () => {
    if (activeView.startsWith('playlist:')) {
        // In a real app, we would fetch playlist songs specifically or filter
        // For now, let's just show all songs as a placeholder or implement the fetch
        // We need to fetch playlist songs when view changes
        return songs; // Placeholder: Ideally we fetch specific songs
    }
    return songs;
  };

  const handleOpenPlaylist = (playlistId: string) => {
    setActiveView(`playlist:${playlistId}`);
  };

  const handleBackToLibrary = () => {
    setActiveView('home');
  };

  // Effect to fetch playlist songs when activeView changes
  const [displaySongs, setDisplaySongs] = useState<Song[]>([]);
  
  useEffect(() => {
    if (activeView.startsWith('playlist:')) {
        const playlistId = activeView.split(':')[1];
        fetch(`/api/playlists/${playlistId}/songs`)
            .then(res => res.json())
            .then(data => setDisplaySongs(data))
            .catch(e => console.error(e));
    } else {
        setDisplaySongs(songs);
    }
  }, [activeView, songs]);


  return (
    <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden">
      {/* Sidebar Removed for Mobile First */}
      
      <div className="flex-1 flex flex-col relative w-full max-w-md mx-auto bg-[#121212] shadow-2xl">
        <MainContent 
          songs={displaySongs}
          playlists={playlists}
          onConvert={handleConvert}
          onPlay={handlePlay}
          onAddToPlaylist={handleAddToPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
          onDeleteSong={handleDeleteSong}
          onOpenPlaylist={handleOpenPlaylist}
          onBack={handleBackToLibrary}
          isConverting={isConverting}
          activeView={activeView}
        />
        
        {currentSong && (
          <Player 
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrev={handlePrev}
          />
        )}
      </div>
    </div>
  );
}
