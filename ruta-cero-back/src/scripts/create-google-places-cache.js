import { pool } from './db.js';

export async function createGooglePlacesCacheTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS google_places_cache (
            cache_key VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_google_places_cache_expires 
        ON google_places_cache(expires_at);
    `;

    try {
        await pool.query(sql);
        console.log('✅ Tabla google_places_cache creada/verificada');
    } catch (error) {
        console.error('❌ Error creando tabla google_places_cache:', error.message);
        throw error;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    await createGooglePlacesCacheTable();
    await pool.end();
    console.log('✅ Migración completada');
}