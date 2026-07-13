import { verificarToken } from '../services/auth.service.js';

export const requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token requerido' });
    }
    try {
        const payload = verificarToken(header.split(' ')[1]);
        req.userId = payload.sub;
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};
