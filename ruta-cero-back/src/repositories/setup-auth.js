import { pool } from './db.js';

const configurarAuth = async () => {
    try {
        console.log('⏳ Configurando esquema auth...');
        await pool.query('CREATE SCHEMA IF NOT EXISTS auth;');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS auth.usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                preferencias TEXT[] DEFAULT '{}',
                avatar_url VARCHAR(500),
                creado_en TIMESTAMPTZ DEFAULT now(),
                actualizado_en TIMESTAMPTZ DEFAULT now()
            );
        `);
        console.log('✅ Esquema auth y tabla usuarios listos.');
    } catch (error) {
        console.error('❌ Error configurando auth:', error.message);
    } finally {
        pool.end();
    }
};

configurarAuth();
