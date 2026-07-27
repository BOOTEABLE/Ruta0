// Importamos las funciones del servicio y les cambiamos el nombre a "Service" 
// para que no choquen con los nombres de este archivo
import { registerUser as registerService, loginUser as loginService } from '../services/auth.service.js';

export const registerUser = async (req, res) => {
    try {
        const { email, password, nombre } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Llamamos al servicio enviando los datos separados por comas, tal como lo pide tu auth.service.js
        const { user, token } = await registerService(email, password, nombre);
        res.status(201).json({ user, token });
    } catch (error) {
        console.error('❌ Error en registro:', error.message);
        if (error.message === 'El email ya está registrado') {
            return res.status(409).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Llamamos al servicio con los datos separados por comas
        const { user, token } = await loginService(email, password);
        res.json({ user, token });
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        if (error.message === 'Credenciales inválidas') {
            return res.status(401).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};