import type { HttpContext } from '@adonisjs/core/http'
import DispositivoMovil from '#models/dispositivo_movil'

export default class DispositivosController {
  /**
   * Registrar token FCM de dispositivo móvil
   */
  async registrar({ request, response, jwtUser }: HttpContext) {
    try {
      const data = request.only(['token_fcm', 'plataforma', 'version_app'])

      // Validación básica
      if (!data.token_fcm || !data.plataforma) {
        return response.status(400).json({
          success: false,
          message: 'Faltan campos requeridos: token_fcm, plataforma'
        })
      }

      // Verificar si ya existe el token para este usuario
      const dispositivoExistente = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .where('token_fcm', data.token_fcm)
        .first()

      if (dispositivoExistente) {
        // Actualizar dispositivo existente
        dispositivoExistente.merge({
          plataforma: data.plataforma,
          versionApp: data.version_app,
          activo: true
        })
        await dispositivoExistente.save()

        return response.json({
          success: true,
          message: 'Dispositivo actualizado exitosamente',
          data: dispositivoExistente.serialize()
        })
      }

      // Desactivar otros dispositivos del mismo usuario (opcional)
      await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .update({ activo: false })

      // Crear nuevo dispositivo
      const dispositivo = await DispositivoMovil.create({
        usuarioId: jwtUser.id,
        tokenFcm: data.token_fcm,
        plataforma: data.plataforma,
        versionApp: data.version_app,
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

      dispositivo.activo = false
      await dispositivo.save()

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
      const dispositivos = await DispositivoMovil.query()
        .where('usuario_id', jwtUser.id)
        .where('activo', true)
        .orderBy('creado_en', 'desc')

      return response.json({
        success: true,
        data: dispositivos.map(d => d.serialize())
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        message: 'Error al listar dispositivos',
        error: error.message
      })
    }
  }
}
