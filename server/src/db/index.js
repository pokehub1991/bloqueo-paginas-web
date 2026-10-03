import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'web_blocker.sqlite');

let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log(`[Base de Datos] SQLite conectado exitosamente en: ${DB_PATH}`);
} catch (error) {
  console.error(`[Base de Datos] Error al abrir SQLite:`, error.message);
  throw error;
}

// Inicializar tablas
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostname TEXT UNIQUE NOT NULL COLLATE NOCASE,
      ip TEXT,
      os TEXT DEFAULT 'Windows',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS device_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostname TEXT NOT NULL COLLATE NOCASE,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hostname, url)
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      icon TEXT DEFAULT 'globe',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_device_rules_hostname ON device_rules(hostname);
  `);

  // Sembrar favoritos iniciales si la tabla está vacía
  const countRow = db.prepare('SELECT COUNT(*) as count FROM favorites').get();
  if (countRow.count === 0) {
    const insertFav = db.prepare(`
      INSERT OR IGNORE INTO favorites (title, url, category, icon)
      VALUES (@title, @url, @category, @icon)
    `);

    const defaultFavorites = [
      // Redes Sociales
      { title: 'Facebook', url: 'facebook.com', category: 'Redes Sociales', icon: 'share-2' },
      { title: 'Instagram', url: 'instagram.com', category: 'Redes Sociales', icon: 'camera' },
      { title: 'TikTok', url: 'tiktok.com', category: 'Redes Sociales', icon: 'music' },
      { title: 'X (Twitter)', url: 'x.com', category: 'Redes Sociales', icon: 'twitter' },

      // Videos y Streaming
      { title: 'YouTube (Completo)', url: 'youtube.com', category: 'Videos y Streaming', icon: 'youtube' },
      { title: 'YouTube Shorts', url: 'youtube.com/shorts', category: 'Videos y Streaming', icon: 'film' },
      { title: 'Netflix', url: 'netflix.com', category: 'Videos y Streaming', icon: 'tv' },
      { title: 'Twitch', url: 'twitch.tv', category: 'Videos y Streaming', icon: 'video' },
      { title: 'Cuevana', url: 'cuevana.pro', category: 'Videos y Streaming', icon: 'play' },

      // Juegos Web
      { title: 'Roblox', url: 'roblox.com', category: 'Juegos Web', icon: 'gamepad-2' },
      { title: 'Poki', url: 'poki.com', category: 'Juegos Web', icon: 'joystick' },
      { title: 'Friv', url: 'friv.com', category: 'Juegos Web', icon: 'smile' }
    ];

    const insertMany = db.transaction((favs) => {
      for (const fav of favs) {
        insertFav.run(fav);
      }
    });
    insertMany(defaultFavorites);
    console.log(`[Base de Datos] Se insertaron ${defaultFavorites.length} páginas favoritas predeterminadas.`);
  }
}

export { db };
