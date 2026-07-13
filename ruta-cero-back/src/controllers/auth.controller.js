import * as authService from '../services/auth.service.js';

export const register = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'nombre, email y password son requeridos' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const resultado = await authService.registrar({ nombre, email, password });
        res.status(201).json(resultado);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email y password son requeridos' });
        }
        const resultado = await authService.login({ email, password });
        res.json(resultado);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};

export const me = async (req, res) => {
    try {
        const usuario = await authService.obtenerPerfil(req.userId);
        res.json({ usuario });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ error: error.message });
    }
};
