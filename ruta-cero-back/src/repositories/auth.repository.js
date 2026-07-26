import { pool } from './db.js';

export const findUserByEmail = async (email) => {
    const query = 'SELECT id, email, password_hash, nombre FROM users WHERE email = $1';
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
};

export const findUserById = async (id) => {
    const query = 'SELECT id, email, nombre FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
};

export const createUser = async ({ email, passwordHash, nombre }) => {
    const query = `
        INSERT INTO users (email, password_hash, nombre)
        VALUES ($1, $2, $3)
        RETURNING id, email, nombre, created_at
    `;
    const result = await pool.query(query, [email.toLowerCase().trim(), passwordHash, nombre?.trim() || null]);
    return result.rows[0];
};