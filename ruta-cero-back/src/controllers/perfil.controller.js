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
        
        // 👈 Asegurar que cada itinerario tenga lugaresIds
        const itinerariosConIds = itinerarios.map(it => ({
            ...it,
            lugaresIds: it.lugares_ids || it.lugaresIds || []
        }));
        
        res.json({ itinerarios: itinerariosConIds });
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

        // 👈 Asegurar que devuelve lugaresIds
        res.json({ 
            itinerario: {
                ...itinerario,
                lugaresIds: itinerario.lugares_ids || itinerario.lugaresIds || []
            }
        });
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
        
        // 👈 Asegurar que devuelve lugaresIds correctamente
        res.status(201).json({ 
            itinerario: {
                id: itinerario.id,
                nombre: itinerario.nombre,
                descripcion: itinerario.descripcion,
                lugaresIds: itinerario.lugares_ids || lugaresIds || [], // 👈 ESTO ES CLAVE
                createdAt: itinerario.created_at,
                updatedAt: itinerario.updated_at
            }
        });
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
        
        console.log('🔵 Onboarding completado para usuario:', user.email);
        console.log('🔵 Rol del usuario:', user.rol);
        
        // 👈 Asegurar que devuelve TODOS los campos necesarios
        res.json({ 
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                rol: user.rol || 'user', // 👈 ESTO ES CLAVE
                onboarding_completado: user.onboarding_completado || true,
                created_at: user.created_at
            },
            onboardingCompletado: true 
        });
    } catch (error) {
        console.error('❌ Error completando onboarding:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};