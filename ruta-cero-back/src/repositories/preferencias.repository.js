import { pool } from './db.js';

export const findPreferenciasByUsuarioId = async (usuarioId) => {
    const query = `
        SELECT 
            categorias_favoritas,
            categorias_evitadas,
            presupuesto_minimo,
            presupuesto_maximo,
            created_at,
            updated_at
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
        RETURNING *;
    `;
    const result = await pool.query(query, [
        usuarioId,
        categoriasFavoritas || [],
        categoriasEvitadas || [],
        presupuestoMinimo || null,
        presupuestoMaximo || null
    ]);
    return result.rows[0];
};

export const deletePreferencias = async (usuarioId) => {
    const query = 'DELETE FROM preferencias_usuario WHERE usuario_id = $1 RETURNING *';
    const result = await pool.query(query, [usuarioId]);
    return result.rows[0] || null;
};