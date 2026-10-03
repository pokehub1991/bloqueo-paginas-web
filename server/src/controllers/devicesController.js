import { db } from '../db/index.js';

// Consideramos conectado si reportó en los últimos 90 segundos
const ONLINE_THRESHOLD_MS = 90 * 1000;

export function listDevices(req, res) {
  try {
    const devices = db.prepare(`
      SELECT id, hostname, ip, os, last_seen, created_at, notes
      FROM devices
      ORDER BY last_seen DESC, hostname ASC
    `).all();

    const allRules = db.prepare(`
      SELECT hostname, url FROM device_rules ORDER BY id ASC
    `).all();

    // Agrupar reglas por hostname
    const rulesMap = {};
    for (const rule of allRules) {
      const h = rule.hostname.toUpperCase();
      if (!rulesMap[h]) rulesMap[h] = [];
      rulesMap[h].push(rule.url);
    }

    const now = Date.now();
    let onlineCount = 0;

    const formattedDevices = devices.map(device => {
      const h = device.hostname.toUpperCase();
      // SQLite CURRENT_TIMESTAMP almacena en formato UTC 'YYYY-MM-DD HH:MM:SS'
      const lastSeenDate = new Date(device.last_seen + (device.last_seen.endsWith('Z') ? '' : 'Z'));
      const lastSeenMs = lastSeenDate.getTime();
      const diffMs = now - lastSeenMs;
      const isOnline = diffMs >= 0 && diffMs <= ONLINE_THRESHOLD_MS;

      if (isOnline) onlineCount++;

      return {
        id: device.id,
        hostname: device.hostname,
        ip: device.ip || 'Sin IP',
        os: device.os || 'Windows',
        lastSeen: device.last_seen,
        isOnline,
        blockedUrls: rulesMap[h] || [],
        rulesCount: (rulesMap[h] || []).length,
        notes: device.notes || ''
      };
    });

    return res.json({
      devices: formattedDevices,
      totalCount: formattedDevices.length,
      onlineCount,
      offlineCount: formattedDevices.length - onlineCount
    });
  } catch (error) {
    console.error('[Dispositivos] Error al listar equipos:', error);
    return res.status(500).json({ error: 'Error al consultar computadoras.' });
  }
}

export function blockUrls(req, res) {
  const { hostnames, urls, mode = 'replace' } = req.body || {};

  if (!hostnames || !Array.isArray(hostnames) || hostnames.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos una computadora.' });
  }

  // Limpiar y normalizar URLs
  const cleanUrls = Array.isArray(urls) 
    ? urls.map(u => u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')).filter(Boolean)
    : [];

  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);

  try {
    const applyChanges = db.transaction(() => {
      const deleteDeviceRules = db.prepare('DELETE FROM device_rules WHERE hostname = ?');
      const deleteSpecificRule = db.prepare('DELETE FROM device_rules WHERE hostname = ? AND url = ?');
      const insertRule = db.prepare('INSERT OR IGNORE INTO device_rules (hostname, url) VALUES (?, ?)');

      for (const h of cleanHostnames) {
        if (mode === 'replace') {
          deleteDeviceRules.run(h);
          for (const u of cleanUrls) {
            insertRule.run(h, u);
          }
        } else if (mode === 'add') {
          for (const u of cleanUrls) {
            insertRule.run(h, u);
          }
        } else if (mode === 'remove') {
          for (const u of cleanUrls) {
            deleteSpecificRule.run(h, u);
          }
        }
      }
    });

    applyChanges();

    return res.json({
      success: true,
      message: `Reglas aplicadas a ${cleanHostnames.length} computadora(s).`,
      affectedHostnames: cleanHostnames,
      urlsCount: cleanUrls.length
    });
  } catch (error) {
    console.error('[Dispositivos] Error al actualizar reglas:', error);
    return res.status(500).json({ error: 'Error al actualizar directivas de navegación.' });
  }
}

export function unblockAll(req, res) {
  const { hostnames } = req.body || {};

  if (!hostnames || !Array.isArray(hostnames) || hostnames.length === 0) {
    return res.status(400).json({ error: 'Debes especificar los nombres de las computadoras.' });
  }

  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);

  try {
    const clearRules = db.transaction(() => {
      const deleteStmt = db.prepare('DELETE FROM device_rules WHERE hostname = ?');
      for (const h of cleanHostnames) {
        deleteStmt.run(h);
      }
    });

    clearRules();

    return res.json({
      success: true,
      message: `Se removieron todas las restricciones de ${cleanHostnames.length} computadora(s).`,
      affectedHostnames: cleanHostnames
    });
  } catch (error) {
    console.error('[Dispositivos] Error al desbloquear equipos:', error);
    return res.status(500).json({ error: 'Error al limpiar restricciones.' });
  }
}

export function deleteDevice(req, res) {
  const { hostname } = req.params;

  if (!hostname) {
    return res.status(400).json({ error: 'Hostname no proporcionado.' });
  }

  const cleanHostname = hostname.trim().toUpperCase();

  try {
    const removeTransaction = db.transaction(() => {
      db.prepare('DELETE FROM device_rules WHERE hostname = ?').run(cleanHostname);
      db.prepare('DELETE FROM devices WHERE hostname = ?').run(cleanHostname);
    });

    removeTransaction();

    return res.json({
      success: true,
      message: `Computadora ${cleanHostname} eliminada del panel.`
    });
  } catch (error) {
    console.error('[Dispositivos] Error al eliminar equipo:', error);
    return res.status(500).json({ error: 'Error al eliminar computadora.' });
  }
}

export function seedDemoDevices(req, res) {
  try {
    const sampleDevices = [
      { hostname: 'VH102-01', ip: '192.168.1.101', os: 'Windows 11 Pro', rules: ['facebook.com', 'tiktok.com', 'roblox.com'] },
      { hostname: 'VH102-02', ip: '192.168.1.102', os: 'Windows 10 Enterprise', rules: ['youtube.com', 'netflix.com'] },
      { hostname: 'VH102-SERV', ip: '192.168.1.150', os: 'Windows Server 2022', rules: [] }
    ];

    const seed = db.transaction(() => {
      const insertDevice = db.prepare(`
        INSERT INTO devices (hostname, ip, os, last_seen)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(hostname) DO UPDATE SET
          ip = excluded.ip,
          os = excluded.os,
          last_seen = CURRENT_TIMESTAMP
      `);

      const insertRule = db.prepare(`
        INSERT OR IGNORE INTO device_rules (hostname, url) VALUES (?, ?)
      `);

      for (const d of sampleDevices) {
        insertDevice.run(d.hostname, d.ip, d.os);
        for (const url of d.rules) {
          insertRule.run(d.hostname, url);
        }
      }
    });

    seed();

    return res.json({
      success: true,
      message: 'Se cargaron computadoras de demostración para pruebas.'
    });
  } catch (error) {
    console.error('[Dispositivos] Error al sembrar equipos de prueba:', error);
    return res.status(500).json({ error: 'Error al generar computadoras de demostración.' });
  }
}
