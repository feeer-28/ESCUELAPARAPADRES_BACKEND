import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import MovilController from '#controllers/movilController'

export default class NotificacionTareasService {
  
  /**
   * Enviar notificación cuando se asigna una nueva tarea
   */
  static async notificarTareaAsignada(asignacionId: number, estudiantesIds: number[]) {
    try {
      // Obtener detalles de la asignación
      const asignacion = await db.from('asignaciones')
        .where('id', asignacionId)
        .first()

      if (!asignacion) {
        console.log('❌ Asignación no encontrada')
        return
      }

      // Obtener usuarios padres de los estudiantes
      const padresIds = await db.from('acudiente_estudiante')
        .whereIn('estudiante_id', estudiantesIds)
        .select('acudiente_id')

      const usuariosPadres = await db.from('acudientes')
        .whereIn('id', padresIds.map(p => p.acudiente_id))
        .select('usuario_id')

      // Enviar notificación a cada padre
      for (const padre of usuariosPadres) {
        await MovilController.enviarNotificacionPush(
          padre.usuario_id,
          '📚 Nueva Tarea Asignada',
          `Se ha asignado una nueva tarea: ${asignacion.titulo}`,
          'tarea',
          {
            asignacion_id: asignacionId,
            tipo: 'nueva_tarea',
            fecha_vencimiento: asignacion.fecha_vencimiento
          }
        )
      }

      console.log(`✅ Notificación de tarea asignada enviada a ${usuariosPadres.length} padres`)
    } catch (error) {
      console.error('❌ Error al notificar tarea asignada:', error)
    }
  }

  /**
   * Enviar notificación de tarea próxima a vencer (24 horas antes)
   */
  static async notificarTareaProximaVencer() {
    try {
      const manana = DateTime.now().plus({ days: 1 }).toSQL()
      const ahora = DateTime.now().toSQL()

      // Buscar tareas que vencen en las próximas 24 horas
      const tareasProximas = await db.from('asignaciones')
        .where('fecha_vencimiento', '>=', ahora)
        .where('fecha_vencimiento', '<=', manana)
        .where('activo', true)

      console.log(`📋 Encontradas ${tareasProximas.length} tareas próximas a vencer`)

      for (const tarea of tareasProximas) {
        // Obtener estudiantes del curso
        const estudiantes = await db.from('estudiantes')
          .where('curso_id', tarea.curso_id)
          .select('id')

        // Obtener padres de estos estudiantes
        const padresIds = await db.from('acudiente_estudiante')
          .whereIn('estudiante_id', estudiantes.map(e => e.id))
          .select('acudiente_id')

        const usuariosPadres = await db.from('acudientes')
          .whereIn('id', padresIds.map(p => p.acudiente_id))
          .select('usuario_id')

        // Enviar notificación
        for (const padre of usuariosPadres) {
          await MovilController.enviarNotificacionPush(
            padre.usuario_id,
            '⏰ Tarea por Vencer',
            `La tarea "${tarea.titulo}" vence mañana`,
            'tarea',
            {
              asignacion_id: tarea.id,
              tipo: 'proxima_vencer',
              fecha_vencimiento: tarea.fecha_vencimiento,
              urgencia: 'alta'
            }
          )
        }
      }

      console.log('✅ Notificaciones de tareas próximas a vencer enviadas')
    } catch (error) {
      console.error('❌ Error al notificar tareas próximas a vencer:', error)
    }
  }

  /**
   * Enviar notificación cuando una tarea se califica
   */
  static async notificarTareaCalificada(calificacion: any) {
    try {
      // Obtener detalles de la calificación y asignación
      const detalles = await db.from('calificaciones as c')
        .join('asignaciones as a', 'c.asignacion_id', 'a.id')
        .join('estudiantes as e', 'c.estudiante_id', 'e.id')
        .where('c.id', calificacion.id)
        .select(
          'a.titulo',
          'a.fecha_vencimiento',
          'e.nombres',
          'e.apellidos',
          'c.nota',
          'c.escala',
          'c.calificado_en'
        )
        .first()

      if (!detalles) {
        console.log('❌ Detalles de calificación no encontrados')
        return
      }

      // Obtener padres del estudiante
      const padresIds = await db.from('acudiente_estudiante')
        .where('estudiante_id', calificacion.estudiante_id)
        .select('acudiente_id')

      const usuariosPadres = await db.from('acudientes')
        .whereIn('id', padresIds.map(p => p.acudiente_id))
        .select('usuario_id')

      // Enviar notificación a cada padre
      for (const padre of usuariosPadres) {
        await MovilController.enviarNotificacionPush(
          padre.usuario_id,
          '✅ Tarea Calificada',
          `${detalles.nombres} ${detalles.apellidos} recibió ${detalles.nota} en "${detalles.titulo}"`,
          'tarea',
          {
            asignacion_id: calificacion.asignacion_id,
            estudiante_id: calificacion.estudiante_id,
            tipo: 'calificada',
            nota: detalles.nota,
            escala: detalles.escala,
            calificado_en: detalles.calificado_en
          }
        )
      }

      console.log(`✅ Notificación de tarea calificada enviada a ${usuariosPadres.length} padres`)
    } catch (error) {
      console.error('❌ Error al notificar tarea calificada:', error)
    }
  }

  /**
   * Enviar notificación de tareas vencidas no entregadas
   */
  static async notificarTareasVencidas() {
    try {
      const ahora = DateTime.now().toSQL()

      // Buscar tareas que ya vencieron y no fueron entregadas
      const tareasVencidas = await db.from('asignaciones as a')
        .leftJoin('entregas as e', function() {
          this.on('a.id', '=', 'e.asignacion_id')
        })
        .where('a.fecha_vencimiento', '<', ahora)
        .where('a.activo', true)
        .whereNull('e.id') // No tienen entrega
        .select('a.*')

      console.log(`📋 Encontradas ${tareasVencidas.length} tareas vencidas no entregadas`)

      for (const tarea of tareasVencidas) {
        // Obtener estudiantes del curso
        const estudiantes = await db.from('estudiantes')
          .where('curso_id', tarea.curso_id)
          .select('id')

        // Obtener padres de estos estudiantes
        const padresIds = await db.from('acudiente_estudiante')
          .whereIn('estudiante_id', estudiantes.map(e => e.id))
          .select('acudiente_id')

        const usuariosPadres = await db.from('acudientes')
          .whereIn('id', padresIds.map(p => p.acudiente_id))
          .select('usuario_id')

        // Enviar notificación
        for (const padre of usuariosPadres) {
          await MovilController.enviarNotificacionPush(
            padre.usuario_id,
            '❌ Tarea Vencida',
            `La tarea "${tarea.titulo}" ha vencido sin ser entregada`,
            'tarea',
            {
              asignacion_id: tarea.id,
              tipo: 'vencida',
              fecha_vencimiento: tarea.fecha_vencimiento,
              urgencia: 'urgente'
            }
          )
        }
      }

      console.log('✅ Notificaciones de tareas vencidas enviadas')
    } catch (error) {
      console.error('❌ Error al notificar tareas vencidas:', error)
    }
  }

  /**
   * Ejecutar revisión completa de notificaciones de tareas
   */
  static async ejecutarRevisionCompleta() {
    console.log('🔄 Iniciando revisión completa de notificaciones de tareas...')
    
    await this.notificarTareaProximaVencer()
    await this.notificarTareasVencidas()
    
    console.log('✅ Revisión completa de notificaciones finalizada')
  }
}
