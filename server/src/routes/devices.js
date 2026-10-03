import { Router } from 'express';
import {
  listDevices,
  blockUrls,
  unblockAll,
  removeUrlFromDevices,
  updateUrlOnDevices,
  deleteDevice,
  deleteBulkDevices,
  deleteLaboratory,
  seedDemoDevices
} from '../controllers/devicesController.js';
import { authMiddleware } from '../utils/auth.js';
import { registerSseClient } from '../utils/sseManager.js';

const router = Router();

// Todas las rutas de administración de dispositivos requieren autenticación
router.get('/', authMiddleware, listDevices);
router.get('/events', authMiddleware, registerSseClient);
router.post('/block', authMiddleware, blockUrls);
router.post('/unblock', authMiddleware, unblockAll);
router.post('/unblock-all', authMiddleware, unblockAll);
router.post('/rules/remove', authMiddleware, removeUrlFromDevices);
router.post('/rules/update', authMiddleware, updateUrlOnDevices);
router.post('/delete-bulk', authMiddleware, deleteBulkDevices);
router.post('/delete-lab', authMiddleware, deleteLaboratory);
router.delete('/:hostname', authMiddleware, deleteDevice);
router.post('/seed-demo', authMiddleware, seedDemoDevices);

export default router;
