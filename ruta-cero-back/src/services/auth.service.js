import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/user.repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ruta0-dev-secret-change-in-production';
const JWT_EXPIRES = '7d';

const SALT_ROUNDS = 10;

export const registrar = async ({ nombre, email, password }) => {
    const existente = await userRepo.buscarPorEmail(email);
    if (existente) {
        throw Object.assign(new Error('El correo ya está registrado'), { status: 409 });
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const usuario = await userRepo.crearUsuario({ nombre, email, password_hash });
    const token = jwt.sign({ sub: usuario.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return { usuario, token };
};

export const login = async ({ email, password }) => {
    const usuario = await userRepo.buscarPorEmail(email);
    if (!usuario) {
        throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
    }
    const valida = await bcrypt.compare(password, usuario.password_hash);
    if (!valida) {
        throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
    }
    const token = jwt.sign({ sub: usuario.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    const { password_hash, ...usuarioSinHash } = usuario;
    return { usuario: usuarioSinHash, token };
};

export const obtenerPerfil = async (userId) => {
    const usuario = await userRepo.buscarPorId(userId);
    if (!usuario) {
        throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    }
    return usuario;
};

export const verificarToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
