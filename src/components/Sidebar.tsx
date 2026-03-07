import { Home, Music, Plus, ListMusic } from 'lucide-react';

interface SidebarProps {
  playlists: { id: string; name: string }[];
  activeView: string;
  onViewChange: (view: string) => void;
  onCreatePlaylist: () => void;
}

export default function Sidebar({ playlists, activeView, onViewChange, onCreatePlaylist }: SidebarProps) {
  return (
    <div className="w-64 bg-black h-full flex flex-col border-r border-white/10">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent mb-8">
          NeonWaves
        </h1>
        
        <nav className="space-y-4">
          <button
            onClick={() => onViewChange('home')}
            className={`flex items-center space-x-3 w-full p-2 rounded-lg transition-colors ${
              activeView === 'home' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Home size={20} />
            <span>Home</span>
          </button>
          
          <button
            onClick={() => onViewChange('library')}
            className={`flex items-center space-x-3 w-full p-2 rounded-lg transition-colors ${
              activeView === 'library' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music size={20} />
            <span>Library</span>
          </button>
        </nav>
      </div>

      <div className="mt-6 px-6 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Playlists</h2>
          <button onClick={onCreatePlaylist} className="text-gray-400 hover:text-white transition-colors">
            <Plus size={16} />
          </button>
        </div>
        
        <ul className="space-y-2">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <button
                onClick={() => onViewChange(`playlist:${playlist.id}`)}
                className={`flex items-center space-x-3 w-full p-2 rounded-lg transition-colors text-sm ${
                  activeView === `playlist:${playlist.id}` ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <ListMusic size={16} />
                <span className="truncate">{playlist.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
