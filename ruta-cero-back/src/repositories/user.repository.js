import { pool } from './db.js';

export const crearUsuario = async ({ nombre, email, password_hash }) => {
    const result = await pool.query(
        `INSERT INTO auth.usuarios (nombre, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, nombre, email, preferencias, avatar_url, creado_en`,
        [nombre, email, password_hash]
    );
    return result.rows[0];
};

export const buscarPorEmail = async (email) => {
    const result = await pool.query(
        'SELECT * FROM auth.usuarios WHERE email = $1',
        [email]
    );
    return result.rows[0] || null;
};

export const buscarPorId = async (id) => {
    const result = await pool.query(
        'SELECT id, nombre, email, preferencias, avatar_url, creado_en FROM auth.usuarios WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};

export const actualizarUsuario = async (id, campos) => {
    const keys = Object.keys(campos);
    if (keys.length === 0) return null;
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
    const valores = [id, ...keys.map(k => campos[k])];
    const result = await pool.query(
        `UPDATE auth.usuarios SET ${sets}, actualizado_en = now() WHERE id = $1
         RETURNING id, nombre, email, preferencias, avatar_url, creado_en`,
        valores
    );
    return result.rows[0] || null;
};
