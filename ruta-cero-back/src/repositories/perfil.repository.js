import { pool } from './db.js';

export const getPreferenciasByUsuarioId = async (usuarioId) => {
    const query = `
        SELECT usuario_id, categorias_favoritas, categorias_evitadas, presupuesto_minimo, presupuesto_maximo, created_at, updated_at
        FROM preferencias_usuario
        WHERE usuario_id = $1
    `;
    const result = await pool.query(query, [usuarioId]);
    return result.rows[0] || null;
};

export const upsertPreferencias = async (usuarioId, { categoriasFavoritas, categoriasEvitadas, presupuestoMinimo, presupuestoMaximo }) => {
    const query = `
        INSERT INTO preferencias_usuario (usuario_id, categorias_favoritas, categorias_evitadas, presupuesto_minimo, presupuesto_maximo, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (usuario_id) DO UPDATE SET
            categorias_favoritas = EXCLUDED.categorias_favoritas,
            categorias_evitadas = EXCLUDED.categorias_evitadas,
            presupuesto_minimo = EXCLUDED.presupuesto_minimo,
            presupuesto_maximo = EXCLUDED.presupuesto_maximo,
            updated_at = NOW()
        RETURNING usuario_id, categorias_favoritas, categorias_evitadas, presupuesto_minimo, presupuesto_maximo, created_at, updated_at
    `;
    const result = await pool.query(query, [usuarioId, categoriasFavoritas || [], categoriasEvitadas || [], presupuestoMinimo || null, presupuestoMaximo || null]);
    return result.rows[0];
};

export const listItinerariosByUsuarioId = async (usuarioId) => {
    const query = `
        SELECT id, usuario_id, nombre, descripcion, lugares_ids, created_at, updated_at
        FROM itinerarios
        WHERE usuario_id = $1
        ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [usuarioId]);
    return result.rows;
};

export const getItinerarioById = async (itinerarioId, usuarioId) => {
    const query = `
        SELECT i.id, i.usuario_id, i.nombre, i.descripcion, i.lugares_ids, i.created_at, i.updated_at
        FROM itinerarios i
        WHERE i.id = $1 AND i.usuario_id = $2
    `;
    const result = await pool.query(query, [itinerarioId, usuarioId]);
    if (result.rows.length === 0) return null;

    const itinerario = result.rows[0];
    if (itinerario.lugares_ids && itinerario.lugares_ids.length > 0) {
        const lugaresQuery = `
            SELECT id, nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza
            FROM lugares
            WHERE id = ANY($1)
        `;
        const lugaresResult = await pool.query(lugaresQuery, [itinerario.lugares_ids]);
        itinerario.lugares = lugaresResult.rows;
    } else {
        itinerario.lugares = [];
    }
    return itinerario;
};

export const saveItinerario = async (usuarioId, { nombre, descripcion, lugaresIds }) => {
    const query = `
        INSERT INTO itinerarios (usuario_id, nombre, descripcion, lugares_ids)
        VALUES ($1, $2, $3, $4)
        RETURNING id, usuario_id, nombre, descripcion, lugares_ids, created_at, updated_at
    `;
    const result = await pool.query(query, [usuarioId, nombre, descripcion, lugaresIds]);
    return result.rows[0];
};

export const updateItinerario = async (itinerarioId, usuarioId, { nombre, descripcion, lugaresIds }) => {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
        updates.push(`nombre = $${paramIndex++}`);
        params.push(nombre);
    }
    if (descripcion !== undefined) {
        updates.push(`descripcion = $${paramIndex++}`);
        params.push(descripcion);
    }
    if (lugaresIds !== undefined) {
        updates.push(`lugares_ids = $${paramIndex++}`);
        params.push(lugaresIds);
    }

    if (updates.length === 0) return null;

    updates.push(`updated_at = NOW()`);
    params.push(itinerarioId, usuarioId);

    const query = `
        UPDATE itinerarios
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND usuario_id = $${paramIndex}
        RETURNING id, usuario_id, nombre, descripcion, lugares_ids, created_at, updated_at
    `;

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;

    const itinerario = result.rows[0];
    if (itinerario.lugares_ids && itinerario.lugares_ids.length > 0) {
        const lugaresQuery = `
            SELECT id, nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza
            FROM lugares
            WHERE id = ANY($1)
        `;
        const lugaresResult = await pool.query(lugaresQuery, [itinerario.lugares_ids]);
        itinerario.lugares = lugaresResult.rows;
    }
    return itinerario;
};

export const deleteItinerario = async (itinerarioId, usuarioId) => {
    const query = `
        DELETE FROM itinerarios
        WHERE id = $1 AND usuario_id = $2
        RETURNING id
    `;
    const result = await pool.query(query, [itinerarioId, usuarioId]);
    return result.rows[0] || null;
};

export const getRecomendaciones = async (usuarioId, lat, lng, radio = 2000) => {
    const preferencias = await getPreferenciasByUsuarioId(usuarioId);
    
    const categoriasFavoritas = preferencias?.categorias_favoritas || [];
    const categoriasEvitadas = preferencias?.categorias_evitadas || [];

    let categoriaFilter = '';
    const params = [lng, lat, radio];
    let paramIndex = 4;

    if (categoriasFavoritas.length > 0) {
        const placeholders = categoriasFavoritas.map((_, i) => `$${paramIndex++}`).join(', ');
        params.push(...categoriasFavoritas);
        categoriaFilter = `AND lower(categoria) IN (${placeholders})`;
    }

    if (categoriasEvitadas.length > 0) {
        const placeholders = categoriasEvitadas.map((_, i) => `$${paramIndex++}`).join(', ');
        params.push(...categoriasEvitadas);
        categoriaFilter += ` AND lower(categoria) NOT IN (${placeholders})`;
    }

    const query = `
        SELECT id, nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza,
               ST_Distance(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distancia
        FROM lugares
        WHERE ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ${categoriaFilter}
        ORDER BY distancia ASC, confianza DESC
        LIMIT 15
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
        SET onboarding_completado = TRUE, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email, nombre, onboarding_completado, created_at
    `;
    const result = await pool.query(query, [usuarioId]);
    return result.rows[0] || null;
};

export const getUserById = async (usuarioId) => {
    const query = 'SELECT id, email, nombre, onboarding_completado, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [usuarioId]);
    return result.rows[0] || null;
};