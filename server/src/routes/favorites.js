import { Router } from 'express';
import { getFavorites, createFavorite, deleteFavorite, resetDefaults } from '../controllers/favoritesController.js';
import { authMiddleware } from '../utils/auth.js';

const router = Router();

router.get('/', authMiddleware, getFavorites);
router.post('/', authMiddleware, createFavorite);
router.post('/reset-defaults', authMiddleware, resetDefaults);
router.delete('/:id', authMiddleware, deleteFavorite);

export default router;
