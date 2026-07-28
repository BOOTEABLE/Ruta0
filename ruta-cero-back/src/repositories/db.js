import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para conexiones seguras en la nube
    },
    max: 20, // Máximo 20 conexiones al mismo tiempo
    idleTimeoutMillis: 30000 // Cierra conexiones inactivas después de 30 seg
});

// Este console.log solo debería aparecer UNA VEZ cuando el servidor arranca
console.log("📦 Conectado a la Base de Datos PostgreSQL");