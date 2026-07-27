import { pool } from '../repositories/db.js';

const CACHE_TTL_HOURS = 24;

export async function getCachedPlaces(cacheKey) {
    const result = await pool.query(
        `SELECT data FROM google_places_cache 
         WHERE cache_key = $1 AND expires_at > NOW()`,
        [cacheKey]
    );
    return result.rows[0]?.data || null;
}

export async function setCachedPlaces(cacheKey, data) {
    await pool.query(
        `INSERT INTO google_places_cache (cache_key, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '${CACHE_TTL_HOURS} hours')
         ON CONFLICT (cache_key) DO UPDATE SET
            data = EXCLUDED.data,
            expires_at = NOW() + INTERVAL '${CACHE_TTL_HOURS} hours'`,
        [cacheKey, JSON.stringify(data)]
    );
}

export async function getCachedPlaceDetails(placeId) {
    const result = await pool.query(
        `SELECT data FROM google_place_details_cache 
         WHERE place_id = $1 AND expires_at > NOW()`,
        [placeId]
    );
    return result.rows[0]?.data || null;
}

export async function setCachedPlaceDetails(placeId, data) {
    await pool.query(
        `INSERT INTO google_place_details_cache (place_id, data, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '${CACHE_TTL_HOURS} hours')
         ON CONFLICT (place_id) DO UPDATE SET
            data = EXCLUDED.data,
            expires_at = NOW() + INTERVAL '${CACHE_TTL_HOURS} hours'`,
        [placeId, JSON.stringify(data)]
    );
}

export async function cleanExpiredCache() {
    const result = await pool.query(
        `DELETE FROM google_places_cache WHERE expires_at <= NOW()`
    );
    const detailsResult = await pool.query(
        `DELETE FROM google_place_details_cache WHERE expires_at <= NOW()`
    );
    return result.rowCount + detailsResult.rowCount;
}

export async function initCacheTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS google_places_cache (
            cache_key VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_google_places_cache_expires 
        ON google_places_cache(expires_at);
        
        CREATE TABLE IF NOT EXISTS google_place_details_cache (
            place_id VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_google_place_details_cache_expires 
        ON google_place_details_cache(expires_at);
    `);
    console.log('✅ Tablas de caché Google Places inicializadas');
}