import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import NotificacionTareasService from '#app/services/NotificacionTareasService'

console.log('🎯 PRUEBA COMPLETA DEL SISTEMA DE NOTIFICACIONES DE TAREAS')
console.log('=' .repeat(70))

// Función para crear datos de prueba
async function crearDatosPrueba() {
  try {
    console.log('\n📝 CREANDO DATOS DE PRUEBA...')
    
    // 1. Verificar si ya existe una institución
    let institucion = await db.from('instituciones').first()
    if (!institucion) {
      institucion = await db.table('instituciones').insertGetId({
        nombre: 'Institución de Prueba',
        nit: '123456789',
        direccion: 'Dirección de prueba',
        telefono: '1234567',
        email: 'test@institucion.com',
        activo: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Institución de prueba creada')
    } else {
      console.log('✅ Usando institución existente')
    }
    
    // 2. Crear usuario padre de prueba
    let usuarioPadre = await db.from('usuarios').where('correo', 'padre@test.com').first()
    if (!usuarioPadre) {
      usuarioPadre = await db.table('usuarios').insertGetId({
        correo: 'padre@test.com',
        contrasena_hash: '$2b$10$test.hash.for.demonstration',
        rol_id: 6, // Rol acudiente
        esta_activo: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Usuario padre creado')
    } else {
      console.log('✅ Usando usuario padre existente')
    }
    
    // 3. Crear acudiente de prueba
    let acudiente = await db.from('acudientes').where('usuario_id', usuarioPadre).first()
    if (!acudiente) {
      acudiente = await db.table('acudientes').insertGetId({
        usuario_id: usuarioPadre,
        nombres: 'Juan',
        apellidos: 'Pérez',
        numero_documento: '12345678',
        telefono: '3001234567',
        correo: 'padre@test.com',
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Acudiente creado')
    } else {
      console.log('✅ Usando acudiente existente')
    }
    
    // 4. Crear grado de prueba
    let grado = await db.from('grados').where('nombre', 'Primero').first()
    if (!grado) {
      grado = await db.table('grados').insertGetId({
        institucion_id: institucion.id || 1,
        nombre: 'Primero',
        activo: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Grado creado')
    } else {
      console.log('✅ Usando grado existente')
    }
    
    // 5. Crear curso de prueba
    let curso = await db.from('cursos').where('nombre', 'Curso A').first()
    if (!curso) {
      curso = await db.table('cursos').insertGetId({
        institucion_id: institucion.id || 1,
        grado_id: grado.id || 1,
        nombre: 'Curso A',
        jornada: 'Mañana',
        activo: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Curso creado')
    } else {
      console.log('✅ Usando curso existente')
    }
    
    // 6. Crear estudiante de prueba
    let estudiante = await db.from('estudiantes').where('numero_documento', '87654321').first()
    if (!estudiante) {
      estudiante = await db.table('estudiantes').insertGetId({
        curso_id: curso.id || 1,
        nombres: 'María',
        apellidos: 'Pérez',
        numero_documento: '87654321',
        tipo_documento: 'CC',
        fecha_nacimiento: DateTime.now().minus({ years: 10 }).toSQLDate(),
        sexo: 'F',
        activo: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Estudiante creado')
    } else {
      console.log('✅ Usando estudiante existente')
    }
    
    // 7. Vincular acudiente con estudiante
    const vinculoExistente = await db.from('acudiente_estudiante')
      .where('acudiente_id', acudiente)
      .where('estudiante_id', estudiante)
      .first()
    
    if (!vinculoExistente) {
      await db.table('acudiente_estudiante').insert({
        acudiente_id: acudiente,
        estudiante_id: estudiante,
        relacion: 'Padre',
        es_principal: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Vínculo acudiente-estudiante creado')
    } else {
      console.log('✅ Vínculo acudiente-estudiante ya existe')
    }
    
    // 8. Crear período activo
    let periodo = await db.from('periodos').where('esta_activo', true).first()
    if (!periodo) {
      periodo = await db.table('periodos').insertGetId({
        nombre: 'Periodo 2026',
        fecha_inicio: DateTime.now().minus({ months: 2 }).toSQLDate(),
        fecha_fin: DateTime.now().plus({ months: 4 }).toSQLDate(),
        esta_activo: true,
        creado_en: DateTime.now().toSQL()
      })
      console.log('✅ Período creado')
    } else {
      console.log('✅ Usando período existente')
    }
    
    // 9. Crear categoría de tareas
    let categoria = await db.from('categorias').where('nombre', 'Matemáticas').first()
    if (!categoria) {
      categoria = await db.table('categorias').insertGetId({
        nombre: 'Matemáticas',
        descripcion: 'Tareas de matemáticas',
        activa: true,
        creada_en: DateTime.now().toSQL()
      })
      console.log('✅ Categoría creada')
    } else {
      console.log('✅ Usando categoría existente')
    }
    
    return {
      usuarioPadre,
      acudiente,
      estudiante,
      curso,
      periodo,
      categoria
    }
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error)
    return null
  }
}

// Prueba 1: Notificación de tarea asignada
async function pruebaTareaAsignada(datos) {
  try {
    console.log('\n📚 PRUEBA 1: Notificación de Tarea Asignada')
    
    // Crear una nueva asignación
    const asignacionId = await db.table('asignaciones').insertGetId({
      titulo: 'Tarea de Matemáticas - Operaciones Básicas',
      descripcion: 'Resolver 10 problemas de suma y resta',
      categoria_id: datos.categoria,
      curso_id: datos.curso,
      periodo_id: datos.periodo,
      fecha_inicio: DateTime.now().toSQLDate(),
      fecha_vencimiento: DateTime.now().plus({ days: 3 }).toSQLDate(),
      frecuencia: 'Única',
      activa: true,
      creada_en: DateTime.now().toSQL()
    })
    
    console.log(`✅ Asignación creada (ID: ${asignacionId})`)
    
    // Simular notificación
    await NotificacionTareasService.notificarTareaAsignada(asignacionId, [datos.estudiante])
    
    // Verificar si se creó la notificación
    const notificacion = await db.from('notificaciones_push')
      .where('usuario_id', datos.usuarioPadre)
      .where('tipo', 'tarea')
      .orderBy('creada_en', 'desc')
      .first()
    
    if (notificacion) {
      console.log('✅ Notificación de tarea asignada creada exitosamente')
      console.log(`   Título: ${notificacion.titulo}`)
      console.log(`   Mensaje: ${notificacion.mensaje}`)
      return true
    } else {
      console.log('❌ No se encontró la notificación creada')
      return false
    }
  } catch (error) {
    console.error('❌ Error en prueba de tarea asignada:', error)
    return false
  }
}

// Prueba 2: Notificación de tarea próxima a vencer
async function pruebaTareaProximaVencer(datos) {
  try {
    console.log('\n⏰ PRUEBA 2: Notificación de Tarea Próxima a Vencer')
    
    // Crear una tarea que vence mañana
    const asignacionId = await db.table('asignaciones').insertGetId({
      titulo: 'Tarea Urgente - Lectura Comprensiva',
      descripcion: 'Leer capítulo 3 y responder preguntas',
      categoria_id: datos.categoria,
      curso_id: datos.curso,
      periodo_id: datos.periodo,
      fecha_inicio: DateTime.now().toSQLDate(),
      fecha_vencimiento: DateTime.now().plus({ hours: 20 }).toSQL(), // Mañana
      frecuencia: 'Única',
      activa: true,
      creada_en: DateTime.now().toSQL()
    })
    
    console.log(`✅ Tarea próxima a vencer creada (ID: ${asignacionId})`)
    
    // Ejecutar notificación de tareas próximas a vencer
    await NotificacionTareasService.notificarTareaProximaVencer()
    
    // Verificar notificación
    const notificacion = await db.from('notificaciones_push')
      .where('usuario_id', datos.usuarioPadre)
      .where('titulo', '⏰ Tarea por Vencer')
      .orderBy('creada_en', 'desc')
      .first()
    
    if (notificacion) {
      console.log('✅ Notificación de tarea próxima a vencer creada')
      console.log(`   Mensaje: ${notificacion.mensaje}`)
      return true
    } else {
      console.log('❌ No se encontró notificación de tarea próxima a vencer')
      return false
    }
  } catch (error) {
    console.error('❌ Error en prueba de tarea próxima a vencer:', error)
    return false
  }
}

// Prueba 3: Notificación de tarea calificada
async function pruebaTareaCalificada(datos) {
  try {
    console.log('\n✅ PRUEBA 3: Notificación de Tarea Calificada')
    
    // Crear una asignación para calificar
    const asignacionId = await db.table('asignaciones').insertGetId({
      titulo: 'Tarea para Calificar - Geometría',
      descripcion: 'Dibujar figuras geométricas',
      categoria_id: datos.categoria,
      curso_id: datos.curso,
      periodo_id: datos.periodo,
      fecha_inicio: DateTime.now().minus({ days: 5 }).toSQLDate(),
      fecha_vencimiento: DateTime.now().minus({ days: 2 }).toSQLDate(),
      frecuencia: 'Única',
      activa: true,
      creada_en: DateTime.now().minus({ days: 6 }).toSQL()
    })
    
    // Crear una entrega
    await db.table('entregas').insert({
      asignacion_id: asignacionId,
      estudiante_id: datos.estudiante,
      descripcion: 'Entrega de geometría completada',
      entregada_en: DateTime.now().minus({ days: 1 }).toSQL(),
      creada_en: DateTime.now().minus({ days: 1 }).toSQL()
    })
    
    // Crear una calificación
    const calificacionId = await db.table('calificaciones').insertGetId({
      asignacion_id: asignacionId,
      estudiante_id: datos.estudiante,
      periodo_id: datos.periodo,
      nota: 4.5,
      escala: 'Alto',
      retroalimentacion: 'Excelente trabajo',
      calificado_en: DateTime.now().toSQL(),
      creado_en: DateTime.now().toSQL()
    })
    
    console.log(`✅ Calificación creada (ID: ${calificacionId})`)
    
    // Simular notificación de tarea calificada
    await NotificacionTareasService.notificarTareaCalificada({ id: calificacionId, estudiante_id: datos.estudiante })
    
    // Verificar notificación
    const notificacion = await db.from('notificaciones_push')
      .where('usuario_id', datos.usuarioPadre)
      .where('titulo', '✅ Tarea Calificada')
      .orderBy('creada_en', 'desc')
      .first()
    
    if (notificacion) {
      console.log('✅ Notificación de tarea calificada creada')
      console.log(`   Mensaje: ${notificacion.mensaje}`)
      return true
    } else {
      console.log('❌ No se encontró notificación de tarea calificada')
      return false
    }
  } catch (error) {
    console.error('❌ Error en prueba de tarea calificada:', error)
    return false
  }
}

// Prueba 4: Notificación de tarea vencida
async function pruebaTareaVencida(datos) {
  try {
    console.log('\n❌ PRUEBA 4: Notificación de Tarea Vencida')
    
    // Crear una tarea que ya venció
    const asignacionId = await db.table('asignaciones').insertGetId({
      titulo: 'Tarea Vencida - Ciencias Naturales',
      descripcion: 'Investigar sobre el ciclo del agua',
      categoria_id: datos.categoria,
      curso_id: datos.curso,
      periodo_id: datos.periodo,
      fecha_inicio: DateTime.now().minus({ days: 5 }).toSQLDate(),
      fecha_vencimiento: DateTime.now().minus({ days: 1 }).toSQLDate(), // Ayer
      frecuencia: 'Única',
      activa: true,
      creada_en: DateTime.now().minus({ days: 6 }).toSQL()
    })
    
    console.log(`✅ Tarea vencida creada (ID: ${asignacionId})`)
    
    // Ejecutar notificación de tareas vencidas
    await NotificacionTareasService.notificarTareasVencidas()
    
    // Verificar notificación
    const notificacion = await db.from('notificaciones_push')
      .where('usuario_id', datos.usuarioPadre)
      .where('titulo', '❌ Tarea Vencida')
      .orderBy('creada_en', 'desc')
      .first()
    
    if (notificacion) {
      console.log('✅ Notificación de tarea vencida creada')
      console.log(`   Mensaje: ${notificacion.mensaje}`)
      return true
    } else {
      console.log('❌ No se encontró notificación de tarea vencida')
      return false
    }
  } catch (error) {
    console.error('❌ Error en prueba de tarea vencida:', error)
    return false
  }
}

// Ejecutar todas las pruebas
async function ejecutarPruebasCompletas() {
  try {
    console.log('🚀 INICIANDO PRUEBAS COMPLETAS DEL SISTEMA DE NOTIFICACIONES DE TAREAS')
    
    // Crear datos de prueba
    const datos = await crearDatosPrueba()
    if (!datos) {
      console.log('❌ No se pudieron crear los datos de prueba')
      return
    }
    
    // Registrar un dispositivo FCM para el padre
    await db.table('dispositivos_moviles').insert({
      usuario_id: datos.usuarioPadre,
      token_fcm: 'test_fcm_token_demo',
      dispositivo: 'Demo Device',
      sistema_operativo: 'Android',
      version_app: '1.0.0',
      activo: true,
      creado_en: DateTime.now().toSQL(),
      actualizado_en: DateTime.now().toSQL()
    })
    console.log('✅ Dispositivo FCM de prueba registrado')
    
    // Ejecutar todas las pruebas
    const resultados = []
    
    resultados.push(await pruebaTareaAsignada(datos))
    resultados.push(await pruebaTareaProximaVencer(datos))
    resultados.push(await pruebaTareaCalificada(datos))
    resultados.push(await pruebaTareaVencida(datos))
    
    // Mostrar resultados
    const exitosas = resultados.filter(r => r).length
    const total = resultados.length
    
    console.log('\n' + '=' .repeat(70))
    console.log('📊 RESULTADOS DE LAS PRUEBAS DE NOTIFICACIONES DE TAREAS')
    console.log(`✅ Pruebas exitosas: ${exitosas}/${total}`)
    console.log(`📈 Porcentaje: ${Math.round((exitosas/total) * 100)}%`)
    
    if (exitosas === total) {
      console.log('\n🎉 ¡TODAS LAS PRUEBAS DE NOTIFICACIONES PASARON!')
      console.log('✅ El sistema completo de notificaciones de tareas está funcionando')
      console.log('📱 Los padres recibirán notificaciones para todos los eventos importantes')
    } else {
      console.log('\n⚠️  Algunas pruebas fallaron. Revisar los logs anteriores.')
    }
    
    // Mostrar resumen de notificaciones creadas
    const totalNotificaciones = await db.from('notificaciones_push')
      .where('usuario_id', datos.usuarioPadre)
      .count('* as total')
      .first()
    
    console.log(`\n📈 Total de notificaciones creadas: ${totalNotificaciones.total}`)
    
    // Listar todas las notificaciones creadas
    const notificaciones = await db.from('notificaciones_push')
      .where('usuario_id', datos.usuarioPadre)
      .orderBy('creada_en', 'desc')
      .limit(10)
    
    console.log('\n📋 Notificaciones creadas:')
    notificaciones.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.titulo} - ${notif.mensaje}`)
    })
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error)
  } finally {
    await db.manager.disconnect()
  }
}

// Ejecutar pruebas
ejecutarPruebasCompletas().catch(console.error)
