import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString:
    'postgresql://escuela_user:zMUPjAcgXrgspof9bpxwVJMwHoX9SdBC@dpg-d5peb2n5c7fs73bkjkrg-a.oregon-postgres.render.com/escuelaparapadres',
  ssl: { rejectUnauthorized: false },
})

async function insertTestData() {
  try {
    await client.connect()
    console.log('✅ Conectado a Render PostgreSQL')

    const result = await client.query(`
      DO $$
      DECLARE
        v_usuario_id INT;
        v_acudiente_id INT;
        v_grado_id INT;
        v_periodo_id INT;
        v_curso_id INT;
        v_estudiante_id INT;
      BEGIN
        -- 1. Usuario acudiente
        INSERT INTO usuarios (correo, contrasena_hash, rol_id, esta_activo, debe_cambiar_contrasena, creado_en, actualizado_en)
        VALUES ('acudiente.test@gmail.com', '$scrypt$n=16384,r=8,p=1$vQaCY+/JaJrTrBHFxB+2aw$RFcb8cj7fYzNKvvUmR6IfNCKN5qPBYrHn3kz0vNpNPcWYqrv0lF4fMMz1nGQqYe2LrEZRGqfTCJt7qTRwjTxdw', 3, true, false, NOW(), NOW())
        ON CONFLICT (correo) DO UPDATE SET esta_activo = true
        RETURNING id INTO v_usuario_id;

        -- 2. Acudiente
        INSERT INTO acudientes (usuario_id, nombres, apellidos, tipo_documento, numero_documento, telefono, telefono_alternativo, correo, direccion, parentesco, ocupacion, tipo_trabajo, nivel_educativo, aporta_economia, horario_trabajo, creado_en, actualizado_en)
        VALUES (v_usuario_id, 'María Fernanda', 'García López', 'CC', '1234567890', '3101234567', '3209876543', 'acudiente.test@gmail.com', 'Calle 5 # 10-20, Popayán', 'Madre', 'Profesora', 'Dependiente', 'Profesional', true, 'Diurno', NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_acudiente_id;

        -- 3. Grado
        INSERT INTO grados (nombre, orden) VALUES ('Sexto', 6)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_grado_id;
        IF v_grado_id IS NULL THEN SELECT id INTO v_grado_id FROM grados WHERE nombre = 'Sexto'; END IF;

        -- 4. Período
        INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, esta_activo, institucion_id, creado_en, actualizado_en)
        VALUES ('2026', '2026-01-20', '2026-11-30', true, 1, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_periodo_id;
        IF v_periodo_id IS NULL THEN SELECT id INTO v_periodo_id FROM periodos WHERE nombre = '2026' LIMIT 1; END IF;

        -- 5. Curso
        INSERT INTO cursos (nombre, grado_id, jornada, institucion_id)
        VALUES ('Sexto A', v_grado_id, 'Mañana', 1)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_curso_id;
        IF v_curso_id IS NULL THEN SELECT id INTO v_curso_id FROM cursos WHERE nombre = 'Sexto A' LIMIT 1; END IF;

        -- 6. Estudiante
        INSERT INTO estudiantes (nombres, apellidos, tipo_documento, numero_documento, fecha_nacimiento, sexo, grupo_sanguineo, rh, pais_nacimiento, ciudad_nacimiento, estrato, eps, curso_id, creado_en, actualizado_en)
        VALUES ('Juan Carlos', 'García Pérez', 'TI', '1098765432', '2012-05-15', 'M', 'O', '+', 'Colombia', 'Popayán', 3, 'Sura', v_curso_id, NOW(), NOW())
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_estudiante_id;
        IF v_estudiante_id IS NULL THEN SELECT id INTO v_estudiante_id FROM estudiantes WHERE numero_documento = '1098765432'; END IF;

        -- 7. Relación acudiente-estudiante
        IF NOT EXISTS (SELECT 1 FROM estudiante_acudiente WHERE estudiante_id = v_estudiante_id AND acudiente_id = v_acudiente_id) THEN
          INSERT INTO estudiante_acudiente (estudiante_id, acudiente_id, relacion, es_principal, creado_en)
          VALUES (v_estudiante_id, v_acudiente_id, 'Madre', true, NOW());
        END IF;

        RAISE NOTICE 'Datos creados exitosamente';
      END $$;
    `)

    console.log('✅ Datos de prueba insertados en Render')
    console.log('\n📱 CREDENCIALES PARA APP MÓVIL:')
    console.log('   Email: acudiente.test@gmail.com')
    console.log('   Password: Acudiente123!')
    console.log('\n👥 Estudiante vinculado: Juan Carlos García Pérez')
    console.log('   Documento: 1098765432')
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.end()
  }
}

insertTestData()
