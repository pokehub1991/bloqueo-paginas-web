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

    const allIdentities = db.prepare(`
      SELECT hostname, block_google_login, allowed_google_domains, block_incognito, clear_session_on_close, force_logout_trigger
      FROM identity_policies
    `).all();

    const identMap = {};
    for (const item of allIdentities) {
      identMap[item.hostname.toUpperCase()] = item;
    }

    const now = Date.now();
    let onlineCount = 0;

    const formattedDevices = devices.map(device => {
      const h = device.hostname.toUpperCase();
      let isOnline = false;
      if (device.last_seen) {
        const lastSeenStr = String(device.last_seen).trim();
        const utcStr = lastSeenStr.endsWith('Z') ? lastSeenStr : lastSeenStr + 'Z';
        const lastSeenDate = new Date(utcStr);
        const lastSeenMs = lastSeenDate.getTime();
        const diffMs = now - lastSeenMs;
        isOnline = !isNaN(lastSeenMs) && diffMs >= 0 && diffMs <= ONLINE_THRESHOLD_MS;
      }

      if (isOnline) onlineCount++;

      const academic = parseAcademicLocation(device.hostname);
      const devRules = rulesMap[h] || { blocked: [], allowed: [] };
      const hasAppliedRules = devRules.blocked.length > 0 || devRules.allowed.length > 0 || device.policy_mode === 'block_all';
      const policyMode = hasAppliedRules ? (device.policy_mode || 'block_list') : 'none';
      const ident = identMap[h] || {};

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
        // Reglas persistentes de navegación
        blockedUrls: devRules.blocked,
        allowedUrls: devRules.allowed,
        rulesCount: policyMode === 'allow_list' ? devRules.allowed.length : devRules.blocked.length,
        notes: device.notes || '',
        // Subsistema de Identidad y Cuentas
        identityPolicy: {
          blockGoogleLogin: Boolean(ident.block_google_login),
          allowedGoogleDomains: ident.allowed_google_domains || '',
          blockIncognito: Boolean(ident.block_incognito),
          clearSessionOnClose: Boolean(ident.clear_session_on_close),
          forceLogoutTrigger: ident.force_logout_trigger || 0
        }
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

      // Guardar automáticamente cada URL agregada en el catálogo de favoritos sin duplicar
      if (mode !== 'remove' && cleanUrls.length > 0) {
        const saveFavStmt = db.prepare(`
          INSERT INTO favorites (title, url, category, icon)
          VALUES (?, ?, 'Frecuentes', 'globe')
          ON CONFLICT(url) DO NOTHING
        `);
        for (const u of cleanUrls) {
          const domainTitle = u.replace(/\.[a-z]+$/, '');
          const formattedTitle = domainTitle.charAt(0).toUpperCase() + domainTitle.slice(1);
          saveFavStmt.run(formattedTitle, u);
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
    const saveFavStmt = db.prepare(`
      INSERT INTO favorites (title, url, category, icon)
      VALUES (?, ?, 'Frecuentes', 'globe')
      ON CONFLICT(url) DO NOTHING
    `);
    const applyChanges = db.transaction(() => {
      for (const h of cleanHostnames) {
        updateStmt.run(cleanNew, h, cleanOld, ruleType);
      }
      const domainTitle = cleanNew.replace(/\.[a-z]+$/, '');
      const formattedTitle = domainTitle.charAt(0).toUpperCase() + domainTitle.slice(1);
      saveFavStmt.run(formattedTitle, cleanNew);
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

/**
 * Renombrar una estación de trabajo (Hostname)
 */
export function renameDevice(req, res) {
  const { hostname } = req.params;
  const { newHostname } = req.body || {};

  if (!newHostname || typeof newHostname !== 'string' || !newHostname.trim()) {
    return res.status(400).json({ error: 'El nuevo nombre de equipo no puede estar vacío.' });
  }

  const oldH = hostname.trim().toUpperCase();
  const newH = newHostname.trim().toUpperCase();

  try {
    const existing = db.prepare('SELECT id FROM devices WHERE hostname = ?').get(oldH);
    if (!existing) {
      return res.status(404).json({ error: `El equipo ${oldH} no existe en el sistema.` });
    }

    const collision = db.prepare('SELECT id FROM devices WHERE hostname = ? AND hostname != ?').get(newH, oldH);
    if (collision) {
      return res.status(400).json({ error: `Ya existe otro equipo registrado con el nombre ${newH}.` });
    }

    const update = db.transaction(() => {
      db.prepare('UPDATE devices SET hostname = ? WHERE hostname = ?').run(newH, oldH);
      db.prepare('UPDATE device_rules SET hostname = ? WHERE hostname = ?').run(newH, oldH);
    });
    update();

    broadcastDeviceUpdate({ action: 'rename', oldHostname: oldH, newHostname: newH });

    return res.json({
      success: true,
      message: `Equipo ${oldH} renombrado exitosamente a ${newH}.`,
      oldHostname: oldH,
      newHostname: newH
    });
  } catch (err) {
    console.error('[Dispositivos] Error al renombrar equipo:', err);
    return res.status(500).json({ error: 'Error interno al renombrar el equipo.' });
  }
}

/**
 * Importar catálogo de laboratorios desde un archivo o texto CSV (hostname, ip)
 * Asocia automáticamente cada IP a su Hostname real y actualiza equipos ya conectados.
 */
export function importCsv(req, res) {
  const { csvText, defaultPavilion, defaultLab } = req.body || {};

  if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
    return res.status(400).json({ error: 'El contenido del archivo CSV no puede estar vacío.' });
  }

  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return res.status(400).json({ error: 'No se encontraron líneas válidas en el CSV.' });
  }

  // Detectar delimitador (coma, punto y coma o tabulación)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';
  else if (firstLine.includes('\t')) delimiter = '\t';

  let startIndex = 0;
  // Omitir fila de encabezado si existe
  const headerLower = firstLine.toLowerCase();
  if (headerLower.includes('host') || headerLower.includes('nombre') || headerLower.includes('ip') || headerLower.includes('equipo')) {
    startIndex = 1;
  }

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const parsedRows = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) continue;

    let h = parts[0].trim().toUpperCase();
    let ip = parts[1].trim();
    let lab = parts[2] ? parts[2].trim().toUpperCase() : (defaultLab || null);
    let pav = parts[3] ? parts[3].trim().toUpperCase() : (defaultPavilion || null);

    // Si las columnas vinieron invertidas (ip primero, luego host)
    if (ipv4Regex.test(h) && !ipv4Regex.test(ip)) {
      const temp = h;
      h = ip.toUpperCase();
      ip = temp;
    }

    if (!h || !ipv4Regex.test(ip)) continue;

    // Clasificación académica automática si no se especificó aula/pabellón
    const academic = parseAcademicLocation(h);
    const finalPavilion = pav || academic.pavilion;
    const finalLab = lab || academic.laboratory;

    parsedRows.push({
      hostname: h,
      ip: ip,
      pavilion: finalPavilion,
      laboratory: finalLab
    });
  }

  if (parsedRows.length === 0) {
    return res.status(400).json({ 
      error: 'No se pudieron extraer registros válidos. Verifica que el formato sea: hostname,ip (ej: VH101-01,10.142.233.10)' 
    });
  }

  try {
    let insertedCount = 0;
    let renamedCount = 0;
    let updatedIpCount = 0;

    const executeImport = db.transaction(() => {
      const upsertMapping = db.prepare(`
        INSERT INTO ip_host_mappings (ip, hostname, pavilion, laboratory)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(ip) DO UPDATE SET
          hostname = excluded.hostname,
          pavilion = excluded.pavilion,
          laboratory = excluded.laboratory
      `);

      const findByIp = db.prepare('SELECT hostname, is_online FROM (SELECT hostname, (last_seen IS NOT NULL) as is_online FROM devices WHERE ip = ?) LIMIT 1');
      const findByHost = db.prepare('SELECT hostname, ip FROM devices WHERE hostname = ?');

      const renameDeviceStmt = db.prepare('UPDATE devices SET hostname = ? WHERE hostname = ?');
      const renameRulesStmt = db.prepare('UPDATE device_rules SET hostname = ? WHERE hostname = ?');
      const updateIpStmt = db.prepare('UPDATE devices SET ip = ? WHERE hostname = ?');
      const insertDeviceStmt = db.prepare(`
        INSERT INTO devices (hostname, ip, os, policy_mode, last_seen)
        VALUES (?, ?, 'Windows', 'none', NULL)
      `);

      for (const row of parsedRows) {
        // 1. Guardar en catálogo de asignación oficial IP -> Host
        upsertMapping.run(row.ip, row.hostname, row.pavilion, row.laboratory);

        // 2. Verificar si un equipo ya conectado con esta IP tenía un nombre provisional (ej: PC-LAB-37)
        const currentDeviceWithIp = findByIp.get(row.ip);
        if (currentDeviceWithIp && currentDeviceWithIp.hostname !== row.hostname) {
          try {
            renameRulesStmt.run(row.hostname, currentDeviceWithIp.hostname);
            renameDeviceStmt.run(row.hostname, currentDeviceWithIp.hostname);
            renamedCount++;
            continue;
          } catch (renErr) {
            // Si colisiona con otro nombre, eliminar el provisional
            db.prepare('DELETE FROM devices WHERE hostname = ?').run(currentDeviceWithIp.hostname);
          }
        }

        // 3. Verificar si el host ya existe en devices para actualizar su IP
        const currentDeviceWithHost = findByHost.get(row.hostname);
        if (currentDeviceWithHost) {
          if (currentDeviceWithHost.ip !== row.ip) {
            updateIpStmt.run(row.ip, row.hostname);
            updatedIpCount++;
          }
        } else {
          // 4. Registrar equipo nuevo en el laboratorio (pendiente de conexión)
          insertDeviceStmt.run(row.hostname, row.ip);
          insertedCount++;
        }
      }
    });

    executeImport();

    // Notificar al Dashboard para refresco instantáneo de tabla y contadores de pabellones
    broadcastDeviceUpdate({ action: 'import_csv', total: parsedRows.length });

    return res.json({
      success: true,
      totalRows: parsedRows.length,
      insertedCount,
      renamedCount,
      updatedIpCount,
      message: `Se importaron ${parsedRows.length} equipos correctamente (${renamedCount} actualizados en vivo, ${insertedCount} nuevos registrados).`
    });
  } catch (err) {
    console.error('[Dispositivos] Error importando CSV:', err);
    return res.status(500).json({ error: 'Error al procesar e importar el archivo CSV.' });
  }
}


