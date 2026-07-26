import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './src/routes/chat.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import perfilRoutes from './src/routes/perfil.routes.js';
import { authenticateToken } from './src/middleware/auth.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Ruta 0 Backend corriendo' });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/perfil', authenticateToken, perfilRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});