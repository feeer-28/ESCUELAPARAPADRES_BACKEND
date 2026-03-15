import type { HttpContext } from '@adonisjs/core/http'
import Evento from '#models/evento_v2'
import NotificacionPush from '#models/notificacion_push_v2'
import DispositivoMovil from '#models/dispositivo_movil_v2'
import { DateTime } from 'luxon'

export default class EventosV2Controller {
  /**
   * Listar eventos de la institución del usuario
   */
  async index({ request, response, jwtUser }: HttpContext) {
    try {
      const { page = 1, limit = 10, tipo, desde, hasta } = request.qs()
      
      let query = Evento.query()
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .preload('creador', (query) => {
          query.select('id', 'firstName', 'lastName')
        })

      // Filtros
      if (tipo) {
        query = query.where('tipo_evento', tipo)
      }
      
      if (desde) {
        query = query.where('fecha_evento', '>=', DateTime.fromISO(desde).toSQL())
      }
      
      if (hasta) {
        query = query.where('fecha_evento', '<=', DateTime.fromISO(hasta).toSQL())
      }

      const eventos = await query.orderBy('fecha_evento', 'asc').paginate(page, limit)

      return response.json({
        success: true,
        data: eventos.serialize(),
        meta: {
          tipos: Evento.tiposEvento(),
          total: eventos.total,
          page: eventos.currentPage,
          limit: eventos.perPage
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al listar eventos',
        error: error.message
      })
    }
  }

  /**
   * Crear nuevo evento
   */
  async store({ request, response, jwtUser }: HttpContext) {
    try {
      const payload = request.only([
        'titulo',
        'descripcion',
        'tipo_evento',
        'fecha_evento',
        'fecha_recordatorio',
        'enviar_notificacion'
      ])

      // Validación
      await validator.validate({
        schema: validator.schema({
          titulo: validator.string([rules.maxLength(255), rules.required()]),
          tipo_evento: validator.enum(Evento.tiposEvento()),
          fecha_evento: validator.date({ format: 'iso' }, [rules.required()]),
          descripcion: validator.string.optional(),
          fecha_recordatorio: validator.date({ format: 'iso' }).optional(),
          enviar_notificacion: validator.boolean.optional()
        }),
        data: payload
      })

      // Validar fecha
      const fechaEvento = DateTime.fromISO(payload.fecha_evento)
      if (fechaEvento < DateTime.now()) {
        return response.status(400).json({
          success: false,
          message: 'La fecha del evento no puede ser anterior a la fecha actual'
        })
      }

      const evento = await Evento.create({
        titulo: payload.titulo,
        descripcion: payload.descripcion,
        tipoEvento: payload.tipo_evento,
        fechaEvento: fechaEvento,
        fechaRecordatorio: payload.fecha_recordatorio ? DateTime.fromISO(payload.fecha_recordatorio) : null,
        institucionId: jwtUser.institucionId,
        creadoPor: jwtUser.id
      })

      // Enviar notificación si se solicita
      if (payload.enviar_notificacion) {
        await this.enviarNotificacionEvento(evento, jwtUser.institucionId)
      }

      return response.status(201).json({
        success: true,
        message: 'Evento creado exitosamente',
        data: evento.serialize()
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al crear evento',
        error: error.message
      })
    }
  }

  /**
   * Mostrar detalle de evento
   */
  async show({ params, response, jwtUser }: HttpContext) {
    try {
      const evento = await Evento.query()
        .where('id', params.id)
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .preload('creador')
        .preload('notificaciones')
        .first()

      if (!evento) {
        return response.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        })
      }

      return response.json({
        success: true,
        data: evento.serialize()
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener evento',
        error: error.message
      })
    }
  }

  /**
   * Actualizar evento
   */
  async update({ params, request, response, jwtUser }: HttpContext) {
    try {
      const evento = await Evento.query()
        .where('id', params.id)
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .first()
      
      if (!evento) {
        return response.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        })
      }

      const payload = request.only([
        'titulo',
        'descripcion',
        'tipo_evento',
        'fecha_evento',
        'fecha_recordatorio'
      ])

      // Validación
      await validator.validate({
        schema: validator.schema({
          titulo: validator.string([rules.maxLength(255)]),
          tipo_evento: validator.enum(Evento.tiposEvento()),
          fecha_evento: validator.date({ format: 'iso' }),
          descripcion: validator.string.optional(),
          fecha_recordatorio: validator.date({ format: 'iso' }).optional()
        }),
        data: payload
      })

      evento.merge({
        titulo: payload.titulo,
        descripcion: payload.descripcion,
        tipoEvento: payload.tipo_evento,
        fechaEvento: payload.fecha_evento ? DateTime.fromISO(payload.fecha_evento) : evento.fechaEvento,
        fechaRecordatorio: payload.fecha_recordatorio ? DateTime.fromISO(payload.fecha_recordatorio) : evento.fechaRecordatorio
      })
      
      await evento.save()

      return response.json({
        success: true,
        message: 'Evento actualizado exitosamente',
        data: evento.serialize()
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar evento',
        error: error.message
      })
    }
  }

  /**
   * Eliminar evento (soft delete)
   */
  async destroy({ params, response, jwtUser }: HttpContext) {
    try {
      const evento = await Evento.query()
        .where('id', params.id)
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .first()
      
      if (!evento) {
        return response.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        })
      }

      evento.activo = false
      await evento.save()

      return response.json({
        success: true,
        message: 'Evento eliminado exitosamente'
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar evento',
        error: error.message
      })
    }
  }

  /**
   * Obtener eventos próximos (para notificaciones)
   */
  async proximos({ request, response, jwtUser }: HttpContext) {
    try {
      const { dias = 7 } = request.qs()
      
      const eventos = await Evento.query()
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .where('fecha_evento', '>=', DateTime.now().toSQL())
        .where('fecha_evento', '<=', DateTime.now().plus({ days: dias }).toSQL())
        .orderBy('fecha_evento', 'asc')

      return response.json({
        success: true,
        data: eventos.map(e => e.serialize()),
        meta: {
          dias: dias,
          cantidad: eventos.length
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener eventos próximos',
        error: error.message
      })
    }
  }

  /**
   * Estadísticas de eventos
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      const total = await Evento.query()
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .count('* as total')
        .first()

      const porTipo = await Evento.query()
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .select('tipo_evento')
        .count('* as cantidad')
        .groupBy('tipo_evento')

      const proximos = await Evento.eventosProximos(7).count('* as total').first()

      return response.json({
        success: true,
        data: {
          total: total?.$extras?.total || 0,
          proximos: proximos?.$extras?.total || 0,
          porTipo: porTipo.map(item => ({
            tipo: item.tipoEvento,
            cantidad: item.$extras.cantidad
          }))
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      })
    }
  }

  /**
   * Enviar notificación de evento
   */
  private async enviarNotificacionEvento(evento: Evento, institucionId: number) {
    try {
      // Obtener dispositivos activos de la institución
      const dispositivos = await DispositivoMovil.query()
        .join('usuarios', 'dispositivos_moviles.usuario_id', 'usuarios.id')
        .join('funcionarios', 'usuarios.id', 'funcionarios.usuario_id')
        .where('dispositivos_moviles.activo', true)
        .where('funcionarios.institucion_id', institucionId)
        .select('dispositivos_moviles.usuario_id', 'dispositivos_moviles.token_fcm')

      // Crear notificaciones para cada dispositivo
      const notificaciones = dispositivos.map(dispositivo => ({
        usuarioId: dispositivo.usuarioId,
        titulo: `📅 ${evento.tipoEvento}: ${evento.titulo}`,
        mensaje: evento.descripcion ? evento.descripcion.substring(0, 100) + '...' : 'Nuevo evento disponible',
        tipo: 'evento',
        referenciaId: evento.id,
        referenciaTipo: 'evento'
      }))

      if (notificaciones.length > 0) {
        await NotificacionPush.createMany(notificaciones)
        console.log(`✅ ${notificaciones.length} notificaciones creadas para el evento: ${evento.titulo}`)
      }
    } catch (error) {
      console.error('❌ Error al enviar notificaciones:', error)
    }
  }
}
