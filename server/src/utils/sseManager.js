// Administrador de Server-Sent Events (SSE) para sincronización en tiempo real multidispositivo
const clients = new Set();

// Intervalo de keepalive para mantener las conexiones abiertas en redes y proxies universitarios
setInterval(() => {
  for (const client of clients) {
    try {
      client.write(': keepalive\n\n');
    } catch {
      clients.delete(client);
    }
  }
}, 15000);

/**
 * Registra una nueva conexión SSE desde un dashboard
 */
export function registerSseClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });

  // Enviar mensaje de bienvenida
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
}

/**
 * Emite una notificación a todos los navegadores/dashboards conectados en cualquier PC o laboratorio
 */
export function broadcastDeviceUpdate(data = {}) {
  const payload = JSON.stringify({
    type: 'sync',
    timestamp: Date.now(),
    ...data
  });

  for (const client of clients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}
