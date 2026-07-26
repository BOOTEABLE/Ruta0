import { verifyToken, getUserFromToken } from '../services/auth.service.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const user = await getUserFromToken(token);
    if (!user) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    req.user = user;
    next();
};

export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        const user = await getUserFromToken(token);
        if (user) req.user = user;
    }
    next();
};