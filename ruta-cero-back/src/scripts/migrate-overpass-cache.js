import { pool } from '../repositories/db.js';

async function migrate() {
    try {
        console.log('🔧 Iniciando migración de tablas de caché Overpass...');
        
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
    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();