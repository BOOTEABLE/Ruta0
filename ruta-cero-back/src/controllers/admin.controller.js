import { pool } from '../repositories/db.js';
import { cleanExpiredCache } from '../repositories/overpassCache.repository.js';

// ===== CACHÉ =====
export const getCacheStats = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                cache_key,
                data,
                expires_at,
                created_at,
                jsonb_array_length(data) as lugares_count
            FROM overpass_places_cache
            WHERE expires_at > NOW()
            ORDER BY created_at DESC
        `);

        const totalLugares = result.rows.reduce((sum, row) => sum + parseInt(row.lugares_count), 0);

        res.json({
            totalEntradas: result.rows.length,
            totalLugares,
            entradas: result.rows.map(row => ({
                cacheKey: row.cache_key,
                lugares: row.lugares_count,
                expira: row.expires_at,
                creada: row.created_at
            }))
        });
    } catch (error) {
        console.error('❌ Error obteniendo stats de caché:', error.message);
        res.status(500).json({ error: 'Error obteniendo estadísticas de caché' });
    }
};

export const getCacheLugares = async (req, res) => {
    try {
        const { cacheKey } = req.query;

        let query = `
            SELECT cache_key, data, expires_at, created_at
            FROM overpass_places_cache
            WHERE expires_at > NOW()
            ORDER BY created_at DESC
        `;
        const params = [];

        if (cacheKey) {
            query = `
                SELECT cache_key, data, expires_at, created_at
                FROM overpass_places_cache
                WHERE cache_key = $1 AND expires_at > NOW()
            `;
            params.push(cacheKey);
        }

        const result = await pool.query(query, params);

        res.json({
            total: result.rows.length,
            entradas: result.rows.map(row => ({
                cacheKey: row.cache_key,
                lugares: row.data,
                expira: row.expires_at,
                creada: row.created_at
            }))
        });
    } catch (error) {
        console.error('❌ Error obteniendo lugares de caché:', error.message);
        res.status(500).json({ error: 'Error obteniendo lugares de caché' });
    }
};

export const clearCache = async (req, res) => {
    try {
        const { cacheKey } = req.body;

        let result;
        if (cacheKey) {
            result = await pool.query(
                'DELETE FROM overpass_places_cache WHERE cache_key = $1',
                [cacheKey]
            );
            console.log(`🗑️ Cache eliminado manualmente: ${cacheKey} (${result.rowCount} entradas)`);
        } else {
            result = await pool.query('DELETE FROM overpass_places_cache WHERE expires_at <= NOW()');
            console.log(`🧹 Cache expirado limpiado automáticamente: ${result.rowCount} entradas`);
        }

        res.json({ 
            mensaje: cacheKey ? 'Caché específica eliminada' : 'Caché expirada limpiada',
            eliminadas: result.rowCount 
        });
    } catch (error) {
        console.error('❌ Error limpiando caché:', error.message);
        res.status(500).json({ error: 'Error limpiando caché' });
    }
};

export const refreshCache = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM overpass_places_cache');
        console.log(`🔄 Caché refrescada: ${result.rowCount} entradas eliminadas`);
        res.json({ 
            mensaje: 'Caché refrescada correctamente',
            eliminadas: result.rowCount
        });
    } catch (error) {
        console.error('❌ Error refrescando caché:', error.message);
        res.status(500).json({ error: 'Error refrescando caché' });
    }
};

// ===== USUARIOS =====
export const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, 
                email, 
                nombre, 
                rol, 
                onboarding_completado,
                created_at,
                updated_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json({
            total: result.rows.length,
            usuarios: result.rows.map(row => ({
                id: row.id,
                email: row.email,
                nombre: row.nombre,
                rol: row.rol,
                onboardingCompletado: row.onboarding_completado,
                creado: row.created_at,
                actualizado: row.updated_at
            }))
        });
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error.message);
        res.status(500).json({ error: 'Error obteniendo lista de usuarios' });
    }
};

export const toggleUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { rol } = req.body;

        if (!['user', 'admin'].includes(rol)) {
            return res.status(400).json({ error: 'Rol inválido. Debe ser "user" o "admin"' });
        }

        const result = await pool.query(
            'UPDATE users SET rol = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, nombre, rol',
            [rol, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ 
            mensaje: 'Rol actualizado correctamente',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error actualizando rol:', error.message);
        res.status(500).json({ error: 'Error actualizando rol de usuario' });
    }
};

export const getUserStats = async (req, res) => {
    try {
        const totalResult = await pool.query('SELECT COUNT(*) as total FROM users');
        const adminResult = await pool.query("SELECT COUNT(*) as admin FROM users WHERE rol = 'admin'");
        const onboardingResult = await pool.query('SELECT COUNT(*) as sin_onboarding FROM users WHERE onboarding_completado = false');
        
        const recentResult = await pool.query(`
            SELECT id, email, nombre, rol, onboarding_completado, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);

        res.json({
            totalUsuarios: parseInt(totalResult.rows[0].total),
            adminUsuarios: parseInt(adminResult.rows[0].admin),
            usuariosSinOnboarding: parseInt(onboardingResult.rows[0].sin_onboarding),
            usuarios: recentResult.rows.map(row => ({
                id: row.id,
                email: row.email,
                nombre: row.nombre,
                rol: row.rol,
                onboardingCompletado: row.onboarding_completado,
                creado: row.created_at
            }))
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de usuarios:', error.message);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
        }

        const result = await pool.query(
            'DELETE FROM users WHERE id = $1 RETURNING id, email, nombre',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ 
            message: 'Usuario eliminado correctamente',
            usuario: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error eliminando usuario:', error.message);
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
};

// ===== ESTADÍSTICAS DE CATEGORÍAS =====
export const getCategoryStats = async (req, res) => {
    try {
        const cacheStats = await pool.query(`
            SELECT 
                SUBSTRING(cache_key FROM 'overpass:([^:]+):') as categoria,
                COUNT(*) as total_consultas,
                SUM(jsonb_array_length(data)) as total_lugares
            FROM overpass_places_cache
            WHERE expires_at > NOW()
            GROUP BY SUBSTRING(cache_key FROM 'overpass:([^:]+):')
            ORDER BY total_consultas DESC
        `);

        const userPreferences = await pool.query(`
            SELECT 
                u.categoria,
                COUNT(*) as total_usuarios
            FROM (
                SELECT unnest(categorias_favoritas) as categoria
                FROM user_preferences
            ) u
            GROUP BY u.categoria
            ORDER BY total_usuarios DESC
        `);

        res.json({
            cache: cacheStats.rows,
            preferencias: userPreferences.rows
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de categorías:', error.message);
        res.status(500).json({ error: 'Error obteniendo estadísticas de categorías' });
    }
};

// ===== DESTACADOS PERSONALES =====

// Obtener destacados del usuario actual
export const getMisDestacados = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const result = await pool.query(
            `SELECT * FROM lugares_destacados 
             WHERE usuario_id = $1 AND activo = true 
             ORDER BY created_at DESC`,
            [usuarioId]
        );
        res.json({ destacados: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo mis destacados:', error.message);
        res.status(500).json({ error: 'Error obteniendo tus lugares destacados' });
    }
};

// Obtener TODOS los destacados (solo admin)
export const getAllDestacados = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, u.nombre as usuario_nombre, u.email as usuario_email
            FROM lugares_destacados d
            JOIN users u ON d.usuario_id = u.id
            WHERE d.activo = true
            ORDER BY d.created_at DESC
        `);
        res.json({ destacados: result.rows });
    } catch (error) {
        console.error('❌ Error obteniendo todos los destacados:', error.message);
        res.status(500).json({ error: 'Error obteniendo lugares destacados' });
    }
};

// Crear destacado (para cualquier usuario)
export const createDestacado = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { nombre, categoria, descripcion, latitud, longitud, direccion, horario, precio, imagen_url } = req.body;

        // Verificar si ya existe este lugar para este usuario
        const existing = await pool.query(
            'SELECT id FROM lugares_destacados WHERE usuario_id = $1 AND nombre = $2 AND latitud = $3 AND activo = true',
            [usuarioId, nombre, latitud]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Este lugar ya está en tus destacados' });
        }

        const result = await pool.query(`
            INSERT INTO lugares_destacados 
            (usuario_id, nombre, categoria, descripcion, latitud, longitud, direccion, horario, precio, imagen_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [usuarioId, nombre, categoria, descripcion, latitud, longitud, direccion, horario, precio, imagen_url]);

        res.status(201).json({ 
            mensaje: 'Lugar destacado creado correctamente',
            destacado: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error creando destacado:', error.message);
        res.status(500).json({ error: 'Error creando lugar destacado' });
    }
};

// Actualizar destacado (usuario solo puede actualizar los suyos)
export const updateDestacado = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.user.id;
        const { nombre, categoria, descripcion, latitud, longitud, direccion, horario, precio, imagen_url } = req.body;

        const result = await pool.query(
            `UPDATE lugares_destacados 
             SET nombre = $1, categoria = $2, descripcion = $3, latitud = $4, 
                 longitud = $5, direccion = $6, horario = $7, precio = $8, 
                 imagen_url = $9, updated_at = NOW()
             WHERE id = $10 AND usuario_id = $11 AND activo = true
             RETURNING *`,
            [nombre, categoria, descripcion, latitud, longitud, direccion, horario, precio, imagen_url, id, usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lugar destacado no encontrado o no autorizado' });
        }

        res.json({ 
            mensaje: 'Lugar destacado actualizado correctamente',
            destacado: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error actualizando destacado:', error.message);
        res.status(500).json({ error: 'Error actualizando lugar destacado' });
    }
};

// Eliminar destacado (usuario solo puede eliminar los suyos, admin puede eliminar todos)
export const deleteDestacado = async (req, res) => {
    try {
        const { id } = req.params;
        const usuarioId = req.user.id;
        const esAdmin = req.user.rol === 'admin';

        let query, params;
        if (esAdmin) {
            query = 'UPDATE lugares_destacados SET activo = false, updated_at = NOW() WHERE id = $1 AND activo = true RETURNING *';
            params = [id];
        } else {
            query = 'UPDATE lugares_destacados SET activo = false, updated_at = NOW() WHERE id = $1 AND usuario_id = $2 AND activo = true RETURNING *';
            params = [id, usuarioId];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lugar destacado no encontrado o no autorizado' });
        }

        res.json({ 
            mensaje: 'Lugar destacado eliminado correctamente',
            destacado: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Error eliminando destacado:', error.message);
        res.status(500).json({ error: 'Error eliminando lugar destacado' });
    }
};
// ===== ESTADÍSTICAS DE USO DE API =====
export const getApiStats = async (req, res) => {
    try {
        // 1. Resumen general
        const summary = await pool.query(`
            SELECT 
                COUNT(*) as total_peticiones,
                SUM(tokens_used) as total_tokens,
                AVG(tiempo_respuesta) as avg_tiempo,
                SUM(CASE WHEN exito = true THEN 1 ELSE 0 END) as peticiones_exitosas,
                COUNT(DISTINCT usuario_id) as usuarios_activos
            FROM api_usage_stats
            WHERE fecha >= NOW() - INTERVAL '30 days'
        `);

        // 2. Peticiones por endpoint
        const byEndpoint = await pool.query(`
            SELECT 
                endpoint,
                COUNT(*) as total,
                AVG(tiempo_respuesta) as avg_tiempo,
                SUM(tokens_used) as tokens
            FROM api_usage_stats
            WHERE fecha >= NOW() - INTERVAL '30 days'
            GROUP BY endpoint
            ORDER BY total DESC
        `);

        // 3. Peticiones por día (últimos 7 días)
        const byDay = await pool.query(`
            SELECT 
                DATE(fecha) as dia,
                COUNT(*) as peticiones,
                SUM(tokens_used) as tokens
            FROM api_usage_stats
            WHERE fecha >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(fecha)
            ORDER BY dia ASC
        `);

        // 4. Estadísticas de caché
        const cacheStats = await pool.query(`
            SELECT 
                tipo,
                accion,
                COUNT(*) as total
            FROM cache_stats
            WHERE fecha >= NOW() - INTERVAL '30 days'
            GROUP BY tipo, accion
            ORDER BY tipo, accion
        `);

        res.json({
            summary: {
                totalPeticiones: parseInt(summary.rows[0]?.total_peticiones || 0),
                totalTokens: parseInt(summary.rows[0]?.total_tokens || 0),
                avgTiempo: Math.round(summary.rows[0]?.avg_tiempo || 0),
                peticionesExitosas: parseInt(summary.rows[0]?.peticiones_exitosas || 0),
                usuariosActivos: parseInt(summary.rows[0]?.usuarios_activos || 0)
            },
            byEndpoint: byEndpoint.rows,
            byDay: byDay.rows,
            cache: cacheStats.rows
        });
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas de API:', error.message);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
};