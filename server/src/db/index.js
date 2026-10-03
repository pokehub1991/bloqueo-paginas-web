import { DatabaseSync } from 'node:sqlite';
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
  db = new DatabaseSync(DB_PATH);
  
  // Helpers de compatibilidad para transaction y pragma
  db.pragma = function(pragmaStr) {
    db.exec(`PRAGMA ${pragmaStr};`);
  };

  db.transaction = function(fn) {
    return function(...args) {
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };
  };

  db.pragma('journal_mode = WAL');
  console.log(`[Base de Datos] SQLite nativo conectado exitosamente en: ${DB_PATH}`);
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
      policy_mode TEXT DEFAULT 'block_list',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS device_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hostname TEXT NOT NULL COLLATE NOCASE,
      url TEXT NOT NULL,
      rule_type TEXT DEFAULT 'block',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(hostname, url, rule_type)
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

  // Migraciones automáticas para bases de datos existentes
  try {
    db.exec("ALTER TABLE devices ADD COLUMN policy_mode TEXT DEFAULT 'block_list';");
  } catch (err) {
    // La columna ya existe
  }
  try {
    db.exec("ALTER TABLE device_rules ADD COLUMN rule_type TEXT DEFAULT 'block';");
  } catch (err) {
    // La columna ya existe
  }

  // Sembrar o actualizar favoritos con las URLs más usadas
  const mostUsedUrls = [
    { title: 'YouTube', url: 'youtube.com', category: 'Más Usadas', icon: 'youtube' },
    { title: 'WhatsApp Web', url: 'web.whatsapp.com', category: 'Más Usadas', icon: 'message-circle' },
    { title: 'TikTok', url: 'tiktok.com', category: 'Más Usadas', icon: 'music' },
    { title: 'Facebook', url: 'facebook.com', category: 'Más Usadas', icon: 'share-2' },
    { title: 'Instagram', url: 'instagram.com', category: 'Más Usadas', icon: 'camera' },
    { title: 'ChatGPT', url: 'chatgpt.com', category: 'Más Usadas', icon: 'sparkles' },
    { title: 'Netflix', url: 'netflix.com', category: 'Más Usadas', icon: 'tv' },
    { title: 'Roblox', url: 'roblox.com', category: 'Más Usadas', icon: 'gamepad-2' },
    { title: 'Wikipedia', url: 'wikipedia.org', category: 'Más Usadas', icon: 'book-open' },
    { title: 'Google', url: 'google.com', category: 'Más Usadas', icon: 'search' },
    { title: 'Twitch', url: 'twitch.tv', category: 'Más Usadas', icon: 'video' },
    { title: 'X (Twitter)', url: 'x.com', category: 'Más Usadas', icon: 'twitter' },
    { title: 'Spotify', url: 'spotify.com', category: 'Más Usadas', icon: 'headphones' },
    { title: 'Poki', url: 'poki.com', category: 'Más Usadas', icon: 'joystick' },
    { title: 'Canva', url: 'canva.com', category: 'Más Usadas', icon: 'palette' }
  ];

  const insertFav = db.prepare(`
    INSERT OR REPLACE INTO favorites (title, url, category, icon)
    VALUES (@title, @url, @category, @icon)
  `);

  const insertMany = db.transaction((favs) => {
    for (const fav of favs) {
      insertFav.run(fav);
    }
  });
  insertMany(mostUsedUrls);
  console.log(`[Base de Datos] Catálogo de URLs más usadas configurado (${mostUsedUrls.length} sitios).`);
}

export { db };
