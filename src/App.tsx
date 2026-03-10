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
  const [cachedSongIds, setCachedSongIds] = useState<string[]>([]);

  // Load local songs
  const loadLocalSongs = () => {
    const saved = localStorage.getItem('neonwaves-songs');
    if (saved) {
      setSongs(JSON.parse(saved));
    }
  };

  const RENDER_URL = 'https://app-music-1.onrender.com';

  const checkCachedSongs = async () => {
    try {
      const cache = await caches.open('musicas-cache');
      const keys = await cache.keys();
      const cachedUrls = keys.map(req => req.url);
      
      setSongs(currentSongs => {
        const cachedIds = currentSongs.filter(song => 
          cachedUrls.includes(`${RENDER_URL}/downloads/${song.filename}`)
        ).map(s => s.id);
        setCachedSongIds(cachedIds);
        return currentSongs;
      });
    } catch (error) {
      console.error('Error checking cache:', error);
    }
  };

  // Fetch initial data
  useEffect(() => {
    loadLocalSongs();
    fetchPlaylists();
  }, []);

  useEffect(() => {
    if (songs.length > 0) {
      checkCachedSongs();
    }
  }, [songs]);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`${RENDER_URL}/api/playlists`);
      const data = await res.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
    }
  };

  const salvarNaPlaylist = (song: Song) => {
    const saved = localStorage.getItem('neonwaves-songs');
    let localSongs: Song[] = saved ? JSON.parse(saved) : [];
    
    // Avoid duplicates
    if (!localSongs.find(s => s.id === song.id)) {
      localSongs = [song, ...localSongs];
      localStorage.setItem('neonwaves-songs', JSON.stringify(localSongs));
      setSongs(localSongs);
    }
  };

  const cacheAudioFile = async (song: Song) => {
    try {
      const cache = await caches.open('musicas-cache');
      const url = `${RENDER_URL}/downloads/${song.filename}`;
      
      // Fetch the file and put it in cache
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response.clone());
        checkCachedSongs(); // Update UI
      }
    } catch (error) {
      console.error('Failed to cache audio:', error);
    }
  };

  const handleConvert = async (url: string) => {
    setIsConverting(true);
    try {
      const convertUrl = `${RENDER_URL}/api/convert`;
      console.log('Enviando para:', convertUrl);
      
      const res = await fetch(convertUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      if (!res.ok) throw new Error(`Conversion failed with status: ${res.status}`);
      
      const data = await res.json();
      if (data.success) {
        salvarNaPlaylist(data.song);
        await cacheAudioFile(data.song);
      } else {
        throw new Error(data.error || 'Unknown error from server');
      }
    } catch (error: any) {
      console.error('Erro no fetch:', error);
      alert(`Failed to convert video. Error: ${error.message || error}`);
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
      const res = await fetch(`${RENDER_URL}/api/playlists`, {
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
        const res = await fetch(`${RENDER_URL}/api/playlists/${playlistId}/songs`, {
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
                alert('Failed to add: Song might have been deleted.');
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
      // Delete from local storage
      const saved = localStorage.getItem('neonwaves-songs');
      if (saved) {
        const localSongs: Song[] = JSON.parse(saved);
        const songToDelete = localSongs.find(s => s.id === songId);
        const updatedSongs = localSongs.filter(s => s.id !== songId);
        localStorage.setItem('neonwaves-songs', JSON.stringify(updatedSongs));
        setSongs(updatedSongs);

        // Delete from cache
        if (songToDelete) {
          const cache = await caches.open('musicas-cache');
          await cache.delete(`${RENDER_URL}/downloads/${songToDelete.filename}`);
          checkCachedSongs();
        }
      }

      // Optionally delete from server if it still exists
      fetch(`${RENDER_URL}/api/songs/${songId}`, { method: 'DELETE' }).catch(e => console.error(e));

      if (currentSong?.id === songId) {
        setCurrentSong(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Failed to delete song:', error);
      alert('Error deleting song');
    }
  };

  // Filter songs based on view
  const getDisplaySongs = () => {
    if (activeView.startsWith('playlist:')) {
        return displaySongs;
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
        fetch(`${RENDER_URL}/api/playlists/${playlistId}/songs`)
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
          songs={getDisplaySongs()}
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
          cachedSongIds={cachedSongIds}
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
