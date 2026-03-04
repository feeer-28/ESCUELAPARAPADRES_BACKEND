// Script para verificar los datos del acudiente y la autenticación
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://escuela_user:zMUPjAcgXrgspof9bpxwVJMwHoX9SdBC@dpg-d5peb2n5c7fs73bkjkrg-a.oregon-postgres.render.com/escuelaparapadres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();
    console.log('✅ Conectado a Render PostgreSQL\n');
    
    // 1. Verificar acudientes
    const acudientes = await client.query(`
      SELECT a.*, u.correo, u.rol_id, u.esta_activo, u.contrasena_hash
      FROM acudientes a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
    `);
    console.log('Acudientes encontrados:');
    acudientes.rows.forEach(a => {
      console.log(`  - ID: ${a.id}, Doc: ${a.numero_documento}, Nombre: ${a.nombre}`);
      console.log(`    Usuario ID: ${a.usuario_id}, Correo: ${a.correo}, rol_id: ${a.rol_id}, activo: ${a.esta_activo}`);
      console.log(`    Hash: ${a.contrasena_hash?.substring(0, 50)}...`);
    });
    
    // 2. Verificar si existe rol 6
    const roles = await client.query('SELECT * FROM roles ORDER BY id');
    console.log('\nRoles existentes:');
    roles.rows.forEach(r => console.log(`  - ID: ${r.id}, Nombre: ${r.nombre}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

check();
