import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getLugaresOverpass, getLugaresMultiples, getCategoriasOverpass } from '../controllers/places.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/categorias', getCategoriasOverpass);
router.get('/lugares', getLugaresOverpass);
router.get('/lugares-multiples', getLugaresMultiples);

export default router;