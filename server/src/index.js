import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDatabase } from './db/index.js';
import { getLocalIpAddresses } from './utils/network.js';

import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agent.js';
import devicesRoutes from './routes/devices.js';
import favoritesRoutes from './routes/favorites.js';
import systemRoutes from './routes/system.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar base de datos
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging amigable de solicitudes del agente
app.use((req, res, next) => {
  if (req.path.startsWith('/api/agent/heartbeat')) {
    const hostname = req.body?.hostname || 'Desconocido';
    console.log(`[Agente] Conexión recibida de ${hostname} (${req.ip}) a las ${new Date().toLocaleTimeString()}`);
  }
  next();
});

// Rutas de API REST
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/system', systemRoutes);

// Servir frontend compilado (Vite dist) en producción
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Servidor] Sirviendo interfaz web estática desde: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Manejo de SPA routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Servidor Central - Bloqueador Web</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; display: flex; justify-content: center; }
          .card { background: #1e293b; padding: 2rem; border-radius: 12px; max-width: 600px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { color: #38bdf8; font-size: 1.5rem; margin-top: 0; }
          code { background: #334155; padding: 0.2rem 0.5rem; border-radius: 4px; color: #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Servidor Central Activo</h1>
          <p>El backend de gestión de directivas de navegación está operando correctamente en el puerto <code>${PORT}</code>.</p>
          <p>Para abrir la interfaz web, ejecuta el cliente de desarrollo o compila el frontend con <code>npm run build:client</code>.</p>
        </div>
      </body>
      </html>
    `);
  });
}

// Escuchar en todas las interfaces de red (0.0.0.0) para permitir acceso LAN
app.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  console.log('\n==============================================================');
  console.log('  CENTRO DE CONTROL DE BLOQUEO WEB - SERVIDOR CENTRAL ACTIVO  ');
  console.log('==============================================================');
  console.log(`  Acceso Local:    http://localhost:${PORT}`);
  localIps.forEach(ip => {
    console.log(`  Acceso en Red:   http://${ip}:${PORT}`);
  });
  console.log('--------------------------------------------------------------');
  console.log('  Credenciales por defecto: admin / V1ll@uPc');
  console.log('  Para los agentes Windows, usa la dirección de "Acceso en Red"');
  console.log('==============================================================\n');
});
