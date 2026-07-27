import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../repositories/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET no está definido en .env');
}

export const hashPassword = async (password) => {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

export const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, rol: user.rol },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export const getUserFromToken = async (token) => {
    const decoded = verifyToken(token);
    if (!decoded) return null;

    const result = await pool.query(
        'SELECT id, email, nombre, rol, onboarding_completado, created_at FROM users WHERE id = $1',
        [decoded.id]
    );
    return result.rows[0] || null;
};

export const registerUser = async (email, password, nombre) => {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
        throw new Error('El email ya está registrado');
    }

    const passwordHash = await hashPassword(password);
    // Asignar rol 'admin' si es admin@gmail.com, sino 'user'
    const rol = email.toLowerCase() === 'admin@gmail.com' ? 'admin' : 'user';
    
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, nombre, rol) VALUES ($1, $2, $3, $4)
         RETURNING id, email, nombre, rol, onboarding_completado, created_at`,
        [email, passwordHash, nombre, rol]
    );
    const user = result.rows[0];
    const token = generateToken(user);
    return { user, token };
};

export const loginUser = async (email, password) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
        throw new Error('Credenciales inválidas');
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        throw new Error('Credenciales inválidas');
    }

    const userPublic = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        onboarding_completado: user.onboarding_completado,
        created_at: user.created_at
    };
    const token = generateToken(userPublic);
    return { user: userPublic, token };
};