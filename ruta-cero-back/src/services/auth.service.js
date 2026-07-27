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
    const payload = { 
        id: user.id, 
        email: user.email, 
        rol: user.rol 
    };
    
    console.log('🔵 GENERANDO TOKEN - Payload:', payload);
    console.log('🔵 Rol en payload:', payload.rol);
    console.log('🔵 Tipo de rol:', typeof payload.rol);
    
    const token = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
    
    console.log('🔵 Token generado (primeros 50 chars):', token.substring(0, 50) + '...');
    
    return token;
};

export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('🔵 Token verificado - Decoded:', decoded);
        return decoded;
    } catch (error) {
        console.error('❌ Error verificando token:', error.message);
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
    
    console.log('🔵 Registrando usuario:', email);
    console.log('🔵 Rol asignado:', rol);
    
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, nombre, rol) VALUES ($1, $2, $3, $4)
         RETURNING id, email, nombre, rol, onboarding_completado, created_at`,
        [email, passwordHash, nombre, rol]
    );
    const user = result.rows[0];
    console.log('🔵 Usuario creado:', user);
    
    const token = generateToken(user);
    return { user, token };
};

export const loginUser = async (email, password) => {
    console.log('🔵 LOGIN - Email:', email);
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user) {
        console.log('❌ Usuario no encontrado');
        throw new Error('Credenciales inválidas');
    }

    console.log('🔵 Usuario encontrado:', user.email);
    console.log('🔵 Rol en BD:', user.rol);
    console.log('🔵 Tipo de rol en BD:', typeof user.rol);

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
        console.log('❌ Contraseña incorrecta');
        throw new Error('Credenciales inválidas');
    }

    console.log('✅ Contraseña correcta');

    const userPublic = {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        onboarding_completado: user.onboarding_completado,
        created_at: user.created_at
    };
    
    console.log('🔵 userPublic:', userPublic);
    console.log('🔵 userPublic.rol:', userPublic.rol);
    
    const token = generateToken(userPublic);
    
    console.log('✅ Login exitoso para:', email);
    
    return { user: userPublic, token };
};