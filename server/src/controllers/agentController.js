import { db } from '../db/index.js';
import { broadcastDeviceUpdate } from '../utils/sseManager.js';

let lastBroadcastTime = 0;

/**
 * Procesa el pulso (heartbeat) de agentes o extensiones cliente.
 * Asigna el Hostname real de manera estrictamente determinista:
 * 1. Consulta la tabla de inventario / catálogo oficial (ip_host_mappings) según la IP del cliente.
 * 2. Si la IP tiene un Hostname asignado, reemplaza automáticamente cualquier identificador provisional (ej. PC-LAB-XX).
 * 3. Devuelve las directivas y el Hostname oficial al cliente para que lo sincronice.
 */
export function heartbeat(req, res) {
  const { hostname, ip, os = 'Windows' } = req.body || {};

  if (!hostname || typeof hostname !== 'string' || !hostname.trim()) {
    return res.status(400).json({ error: 'El nombre del equipo (hostname) es obligatorio.' });
  }

  // Obtener IP real del cliente conectado
  const clientIp = ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = clientIp.replace(/^::ffff:/, '').trim();

  let effectiveHostname = hostname.trim().toUpperCase();

  // 1. Verificar catálogo oficial de asignación IP -> Hostname (cargado vía CSV)
  const mapped = db.prepare('SELECT hostname FROM ip_host_mappings WHERE ip = ?').get(cleanIp);
  if (mapped && mapped.hostname) {
    effectiveHostname = mapped.hostname.trim().toUpperCase();
  } else {
    // 2. Si no está en el catálogo explícito, buscar si ya existe un equipo real con esa IP en devices
    const existingReal = db.prepare(`
      SELECT hostname FROM devices 
      WHERE ip = ? AND hostname NOT LIKE 'PC-LAB-%' AND hostname != 'PC-LAB'
      ORDER BY last_seen DESC LIMIT 1
    `).get(cleanIp);

    if (existingReal && existingReal.hostname) {
      effectiveHostname = existingReal.hostname.trim().toUpperCase();
    }
  }

  try {
    // 3. Si este IP tenía antes un registro provisional (ej: PC-LAB-37) y ahora conocemos su host real, migrarlo limpiamente
    if (!effectiveHostname.startsWith('PC-LAB-')) {
      const prevProvisional = db.prepare(`
        SELECT hostname FROM devices 
        WHERE ip = ? AND hostname LIKE 'PC-LAB-%' AND hostname != ?
      `).get(cleanIp, effectiveHostname);

      if (prevProvisional) {
        try {
          db.prepare('UPDATE device_rules SET hostname = ? WHERE hostname = ?').run(effectiveHostname, prevProvisional.hostname);
          db.prepare('DELETE FROM devices WHERE hostname = ?').run(prevProvisional.hostname);
          console.log(`[Catálogo IP] Equipo provisional ${prevProvisional.hostname} migrado al host oficial ${effectiveHostname} (${cleanIp})`);
        } catch (migErr) {
          // Si ya existía el host oficial, solo limpiar el provisional
          db.prepare('DELETE FROM devices WHERE hostname = ?').run(prevProvisional.hostname);
        }
      }
    }

    const existing = db.prepare('SELECT hostname FROM devices WHERE hostname = ?').get(effectiveHostname);

    // Upsert equipo
    const upsertStmt = db.prepare(`
      INSERT INTO devices (hostname, ip, os, last_seen)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(hostname) DO UPDATE SET
        ip = excluded.ip,
        os = excluded.os,
        last_seen = CURRENT_TIMESTAMP
    `);
    upsertStmt.run(effectiveHostname, cleanIp, os);

    // Notificar al Dashboard vía SSE
    const now = Date.now();
    if (!existing || now - lastBroadcastTime > 2500) {
      lastBroadcastTime = now;
      broadcastDeviceUpdate({ action: 'heartbeat', hostname: effectiveHostname });
    }

    // Obtener reglas de navegación asignadas
    const rulesStmt = db.prepare(`
      SELECT url, rule_type FROM device_rules WHERE hostname = ? ORDER BY id ASC
    `);
    const rules = rulesStmt.all(effectiveHostname);
    const blockedUrls = rules.filter(r => !r.rule_type || r.rule_type === 'block').map(r => r.url);
    const allowedUrls = rules.filter(r => r.rule_type === 'allow').map(r => r.url);

    // Obtener directiva actual del equipo
    const deviceRow = db.prepare('SELECT policy_mode FROM devices WHERE hostname = ?').get(effectiveHostname);
    let policyMode = deviceRow?.policy_mode;
    if (!policyMode || (policyMode === 'block_list' && blockedUrls.length === 0) || (policyMode === 'allow_list' && allowedUrls.length === 0)) {
      if (policyMode !== 'block_all') {
        policyMode = 'none';
      }
    }

    return res.json({
      hostname: effectiveHostname,
      ip: cleanIp,
      policyMode,
      blockedUrls,
      allowedUrls,
      count: blockedUrls.length + allowedUrls.length,
      syncTime: new Date().toISOString(),
      message: 'Reglas sincronizadas según catálogo de IP.'
    });
  } catch (error) {
    console.error(`[Agente Heartbeat] Error al procesar equipo ${effectiveHostname}:`, error);
    return res.status(500).json({ error: 'Error interno al registrar el equipo.' });
  }
}
