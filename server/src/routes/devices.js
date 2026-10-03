import { Router } from 'express';
import {
  listDevices,
  blockUrls,
  unblockAll,
  deleteDevice,
  seedDemoDevices
} from '../controllers/devicesController.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

// Todas las rutas de administración de dispositivos requieren autenticación
router.get('/', authMiddleware, listDevices);
router.post('/block', authMiddleware, blockUrls);
router.post('/unblock-all', authMiddleware, unblockAll);
router.delete('/:hostname', authMiddleware, deleteDevice);
router.post('/seed-demo', authMiddleware, seedDemoDevices);

export default router;
