/**
 * UPC NetShield - Background Service Worker / Script
 * Compatible con Google Chrome, Microsoft Edge, Mozilla Firefox, Brave y Opera.
 * Gestiona la sincronización con el Dashboard y el bloqueo instantáneo en tiempo real.
 */

const DEFAULT_SERVER_URL = 'http://10.142.240.190:5050';
const DEFAULT_POLL_INTERVAL_SEC = 2;

// --- DETECCIÓN DE ENTORNO Y NAVEGADOR ---
function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Brave')) return 'Brave';
  if (ua.includes('Chrome/')) return 'Chrome';
  return 'Browser';
}

function getOSName() {
  const platform = navigator.platform || '';
  const ua = navigator.userAgent;
  if (platform.includes('Win') || ua.includes('Windows')) return 'Windows 11';
  if (platform.includes('Mac') || ua.includes('Macintosh')) return 'macOS';
  if (platform.includes('Linux')) return 'Linux';
  return 'Windows';
}

// --- GESTIÓN DE CONFIGURACIÓN PERSISTENTE ---
async function getConfig() {
  const data = await chrome.storage.local.get([
    'serverUrl',
    'hostname',
    'policyMode',
    'blockedUrls',
    'allowedUrls',
    'isConnected',
    'lastSyncTime',
    'lastError'
  ]);

  let hostname = data.hostname;
  if (!hostname) {
    const randomNum = Math.floor(10 + Math.random() * 90);
    hostname = `PC-LAB-${randomNum}`;
    await chrome.storage.local.set({ hostname });
  }

  return {
    serverUrl: data.serverUrl || DEFAULT_SERVER_URL,
    hostname: hostname,
    policyMode: data.policyMode || 'block_list',
    blockedUrls: data.blockedUrls || [],
    allowedUrls: data.allowedUrls || [],
    isConnected: !!data.isConnected,
    lastSyncTime: data.lastSyncTime || null,
    lastError: data.lastError || null
  };
}

// Extraer nombre de dominio limpio
function cleanDomain(url) {
  if (!url) return '';
  let str = url.trim().toLowerCase();
  str = str.replace(/^[a-z0-9]+:\/\//, '');
  str = str.replace(/^\*:\/\//, '');
  str = str.replace(/^[\*.]+/, '');
  if (str.includes('/')) str = str.substring(0, str.indexOf('/'));
  if (str.includes('?')) str = str.substring(0, str.indexOf('?'));
  if (str.includes('#')) str = str.substring(0, str.indexOf('#'));
  if (str.includes(':')) str = str.substring(0, str.indexOf(':'));
  return str.trim();
}

function extractHostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return cleanDomain(url);
  }
}

// Comprobar si una URL pertenece al servidor o es local
function isInternalOrServerUrl(targetUrl, serverUrl) {
  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;

    if (serverUrl) {
      const srvHost = new URL(serverUrl).hostname.toLowerCase();
      if (host === srvHost) return true;
    }
  } catch {}
  return false;
}

// --- ACTUALIZACIÓN DE REGLAS NATIVAS DE NAVEGACIÓN (declarativeNetRequest) ---
async function updateDeclarativeRules(policyMode, blockedUrls, allowedUrls, serverUrl) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    const newRules = [];
    let ruleId = 1;

    const blockedPagePath = chrome.runtime.getURL('blocked.html');
    let srvHost = '';
    try {
      srvHost = new URL(serverUrl).hostname;
    } catch {}

    const essentialDomains = ['localhost', '127.0.0.1'];
    if (srvHost) essentialDomains.push(srvHost);

    if (policyMode === 'block_all') {
      // Regla 1: Redirigir toda navegación principal a blocked.html
      newRules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { extensionPath: '/blocked.html?reason=all' }
        },
        condition: {
          urlFilter: '*',
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });

      // Regla 2: Bloquear subrecursos externos
      newRules.push({
        id: ruleId++,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*',
          resourceTypes: ['xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
        }
      });

      // Excepciones permitidas (servidor local y extensiones)
      for (const host of essentialDomains) {
        newRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${host}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }

    } else if (policyMode === 'allow_list') {
      // Bloquear todo por defecto
      newRules.push({
        id: ruleId++,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: { extensionPath: '/blocked.html?reason=not_allowed' }
        },
        condition: {
          urlFilter: '*',
          resourceTypes: ['main_frame', 'sub_frame']
        }
      });

      newRules.push({
        id: ruleId++,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*',
          resourceTypes: ['xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
        }
      });

      // Permitir esenciales
      for (const host of essentialDomains) {
        newRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${host}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }

      // Permitir dominios de la lista autorizada
      const allowedDomains = new Set();
      for (const u of allowedUrls) {
        const dom = cleanDomain(u);
        if (dom) allowedDomains.add(dom);
      }

      for (const dom of allowedDomains) {
        newRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${dom}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }

    } else if (policyMode === 'block_list') {
      // Bloquear solo los dominios de la lista restringida
      const domainsToBlock = new Set();
      for (const u of blockedUrls) {
        const dom = cleanDomain(u);
        if (dom && !essentialDomains.includes(dom)) {
          domainsToBlock.add(dom);
        }
      }

      for (const dom of domainsToBlock) {
        // Redirigir frame principal a página de bloqueo con info
        newRules.push({
          id: ruleId++,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: { extensionPath: `/blocked.html?domain=${encodeURIComponent(dom)}&reason=block_list` }
          },
          condition: {
            urlFilter: `||${dom}`,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });

        // Cortar peticiones AJAX / websockets / video streaming
        newRules.push({
          id: ruleId++,
          priority: 1,
          action: { type: 'block' },
          condition: {
            urlFilter: `||${dom}`,
            resourceTypes: ['xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: removeRuleIds,
      addRules: newRules
    });

  } catch (err) {
    console.error('[NetShield] Error actualizando reglas declarativas:', err);
  }
}

// --- APLICACIÓN INMEDIATA EN PESTAÑAS ACTIVAS (SIN REINICIAR NAVEGADOR) ---
async function enforceActiveTabs(policyMode, blockedUrls, allowedUrls, serverUrl) {
  try {
    const tabs = await chrome.tabs.query({});
    const blockedPageUrl = chrome.runtime.getURL('blocked.html');

    for (const tab of tabs) {
      if (!tab.url || 
          tab.url.startsWith('chrome://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('about:') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith(blockedPageUrl)) {
        continue;
      }

      const host = extractHostFromUrl(tab.url);
      if (!host) continue;

      if (isInternalOrServerUrl(tab.url, serverUrl)) {
        continue;
      }

      let shouldBlock = false;
      let reasonParam = '';
      let domainParam = host;

      if (policyMode === 'block_all') {
        shouldBlock = true;
        reasonParam = 'all';
      } else if (policyMode === 'allow_list') {
        const allowedClean = allowedUrls.map(u => cleanDomain(u));
        const isAllowed = allowedClean.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
        if (!isAllowed) {
          shouldBlock = true;
          reasonParam = 'not_allowed';
        }
      } else if (policyMode === 'block_list') {
        const blockedClean = blockedUrls.map(u => cleanDomain(u));
        const isBlocked = blockedClean.some(blocked => host === blocked || host.endsWith(`.${blocked}`));
        if (isBlocked) {
          shouldBlock = true;
          reasonParam = 'block_list';
        }
      }

      if (shouldBlock) {
        const redirectUrl = `${blockedPageUrl}?domain=${encodeURIComponent(domainParam)}&reason=${encodeURIComponent(reasonParam)}`;
        try {
          await chrome.tabs.update(tab.id, { url: redirectUrl });
        } catch (tabErr) {
          // Ignorar pestañas cerradas
        }
      }
    }
  } catch (err) {
    console.error('[NetShield] Error al inspeccionar pestañas activas:', err);
  }
}

// --- SINCRONIZACIÓN CON EL SERVIDOR CENTRAL (HEARTBEAT) ---
let isSyncing = false;

async function syncWithServer() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const config = await getConfig();
    const endpoint = `${config.serverUrl.replace(/\/+$/, '')}/api/agent/heartbeat`;

    const payload = {
      hostname: config.hostname,
      os: `${getOSName()} (${getBrowserName()} Ext)`,
      ip: ''
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const policyMode = data.policyMode || 'block_list';
    const blockedUrls = data.blockedUrls || [];
    const allowedUrls = data.allowedUrls || [];

    // Si el servidor resolvió o actualizó el nombre de este equipo (por DNS/NetBIOS o desde el dashboard)
    if (data.hostname && data.hostname !== config.hostname) {
      console.log(`[NetShield] Nombre de equipo asignado por servidor: ${data.hostname}`);
      await chrome.storage.local.set({ hostname: data.hostname });
      config.hostname = data.hostname;
    }

    // Comprobar si hubo cambios en la directiva
    const currentKey = `${policyMode}|${blockedUrls.join(',')}|${allowedUrls.join(',')}`;
    const prevKey = `${config.policyMode}|${config.blockedUrls.join(',')}|${config.allowedUrls.join(',')}`;

    if (currentKey !== prevKey || !config.isConnected) {
      // 1. Actualizar motor declarativo de la extensión
      await updateDeclarativeRules(policyMode, blockedUrls, allowedUrls, config.serverUrl);

      // 2. Interceptar al instante cualquier pestaña activa que esté en un sitio prohibido
      await enforceActiveTabs(policyMode, blockedUrls, allowedUrls, config.serverUrl);
    }

    await chrome.storage.local.set({
      policyMode,
      blockedUrls,
      allowedUrls,
      ip: data.ip || '',
      isConnected: true,
      lastSyncTime: new Date().toLocaleTimeString(),
      lastError: null
    });

  } catch (err) {
    await chrome.storage.local.set({
      isConnected: false,
      lastError: err.message
    });
  } finally {
    isSyncing = false;
  }
}

// --- CONFIGURACIÓN DE ALARMAS Y EVENTOS ---
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[NetShield] Extensión instalada. Iniciando agente...');
  await syncWithServer();
  chrome.alarms.create('netshield-heartbeat', {
    periodInMinutes: 0.05 // aprox cada 3 segundos
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await syncWithServer();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'netshield-heartbeat') {
    syncWithServer();
  }
});

// Bucle en memoria continuo para máxima respuesta (cada 2.5s)
setInterval(() => {
  syncWithServer();
}, DEFAULT_POLL_INTERVAL_SEC * 1000);

// --- NAVEGACIÓN EN TIEMPO REAL (RESPALDO ADICIONAL) ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Solo frame principal
  const url = details.url;
  if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
    return;
  }

  const config = await getConfig();
  if (isInternalOrServerUrl(url, config.serverUrl)) return;

  const host = extractHostFromUrl(url);
  if (!host) return;

  let block = false;
  let reason = '';

  if (config.policyMode === 'block_all') {
    block = true;
    reason = 'all';
  } else if (config.policyMode === 'allow_list') {
    const allowed = config.allowedUrls.map(u => cleanDomain(u));
    const isOk = allowed.some(a => host === a || host.endsWith(`.${a}`));
    if (!isOk) {
      block = true;
      reason = 'not_allowed';
    }
  } else if (config.policyMode === 'block_list') {
    const blocked = config.blockedUrls.map(u => cleanDomain(u));
    const isBad = blocked.some(b => host === b || host.endsWith(`.${b}`));
    if (isBad) {
      block = true;
      reason = 'block_list';
    }
  }

  if (block) {
    const blockedPageUrl = chrome.runtime.getURL('blocked.html') + 
      `?domain=${encodeURIComponent(host)}&reason=${encodeURIComponent(reason)}`;
    chrome.tabs.update(details.tabId, { url: blockedPageUrl });
  }
});

// Mensajería con el Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncNow') {
    syncWithServer().then(() => {
      getConfig().then(cfg => sendResponse({ success: true, config: cfg }));
    });
    return true; // Asíncrono
  } else if (request.action === 'updateSettings') {
    chrome.storage.local.set(request.payload).then(() => {
      syncWithServer().then(() => {
        getConfig().then(cfg => sendResponse({ success: true, config: cfg }));
      });
    });
    return true;
  }
});
