import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://escuela_user:zMUPjAcgXrgspof9bpxwVJMwHoX9SdBC@dpg-d5peb2n5c7fs73bkjkrg-a.oregon-postgres.render.com/escuelaparapadres',
  ssl: { rejectUnauthorized: false }
})

async function checkAndFix() {
  await client.connect()
  
  // Ver roles existentes
  const roles = await client.query('SELECT * FROM roles ORDER BY id')
  console.log('Roles:', roles.rows)
  
  // Ver usuario
  const usuario = await client.query("SELECT id, correo, rol_id FROM usuarios WHERE correo = 'acudiente.test@gmail.com'")
  console.log('Usuario:', usuario.rows)
  
  // El endpoint espera rolId = 6 para acudientes
  // Necesitamos crear rol 6 o cambiar el código
  // Por ahora, insertemos el rol 6
  await client.query(`
    INSERT INTO roles (id, nombre, esta_activo) VALUES (6, 'acudiente_movil', true)
    ON CONFLICT (id) DO NOTHING
  `)
  
  // Actualizar usuario a rol 6
  await client.query("UPDATE usuarios SET rol_id = 6 WHERE correo = 'acudiente.test@gmail.com'")
  console.log('✅ Usuario actualizado a rol_id = 6')
  
  await client.end()
}

checkAndFix()
