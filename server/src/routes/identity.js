import { Router } from 'express';
import { 
  getPolicies, 
  updatePolicies, 
  forceLogout, 
  getStats 
} from '../controllers/identityController.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

router.get('/policies', authMiddleware, getPolicies);
router.post('/policies', authMiddleware, updatePolicies);
router.post('/force-logout', authMiddleware, forceLogout);
router.get('/stats', authMiddleware, getStats);

export default router;
