import React, { useState, useEffect } from 'react';
import { Download, Search, Play, Plus, Clock, Music, MoreVertical, Download as InstallIcon, Settings, X, Disc, Mic2, ListMusic, Trash2, FileText, Copy, Check, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

interface MainContentProps {
  songs: Song[];
  playlists: Playlist[];
  onConvert: (url: string) => Promise<void>;
  onPlay: (song: Song) => void;
  onAddToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  onCreatePlaylist: (name: string) => Promise<void>;
  onDeleteSong: (songId: string) => Promise<void>;
  onEditSong: (songId: string, newTitle: string, newArtist: string) => Promise<void>;
  onOpenPlaylist: (playlistId: string) => void;
  onBack: () => void;
  isConverting: boolean;
  activeView: string;
  cachedSongIds: string[];
}

export default function MainContent({ songs, playlists, onConvert, onPlay, onAddToPlaylist, onCreatePlaylist, onDeleteSong, onEditSong, onOpenPlaylist, onBack, isConverting, activeView, cachedSongIds }: MainContentProps) {
  const [url, setUrl] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'musics' | 'playlists' | 'artists' | 'genres'>('musics');
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Modals state
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Lyrics state
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPlaylistView = activeView.startsWith('playlist:');
  const currentPlaylistId = isPlaylistView ? activeView.split(':')[1] : null;
  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url) {
      await onConvert(url);
      setUrl('');
      setShowImportModal(false);
    }
  };

  const handleOpenOptions = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSong(song);
    setShowOptionsModal(true);
  };

  const handleOptionAddToPlaylist = () => {
    setShowOptionsModal(false);
    setShowPlaylistSelector(true);
  };

  const handleOptionViewLyrics = async () => {
    if (!selectedSong) return;
    
    setShowOptionsModal(false);
    setShowLyricsModal(true);
    setIsLoadingLyrics(true);
    setLyrics(null);
    setCopied(false);

    try {
        const params = new URLSearchParams({
            title: selectedSong.title,
            artist: selectedSong.artist || ''
        });
        
        const BACKEND_URL = 'https://app-music-1.onrender.com';
        const res = await fetch(`${BACKEND_URL}/api/lyrics?${params}`);
        const data = await res.json();
        
        if (res.ok && data.lyrics) {
            setLyrics(data.lyrics);
        } else {
            setLyrics('Letra indisponível para esta faixa. 🎵');
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        setLyrics('Letra indisponível para esta faixa. 🎵');
    } finally {
        setIsLoadingLyrics(false);
    }
  };

  const handleCopyLyrics = () => {
    if (lyrics) {
        navigator.clipboard.writeText(lyrics);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectPlaylist = async (playlistId: string) => {
    if (selectedSong) {
        await onAddToPlaylist(playlistId, selectedSong.id);
        setShowPlaylistSelector(false);
        setSelectedSong(null);
    }
  };

  const handleCreatePlaylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName) {
        await onCreatePlaylist(newPlaylistName);
        setNewPlaylistName('');
        setShowCreatePlaylistModal(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getArtists = () => {
    const artists: Record<string, Song[]> = {};
    songs.forEach(song => {
        const artist = song.artist || 'Unknown Artist';
        if (!artists[artist]) artists[artist] = [];
        artists[artist].push(song);
    });
    return Object.entries(artists);
  };

  const getGenres = () => {
    const genres: Record<string, Song[]> = {};
    songs.forEach(song => {
        const genre = song.genre || 'Unknown Genre';
        if (!genres[genre]) genres[genre] = [];
        genres[genre].push(song);
    });
    return Object.entries(genres);
  };

  return (
    <div className="flex-1 bg-black overflow-y-auto pb-24 h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-4 pt-6 pb-2 bg-black z-20">
        {isPlaylistView ? (
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="text-white hover:text-gray-300">
                    <X size={24} className="rotate-45" /> {/* Using X as Back/Close for now, or ArrowLeft */}
                </button>
                <h1 className="text-xl font-bold text-white truncate max-w-[200px]">
                    {currentPlaylist?.name || 'Playlist'}
                </h1>
            </div>
        ) : (
            <h1 className="text-2xl font-bold text-white">
                Lark Player
            </h1>
        )}
        
        <div className="flex items-center gap-4">
            <button className="text-white hover:text-gray-300">
                <Search size={22} />
            </button>
            <button className="text-white hover:text-gray-300">
                <Settings size={22} />
            </button>
            {!isPlaylistView && (
                <button 
                    onClick={() => setShowImportModal(true)}
                    className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-white/10"
                >
                    Importar
                </button>
            )}
        </div>
      </div>

      {/* Install App Banner (if available) */}
      {deferredPrompt && !isPlaylistView && (
        <div className="px-4 mb-2">
            <button 
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
            >
                <InstallIcon size={14} />
                Instalar App para melhor experiência
            </button>
        </div>
      )}

      {/* Tabs - Hide in Playlist View */}
      {!isPlaylistView && (
          <div className="px-4 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex space-x-6 min-w-max">
                {(['musics', 'playlists', 'artists', 'genres'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-base font-medium pb-1 capitalize transition-colors ${
                            activeTab === tab 
                            ? 'text-white relative' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        {tab === 'musics' ? 'Músicas' : 
                         tab === 'playlists' ? 'Playlists' : 
                         tab === 'artists' ? 'Artistas' : 'Gêneros'}
                        
                        {activeTab === tab && (
                            <motion.div 
                                layoutId="activeTab"
                                className="absolute -bottom-1 left-0 right-0 h-1 bg-blue-500 rounded-full"
                            />
                        )}
                    </button>
                ))}
            </div>
          </div>
      )}

      {/* Content Area */}
      <div className="flex-1 px-4 overflow-y-auto">
        <AnimatePresence mode="wait">
            {(activeTab === 'musics' || isPlaylistView) && (
                <motion.div 
                    key="musics"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                >
                    {songs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <Music size={48} className="mb-4 opacity-20" />
                            <p>Nenhum conteúdo</p>
                            {!isPlaylistView && (
                                <button onClick={() => setShowImportModal(true)} className="mt-4 text-blue-500 text-sm">
                                    Importar música
                                </button>
                            )}
                        </div>
                    ) : (
                        songs.map((song, index) => (
                            <div
                                key={song.id}
                                className="flex items-center gap-3 p-2 active:bg-white/5 rounded-xl transition-colors"
                                onClick={() => onPlay(song)}
                            >
                                <div className="relative w-14 h-14 flex-shrink-0">
                                    <img src={song.thumbnail} alt={song.title} className="w-full h-full rounded-lg object-cover" />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="text-white font-medium truncate text-sm">{song.title}</h4>
                                        {cachedSongIds.includes(song.id) && (
                                            <Check size={14} className="text-green-500 flex-shrink-0" title="Download Concluído" />
                                        )}
                                    </div>
                                    <div className="flex items-center text-xs text-gray-500 gap-2">
                                        <span className="truncate max-w-[150px]">{song.artist || 'Unknown Artist'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newTitle = prompt('Novo título:', song.title);
                                            const newArtist = prompt('Novo artista:', song.artist || '');
                                            if (newTitle !== null && newArtist !== null) {
                                                onEditSong(song.id, newTitle, newArtist);
                                            }
                                        }}
                                        className="w-8 h-8 flex items-center justify-center bg-white/10 text-gray-300 hover:text-white rounded-full hover:bg-blue-500/50 transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Tem certeza que deseja excluir "${song.title}"?`)) {
                                                onDeleteSong(song.id);
                                            }
                                        }}
                                        className="w-8 h-8 flex items-center justify-center bg-white/10 text-gray-300 hover:text-white rounded-full hover:bg-red-500/50 transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleOpenOptions(song, e)}
                                        className="p-2 text-gray-500 hover:text-white"
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            )}

            {activeTab === 'playlists' && !isPlaylistView && (
                <motion.div 
                    key="playlists"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                >
                    <div 
                        className="flex items-center gap-4 p-2 cursor-pointer active:bg-white/5 rounded-xl"
                        onClick={() => setShowCreatePlaylistModal(true)}
                    >
                        <div className="w-16 h-16 bg-[#2a2a2a] rounded-xl flex items-center justify-center text-gray-400">
                            <Plus size={32} />
                        </div>
                        <span className="text-white font-medium">Adicionar novo</span>
                    </div>
                    
                    <div className="flex items-center gap-4 p-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-900/20">
                            <div className="text-2xl">❤️</div>
                        </div>
                        <div>
                            <span className="text-white font-medium block">Favoritos</span>
                            <span className="text-xs text-gray-500">0 músicas</span>
                        </div>
                    </div>

                    {playlists.map(playlist => (
                        <div 
                            key={playlist.id} 
                            className="flex items-center gap-4 p-2 cursor-pointer active:bg-white/5 rounded-xl"
                            onClick={() => onOpenPlaylist(playlist.id)}
                        >
                            <div className="w-16 h-16 bg-[#2a2a2a] rounded-xl flex items-center justify-center text-gray-400">
                                <ListMusic size={32} />
                            </div>
                            <div>
                                <span className="text-white font-medium block">{playlist.name}</span>
                                <span className="text-xs text-gray-500">Playlist</span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            )}

            {activeTab === 'artists' && !isPlaylistView && (
                <motion.div 
                    key="artists"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                >
                    {getArtists().map(([artist, artistSongs]) => (
                        <div key={artist} className="flex items-center gap-4 p-2">
                            <div className="w-14 h-14 bg-[#2a2a2a] rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
                                {artistSongs[0]?.thumbnail ? (
                                    <img src={artistSongs[0].thumbnail} className="w-full h-full object-cover opacity-70" />
                                ) : (
                                    <Mic2 size={24} />
                                )}
                            </div>
                            <div>
                                <span className="text-white font-medium block">{artist}</span>
                                <span className="text-xs text-gray-500">{artistSongs.length} músicas</span>
                            </div>
                        </div>
                    ))}
                    {getArtists().length === 0 && (
                        <div className="text-center py-10 text-gray-500">Nenhum artista encontrado</div>
                    )}
                </motion.div>
            )}

            {activeTab === 'genres' && !isPlaylistView && (
                <motion.div 
                    key="genres"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid grid-cols-2 gap-4 pt-2"
                >
                    {getGenres().map(([genre, genreSongs]) => (
                        <div key={genre} className="bg-[#1a1a1a] rounded-xl p-4 flex flex-col items-center justify-center aspect-square border border-white/5">
                            <Disc size={32} className="text-blue-500 mb-2" />
                            <span className="text-white font-medium text-center line-clamp-1">{genre}</span>
                            <span className="text-xs text-gray-500">{genreSongs.length} músicas</span>
                        </div>
                    ))}
                    {getGenres().length === 0 && (
                        <div className="col-span-2 text-center py-10 text-gray-500">Nenhum gênero encontrado</div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowImportModal(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-[#1e1e1e] w-full max-w-md rounded-2xl p-6 border border-white/10 shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-white">Importar do YouTube</h3>
                        <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="relative mb-6">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <Search size={20} />
                            </div>
                            <input 
                                type="text" 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="Cole o link do YouTube aqui..." 
                                className="w-full bg-[#2a2a2a] text-white pl-12 pr-4 py-4 rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                autoFocus
                            />
                        </div>
                        
                        <button 
                            type="submit"
                            disabled={isConverting || !url}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isConverting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Processando...
                                </>
                            ) : (
                                'Baixar e Converter'
                            )}
                        </button>
                    </form>
                    
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        O áudio será extraído em alta qualidade e salvo na sua biblioteca.
                    </p>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Options Modal (Action Sheet) */}
      <AnimatePresence>
        {showOptionsModal && selectedSong && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
                onClick={() => setShowOptionsModal(false)}
            >
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="bg-[#1e1e1e] w-full max-w-md rounded-t-2xl p-4 border-t border-white/10"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-6 p-2">
                        <img src={selectedSong.thumbnail} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                            <h4 className="text-white font-medium line-clamp-1">{selectedSong.title}</h4>
                            <p className="text-xs text-gray-400">{selectedSong.artist || 'Unknown Artist'}</p>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <button 
                            onClick={handleOptionAddToPlaylist}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-white transition-colors"
                        >
                            <ListMusic size={20} className="text-gray-400" />
                            Adicionar à Playlist
                        </button>
                        <button 
                            onClick={handleOptionViewLyrics}
                            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl text-white transition-colors"
                        >
                            <FileText size={20} className="text-gray-400" />
                            Ver Letra
                        </button>
                    </div>
                    
                    <button 
                        onClick={() => setShowOptionsModal(false)}
                        className="w-full mt-4 py-3 text-center text-gray-400 font-medium"
                    >
                        Cancelar
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Selector Modal */}
      <AnimatePresence>
        {showPlaylistSelector && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowPlaylistSelector(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-[#1e1e1e] w-full max-w-xs rounded-2xl p-4 border border-white/10 max-h-[80vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-lg font-bold text-white mb-4 text-center">Adicionar à Playlist</h3>
                    
                    <div className="overflow-y-auto flex-1 space-y-2 mb-4">
                        <button 
                            onClick={() => {
                                setShowPlaylistSelector(false);
                                setShowCreatePlaylistModal(true);
                            }}
                            className="w-full flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-xl text-white hover:bg-[#3a3a3a] transition-colors"
                        >
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                <Plus size={20} />
                            </div>
                            <span className="font-medium">Nova Playlist</span>
                        </button>

                        {playlists.map(playlist => (
                            <button 
                                key={playlist.id}
                                onClick={() => handleSelectPlaylist(playlist.id)}
                                className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl text-white transition-colors text-left"
                            >
                                <div className="w-10 h-10 bg-[#121212] rounded-lg flex items-center justify-center text-gray-500">
                                    <ListMusic size={18} />
                                </div>
                                <span className="font-medium truncate">{playlist.name}</span>
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => setShowPlaylistSelector(false)}
                        className="w-full py-2 text-center text-gray-400"
                    >
                        Cancelar
                    </button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Create Playlist Modal */}
      <AnimatePresence>
        {showCreatePlaylistModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowCreatePlaylistModal(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="bg-[#1e1e1e] w-full max-w-xs rounded-2xl p-6 border border-white/10"
                    onClick={e => e.stopPropagation()}
                >
                    <h3 className="text-lg font-bold text-white mb-4">Nova Playlist</h3>
                    <form onSubmit={handleCreatePlaylistSubmit}>
                        <input 
                            type="text" 
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="Nome da playlist" 
                            className="w-full bg-[#2a2a2a] text-white px-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={() => setShowCreatePlaylistModal(false)}
                                className="flex-1 py-3 text-gray-400 font-medium hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit"
                                disabled={!newPlaylistName}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                            >
                                Criar
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics Modal */}
      <AnimatePresence>
        {showLyricsModal && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col"
                onClick={() => setShowLyricsModal(false)}
            >
                <motion.div 
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    className="flex-1 flex flex-col bg-[#121212] w-full h-full overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Lyrics Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {selectedSong && (
                                <>
                                    <img src={selectedSong.thumbnail} className="w-10 h-10 rounded-lg object-cover" />
                                    <div className="min-w-0">
                                        <h3 className="text-white font-bold truncate">{selectedSong.title}</h3>
                                        <p className="text-xs text-gray-400 truncate">{selectedSong.artist || 'Unknown Artist'}</p>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleCopyLyrics}
                                className="p-2 text-gray-400 hover:text-white transition-colors relative"
                                title="Copiar letra"
                            >
                                {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                            </button>
                            <button 
                                onClick={() => setShowLyricsModal(false)}
                                className="p-2 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Lyrics Content */}
                    <div className="flex-1 overflow-y-auto p-6 text-center">
                        {isLoadingLyrics ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <p>Buscando letra...</p>
                            </div>
                        ) : lyrics === 'Letra indisponível para esta faixa. 🎵' ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                <Music size={48} className="opacity-20 mb-2" />
                                <p className="text-lg font-medium">{lyrics}</p>
                                <button 
                                    onClick={() => setShowLyricsModal(false)}
                                    className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                                >
                                    Fechar
                                </button>
                            </div>
                        ) : (
                            <div className="text-lg leading-relaxed text-gray-300 font-medium whitespace-pre-wrap pb-20">
                                {lyrics || "Nenhuma letra encontrada."}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
