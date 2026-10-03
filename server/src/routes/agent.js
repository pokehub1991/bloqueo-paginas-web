import { Router } from 'express';
import { heartbeat } from '../controllers/agentController.js';

const router = Router();

// Endpoint público para que los agentes en red local envíen su heartbeat y reciban reglas
router.post('/heartbeat', heartbeat);

export default router;
