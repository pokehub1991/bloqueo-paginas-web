const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('web_blocker_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('web_blocker_token', token);
  } else {
    localStorage.removeItem('web_blocker_token');
  }
}

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `Error en la solicitud (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  // Autenticación
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setAuthToken(data.token);
    return data;
  },

  logout: () => {
    setAuthToken(null);
  },

  getMe: async () => {
    return request('/auth/me');
  },

  // Dispositivos
  getDevices: async () => {
    return request('/devices');
  },

  blockUrls: async (hostnames, urls, mode = 'replace') => {
    return request('/devices/block', {
      method: 'POST',
      body: JSON.stringify({ hostnames, urls, mode })
    });
  },

  unblockAll: async (hostnames) => {
    return request('/devices/unblock-all', {
      method: 'POST',
      body: JSON.stringify({ hostnames })
    });
  },

  deleteDevice: async (hostname) => {
    return request(`/devices/${encodeURIComponent(hostname)}`, {
      method: 'DELETE'
    });
  },

  seedDemoDevices: async () => {
    return request('/devices/seed-demo', {
      method: 'POST'
    });
  },

  // Favoritos
  getFavorites: async () => {
    return request('/favorites');
  },

  createFavorite: async (fav) => {
    return request('/favorites', {
      method: 'POST',
      body: JSON.stringify(fav)
    });
  },

  deleteFavorite: async (id) => {
    return request(`/favorites/${id}`, {
      method: 'DELETE'
    });
  },

  resetFavorites: async () => {
    return request('/favorites/reset-defaults', {
      method: 'POST'
    });
  },

  // Sistema
  getSystemInfo: async () => {
    return request('/system/info');
  }
};

/**
 * Formatea fechas y marcas de tiempo en lenguaje natural cercano en español
 * Ejemplo: "Hace 15 segundos", "Hace 3 minutos", "Hoy a las 14:30"
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Nunca visto';

  // Asegurar formato UTC si no tiene sufijo Z
  const utcString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
  const date = new Date(utcString);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 5) return 'Justo ahora';
  if (diffSeconds < 60) return `Hace ${diffSeconds} segundos`;
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes === 1) return 'Hace 1 minuto';
  if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return 'Hace 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} horas`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
