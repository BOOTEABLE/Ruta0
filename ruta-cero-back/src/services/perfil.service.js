import { pool } from '../repositories/db.js';
import * as preferenciasRepo from '../repositories/preferencias.repository.js';
import * as itinerariosRepo from '../repositories/itinerarios.repository.js';

const RADIO_BUSQUEDA_DEFAULT = 2000;

export const getPreferencias = async (usuarioId) => {
    return await preferenciasRepo.findPreferenciasByUsuarioId(usuarioId);
};

export const updatePreferencias = async (usuarioId, data) => {
    const { categoriasFavoritas, categoriasEvitadas, presupuestoMinimo, presupuestoMaximo } = data;
    return await preferenciasRepo.upsertPreferencias(usuarioId, {
        categoriasFavoritas,
        categoriasEvitadas,
        presupuestoMinimo,
        presupuestoMaximo
    });
};

export const getItinerarios = async (usuarioId) => {
    return await itinerariosRepo.findItinerariosByUsuarioId(usuarioId);
};

export const getItinerario = async (itinerarioId, usuarioId) => {
    return await itinerariosRepo.findItinerarioById(itinerarioId, usuarioId);
};

export const getItinerarioConLugares = async (itinerarioId, usuarioId) => {
    return await itinerariosRepo.findItinerarioWithLugares(itinerarioId, usuarioId);
};

export const saveItinerario = async (usuarioId, { nombre, descripcion, lugaresIds }) => {
    return await itinerariosRepo.createItinerario(usuarioId, { nombre, descripcion, lugaresIds });
};

export const updateItinerario = async (itinerarioId, usuarioId, data) => {
    return await itinerariosRepo.updateItinerario(itinerarioId, usuarioId, data);
};

export const deleteItinerario = async (itinerarioId, usuarioId) => {
    return await itinerariosRepo.deleteItinerario(itinerarioId, usuarioId);
};

export const getRecomendaciones = async (usuarioId, lat, lng, radio = RADIO_BUSQUEDA_DEFAULT) => {
    const preferencias = await preferenciasRepo.findPreferenciasByUsuarioId(usuarioId);
    
    let categoriasInteres = preferencias?.categorias_favoritas || [];
    let categoriasEvitar = preferencias?.categorias_evitadas || [];

    // Usar IN / NOT IN con placeholders dinámicos - evita problemas con ANY/ALL
    const params = [lng, lat, radio];
    let categoriaFilter = '';
    let paramIndex = 4;

    if (categoriasInteres.length > 0) {
        const placeholders = categoriasInteres.map((_, i) => `$${paramIndex++}`).join(', ');
        params.push(...categoriasInteres.map(c => c.toLowerCase()));
        categoriaFilter += ` AND lower(categoria) IN (${placeholders})`;
    }

    if (categoriasEvitar.length > 0) {
        const placeholders = categoriasEvitar.map((_, i) => `$${paramIndex++}`).join(', ');
        params.push(...categoriasEvitar.map(c => c.toLowerCase()));
        categoriaFilter += ` AND lower(categoria) NOT IN (${placeholders})`;
    }

    const query = `
        SELECT id, nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza
        FROM lugares
        WHERE ST_DWithin(
            ubicacion::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            $3
        )
        ${categoriaFilter}
        ORDER BY ubicacion <-> ST_SetSRID(ST_MakePoint($1, $2), 4326), confianza DESC
        LIMIT 15;
    `;

    const result = await pool.query(query, params);
    return result.rows;
};

export const checkOnboardingStatus = async (usuarioId) => {
    const query = 'SELECT onboarding_completado FROM users WHERE id = $1';
    const result = await pool.query(query, [usuarioId]);
    return result.rows[0]?.onboarding_completado || false;
};

export const completeOnboarding = async (usuarioId) => {
    const query = `
        UPDATE users
        SET onboarding_completado = true, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, nombre, onboarding_completado, created_at
    `;
    const result = await pool.query(query, [usuarioId]);
    return result.rows[0] || null;
};