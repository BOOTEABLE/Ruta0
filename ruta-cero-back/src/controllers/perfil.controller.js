import {
    getPreferencias,
    updatePreferencias,
    getItinerarios,
    getItinerarioConLugares,
    saveItinerario as saveItinerarioService,
    updateItinerario as updateItinerarioService,
    deleteItinerario as deleteItinerarioService,
    getRecomendaciones as getRecomendacionesService,
    checkOnboardingStatus as checkOnboardingStatusService,
    completeOnboarding as completeOnboardingService
} from '../services/perfil.service.js';

export const obtenerPreferencias = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const preferencias = await getPreferencias(usuarioId);
        res.json({ preferencias });
    } catch (error) {
        console.error('❌ Error obteniendo preferencias:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const actualizarPreferencias = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { categoriasFavoritas, categoriasEvitadas, presupuestoMinimo, presupuestoMaximo } = req.body;

        const preferencias = await updatePreferencias(usuarioId, {
            categoriasFavoritas,
            categoriasEvitadas,
            presupuestoMinimo,
            presupuestoMaximo
        });

        res.json({ preferencias });
    } catch (error) {
        console.error('❌ Error actualizando preferencias:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const listarItinerarios = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const itinerarios = await getItinerarios(usuarioId);
        res.json({ itinerarios });
    } catch (error) {
        console.error('❌ Error listando itinerarios:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const obtenerItinerario = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { id } = req.params;

        const itinerario = await getItinerarioConLugares(parseInt(id), usuarioId);
        if (!itinerario) {
            return res.status(404).json({ error: 'Itinerario no encontrado' });
        }

        res.json({ itinerario });
    } catch (error) {
        console.error('❌ Error obteniendo itinerario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const saveItinerario = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { nombre, descripcion, lugaresIds } = req.body;

        if (!nombre || !lugaresIds || lugaresIds.length === 0) {
            return res.status(400).json({ error: 'Nombre y lista de lugares son requeridos' });
        }

        const itinerario = await saveItinerarioService(usuarioId, { nombre, descripcion, lugaresIds });
        res.status(201).json({ itinerario });
    } catch (error) {
        console.error('❌ Error guardando itinerario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const updateItinerario = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { id } = req.params;
        const { nombre, descripcion, lugaresIds } = req.body;

        const itinerario = await updateItinerarioService(parseInt(id), usuarioId, { nombre, descripcion, lugaresIds });
        if (!itinerario) {
            return res.status(404).json({ error: 'Itinerario no encontrado' });
        }

        res.json({ itinerario });
    } catch (error) {
        console.error('❌ Error actualizando itinerario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const deleteItinerario = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { id } = req.params;

        const itinerario = await deleteItinerarioService(parseInt(id), usuarioId);
        if (!itinerario) {
            return res.status(404).json({ error: 'Itinerario no encontrado' });
        }

        res.json({ message: 'Itinerario eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error eliminando itinerario:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getRecomendaciones = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { lat, lng, radio } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitud y longitud son requeridas' });
        }

        const lugares = await getRecomendacionesService(usuarioId, parseFloat(lat), parseFloat(lng), parseInt(radio) || 2000);

        res.json({
            respuesta: `Encontré ${lugares.length} lugares que coinciden con tus preferencias.`,
            lugaresFisicos: lugares
        });
    } catch (error) {
        console.error('❌ Error obteniendo recomendaciones:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const checkOnboardingStatus = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const completado = await checkOnboardingStatusService(usuarioId);
        res.json({ onboardingCompletado: completado });
    } catch (error) {
        console.error('❌ Error verificando onboarding:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const completeOnboarding = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const user = await completeOnboardingService(usuarioId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ user });
    } catch (error) {
        console.error('❌ Error completando onboarding:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};