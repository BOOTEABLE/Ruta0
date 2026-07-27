import { pool } from '../repositories/db.js';

const runMigrations = async () => {
    try {
        console.log("⏳ Ejecutando migraciones seguras...");

        // 👇 RESETEO DE TABLAS MAL CREADAS 👇
        await pool.query('DROP TABLE IF EXISTS preferencias_usuario CASCADE;');
        await pool.query('DROP TABLE IF EXISTS itinerarios CASCADE;');
        console.log("🗑️ Tablas nuevas reseteadas correctamente.");
        // 👆 FIN DE RESETEO 👆

        // 1. Añadir columna onboarding_completado a users si no existe
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT FALSE;
        `);
        console.log("✅ Columna 'onboarding_completado' añadida a users.");

        // 2. Crear tabla preferencias_usuario si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS preferencias_usuario (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                categorias_favoritas TEXT[] DEFAULT '{}',
                categorias_evitadas TEXT[] DEFAULT '{}',
                presupuesto_minimo VARCHAR(20),
                presupuesto_maximo VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE (usuario_id)
            );
        `);
        console.log("✅ Tabla 'preferencias_usuario' creada/verificada.");

        // 3. Crear tabla itinerarios si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS itinerarios (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                nombre VARCHAR(200) NOT NULL,
                descripcion TEXT,
                lugares_ids INTEGER[] NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Tabla 'itinerarios' creada/verificada.");

        // 4. Índices para performance
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_preferencias_usuario ON preferencias_usuario(usuario_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_itinerarios_usuario ON itinerarios(usuario_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_itinerarios_lugares_gin ON itinerarios USING GIN (lugares_ids);`);
        console.log("✅ Índices creados/verificados.");

        console.log("✅ Migraciones completadas exitosamente. ¡Base de datos lista para producción!");

    } catch (error) {
        console.error("❌ Error ejecutando migraciones:", error.message);
        throw error;
    } finally {
        pool.end();
    }
};

runMigrations();