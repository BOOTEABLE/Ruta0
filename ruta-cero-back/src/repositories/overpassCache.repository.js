import { pool } from '../repositories/db.js';

const CACHE_TTL_HOURS = 24;

export async function getCachedPlaces(cacheKey) {
    const result = await pool.query(
        `SELECT data FROM overpass_places_cache 
         WHERE cache_key = $1 AND expires_at > NOW()`,
        [cacheKey]
    );
    return result.rows[0]?.data || null;
}

export async function setCachedPlaces(cacheKey, data) {
    await pool.query(
        `INSERT INTO overpass_places_cache (cache_key, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '${CACHE_TTL_HOURS} hours')
         ON CONFLICT (cache_key) DO UPDATE SET
            data = EXCLUDED.data,
            expires_at = NOW() + INTERVAL '${CACHE_TTL_HOURS} hours'`,
        [cacheKey, JSON.stringify(data)]
    );
}

export async function cleanExpiredCache() {
    const result = await pool.query(
        `DELETE FROM overpass_places_cache WHERE expires_at <= NOW()`
    );
    return result.rowCount;
}

export async function initCacheTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS overpass_places_cache (
            cache_key VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_overpass_places_cache_expires 
        ON overpass_places_cache(expires_at);
    `);
    console.log('✅ Tablas de caché Overpass inicializadas');
}