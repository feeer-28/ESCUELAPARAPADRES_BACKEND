import router from '@adonisjs/core/services/router'
import migrator from '@adonisjs/lucid/services/migrator'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

router.post('/setup/migrations', async ({ response }) => {
  try {
    await migrator.run()
    return response.json({
      success: true,
      message: 'Migraciones ejecutadas correctamente',
    })
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: 'Error ejecutando migraciones',
      error: error.message,
    })
  }
})

router.post('/setup/test-data', async ({ response }) => {
  try {
    // 1. Usuario acudiente
    const [usuario] = await db
      .table('usuarios')
      .insert({
        correo: 'acudiente.test@gmail.com',
        contrasena_hash: '$scrypt$n=16384,r=8,p=1$vQaCY+/JaJrTrBHFxB+2aw$RFcb8cj7fYzNKvvUmR6IfNCKN5qPBYrHn3kz0vNpNPcWYqrv0lF4fMMz1nGQqYe2LrEZRGqfTCJt7qTRwjTxdw',
        rol_id: 3,
        esta_activo: true,
        debe_cambiar_contrasena: false,
        creado_en: DateTime.now().toSQL(),
        actualizado_en: DateTime.now().toSQL(),
      })
      .onConflict('correo')
      .ignore()
      .returning('id')

    const usuarioId = usuario?.id || (await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()).id

    // 2. Acudiente
    const [acudiente] = await db
      .table('acudientes')
      .insert({
        usuario_id: usuarioId,
        nombres: 'María Fernanda',
        apellidos: 'García López',
        tipo_documento: 'CC',
        numero_documento: '1234567890',
        telefono: '3101234567',
        telefono_alternativo: '3209876543',
        correo: 'acudiente.test@gmail.com',
        direccion: 'Calle 5 # 10-20, Popayán',
        parentesco: 'Madre',
        ocupacion: 'Profesora',
        tipo_trabajo: 'Dependiente',
        nivel_educativo: 'Profesional',
        aporta_economia: true,
        horario_trabajo: 'Diurno',
        creado_en: DateTime.now().toSQL(),
        actualizado_en: DateTime.now().toSQL(),
      })
      .returning('id')

    // 3. Grado
    const [grado] = await db.table('grados').insert({ nombre: 'Sexto', orden: 6 }).onConflict('nombre').ignore().returning('id')
    const gradoId = grado?.id || (await db.from('grados').where('nombre', 'Sexto').first()).id

    // 4. Período
    const [periodo] = await db.table('periodos').insert({
      nombre: '2026',
      fecha_inicio: '2026-01-20',
      fecha_fin: '2026-11-30',
      esta_activo: true,
      institucion_id: 1,
      creado_en: DateTime.now().toSQL(),
      actualizado_en: DateTime.now().toSQL(),
    }).returning('id')
    const periodoId = periodo?.id || (await db.from('periodos').where('nombre', '2026').first()).id

    // 5. Curso
    const [curso] = await db.table('cursos').insert({
      nombre: 'Sexto A',
      grado_id: gradoId,
      jornada: 'Mañana',
      institucion_id: 1,
    }).returning('id')
    const cursoId = curso?.id || (await db.from('cursos').where('nombre', 'Sexto A').first()).id

    // 6. Estudiante
    const [estudiante] = await db.table('estudiantes').insert({
      nombres: 'Juan Carlos',
      apellidos: 'García Pérez',
      tipo_documento: 'TI',
      numero_documento: '1098765432',
      fecha_nacimiento: '2012-05-15',
      sexo: 'M',
      grupo_sanguineo: 'O',
      rh: '+',
      pais_nacimiento: 'Colombia',
      ciudad_nacimiento: 'Popayán',
      estrato: 3,
      eps: 'Sura',
      curso_id: cursoId,
      creado_en: DateTime.now().toSQL(),
      actualizado_en: DateTime.now().toSQL(),
    }).onConflict('numero_documento').ignore().returning('id')
    const estudianteId = estudiante?.id || (await db.from('estudiantes').where('numero_documento', '1098765432').first()).id

    // 7. Relación
    const existe = await db.from('estudiante_acudiente').where({ estudiante_id: estudianteId, acudiente_id: acudiente.id }).first()
    if (!existe) {
      await db.table('estudiante_acudiente').insert({
        estudiante_id: estudianteId,
        acudiente_id: acudiente.id,
        relacion: 'Madre',
        es_principal: true,
        creado_en: DateTime.now().toSQL(),
      })
    }

    return response.json({
      success: true,
      message: 'Datos de prueba creados',
      credenciales: {
        correo: 'acudiente.test@gmail.com',
        contrasena: 'Acudiente123!',
      },
    })
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: 'Error creando datos de prueba',
      error: error.message,
    })
  }
})
