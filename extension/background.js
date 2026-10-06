/**
 * UPC NetShield - Background Service Worker / Script
 * Compatible con Google Chrome, Microsoft Edge, Mozilla Firefox, Brave y Opera.
 * Gestiona la sincronización con el Dashboard, bloqueo instantáneo, y el subsistema
 * de Seguridad de Cuentas, Perfiles e Incógnito (Google OAuth & Session Management).
 */

const DEFAULT_SERVER_URL = 'http://10.142.240.190:5050';
const DEFAULT_POLL_INTERVAL_SEC = 3;

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
    'identityPolicy',
    'policyHash',
    'lastLogoutTrigger',
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
    identityPolicy: data.identityPolicy || {
      blockGoogleLogin: false,
      allowedGoogleDomains: '',
      blockIncognito: false,
      clearSessionOnClose: false,
      forceLogoutTrigger: 0
    },
    policyHash: data.policyHash || null,
    lastLogoutTrigger: data.lastLogoutTrigger || 0,
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

// --- SUBSISTEMA DE PURGA DE SESIONES Y CREDENCIALES ---
async function purgePersonalSessions() {
  console.log('[UPC NetShield] ⚡ Ejecutando purga inmediata de sesiones y credenciales de usuario...');

  // 1. Invalida sesión en servidor de Google silenciosamente
  try {
    fetch('https://accounts.google.com/Logout', { mode: 'no-cors' }).catch(() => {});
  } catch {}

  // 2. Limpieza exhaustiva a través de chrome.browsingData
  if (chrome.browsingData && chrome.browsingData.remove) {
    try {
      await chrome.browsingData.remove({}, {
        cookies: true,
        localStorage: true,
        indexedDB: true,
        cache: true,
        serviceWorkers: true,
        passwords: true,
        formData: true
      });
      console.log('[UPC NetShield] browsingData purgado exitosamente.');
    } catch (bErr) {
      console.warn('[UPC NetShield] Aviso browsingData:', bErr.message);
    }
  }

  // 3. Limpieza de cookies de dominios específicos
  if (chrome.cookies && chrome.cookies.getAll) {
    const targetDomains = [
      'google.com',
      '.google.com',
      'accounts.google.com',
      'youtube.com',
      '.youtube.com',
      'live.com',
      '.live.com',
      'login.microsoftonline.com',
      'microsoft.com',
      '.microsoft.com'
    ];
    for (const domain of targetDomains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        for (const c of cookies) {
          const protocol = c.secure ? 'https:' : 'http:';
          const domainUrl = c.domain.startsWith('.') ? c.domain.substring(1) : c.domain;
          const url = `${protocol}//${domainUrl}${c.path}`;
          chrome.cookies.remove({ url, name: c.name }).catch(() => {});
        }
      } catch {}
    }
  }
}

// --- ACTUALIZACIÓN DE REGLAS NATIVAS DE NAVEGACIÓN (declarativeNetRequest) ---
async function updateDeclarativeRules(policyMode, blockedUrls, allowedUrls, serverUrl, identityPolicy = {}) {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    const newRules = [];
    let ruleId = 1;

    let srvHost = '';
    try {
      srvHost = new URL(serverUrl).hostname;
    } catch {}

    const essentialDomains = ['localhost', '127.0.0.1'];
    if (srvHost) essentialDomains.push(srvHost);

    // =========================================================================
    // REGLAS DEL SUBSISTEMA DE IDENTIDADES (Prioridad Alta: 20-30)
    // =========================================================================

    // 1. Bloqueo de inicio de sesión con cuentas personales en Google
    if (identityPolicy.blockGoogleLogin) {
      const googleAuthEndpoints = [
        'accounts.google.com*',
        'accounts.youtube.com*',
        'myaccount.google.com*',
        'passwords.google.com*'
      ];

      for (const endpoint of googleAuthEndpoints) {
        newRules.push({
          id: ruleId++,
          priority: 30,
          action: {
            type: 'redirect',
            redirect: { extensionPath: '/blocked_auth.html' }
          },
          condition: {
            urlFilter: `||${endpoint}`,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });
      }
    }

    // 2. Restricción de dominios permitidos de Google Workspace (Header Injection)
    if (identityPolicy.allowedGoogleDomains && identityPolicy.allowedGoogleDomains.trim()) {
      const allowedDomainsList = identityPolicy.allowedGoogleDomains.trim();
      const googleHosts = ['google.com', 'accounts.google.com', 'googleapis.com'];
      for (const gh of googleHosts) {
        newRules.push({
          id: ruleId++,
          priority: 20,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              {
                header: 'X-GoogApps-Allowed-Domains',
                operation: 'set',
                value: allowedDomainsList
              }
            ]
          },
          condition: {
            urlFilter: `||${gh}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'other']
          }
        });
      }
    }

    // =========================================================================
    // REGLAS GENERALES DE NAVEGACIÓN (Prioridad 1-5)
    // =========================================================================

    if (policyMode === 'block_all') {
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

      newRules.push({
        id: ruleId++,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*',
          resourceTypes: ['xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
        }
      });

      for (const host of essentialDomains) {
        newRules.push({
          id: ruleId++,
          priority: 5,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${host}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }

    } else if (policyMode === 'allow_list') {
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

      for (const host of essentialDomains) {
        newRules.push({
          id: ruleId++,
          priority: 5,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${host}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }

      const allowedDomains = new Set();
      for (const u of allowedUrls) {
        const dom = cleanDomain(u);
        if (dom) allowedDomains.add(dom);
      }

      for (const dom of allowedDomains) {
        newRules.push({
          id: ruleId++,
          priority: 5,
          action: { type: 'allow' },
          condition: {
            urlFilter: `||${dom}`,
            resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image', 'media', 'websocket', 'other']
          }
        });
      }

    } else if (policyMode === 'block_list') {
      const domainsToBlock = new Set();
      for (const u of blockedUrls) {
        const dom = cleanDomain(u);
        if (dom && !essentialDomains.includes(dom)) {
          domainsToBlock.add(dom);
        }
      }

      for (const dom of domainsToBlock) {
        newRules.push({
          id: ruleId++,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: { extensionPath: `/blocked.html?domain=${encodeURIComponent(dom)}&reason=block_list` }
          },
          condition: {
            urlFilter: `||${dom}`,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });

        newRules.push({
          id: ruleId++,
          priority: 2,
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

    console.log(`[UPC NetShield] Reglas declarativas actualizadas. Total activas: ${newRules.length}`);
  } catch (err) {
    console.error('[UPC NetShield] Error al actualizar reglas declarativas:', err);
  }
}

// --- REDIRECCIÓN INMEDIATA DE PESTAÑAS ACTIVAS ABIERTAS ---
async function enforceActiveTabs(policyMode, blockedUrls, allowedUrls, serverUrl, identityPolicy = {}) {
  try {
    const tabs = await chrome.tabs.query({});
    const blockedPageUrl = chrome.runtime.getURL('blocked.html');
    const blockedAuthUrl = chrome.runtime.getURL('blocked_auth.html');

    for (const tab of tabs) {
      if (!tab.url) continue;
      const url = tab.url;

      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || 
          url.startsWith('chrome-extension://') || isInternalOrServerUrl(url, serverUrl)) {
        continue;
      }

      // 1. Si intenta estar en endpoints de login de Google con la política activa
      if (identityPolicy.blockGoogleLogin && url.includes('accounts.google.com/')) {
        if (url.includes('/signin/') || url.includes('/ServiceLogin') || url.includes('/oauth2/')) {
          await chrome.tabs.update(tab.id, { url: blockedAuthUrl }).catch(() => {});
          continue;
        }
      }

      const host = extractHostFromUrl(url);
      if (!host) continue;

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
        } catch (tabErr) {}
      }
    }
  } catch (err) {
    console.error('[NetShield] Error al inspeccionar pestañas activas:', err);
  }
}

// --- GUARDIÁN DE MODO INCÓGNITO ---
function setupIncognitoGuard() {
  // 1. Escuchar ventanas nuevas (cierra la ventana incógnita al instante)
  if (chrome.windows && chrome.windows.onCreated) {
    chrome.windows.onCreated.addListener(async (win) => {
      try {
        if (!win.incognito) return;
        const config = await getConfig();
        if (config.identityPolicy?.blockIncognito) {
          console.log('[UPC NetShield] 🕶️ Ventana en modo incógnito detectada y cerrada al instante.');
          if (win.id) {
            await chrome.windows.remove(win.id).catch(() => {});
          }

          const allWins = await chrome.windows.getAll();
          const normalWin = allWins.find(w => !w.incognito);
          if (normalWin) {
            await chrome.tabs.create({
              windowId: normalWin.id,
              url: chrome.runtime.getURL('blocked_auth.html')
            }).catch(() => {});
          }
        }
      } catch {}
    });
  }

  // 2. Escuchar pestañas en incógnito
  chrome.tabs.onCreated.addListener(async (tab) => {
    try {
      if (!tab.incognito) return;
      const config = await getConfig();
      if (config.identityPolicy?.blockIncognito) {
        console.log('[UPC NetShield] 🕶️ Pestaña en modo incógnito detectada y cerrada por política.');
        if (tab.id) {
          await chrome.tabs.remove(tab.id).catch(() => {});
        }
      }
    } catch {}
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    try {
      if (tab.incognito) {
        const config = await getConfig();
        if (config.identityPolicy?.blockIncognito) {
          await chrome.tabs.remove(tabId).catch(() => {});
        }
      }
    } catch {}
  });
}

// --- GUARDIÁN DE INTERCEPCIÓN WEB DE AUTENTICACIÓN ---
function setupWebAuthGuard() {
  if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
    chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
      if (details.frameId !== 0) return; // Solo marco principal
      try {
        const config = await getConfig();
        if (config.identityPolicy?.blockGoogleLogin) {
          const u = (details.url || '').toLowerCase();
          if (
            u.includes('accounts.google.com') ||
            u.includes('accounts.youtube.com') ||
            u.includes('myaccount.google.com')
          ) {
            console.log('[UPC NetShield] 🔒 Intento de acceso a login de Google interceptado:', details.url);
            await chrome.tabs.update(details.tabId, {
              url: chrome.runtime.getURL('blocked_auth.html')
            }).catch(() => {});
          }
        }
      } catch {}
    });
  }
}

// --- GUARDIÁN DE CIERRE DE SESIONES AL SALIR ---
function setupClearOnCloseGuard() {
  chrome.windows.onRemoved.addListener(async () => {
    try {
      const remainingWindows = await chrome.windows.getAll();
      if (remainingWindows.length === 0) {
        const config = await getConfig();
        if (config.identityPolicy?.clearSessionOnClose) {
          await purgePersonalSessions();
        }
      }
    } catch {}
  });
}

// --- SINCRONIZACIÓN CON EL SERVIDOR CENTRAL (HEARTBEAT CON JITTER & ETAG) ---
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
      ip: '',
      policyHash: config.policyHash || null
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

    // 1. Manejo de respuesta Not Modified (Alta eficiencia en 1,000+ equipos)
    if (data.notModified) {
      const incomingTrigger = Number(data.forceLogoutTrigger || 0);
      const currentTrigger = Number(config.lastLogoutTrigger || 0);

      if (incomingTrigger > currentTrigger) {
        console.log(`[UPC NetShield] ⚡ Orden remota de cierre de sesión recibida (Trigger: ${incomingTrigger})`);
        await purgePersonalSessions();
        await chrome.storage.local.set({ lastLogoutTrigger: incomingTrigger });
      }

      await chrome.storage.local.set({
        isConnected: true,
        lastSyncTime: new Date().toLocaleTimeString(),
        lastError: null
      });
      return;
    }

    // 2. Respuesta completa con nuevas políticas
    const policyMode = data.policyMode || 'block_list';
    const blockedUrls = data.blockedUrls || [];
    const allowedUrls = data.allowedUrls || [];
    const identityPolicy = data.identityPolicy || {
      blockGoogleLogin: false,
      allowedGoogleDomains: '',
      blockIncognito: false,
      clearSessionOnClose: false,
      forceLogoutTrigger: 0
    };
    const incomingHash = data.policyHash || null;

    // Actualizar hostname asignado por servidor
    if (data.hostname && data.hostname !== config.hostname) {
      console.log(`[UPC NetShield] Hostname asignado por catálogo: ${data.hostname}`);
      await chrome.storage.local.set({ hostname: data.hostname });
      config.hostname = data.hostname;
    }

    // Comprobar orden forzada de cierre de sesión inmediata
    const incomingTrigger = Number(identityPolicy.forceLogoutTrigger || 0);
    const currentTrigger = Number(config.lastLogoutTrigger || 0);

    if (incomingTrigger > currentTrigger) {
      console.log(`[UPC NetShield] ⚡ Orden remota de cierre de sesión detectada (Trigger: ${incomingTrigger})`);
      await purgePersonalSessions();
    }

    // Si se acaba de activar el bloqueo de Google, purgar sesiones existentes de inmediato
    if (identityPolicy.blockGoogleLogin && !config.identityPolicy?.blockGoogleLogin) {
      console.log('[UPC NetShield] 🔒 Bloqueo de Google activado. Purgando sesiones abiertas...');
      await purgePersonalSessions();
    }

    // Actualizar reglas declarativas si hubo cambios
    if (incomingHash !== config.policyHash || !config.isConnected) {
      await updateDeclarativeRules(policyMode, blockedUrls, allowedUrls, config.serverUrl, identityPolicy);
      await enforceActiveTabs(policyMode, blockedUrls, allowedUrls, config.serverUrl, identityPolicy);
    }

    await chrome.storage.local.set({
      policyMode,
      blockedUrls,
      allowedUrls,
      identityPolicy,
      policyHash: incomingHash,
      lastLogoutTrigger: incomingTrigger,
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

// Iniciar guardianes de seguridad
setupIncognitoGuard();
setupClearOnCloseGuard();
setupWebAuthGuard();

// --- CONFIGURACIÓN DE ALARMAS Y EVENTOS ---
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[UPC NetShield] Extensión instalada. Iniciando servicios...');
  await syncWithServer();
  chrome.alarms.create('netshield-heartbeat', {
    periodInMinutes: 0.05
  });
});

chrome.runtime.onStartup.addListener(async () => {
  const config = await getConfig();
  if (config.identityPolicy?.clearSessionOnClose) {
    await purgePersonalSessions();
  }
  await syncWithServer();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'netshield-heartbeat') {
    syncWithServer();
  }
});

// Bucle en memoria con jitter para evitar saturación de red en 1,000+ máquinas
function scheduleNextPoll() {
  const jitterMs = Math.floor(Math.random() * 800) - 400; // ±400ms
  const intervalMs = Math.max(2000, (DEFAULT_POLL_INTERVAL_SEC * 1000) + jitterMs);
  setTimeout(async () => {
    await syncWithServer();
    scheduleNextPoll();
  }, intervalMs);
}
scheduleNextPoll();

// Mensajería con el Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncNow') {
    syncWithServer().then(() => {
      getConfig().then(cfg => sendResponse({ success: true, config: cfg }));
    });
    return true;
  } else if (request.action === 'purgeSessions') {
    purgePersonalSessions().then(() => {
      sendResponse({ success: true, message: 'Sesiones purgadas.' });
    });
    return true;
  } else if (request.action === 'updateSettings') {
    chrome.storage.local.set(request.payload).then(() => {
      syncWithServer().then(() => {
        getConfig().then(cfg => sendResponse({ success: true, config: cfg }));
      });
    });
    return true;
  }
});
