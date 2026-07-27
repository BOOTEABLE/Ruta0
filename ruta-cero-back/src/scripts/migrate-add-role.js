import { pool } from '../repositories/db.js';

async function migrate() {
    try {
        console.log('🔧 Agregando columna "rol" a la tabla users...');
        
        // Agregar columna rol con valor por defecto 'user'
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS rol VARCHAR(20) DEFAULT 'user' 
            CHECK (rol IN ('user', 'admin'));
        `);
        console.log('✅ Columna "rol" agregada.');

        // Actualizar admin@gmail.com a admin si existe
        const result = await pool.query(
            `UPDATE users SET rol = 'admin' WHERE email = 'admin@gmail.com' RETURNING email, rol`
        );
        
        if (result.rowCount > 0) {
            console.log(`✅ Usuario actualizado a admin: ${result.rows[0].email} (${result.rows[0].rol})`);
        } else {
            console.log('ℹ️  No existe usuario admin@gmail.com, se creará como admin al registrarse.');
        }

        // Verificar
        const check = await pool.query('SELECT email, rol FROM users');
        console.log('\n📋 Usuarios actuales:');
        check.rows.forEach(u => console.log(`  - ${u.email}: ${u.rol}`));

    } catch (error) {
        console.error('❌ Error en migración:', error.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

migrate();