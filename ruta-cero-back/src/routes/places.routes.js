import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getLugaresOverpass, getCategoriasOverpass } from '../controllers/places.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/categorias', getCategoriasOverpass);
router.get('/lugares', getLugaresOverpass);

export default router;