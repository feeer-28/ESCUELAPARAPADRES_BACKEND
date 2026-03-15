import router from '@adonisjs/core/services/router'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

router.post('/setup/migrations', async ({ response }) => {
  try {
    // Verificar que las tablas existan
    const tables = await db.rawQuery("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    
    return response.json({
      success: true,
      message: 'Tablas en la base de datos',
      tables: tables.rows.map((t: any) => t.tablename),
    })
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: 'Error verificando tablas',
      error: error.message,
    })
  }
})

router.post('/setup/test-data', async ({ response }) => {
  try {
    // 1. Verificar si el usuario ya existe
    const usuarioExistente = await db.from('usuarios').where('correo', 'acudiente.test@gmail.com').first()
    
    let usuarioId: number
    if (usuarioExistente) {
      usuarioId = usuarioExistente.id
    } else {
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
        .returning('id')
      usuarioId = usuario.id
    }

    // 2. Acudiente
    const acudienteExistente = await db.from('acudientes').where('usuario_id', usuarioId).first()
    let acudienteId: number
    
    if (acudienteExistente) {
      acudienteId = acudienteExistente.id
    } else {
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
      acudienteId = acudiente.id
    }

    // 3. Grado
    let grado = await db.from('grados').where('nombre', 'Sexto').first()
    if (!grado) {
      const [newGrado] = await db.table('grados').insert({ nombre: 'Sexto', orden: 6 }).returning('id')
      grado = { id: newGrado.id }
    }

    // 4. Curso
    let curso = await db.from('cursos').where('nombre', 'Sexto A').first()
    if (!curso) {
      const [newCurso] = await db.table('cursos').insert({
        nombre: 'Sexto A',
        grado_id: grado.id,
        jornada: 'Mañana',
        institucion_id: 1,
      }).returning('id')
      curso = { id: newCurso.id }
    }

    // 5. Estudiante
    let estudiante = await db.from('estudiantes').where('numero_documento', '1098765432').first()
    if (!estudiante) {
      const [newEstudiante] = await db.table('estudiantes').insert({
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
        curso_id: curso.id,
        creado_en: DateTime.now().toSQL(),
        actualizado_en: DateTime.now().toSQL(),
      }).returning('id')
      estudiante = { id: newEstudiante.id }
    }

    // 6. Relación
    const existe = await db.from('estudiante_acudiente').where({ estudiante_id: estudiante.id, acudiente_id: acudienteId }).first()
    if (!existe) {
      await db.table('estudiante_acudiente').insert({
        estudiante_id: estudiante.id,
        acudiente_id: acudienteId,
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
