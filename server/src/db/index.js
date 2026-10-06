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
  // Intentar primero con el módulo nativo de Node.js 22.5+ (node:sqlite)
  const sqlite = await import('node:sqlite');
  db = new sqlite.DatabaseSync(DB_PATH);

  // Helpers de compatibilidad para node:sqlite
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
  db.pragma('synchronous = NORMAL');
  console.log(`[Base de Datos] SQLite nativo (node:sqlite) conectado en: ${DB_PATH}`);
} catch (nativeErr) {
  // Fallback transparente para Node.js 20 o entornos con better-sqlite3
  try {
    const { default: Database } = await import('better-sqlite3');
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    console.log(`[Base de Datos] SQLite (better-sqlite3) conectado en: ${DB_PATH}`);
  } catch (betterErr) {
    console.error('[Base de Datos] Error al abrir SQLite:', betterErr.message);
    throw betterErr;
  }
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

    CREATE TABLE IF NOT EXISTS ip_host_mappings (
      ip TEXT PRIMARY KEY,
      hostname TEXT NOT NULL COLLATE NOCASE,
      pavilion TEXT,
      laboratory TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS identity_policies (
      hostname TEXT PRIMARY KEY COLLATE NOCASE,
      block_google_login BOOLEAN DEFAULT 0,
      allowed_google_domains TEXT DEFAULT '',
      block_incognito BOOLEAN DEFAULT 0,
      clear_session_on_close BOOLEAN DEFAULT 0,
      force_logout_trigger INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_device_rules_hostname ON device_rules(hostname);
    CREATE INDEX IF NOT EXISTS idx_devices_ip ON devices(ip);
    CREATE INDEX IF NOT EXISTS idx_ip_host_mappings_ip ON ip_host_mappings(ip);
    CREATE INDEX IF NOT EXISTS idx_identity_policies_hostname ON identity_policies(hostname);
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

  // Asegurar que cualquier favorito de prueba previo sea purgado permanentemente
  try {
    db.exec("DELETE FROM favorites WHERE category != 'Frecuentes';");
  } catch (err) {
    // ignorar
  }
}

export { db };
