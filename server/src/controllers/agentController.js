import { db } from '../db/index.js';
import { broadcastDeviceUpdate } from '../utils/sseManager.js';

let lastBroadcastTime = 0;

export function heartbeat(req, res) {
  const { hostname, ip, os = 'Windows' } = req.body || {};

  if (!hostname || typeof hostname !== 'string' || !hostname.trim()) {
    return res.status(400).json({ error: 'El nombre del equipo (hostname) es obligatorio.' });
  }

  const cleanHostname = hostname.trim().toUpperCase();
  // Obtener IP enviada o derivar de la conexión
  const clientIp = ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace(/^::ffff:/, '');

  try {
    const existing = db.prepare('SELECT hostname FROM devices WHERE hostname = ?').get(cleanHostname);

    // Upsert equipo
    const upsertStmt = db.prepare(`
      INSERT INTO devices (hostname, ip, os, last_seen)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(hostname) DO UPDATE SET
        ip = excluded.ip,
        os = excluded.os,
        last_seen = CURRENT_TIMESTAMP
    `);
    upsertStmt.run(cleanHostname, cleanIp, os);

    // Si es un equipo nuevo o ha pasado al menos 3 segundos desde la última notificación, notificar dashboards
    const now = Date.now();
    if (!existing || now - lastBroadcastTime > 3000) {
      lastBroadcastTime = now;
      broadcastDeviceUpdate({ action: 'heartbeat', hostname: cleanHostname });
    }

    // Obtener configuración del equipo
    const deviceRow = db.prepare('SELECT policy_mode FROM devices WHERE hostname = ?').get(cleanHostname);
    const policyMode = deviceRow?.policy_mode || 'block_list';

    // Obtener reglas de navegación asignadas a este equipo
    const rulesStmt = db.prepare(`
      SELECT url, rule_type FROM device_rules WHERE hostname = ? ORDER BY id ASC
    `);
    const rules = rulesStmt.all(cleanHostname);
    const blockedUrls = rules.filter(r => !r.rule_type || r.rule_type === 'block').map(r => r.url);
    const allowedUrls = rules.filter(r => r.rule_type === 'allow').map(r => r.url);

    return res.json({
      hostname: cleanHostname,
      ip: cleanIp,
      policyMode,
      blockedUrls,
      allowedUrls,
      count: blockedUrls.length + allowedUrls.length,
      syncTime: new Date().toISOString(),
      message: 'Reglas de navegación sincronizadas correctamente.'
    });
  } catch (error) {
    console.error(`[Agente Heartbeat] Error al procesar equipo ${cleanHostname}:`, error);
    return res.status(500).json({ error: 'Error interno al registrar el equipo.' });
  }
}
