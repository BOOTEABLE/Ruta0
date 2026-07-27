import { pool } from '../repositories/db.js';
import { initCacheTables } from '../repositories/googlePlacesCache.repository.js';

async function migrate() {
    try {
        console.log('🔧 Iniciando migración de tablas de caché Google Places...');
        await initCacheTables();
        console.log('✅ Migración completada');
    } catch (error) {
        console.error('❌ Error en migración:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();