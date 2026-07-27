import { Router } from 'express';
import { getLugaresMultiples, getCategoriasOverpass } from '../controllers/places.controller.js';

const router = Router();

router.use((req, res, next) => {
    // Log para debugging
    console.log(`📍 Admin route: ${req.method} ${req.path}`);
    next();
});

router.get('/categorias', getCategoriasOverpass);
router.get('/lugares-multiples', getLugaresMultiples);

export default router;