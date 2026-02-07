import type { HttpContext } from '@adonisjs/core/http'
import Evento from '#models/evento'
import { DateTime } from 'luxon'

export default class EventosController {
  /**
   * Listar eventos de la institución del usuario
   */
  async index({ request, response, jwtUser }: HttpContext) {
    try {
      const { page = 1, limit = 10, tipo } = request.qs()
      
      const eventos = await Evento.query()
        .where('institucion_id', jwtUser.institucionId)
        .where('activo', true)
        .if(tipo, (query) => query.where('tipo_evento', tipo))
        .orderBy('fecha_evento', 'asc')
        .preload('creador', (query) => {
          query.select('id', 'firstName', 'lastName')
        })
        .paginate(page, limit)

      return response.json({
        success: true,
        data: eventos.serialize()
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
      const data = request.only([
        'titulo',
        'descripcion',
        'tipo_evento',
        'fecha_evento',
        'fecha_recordatorio'
      ])

      // Validación básica
      if (!data.titulo || !data.tipo_evento || !data.fecha_evento) {
        return response.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: titulo, tipo_evento, fecha_evento'
        })
      }

      const evento = await Evento.create({
        ...data,
        institucionId: jwtUser.institucionId,
        creadoPor: jwtUser.id
      })

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
  async show({ params, response }: HttpContext) {
    try {
      const evento = await Evento.query()
        .where('id', params.id)
        .where('activo', true)
        .preload('creador')
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
  async update({ params, request, response }: HttpContext) {
    try {
      const evento = await Evento.find(params.id)
      
      if (!evento || !evento.activo) {
        return response.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        })
      }

      const data = request.only([
        'titulo',
        'descripcion',
        'tipo_evento',
        'fecha_evento',
        'fecha_recordatorio'
      ])

      evento.merge(data)
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
  async destroy({ params, response }: HttpContext) {
    try {
      const evento = await Evento.find(params.id)
      
      if (!evento || !evento.activo) {
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
  async proximos({ request, response }: HttpContext) {
    try {
      const { dias = 7 } = request.qs()
      
      const fechaLimite = DateTime.now().plus({ days: dias })
      
      const eventos = await Evento.query()
        .where('fecha_evento', '<=', fechaLimite.toSQL())
        .where('fecha_evento', '>=', DateTime.now().toSQL())
        .where('activo', true)
        .orderBy('fecha_evento', 'asc')

      return response.json({
        success: true,
        data: eventos.map(e => e.serialize())
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al obtener eventos próximos',
        error: error.message
      })
    }
  }
}
