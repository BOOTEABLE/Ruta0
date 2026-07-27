import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './src/routes/chat.routes.js';
import authRoutes from './src/routes/auth.routes.js';
import perfilRoutes from './src/routes/perfil.routes.js';
import placesRoutes from './src/routes/places.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import { authenticateToken } from './src/middleware/auth.middleware.js';
import { pool } from './src/repositories/db.js'; // 👈 IMPORTAR pool

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== MIDDLEWARE DE ESTADÍSTICAS DE API =====
// Función para registrar estadísticas
async function registrarEstadistica(req, res, duration) {
    try {
        // Obtener usuario ID (si está autenticado)
        const usuarioId = req.user?.id || null;
        const endpoint = req.path;
        const metodo = req.method;
        const exito = res.statusCode < 400;
        
        // Calcular tokens usados (estimación)
        let tokensUsed = 0;
        
        // Si es una petición al chat (Gemini)
        if (endpoint.includes('/chat') || endpoint.includes('/recomendaciones')) {
            const prompt = req.body?.mensaje || req.body?.texto || '';
            const response = res.locals?.respuesta || '';
            tokensUsed = Math.ceil((prompt.length + response.length) / 4);
            
            // Si hay respuesta de IA, usarla para calcular tokens
            if (res.locals?.tokens) {
                tokensUsed = res.locals.tokens;
            }
        }
        
        // Si es una petición a places (Overpass/Google)
        if (endpoint.includes('/places') || endpoint.includes('/lugares')) {
            // Registrar consultas a Overpass
            const categoria = req.query?.categoria || req.body?.categoria || '';
            // Las consultas a Overpass no usan tokens, pero registramos el tamaño de la respuesta
            const dataSize = res.locals?.dataSize || 0;
        }
        
        await pool.query(
            `INSERT INTO api_usage_stats 
             (endpoint, metodo, tokens_used, tiempo_respuesta, exito, usuario_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                endpoint,
                metodo,
                tokensUsed,
                duration,
                exito,
                usuarioId,
                JSON.stringify({
                    status: res.statusCode,
                    ip: req.ip || req.connection?.remoteAddress || '',
                    userAgent: req.headers['user-agent'] || ''
                })
            ]
        );
    } catch (error) {
        // No mostrar errores para no afectar la respuesta
        console.error('❌ Error registrando estadística:', error.message);
    }
}

// Middleware para interceptar todas las peticiones
app.use(async (req, res, next) => {
    const startTime = Date.now();
    
    // Guardar referencia para después
    req.startTime = startTime;
    
    // Interceptar el método json para capturar la respuesta
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        
        // Guardar datos de la respuesta para estadísticas
        res.locals.respuesta = data?.respuesta || data?.message || '';
        res.locals.dataSize = JSON.stringify(data).length;
        
        // Registrar estadística en background (sin esperar)
        registrarEstadistica(req, res, duration).catch(err => 
            console.error('Error registrando estadística:', err)
        );
        
        return originalJson.call(this, data);
    };
    
    next();
});

// ===== RUTAS =====

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Ruta 0 Backend corriendo' });
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/perfil', authenticateToken, perfilRoutes);
app.use('/api/places', authenticateToken, placesRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});