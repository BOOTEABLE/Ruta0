import { pool } from './db.js';

const configurarBaseDeDatos = async () => {
    try {
        console.log("⏳ Conectando a PostgreSQL y preparando terreno...");
        
        // 1. Activamos los superpoderes espaciales de PostGIS
        await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');

        // 2. Borramos las tablas viejas (orden: users primero por FK si la hubiera)
        await pool.query('DROP TABLE IF EXISTS lugares;');
        await pool.query('DROP TABLE IF EXISTS users;');

        // 3. Creamos la tabla USUARIOS
        await pool.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                nombre VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Tabla 'users' creada.");

        // 4. Creamos la tabla LUGARES con soporte PostGIS y nuevas columnas
        await pool.query(`
            CREATE TABLE lugares (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) UNIQUE NOT NULL, -- Agregado UNIQUE para que funcione el ETL
                categoria VARCHAR(50) NOT NULL,
                precio VARCHAR(20),
                descripcion TEXT,
                latitud DECIMAL(10, 8),
                longitud DECIMAL(11, 8),
                ubicacion GEOMETRY(Point, 4326),
                horario TEXT,                        -- ¡NUEVA COLUMNA!
                confianza INTEGER,                   -- ¡NUEVA COLUMNA!
                actualizado_en TIMESTAMP DEFAULT NOW() -- ¡NUEVA COLUMNA!
            );
        `);
        console.log("✅ Tabla 'lugares' creada con soporte para mapas y nuevos campos del ETL.");

        // 5. Insertamos lugares de prueba (semilla) adaptados a las nuevas columnas
        console.log("⏳ Insertando lugares con sus coordenadas reales...");
        await pool.query(`
            INSERT INTO lugares (nombre, categoria, precio, descripcion, latitud, longitud, ubicacion, horario, confianza) VALUES 
            ('Café de la Vaca Centro', 'Cafetería', '$$', 'Excelente cafetería tradicional en el centro.', -0.2201, -78.5123, ST_SetSRID(ST_MakePoint(-78.5123, -0.2201), 4326), 'Lunes a Viernes 8am-6pm', 100),
            ('Parque La Carolina', 'Parques', 'Gratis', 'El parque más grande del centro-norte.', -0.1839, -78.4831, ST_SetSRID(ST_MakePoint(-78.4831, -0.1839), 4326), 'Abierto 24 horas', 100),
            ('Yaku Museo del Agua', 'Museos', '$', 'Museo con excelentes vistas de la ciudad.', -0.2232, -78.5186, ST_SetSRID(ST_MakePoint(-78.5186, -0.2232), 4326), 'Martes a Domingo 9am-5pm', 100);
        `);
        console.log("✅ Datos y coordenadas guardados correctamente.");

    } catch (error) {
        console.error("❌ Error configurando la base de datos:", error.message);
    } finally {
        pool.end(); 
    }
};

configurarBaseDeDatos();