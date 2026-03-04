import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const client = new Client({
  connectionString:
    'postgresql://escuela_user:zMUPjAcgXrgspof9bpxwVJMwHoX9SdBC@dpg-d5peb2n5c7fs73bkjkrg-a.oregon-postgres.render.com/escuelaparapadres',
  ssl: { rejectUnauthorized: false },
})

async function setupDatabase() {
  try {
    await client.connect()
    console.log('✅ Conectado a Render PostgreSQL')

    // Verificar si las tablas existen
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `)
    const tables = tablesResult.rows.map(r => r.tablename)
    
    if (!tables.includes('usuarios')) {
      console.log('🔄 Creando tablas desde schema.sql...')
      const schemaPath = path.join(__dirname, '..', 'database', 'create_tables.sql')
      const schema = fs.readFileSync(schemaPath, 'utf8')
      await client.query(schema)
      console.log('✅ Tablas creadas exitosamente')
    } else {
      console.log('✅ Las tablas ya existen')
    }

    // Crear datos de prueba
    console.log('🔄 Creando datos de prueba...')

    // 1. Roles
    await client.query(`
      INSERT INTO roles (id, nombre, esta_activo) VALUES 
        (1, 'admin_sistema', true),
        (2, 'docente', true),
        (3, 'acudiente', true),
        (4, 'rector', true),
        (5, 'coordinador', true)
      ON CONFLICT (id) DO NOTHING
    `)

    // 2. Departamento
    await client.query(`
      INSERT INTO departamentos (id, nombre, codigo) VALUES (1, 'Cauca', '19')
      ON CONFLICT (id) DO NOTHING
    `)

    // 3. Municipio
    await client.query(`
      INSERT INTO municipios (id, nombre, departamento_id, codigo) VALUES (1, 'Popayán', 1, '19001')
      ON CONFLICT (id) DO NOTHING
    `)

    // 4. Institución
    await client.query(`
      INSERT INTO instituciones (id, nombre, naturaleza, municipio_id, telefono_principal, correo_institucional)
      VALUES (1, 'Institución Educativa Test', 'Publica', 1, '3001234567', 'contacto@test.edu.co')
      ON CONFLICT (id) DO NOTHING
    `)

    // 5. Grado
    await client.query(`
      INSERT INTO grados (id, nombre, orden) VALUES (1, 'Sexto', 6)
      ON CONFLICT (id) DO NOTHING
    `)

    // 6. Período
    await client.query(`
      INSERT INTO periodos (id, nombre, fecha_inicio, fecha_fin, institucion_id, esta_activo)
      VALUES (1, '2026', '2026-01-20', '2026-11-30', 1, true)
      ON CONFLICT (id) DO NOTHING
    `)

    // 7. Curso
    await client.query(`
      INSERT INTO cursos (id, nombre, grado_id, jornada, institucion_id)
      VALUES (1, 'Sexto A', 1, 'Mañana', 1)
      ON CONFLICT (id) DO NOTHING
    `)

    // 8. Usuario acudiente
    await client.query(`
      INSERT INTO usuarios (id, correo, contrasena_hash, rol_id, esta_activo, debe_cambiar_contrasena)
      VALUES (1, 'acudiente.test@gmail.com', '$scrypt$n=16384,r=8,p=1$vQaCY+/JaJrTrBHFxB+2aw$RFcb8cj7fYzNKvvUmR6IfNCKN5qPBYrHn3kz0vNpNPcWYqrv0lF4fMMz1nGQqYe2LrEZRGqfTCJt7qTRwjTxdw', 3, true, false)
      ON CONFLICT (id) DO NOTHING
    `)

    // 9. Acudiente
    await client.query(`
      INSERT INTO acudientes (id, usuario_id, nombres, apellidos, tipo_documento, numero_documento, telefono, correo, parentesco)
      VALUES (1, 1, 'María Fernanda', 'García López', 'CC', '1234567890', '3101234567', 'acudiente.test@gmail.com', 'Madre')
      ON CONFLICT (id) DO NOTHING
    `)

    // 10. Estudiante
    await client.query(`
      INSERT INTO estudiantes (id, nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, sexo, curso_id)
      VALUES (1, 'Juan Carlos', 'García Pérez', 'TI', '1098765432', '2012-05-15', 'M', 1)
      ON CONFLICT (id) DO NOTHING
    `)

    // 11. Relación acudiente-estudiante
    await client.query(`
      INSERT INTO estudiante_acudiente (estudiante_id, acudiente_id, relacion, es_principal)
      VALUES (1, 1, 'Madre', true)
      ON CONFLICT DO NOTHING
    `)

    console.log('\n✅ SETUP COMPLETO')
    console.log('\n📱 CREDENCIALES PARA APP MÓVIL:')
    console.log('   Email: acudiente.test@gmail.com')
    console.log('   Password: Acudiente123!')
    console.log('\n👥 Estudiante vinculado: Juan Carlos García Pérez')

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

setupDatabase()
