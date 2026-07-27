import { Router } from 'express';
import { authenticateToken, verifyAdmin } from '../middleware/auth.middleware.js';
import {
    // Caché
    getCacheStats,
    getCacheLugares,
    clearCache,
    refreshCache,
    // Usuarios
    getAllUsers,
    toggleUserRole,
    getUserStats,
    deleteUser,
    // Estadísticas
    getCategoryStats,
    // Lugares Destacados
    getMisDestacados,      // 👈 NUEVO: Obtener destacados del usuario actual
    getAllDestacados,      // 👈 NUEVO: Obtener TODOS los destacados (solo admin)
    createDestacado,
    deleteDestacado,
    updateDestacado,
    getApiStats
} from '../controllers/admin.controller.js';

const router = Router();

// ===== MIDDLEWARE DE AUTENTICACIÓN (para TODAS las rutas) =====
router.use(authenticateToken);

// ===== GESTIÓN DE CACHÉ (solo admin) =====
router.get('/cache/stats', verifyAdmin, getCacheStats);
router.get('/cache/lugares', verifyAdmin, getCacheLugares);
router.post('/cache/clear', verifyAdmin, clearCache);
router.post('/cache/refresh', verifyAdmin, refreshCache);

// ===== GESTIÓN DE USUARIOS (solo admin) =====
router.get('/usuarios', verifyAdmin, getAllUsers);
router.get('/usuarios/stats', verifyAdmin, getUserStats);
router.patch('/usuarios/:id/rol', verifyAdmin, toggleUserRole);
router.delete('/usuarios/:id', verifyAdmin, deleteUser);

// ===== ESTADÍSTICAS DE CATEGORÍAS (solo admin) =====
router.get('/stats/categorias', verifyAdmin, getCategoryStats);
router.get('/stats/api', verifyAdmin, getApiStats)

// ===== LUGARES DESTACADOS =====
// Rutas para TODOS los usuarios autenticados
router.get('/destacados/mis', getMisDestacados);        // 👈 Obtener mis destacados
router.post('/destacados', createDestacado);             // 👈 Crear destacado
router.delete('/destacados/:id', deleteDestacado);       // 👈 Eliminar destacado (propio)
router.put('/destacados/:id', updateDestacado);          // 👈 Actualizar destacado (propio)

// Rutas SOLO para admin
router.get('/destacados/todos', verifyAdmin, getAllDestacados);  // 👈 Ver todos los destacados

export default router;