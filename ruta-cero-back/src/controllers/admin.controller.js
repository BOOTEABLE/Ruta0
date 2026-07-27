import { pool } from '../repositories/db.js';
import { cleanExpiredCache } from '../repositories/overpassCache.repository.js';

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