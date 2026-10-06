import { db } from '../db/index.js';
import { broadcastDeviceUpdate } from '../utils/sseManager.js';

/**
 * Obtiene las políticas de identidad y sesiones de todos los equipos.
 */
export function getPolicies(req, res) {
  try {
    const policies = db.prepare(`
      SELECT hostname, block_google_login, allowed_google_domains, 
             block_incognito, clear_session_on_close, force_logout_trigger, updated_at
      FROM identity_policies
    `).all();

    const policiesMap = {};
    for (const p of policies) {
      policiesMap[p.hostname.toUpperCase()] = {
        hostname: p.hostname,
        blockGoogleLogin: Boolean(p.block_google_login),
        allowedGoogleDomains: p.allowed_google_domains || '',
        blockIncognito: Boolean(p.block_incognito),
        clearSessionOnClose: Boolean(p.clear_session_on_close),
        forceLogoutTrigger: p.force_logout_trigger || 0,
        updatedAt: p.updated_at
      };
    }

    return res.json({ policies: policiesMap });
  } catch (err) {
    console.error('[Identity Controller] Error al listar políticas:', err);
    return res.status(500).json({ error: 'Error al obtener políticas de identidad.' });
  }
}

/**
 * Actualiza las políticas de identidad para una lista de hostnames.
 */
export function updatePolicies(req, res) {
  const { 
    hostnames = [], 
    blockGoogleLogin, 
    allowedGoogleDomains, 
    blockIncognito, 
    clearSessionOnClose 
  } = req.body || {};

  if (!Array.isArray(hostnames) || hostnames.length === 0) {
    return res.status(400).json({ error: 'Debes seleccionar al menos un equipo.' });
  }

  try {
    const upsertStmt = db.prepare(`
      INSERT INTO identity_policies (
        hostname, block_google_login, allowed_google_domains, 
        block_incognito, clear_session_on_close, updated_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(hostname) DO UPDATE SET
        block_google_login = CASE WHEN ? IS NOT NULL THEN ? ELSE block_google_login END,
        allowed_google_domains = CASE WHEN ? IS NOT NULL THEN ? ELSE allowed_google_domains END,
        block_incognito = CASE WHEN ? IS NOT NULL THEN ? ELSE block_incognito END,
        clear_session_on_close = CASE WHEN ? IS NOT NULL THEN ? ELSE clear_session_on_close END,
        updated_at = CURRENT_TIMESTAMP
    `);

    const updateTx = db.transaction((targets) => {
      for (const rawHost of targets) {
        if (!rawHost) continue;
        const h = rawHost.trim().toUpperCase();
        const bGoogle = blockGoogleLogin !== undefined ? (blockGoogleLogin ? 1 : 0) : null;
        const aDomains = allowedGoogleDomains !== undefined ? String(allowedGoogleDomains).trim() : null;
        const bIncognito = blockIncognito !== undefined ? (blockIncognito ? 1 : 0) : null;
        const cSession = clearSessionOnClose !== undefined ? (clearSessionOnClose ? 1 : 0) : null;

        upsertStmt.run(
          h, 
          bGoogle ?? 0, 
          aDomains ?? '', 
          bIncognito ?? 0, 
          cSession ?? 0,
          bGoogle, bGoogle,
          aDomains, aDomains,
          bIncognito, bIncognito,
          cSession, cSession
        );
      }
    });

    updateTx(hostnames);

    broadcastDeviceUpdate({ action: 'identity_policies_updated', count: hostnames.length });

    return res.json({ 
      success: true, 
      count: hostnames.length, 
      message: `Políticas de seguridad actualizadas en ${hostnames.length} equipo(s).` 
    });
  } catch (err) {
    console.error('[Identity Controller] Error al actualizar políticas:', err);
    return res.status(500).json({ error: 'Error interno al actualizar las políticas.' });
  }
}

/**
 * Dispara una orden inmediata de cierre de sesión (Emergency Flush)
 * incrementando force_logout_trigger.
 */
export function forceLogout(req, res) {
  const { hostnames = [] } = req.body || {};

  try {
    let affectedCount = 0;

    if (hostnames.length > 0) {
      const triggerStmt = db.prepare(`
        INSERT INTO identity_policies (hostname, force_logout_trigger, updated_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(hostname) DO UPDATE SET
          force_logout_trigger = force_logout_trigger + 1,
          updated_at = CURRENT_TIMESTAMP
      `);

      const triggerTx = db.transaction((targets) => {
        for (const rawHost of targets) {
          if (!rawHost) continue;
          triggerStmt.run(rawHost.trim().toUpperCase());
          affectedCount++;
        }
      });
      triggerTx(hostnames);
    } else {
      // Disparar a todos los equipos registrados
      const allDevs = db.prepare('SELECT hostname FROM devices').all();
      const triggerStmt = db.prepare(`
        INSERT INTO identity_policies (hostname, force_logout_trigger, updated_at)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(hostname) DO UPDATE SET
          force_logout_trigger = force_logout_trigger + 1,
          updated_at = CURRENT_TIMESTAMP
      `);

      const triggerTx = db.transaction((targets) => {
        for (const d of targets) {
          triggerStmt.run(d.hostname.toUpperCase());
          affectedCount++;
        }
      });
      triggerTx(allDevs);
    }

    broadcastDeviceUpdate({ action: 'force_logout_triggered', count: affectedCount });

    return res.json({
      success: true,
      count: affectedCount,
      message: `Orden de cierre forzado de sesión enviada a ${affectedCount} equipo(s).`
    });
  } catch (err) {
    console.error('[Identity Controller] Error al forzar cierre de sesión:', err);
    return res.status(500).json({ error: 'Error al enviar orden de cierre de sesión.' });
  }
}

/**
 * Resumen de métricas globales del subsistema de identidad.
 */
export function getStats(req, res) {
  try {
    const totalDevices = db.prepare('SELECT COUNT(*) as count FROM devices').get()?.count || 0;
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN block_google_login = 1 THEN 1 ELSE 0 END) as googleBlockedCount,
        SUM(CASE WHEN block_incognito = 1 THEN 1 ELSE 0 END) as incognitoBlockedCount,
        SUM(CASE WHEN clear_session_on_close = 1 THEN 1 ELSE 0 END) as clearOnCloseCount,
        SUM(CASE WHEN allowed_google_domains != '' THEN 1 ELSE 0 END) as domainRestrictedCount
      FROM identity_policies
    `).get() || {};

    return res.json({
      totalDevices,
      googleBlockedCount: stats.googleBlockedCount || 0,
      incognitoBlockedCount: stats.incognitoBlockedCount || 0,
      clearOnCloseCount: stats.clearOnCloseCount || 0,
      domainRestrictedCount: stats.domainRestrictedCount || 0
    });
  } catch (err) {
    console.error('[Identity Controller] Error al calcular estadísticas:', err);
    return res.status(500).json({ error: 'Error al obtener métricas.' });
  }
}
