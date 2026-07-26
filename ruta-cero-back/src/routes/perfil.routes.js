import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
    obtenerPreferencias,
    actualizarPreferencias,
    listarItinerarios,
    obtenerItinerario,
    saveItinerario,
    updateItinerario,
    deleteItinerario,
    getRecomendaciones,
    checkOnboardingStatus,
    completeOnboarding
} from '../controllers/perfil.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/onboarding-status', checkOnboardingStatus);
router.post('/onboarding-complete', completeOnboarding);

router.get('/preferencias', obtenerPreferencias);
router.put('/preferencias', actualizarPreferencias);

router.get('/itinerarios', listarItinerarios);
router.post('/itinerarios', saveItinerario);
router.get('/itinerarios/:id', obtenerItinerario);
router.put('/itinerarios/:id', updateItinerario);
router.delete('/itinerarios/:id', deleteItinerario);

router.get('/recomendaciones', getRecomendaciones);

export default router;