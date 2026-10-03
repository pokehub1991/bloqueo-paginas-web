import { db } from '../db/index.js';
import { parseAcademicLocation } from '../utils/academicParser.js';
import { broadcastDeviceUpdate } from '../utils/sseManager.js';

// Consideramos conectado si reportó en los últimos 90 segundos
const ONLINE_THRESHOLD_MS = 90 * 1000;

export function listDevices(req, res) {
  try {
    const devices = db.prepare(`
      SELECT id, hostname, ip, os, policy_mode, last_seen, created_at, notes
      FROM devices
      ORDER BY last_seen DESC, hostname ASC
    `).all();

    const allRules = db.prepare(`
      SELECT hostname, url, rule_type FROM device_rules ORDER BY id ASC
    `).all();

    // Agrupar reglas por hostname y por tipo (block vs allow)
    const rulesMap = {};
    for (const rule of allRules) {
      const h = rule.hostname.toUpperCase();
      if (!rulesMap[h]) {
        rulesMap[h] = { blocked: [], allowed: [] };
      }
      if (rule.rule_type === 'allow') {
        rulesMap[h].allowed.push(rule.url);
      } else {
        rulesMap[h].blocked.push(rule.url);
      }
    }

    const now = Date.now();
    let onlineCount = 0;

    const formattedDevices = devices.map(device => {
      const h = device.hostname.toUpperCase();
      const lastSeenDate = new Date(device.last_seen + (device.last_seen.endsWith('Z') ? '' : 'Z'));
      const lastSeenMs = lastSeenDate.getTime();
      const diffMs = now - lastSeenMs;
      const isOnline = diffMs >= 0 && diffMs <= ONLINE_THRESHOLD_MS;

      if (isOnline) onlineCount++;

      const academic = parseAcademicLocation(device.hostname);
      const devRules = rulesMap[h] || { blocked: [], allowed: [] };
      const policyMode = device.policy_mode || 'block_list';

      return {
        id: device.id,
        hostname: device.hostname,
        ip: device.ip || 'Sin IP',
        os: device.os || 'Windows',
        policyMode: policyMode,
        lastSeen: device.last_seen,
        isOnline,
        // Clasificación académica universitaria
        pavilion: academic.pavilion,
        pavilionLabel: academic.pavilionLabel,
        laboratory: academic.laboratory,
        laboratoryLabel: academic.laboratoryLabel,
        station: academic.station,
        // Reglas persistentes
        blockedUrls: devRules.blocked,
        allowedUrls: devRules.allowed,
        rulesCount: policyMode === 'allow_list' ? devRules.allowed.length : devRules.blocked.length,
        notes: device.notes || ''
      };
    });

    // Mapear resumen de pabellones detectados
    const pavilionsMap = {};
    const laboratoriesMap = {};

    for (const d of formattedDevices) {
      // Agrupar por Pabellón
      if (!pavilionsMap[d.pavilion]) {
        pavilionsMap[d.pavilion] = {
          code: d.pavilion,
          label: d.pavilionLabel,
          laboratories: new Set(),
          deviceCount: 0,
          onlineCount: 0
        };
      }
      pavilionsMap[d.pavilion].laboratories.add(d.laboratory);
      pavilionsMap[d.pavilion].deviceCount++;
      if (d.isOnline) pavilionsMap[d.pavilion].onlineCount++;

      // Agrupar por Laboratorio
      if (!laboratoriesMap[d.laboratory]) {
        laboratoriesMap[d.laboratory] = {
          code: d.laboratory,
          label: d.laboratoryLabel,
          pavilion: d.pavilion,
          deviceCount: 0,
          onlineCount: 0
        };
      }
      laboratoriesMap[d.laboratory].deviceCount++;
      if (d.isOnline) laboratoriesMap[d.laboratory].onlineCount++;
    }

    const pavilions = Object.values(pavilionsMap).map(p => ({
      code: p.code,
      label: p.label,
      labsCount: p.laboratories.size,
      deviceCount: p.deviceCount,
      onlineCount: p.onlineCount
    }));

    const laboratories = Object.values(laboratoriesMap);

    return res.json({
      devices: formattedDevices,
      pavilions,
      laboratories,
      totalCount: formattedDevices.length,
      onlineCount,
      offlineCount: formattedDevices.length - onlineCount
    });
  } catch (error) {
    console.error('[Dispositivos] Error al listar equipos:', error);
    return res.status(500).json({ error: 'Error al consultar equipos de laboratorios.' });
  }
}

export function blockUrls(req, res) {
  const { hostnames, urls, mode = 'add', policyMode, ruleType } = req.body || {};

  if (!hostnames || !Array.isArray(hostnames) || hostnames.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un equipo de cómputo.' });
  }

  // Limpiar y normalizar URLs
  const cleanUrls = Array.isArray(urls) 
    ? urls.map(u => u.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '')).filter(Boolean)
    : [];

  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);

  try {
    const applyChanges = db.transaction(() => {
      const upsertPolicyStmt = db.prepare(`
        INSERT INTO devices (hostname, policy_mode, last_seen)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(hostname) DO UPDATE SET
          policy_mode = COALESCE(excluded.policy_mode, devices.policy_mode)
      `);
      const deleteDeviceRules = db.prepare('DELETE FROM device_rules WHERE hostname = ? AND rule_type = ?');
      const deleteSpecificRule = db.prepare('DELETE FROM device_rules WHERE hostname = ? AND url = ? AND rule_type = ?');
      const insertRule = db.prepare('INSERT OR IGNORE INTO device_rules (hostname, url, rule_type) VALUES (?, ?, ?)');

      for (const h of cleanHostnames) {
        if (policyMode) {
          upsertPolicyStmt.run(h, policyMode);
        }

        const effectiveRuleType = ruleType || (policyMode === 'allow_list' ? 'allow' : 'block');

        if (mode === 'replace') {
          deleteDeviceRules.run(h, effectiveRuleType);
          for (const u of cleanUrls) {
            insertRule.run(h, u, effectiveRuleType);
          }
        } else if (mode === 'add') {
          // Persistencia acumulativa: agrega sin borrar las páginas previas
          for (const u of cleanUrls) {
            insertRule.run(h, u, effectiveRuleType);
          }
        } else if (mode === 'remove') {
          for (const u of cleanUrls) {
            deleteSpecificRule.run(h, u, effectiveRuleType);
          }
        }
      }
    });

    applyChanges();
    broadcastDeviceUpdate({ action: 'policy_change', affectedHostnames: cleanHostnames });

    return res.json({
      success: true,
      message: `Reglas aplicadas a ${cleanHostnames.length} equipo(s).`,
      affectedHostnames: cleanHostnames,
      policyMode,
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
    return res.status(400).json({ error: 'Debes especificar los nombres de los equipos.' });
  }

  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);

  try {
    const clearRules = db.transaction(() => {
      const deleteStmt = db.prepare('DELETE FROM device_rules WHERE hostname = ?');
      const resetPolicyStmt = db.prepare("UPDATE devices SET policy_mode = 'none' WHERE hostname = ?");
      for (const h of cleanHostnames) {
        deleteStmt.run(h);
        resetPolicyStmt.run(h);
      }
    });

    clearRules();
    broadcastDeviceUpdate({ action: 'unblock', affectedHostnames: cleanHostnames });

    return res.json({
      success: true,
      message: `Se removieron todas las restricciones de ${cleanHostnames.length} equipo(s). Navegación libre.`,
      affectedHostnames: cleanHostnames
    });
  } catch (error) {
    console.error('[Dispositivos] Error al desbloquear equipos:', error);
    return res.status(500).json({ error: 'Error al limpiar restricciones.' });
  }
}

export function removeUrlFromDevices(req, res) {
  const { hostnames, url, policyMode } = req.body || {};
  if (!hostnames || !Array.isArray(hostnames) || hostnames.length === 0 || !url) {
    return res.status(400).json({ error: 'Datos insuficientes para eliminar la página.' });
  }

  const cleanUrl = url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);
  const ruleType = policyMode === 'allow_list' ? 'allow' : 'block';

  try {
    const delStmt = db.prepare('DELETE FROM device_rules WHERE hostname = ? AND url = ? AND rule_type = ?');
    const applyChanges = db.transaction(() => {
      for (const h of cleanHostnames) {
        delStmt.run(h, cleanUrl, ruleType);
      }
    });
    applyChanges();
    broadcastDeviceUpdate({ action: 'remove_url', affectedHostnames: cleanHostnames });

    return res.json({
      success: true,
      message: `Página "${cleanUrl}" eliminada de ${cleanHostnames.length} equipo(s).`,
      affectedHostnames: cleanHostnames,
      url: cleanUrl
    });
  } catch (error) {
    console.error('[Dispositivos] Error al eliminar URL:', error);
    return res.status(500).json({ error: 'Error al eliminar página.' });
  }
}

export function updateUrlOnDevices(req, res) {
  const { hostnames, oldUrl, newUrl, policyMode } = req.body || {};
  if (!hostnames || !Array.isArray(hostnames) || hostnames.length === 0 || !oldUrl || !newUrl) {
    return res.status(400).json({ error: 'Datos insuficientes para actualizar la página.' });
  }

  const cleanOld = oldUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const cleanNew = newUrl.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);
  const ruleType = policyMode === 'allow_list' ? 'allow' : 'block';

  try {
    const updateStmt = db.prepare('UPDATE device_rules SET url = ? WHERE hostname = ? AND url = ? AND rule_type = ?');
    const applyChanges = db.transaction(() => {
      for (const h of cleanHostnames) {
        updateStmt.run(cleanNew, h, cleanOld, ruleType);
      }
    });
    applyChanges();
    broadcastDeviceUpdate({ action: 'update_url', affectedHostnames: cleanHostnames });

    return res.json({
      success: true,
      message: `Página actualizada de "${cleanOld}" a "${cleanNew}".`,
      affectedHostnames: cleanHostnames,
      oldUrl: cleanOld,
      newUrl: cleanNew
    });
  } catch (error) {
    console.error('[Dispositivos] Error al actualizar URL:', error);
    return res.status(500).json({ error: 'Error al actualizar página.' });
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
    broadcastDeviceUpdate({ action: 'delete_device', deletedHostname: cleanHostname });

    return res.json({
      success: true,
      message: `Equipo ${cleanHostname} eliminado del panel.`
    });
  } catch (error) {
    console.error('[Dispositivos] Error al eliminar equipo:', error);
    return res.status(500).json({ error: 'Error al eliminar equipo.' });
  }
}

export function deleteBulkDevices(req, res) {
  const { hostnames } = req.body || {};
  if (!hostnames || !Array.isArray(hostnames) || hostnames.length === 0) {
    return res.status(400).json({ error: 'Debes proporcionar una lista de equipos a eliminar.' });
  }

  const cleanHostnames = hostnames.map(h => h.trim().toUpperCase()).filter(Boolean);

  try {
    const removeTransaction = db.transaction(() => {
      const delRules = db.prepare('DELETE FROM device_rules WHERE hostname = ?');
      const delDev = db.prepare('DELETE FROM devices WHERE hostname = ?');
      for (const h of cleanHostnames) {
        delRules.run(h);
        delDev.run(h);
      }
    });

    removeTransaction();
    broadcastDeviceUpdate({ action: 'delete_bulk', deletedHostnames: cleanHostnames });

    return res.json({
      success: true,
      message: `Se eliminaron ${cleanHostnames.length} equipo(s) del registro.`,
      deletedHostnames: cleanHostnames
    });
  } catch (error) {
    console.error('[Dispositivos] Error al eliminar equipos en lote:', error);
    return res.status(500).json({ error: 'Error al eliminar equipos.' });
  }
}

export function deleteLaboratory(req, res) {
  const { labCode } = req.body || {};
  if (!labCode) {
    return res.status(400).json({ error: 'Código de laboratorio no proporcionado.' });
  }

  try {
    const allDevices = db.prepare('SELECT hostname FROM devices').all();
    const toDelete = [];
    for (const d of allDevices) {
      const academic = parseAcademicLocation(d.hostname);
      if (academic.laboratory === labCode) {
        toDelete.push(d.hostname.toUpperCase());
      }
    }

    if (toDelete.length === 0) {
      return res.status(404).json({ error: `No se encontraron equipos registrados para el laboratorio ${labCode}.` });
    }

    const removeTransaction = db.transaction(() => {
      const delRules = db.prepare('DELETE FROM device_rules WHERE hostname = ?');
      const delDev = db.prepare('DELETE FROM devices WHERE hostname = ?');
      for (const h of toDelete) {
        delRules.run(h);
        delDev.run(h);
      }
    });

    removeTransaction();
    broadcastDeviceUpdate({ action: 'delete_lab', labCode, deletedHostnames: toDelete });

    return res.json({
      success: true,
      message: `Se eliminó el laboratorio ${labCode} con sus ${toDelete.length} equipos.`,
      deletedCount: toDelete.length,
      deletedHostnames: toDelete
    });
  } catch (error) {
    console.error('[Dispositivos] Error al eliminar laboratorio:', error);
    return res.status(500).json({ error: 'Error al eliminar laboratorio.' });
  }
}

export function seedDemoDevices(req, res) {
  try {
    // Laboratorios universitarios de 21 a 31 equipos por laboratorio en Pabellones A, E, G y H
    const sampleLabs = [
      // Pabellón H
      { prefix: 'VH101', pavilion: 'H', count: 25, defaultMode: 'block_list', urls: ['facebook.com', 'tiktok.com'] },
      { prefix: 'VH102', pavilion: 'H', count: 28, defaultMode: 'allow_list', urls: ['wikipedia.org', 'google.com'] },
      { prefix: 'VH203', pavilion: 'H', count: 22, defaultMode: 'none', urls: [] },

      // Pabellón A
      { prefix: 'VA101', pavilion: 'A', count: 24, defaultMode: 'block_all', urls: [] },
      { prefix: 'VA108', pavilion: 'A', count: 30, defaultMode: 'block_list', urls: ['youtube.com', 'roblox.com'] },

      // Pabellón E
      { prefix: 'VE105', pavilion: 'E', count: 26, defaultMode: 'block_list', urls: ['netflix.com', 'twitch.tv'] },
      { prefix: 'VE201', pavilion: 'E', count: 22, defaultMode: 'allow_list', urls: ['chatgpt.com', 'wikipedia.org'] },

      // Pabellón G
      { prefix: 'VG104', pavilion: 'G', count: 25, defaultMode: 'none', urls: [] },
      { prefix: 'VG201', pavilion: 'G', count: 27, defaultMode: 'block_list', urls: ['tiktok.com', 'instagram.com'] }
    ];

    const seed = db.transaction(() => {
      const insertDevice = db.prepare(`
        INSERT INTO devices (hostname, ip, os, policy_mode, last_seen)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(hostname) DO UPDATE SET
          ip = excluded.ip,
          os = excluded.os,
          policy_mode = excluded.policy_mode,
          last_seen = CURRENT_TIMESTAMP
      `);

      const insertRule = db.prepare(`
        INSERT OR IGNORE INTO device_rules (hostname, url, rule_type) VALUES (?, ?, ?)
      `);

      // Limpiar equipos demo previos pero conservar LAPTOP-BRYAN
      db.prepare("DELETE FROM device_rules WHERE hostname != 'LAPTOP-BRYAN'").run();
      db.prepare("DELETE FROM devices WHERE hostname != 'LAPTOP-BRYAN'").run();

      for (const lab of sampleLabs) {
        for (let i = 1; i <= lab.count; i++) {
          const num = i < 10 ? `0${i}` : `${i}`;
          const hostname = `${lab.prefix}-${num}`;
          const subnet = lab.prefix.charCodeAt(1) + parseInt(lab.prefix.slice(2, 4) || '1');
          const ip = `192.168.${subnet % 200}.${i + 10}`;
          const os = i % 2 === 0 ? 'Windows 11 Pro' : 'Windows 10 Enterprise';

          insertDevice.run(hostname, ip, os, lab.defaultMode);
          const rType = lab.defaultMode === 'allow_list' ? 'allow' : 'block';
          for (const u of lab.urls) {
            insertRule.run(hostname, u, rType);
          }
        }
      }
    });

    seed();

    return res.json({
      success: true,
      message: 'Se cargaron los laboratorios universitarios para los Pabellones A, E, G y H.'
    });
  } catch (error) {
    console.error('[Dispositivos] Error al sembrar equipos de prueba:', error);
    return res.status(500).json({ error: 'Error al generar laboratorios de prueba.' });
  }
}
