import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import chatRoutes from './src/routes/chat.routes.js';
import authRoutes from './src/routes/auth.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Seguridad y parsing
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Ruta 0 Backend corriendo' });
});

// Rutas
app.use('/api/chat', chatRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});