import type { HttpContext } from '@adonisjs/core/http'
import DispositivoMovil from '#models/dispositivo_movil_v2'
import { validator, rules } from '@adonisjs/validator'

export default class DispositivosV2Controller {
  /**
   * Registrar token FCM de dispositivo móvil
   */
  async registrar({ request, response, jwtUser }: HttpContext) {
    try {
      const payload = request.only([
        'token_fcm',
        'plataforma',
        'version_app',
        'modelo_dispositivo',
        'version_os'
      ])

      // Validación
      await validator.validate({
        schema: validator.schema({
          token_fcm: validator.string([rules.required(), rules.maxLength(255)]),
          plataforma: validator.enum(DispositivoMovil.plataformas(), [rules.required()]),
          version_app: validator.string([rules.maxLength(50)]).optional(),
          modelo_dispositivo: validator.string([rules.maxLength(100)]).optional(),
          version_os: validator.string([rules.maxLength(50)]).optional()
        }),
        data: payload
      })

      // Verificar si ya existe el token para este usuario
      const dispositivoExistente = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .where('token_fcm', payload.token_fcm)
        .first()

      if (dispositivoExistente) {
        // Actualizar dispositivo existente
        dispositivoExistente.merge({
          plataforma: payload.plataforma,
          versionApp: payload.version_app,
          modeloDispositivo: payload.modelo_dispositivo,
          versionOs: payload.version_os,
          activo: true
        })
        await dispositivoExistente.actualizarUso()

        return response.json({
          success: true,
          message: 'Dispositivo actualizado exitosamente',
          data: dispositivoExistente.serialize()
        })
      }

      // Desactivar otros dispositivos del mismo usuario (opcional - mantener solo uno activo)
      await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .update({ activo: false })

      // Crear nuevo dispositivo
      const dispositivo = await DispositivoMovil.create({
        usuarioId: jwtUser.id,
        tokenFcm: payload.token_fcm,
        plataforma: payload.plataforma,
        versionApp: payload.version_app,
        modeloDispositivo: payload.modelo_dispositivo,
        versionOs: payload.version_os,
        activo: true
      })

      return response.status(201).json({
        success: true,
        message: 'Dispositivo registrado exitosamente',
        data: dispositivo.serialize()
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al registrar dispositivo',
        error: error.message
      })
    }
  }

  /**
   * Eliminar/desactivar token FCM
   */
  async eliminar({ request, response, jwtUser }: HttpContext) {
    try {
      const { token_fcm } = request.only(['token_fcm'])

      if (!token_fcm) {
        return response.status(400).json({
          success: false,
          message: 'Se requiere el token_fcm'
        })
      }

      const dispositivo = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .where('token_fcm', token_fcm)
        .first()

      if (!dispositivo) {
        return response.status(404).json({
          success: false,
          message: 'Dispositivo no encontrado'
        })
      }

      await dispositivo.desactivar()

      return response.json({
        success: true,
        message: 'Dispositivo desactivado exitosamente'
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar dispositivo',
        error: error.message
      })
    }
  }

  /**
   * Listar dispositivos del usuario
   */
  async index({ response, jwtUser }: HttpContext) {
    try {
      const dispositivos = await DispositivoMovil.activosPorUsuario(jwtUser.id)

      return response.json({
        success: true,
        data: dispositivos.map(d => d.serialize()),
        meta: {
          total: dispositivos.length,
          plataformas: DispositivoMovil.plataformas()
        }
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al listar dispositivos',
        error: error.message
      })
    }
  }

  /**
   * Actualizar información del dispositivo
   */
  async actualizar({ request, response, jwtUser }: HttpContext) {
    try {
      const { token_fcm, version_app, modelo_dispositivo, version_os } = request.only([
        'token_fcm',
        'version_app',
        'modelo_dispositivo',
        'version_os'
      ])

      if (!token_fcm) {
        return response.status(400).json({
          success: false,
          message: 'Se requiere el token_fcm'
        })
      }

      const dispositivo = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .where('token_fcm', token_fcm)
        .where('activo', true)
        .first()

      if (!dispositivo) {
        return response.status(404).json({
          success: false,
          message: 'Dispositivo no encontrado o inactivo'
        })
      }

      dispositivo.merge({
        versionApp: version_app,
        modeloDispositivo: modelo_dispositivo,
        versionOs: version_os
      })

      await dispositivo.actualizarUso()

      return response.json({
        success: true,
        message: 'Dispositivo actualizado exitosamente',
        data: dispositivo.serialize()
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar dispositivo',
        error: error.message
      })
    }
  }

  /**
   * Desactivar todos los dispositivos del usuario
   */
  async desactivarTodos({ response, jwtUser }: HttpContext) {
    try {
      await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .update({ activo: false })

      return response.json({
        success: true,
        message: 'Todos los dispositivos han sido desactivados'
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al desactivar dispositivos',
        error: error.message
      })
    }
  }

  /**
   * Estadísticas de dispositivos
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      const total = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .count('* as total')
        .first()

      const activos = await DispositivoMovil.activosPorUsuario(jwtUser.id)

      const porPlataforma = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .where('activo', true)
        .select('plataforma')
        .count('* as cantidad')
        .groupBy('plataforma')

      return response.json({
        success: true,
        data: {
          total: total?.total || 0,
          activos: activos.length,
          porPlataforma: porPlataforma.map(item => ({
            plataforma: item.plataforma,
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
}
