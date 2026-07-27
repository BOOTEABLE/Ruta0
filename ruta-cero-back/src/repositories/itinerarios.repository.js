import { pool } from './db.js';

export const findItinerariosByUsuarioId = async (usuarioId) => {
    const query = `
        SELECT id, usuario_id, nombre, descripcion, lugares_ids, created_at, updated_at
        FROM itinerarios
        WHERE usuario_id = $1
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [usuarioId]);
    return result.rows;
};

export const findItinerarioById = async (itinerarioId, usuarioId) => {
    const query = `
        SELECT id, usuario_id, nombre, descripcion, lugares_ids, created_at, updated_at
        FROM itinerarios
        WHERE id = $1 AND usuario_id = $2
    `;
    const result = await pool.query(query, [itinerarioId, usuarioId]);
    return result.rows[0] || null;
};

export const findItinerarioWithLugares = async (itinerarioId, usuarioId) => {
    const itinerario = await findItinerarioById(itinerarioId, usuarioId);
    if (!itinerario) return null;

    if (!itinerario.lugares_ids || itinerario.lugares_ids.length === 0) {
        return { ...itinerario, lugares: [] };
    }

    const query = `
        SELECT id, nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza
        FROM lugares
        WHERE id = ANY($1)
        ORDER BY array_position($1, id)
    `;
    const result = await pool.query(query, [itinerario.lugares_ids]);
    
    return { ...itinerario, lugares: result.rows };
};

export const createItinerario = async (usuarioId, { nombre, descripcion, lugaresIds }) => {
    const query = `
        INSERT INTO itinerarios (usuario_id, nombre, descripcion, lugares_ids)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const result = await pool.query(query, [usuarioId, nombre, descripcion, lugaresIds || []]);
    return result.rows[0];
};

export const updateItinerario = async (itinerarioId, usuarioId, { nombre, descripcion, lugaresIds }) => {
    const query = `
        UPDATE itinerarios
        SET nombre = COALESCE($3, nombre),
            descripcion = COALESCE($4, descripcion),
            lugares_ids = COALESCE($5, lugares_ids),
            updated_at = NOW()
        WHERE id = $1 AND usuario_id = $2
        RETURNING *;
    `;
    const result = await pool.query(query, [itinerarioId, usuarioId, nombre, descripcion, lugaresIds]);
    return result.rows[0] || null;
};

export const deleteItinerario = async (itinerarioId, usuarioId) => {
    const query = 'DELETE FROM itinerarios WHERE id = $1 AND usuario_id = $2 RETURNING *';
    const result = await pool.query(query, [itinerarioId, usuarioId]);
    return result.rows[0] || null;
};