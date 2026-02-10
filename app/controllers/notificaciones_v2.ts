import type { HttpContext } from '@adonisjs/core/http'
import NotificacionPush from '#models/notificacion_push_v2'
import DispositivoMovil from '#models/dispositivo_movil_v2'


export default class NotificacionesV2Controller {
  /**
   * Listar notificaciones del usuario
   */
  async index({ request, response, jwtUser }: HttpContext) {
    try {
      const { page = 1, limit = 10, tipo, leida } = request.qs()
      
      let query = NotificacionPush.query()
        .where('usuario_id', jwtUser.id)

      // Filtros
      if (tipo) {
        query = query.where('tipo', tipo)
      }
      
      if (leida !== undefined) {
        query = query.where('leida', leida === 'true')
      }

      const notificaciones = await query
        .orderBy('creada_en', 'desc')
        .paginate(page, limit)

      // Contar no leídas
      const noLeidas = await NotificacionPush.noLeidas(jwtUser.id).count('* as total').first()

      return response.json({
        success: true,
        data: notificaciones.serialize(),
        meta: {
          tipos: NotificacionPush.tiposNotificacion(),
          noLeidas: noLeidas?.total || 0,
          total: notificaciones.total,
          page: notificaciones.currentPage,
          limit: notificaciones.perPage
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al listar notificaciones',
        error: error.message
      })
    }
  }

  /**
   * Marcar notificación como leída
   */
  async marcarLeida({ params, response, jwtUser }: HttpContext) {
    try {      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        })
      }
      const notificacion = await NotificacionPush.query()
        .where('id', params.id)
        .where('usuario_id', jwtUser.id)
        .first()

      if (!notificacion) {
        return response.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        })
      }

      if (notificacion.leida) {
        return response.json({
          success: true,
          message: 'Notificación ya estaba marcada como leída',
          data: notificacion.serialize()
        })
      }

      await notificacion.marcarComoLeida()

      return response.json({
        success: true,
        message: 'Notificación marcada como leída',
        data: notificacion.serialize()
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al marcar notificación como leída',
        error: error.message
      })
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasLeidas({ response, jwtUser }: HttpContext) {
    try {
      const notificaciones = await NotificacionPush.noLeidas(jwtUser.id)

      for (const notificacion of notificaciones) {
        await notificacion.marcarComoLeida()
      }

      return response.json({
        success: true,
        message: `${notificaciones.length} notificaciones marcadas como leídas`,
        data: {
          cantidad: notificaciones.length
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al marcar notificaciones como leídas',
        error: error.message
      })
    }
  }

  /**
   * Eliminar notificación
   */
  async destroy({ params, response, jwtUser }: HttpContext) {
    try {
      const notificacion = await NotificacionPush.query()
        .where('id', params.id)
        .where('usuario_id', jwtUser.id)
        .first()

      if (!notificacion) {
        return response.status(404).json({
          success: false,
          message: 'Notificación no encontrada'
        })
      }

      await notificacion.delete()

      return response.json({
        success: true,
        message: 'Notificación eliminada exitosamente'
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar notificación',
        error: error.message
      })
    }
  }

  /**
   * Estadísticas de notificaciones
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      const total = await NotificacionPush.query()
        .where('usuario_id', jwtUser.id)
        .count('* as total')
        .first()

      const leidas = await NotificacionPush.query()
        .where('usuario_id', jwtUser.id)
        .where('leida', true)
        .count('* as total')
        .first()

      const enviadas = await NotificacionPush.query()
        .where('usuario_id', jwtUser.id)
        .where('enviada', true)
        .count('* as total')
        .first()

      const porTipo = await NotificacionPush.query()
        .where('usuario_id', jwtUser.id)
        .select('tipo')
        .count('* as cantidad')
        .groupBy('tipo')

      return response.json({
        success: true,
        data: {
          total: total?.$extras?.total || 0,
          leidas: leidas?.$extras?.total || 0,
          noLeidas: (total?.$extras?.total || 0) - (leidas?.$extras?.total || 0),
          enviadas: enviadas?.$extras?.total || 0,
          porTipo: porTipo.map(item => ({
            tipo: item.tipo,
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
   * Enviar notificación de prueba
   */
  async prueba({ request, response, jwtUser }: HttpContext) {
    try {
      const { titulo, mensaje } = request.only(['titulo', 'mensaje'])

      if (!titulo || !mensaje) {
        return response.status(400).json({
          success: false,
          message: 'Se requieren título y mensaje'
        })
      }

      // Verificar que el usuario tenga dispositivos activos
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        })
      }

      const dispositivos = await DispositivoMovil.activosPorUsuario(jwtUser.id)

      if (dispositivos.length === 0) {
        return response.status(400).json({
          success: false,
          message: 'No tienes dispositivos activos registrados'
        })
      }

      // Crear notificación de prueba
      const notificacion = await NotificacionPush.create({
        usuarioId: jwtUser.id,
        titulo: `🧪 ${titulo}`,
        mensaje: mensaje,
        tipo: 'general',
        enviada: false
      })

      // Aquí iría la lógica real de envío a Firebase
      // Por ahora, solo marcamos como enviada
      await notificacion.marcarComoEnviada()

      return response.json({
        success: true,
        message: 'Notificación de prueba enviada exitosamente',
        data: {
          notificacion: notificacion.serialize(),
          dispositivos: dispositivos.length
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al enviar notificación de prueba',
        error: error.message
      })
    }
  }
}
