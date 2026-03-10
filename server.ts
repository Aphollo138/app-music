import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
// @ts-ignore
import ytDlpExec from 'yt-dlp-exec';
// @ts-ignore
import ffmpegPath from 'ffmpeg-static';
import { getLyrics } from 'genius-lyrics-api';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('songs.db');
db.pragma('foreign_keys = ON'); // Enable foreign keys
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Debug logging middleware
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
});

// Health check route
app.get('/', (req, res) => {
    res.send('Server is running');
});

// Ensure downloads directory exists in public folder
// Using process.cwd() ensures it creates in the project root regardless of where the script is run from
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const DOWNLOAD_DIR = path.join(PUBLIC_DIR, 'downloads');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  console.log(`[SISTEMA] Diretório criado: ${PUBLIC_DIR}`);
}
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  console.log(`[SISTEMA] Diretório criado: ${DOWNLOAD_DIR}`);
}

// Serve public directory statically
app.use(express.static(PUBLIC_DIR));

// Database Setup
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    duration INTEGER,
    thumbnail TEXT,
    artist TEXT,
    genre TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id TEXT,
    song_id TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id),
    FOREIGN KEY(song_id) REFERENCES songs(id),
    PRIMARY KEY(playlist_id, song_id)
  );
`);

// Try to add columns if they don't exist (migration for existing dbs)
try {
  db.exec("ALTER TABLE songs ADD COLUMN artist TEXT");
} catch (e) { /* Column likely exists */ }

try {
  db.exec("ALTER TABLE songs ADD COLUMN genre TEXT");
} catch (e) { /* Column likely exists */ }


// Helper to sanitize filename
const sanitizeFilename = (name: string) => {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
};

// API Routes

// Convert YouTube to MP3
app.post('/api/convert', async (req, res) => {
  console.log('Recebi um pedido de conversão para:', req.body.url);
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    console.log(`[CONVERSÃO] Iniciando extração de metadados para: ${url}`);
    
    // Garante que a pasta downloads existe antes de cada conversão (útil para o disco efêmero do Render)
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      console.log(`[SISTEMA] Diretório recriado antes do download: ${DOWNLOAD_DIR}`);
    }

    // Get metadata first
    const rawMeta = await ytDlpExec(url, {
      dumpJson: true,
      noWarnings: true,
    });
    
    // Handle potential string output from exec
    // yt-dlp-exec might return an object directly if dumpJson is true, or stdout string
    const info = (rawMeta as any).stdout ? JSON.parse((rawMeta as any).stdout) : rawMeta;

    const title = info.title;
    const duration = info.duration;
    const thumbnail = info.thumbnail;
    // Try to get artist from metadata, fallback to uploader or channel
    const artist = info.artist || info.uploader || info.channel || 'Unknown Artist';
    // Try to get genre, fallback to categories or Unknown
    const genre = info.genre || (info.categories && info.categories.length > 0 ? info.categories[0] : 'Unknown Genre');

    console.log(`[CONVERSÃO] Metadados obtidos com sucesso. Título: "${title}"`);

    const id = uuidv4();
    
    // Sanitize title for filename
    const cleanTitle = sanitizeFilename(title);
    const filename = `${cleanTitle}.mp3`;
    // Use absolute path for output template to ensure it goes to the right place
    const outputTemplate = path.join(DOWNLOAD_DIR, `${cleanTitle}.%(ext)s`);

    console.log(`[CONVERSÃO] Iniciando download e extração de áudio para: "${title}"`);

    // Download command
    await ytDlpExec(url, {
        extractAudio: true,
        audioFormat: 'mp3',
        output: outputTemplate,
        noWarnings: true,
        ffmpegLocation: ffmpegPath || '/usr/bin/ffmpeg' // Usa o binário do ffmpeg-static dinamicamente
    });

    console.log(`[CONVERSÃO] Áudio extraído e salvo com sucesso em: ${outputTemplate}`);
    
    const stmt = db.prepare('INSERT INTO songs (id, title, filename, duration, thumbnail, artist, genre) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, title, filename, duration, thumbnail, artist, genre);

    console.log(`[CONVERSÃO] Música salva no banco de dados. Processo concluído para: "${title}"`);

    res.json({ success: true, song: { id, title, filename, duration, thumbnail, artist, genre } });

  } catch (error: any) {
    console.error('[CONVERSÃO] Erro durante o processo:', error);
    res.status(500).json({ error: 'Failed to process video', details: error.message });
  }
});

// Delete a song
app.delete('/api/songs/:id', (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Request received for song ID: ${id}`);
    
    try {
        // Get filename first (optional, just for file cleanup)
        const song = db.prepare('SELECT filename FROM songs WHERE id = ?').get(id) as { filename: string } | undefined;
        
        // Define transaction
        const deleteTransaction = db.transaction((songId) => {
            console.log(`[DELETE] Executing transaction for ${songId}`);
            db.prepare('DELETE FROM playlist_songs WHERE song_id = ?').run(songId);
            db.prepare('DELETE FROM songs WHERE id = ?').run(songId);
        });

        // Execute DB transaction first to ensure data consistency
        deleteTransaction(id);
        console.log(`[DELETE] DB transaction complete for ${id}`);

        if (song) {
            // Delete from filesystem (best effort)
            const filePath = path.join(DOWNLOAD_DIR, song.filename);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`[DELETE] File deleted: ${filePath}`);
                } else {
                    console.log(`[DELETE] File not found: ${filePath}`);
                }
            } catch (fsError) {
                console.error('[DELETE] File deletion error (ignoring):', fsError);
            }
        } else {
            console.log(`[DELETE] Song not found in DB (idempotent success): ${id}`);
        }
        
        res.json({ success: true });
    } catch (error: any) {
        console.error('[DELETE] Error:', error);
        res.status(500).json({ error: 'Failed to delete song', details: error.message });
    }
});

// Get all songs
app.get('/api/songs', (req, res) => {
  const stmt = db.prepare('SELECT * FROM songs ORDER BY created_at DESC');
  const songs = stmt.all();
  res.json(songs);
});

// Playlists
app.get('/api/playlists', (req, res) => {
    const stmt = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC');
    res.json(stmt.all());
});

app.post('/api/playlists', (req, res) => {
    const { name } = req.body;
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO playlists (id, name) VALUES (?, ?)');
    stmt.run(id, name);
    res.json({ id, name });
});

app.post('/api/playlists/:id/songs', (req, res) => {
    const { id } = req.params;
    const { songId } = req.body;
    try {
        const stmt = db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)');
        const info = stmt.run(id, songId);
        res.json({ success: true, added: info.changes > 0 });
    } catch (e: any) {
        console.error('Add to playlist error:', e);
        res.status(400).json({ error: 'Failed to add song to playlist', details: e.message });
    }
});

app.get('/api/playlists/:id/songs', (req, res) => {
    const { id } = req.params;
    const stmt = db.prepare(`
        SELECT s.* FROM songs s
        JOIN playlist_songs ps ON s.id = ps.song_id
        WHERE ps.playlist_id = ?
    `);
    res.json(stmt.all(id));
});


// Get Lyrics
app.get('/api/lyrics', async (req, res) => {
    const { title, artist } = req.query;

    if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Title is required' });
    }

    const artistName = typeof artist === 'string' ? artist : 'Unknown Artist';
    const apiKey = process.env.GENIUS_ACCESS_TOKEN;

    // Clean up title for better search results (remove .mp3, parentheses, etc)
    const cleanTitle = title.replace(/\.mp3$/i, '').replace(/\(.*\)/g, '').replace(/\[.*\]/g, '').trim();

    console.log(`Fetching lyrics for: ${cleanTitle} by ${artistName}`);

    const options = {
        apiKey: apiKey || 'NO_KEY', // Library might fail or fallback if no key, but usually requires one for search
        title: cleanTitle,
        artist: artistName === 'Unknown Artist' ? '' : artistName,
        optimizeQuery: true
    };

    try {
        const lyrics = await getLyrics(options);
        
        if (lyrics) {
            res.json({ lyrics });
        } else {
            res.status(404).json({ error: 'Lyrics not found' });
        }
    } catch (error: any) {
        console.error('Lyrics fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch lyrics', details: error.message });
    }
});

// Vite Middleware
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  // Serve static files in production
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
