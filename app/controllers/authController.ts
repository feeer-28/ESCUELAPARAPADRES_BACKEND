import type { HttpContext } from '@adonisjs/core/http'
import hash from '@adonisjs/core/services/hash'
import Usuario from '#models/usuario'
import Funcionario from '#models/funcionario'
import jwt from 'jsonwebtoken'
import env from '#start/env'
import { DateTime } from 'luxon'

export default class AuthController {
  /**
   * Login genérico para rectores, coordinadores, orientadores, docentes
   * Valida rol del usuario
   */
  private async loginGenerico(
    { request, response }: HttpContext,
    rolesPermitidos: number[],
    nombreRol: string
  ) {
    try {
      const { correo, contrasena } = request.only(['correo', 'contrasena'])

      // Validar campos requeridos
      if (!correo || !contrasena) {
        return response.status(400).json({
          success: false,
          message: 'El correo y la contraseña son requeridos',
        })
      }

      // Buscar usuario por correo
      const usuario = await Usuario.query().where('correo', correo).preload('rol').first()

      if (!usuario) {
        return response.status(401).json({
          success: false,
          message: 'Correo o contraseña incorrectos',
        })
      }

      // Verificar que el rol sea el permitido para este endpoint
      if (!rolesPermitidos.includes(usuario.rolId)) {
        return response.status(422).json({
          success: false,
          message: `Usuario no autorizado para login de ${nombreRol}`,
        })
      }

      // Verificar que el usuario esté activo
      if (!usuario.estaActivo) {
        return response.status(403).json({
          success: false,
          message: 'Usuario desactivado. Contacta al administrador.',
        })
      }

      // Verificar contraseña
      const isPasswordValid = await hash.verify(usuario.contrasenaHash, contrasena)
      if (!isPasswordValid) {
        return response.status(401).json({
          success: false,
          message: 'Correo o contraseña incorrectos',
        })
      }

      // Actualizar último ingreso
      usuario.ultimoIngreso = DateTime.now()
      await usuario.save()

      // Obtener datos del funcionario si existe
      const funcionario = await Funcionario.query()
        .where('usuario_id', usuario.id)
        .preload('institucion')
        .first()

      // Generar token JWT
      const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
      const token = jwt.sign(
        {
          sub: usuario.id,
          correo: usuario.correo,
          rolId: usuario.rolId,
          institucionId: funcionario?.institucionId,
        },
        jwtSecret,
        { expiresIn: '7d' }
      )

      return response.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: {
          token,
          tokenType: 'Bearer',
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            rolNombre: usuario.rol.nombre,
            estaActivo: usuario.estaActivo,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
            ...(funcionario && {
              nombre: funcionario.nombre,
              apellido: funcionario.apellido,
              telefono: funcionario.telefono,
              institucionId: funcionario.institucionId,
              institucion: funcionario.institucion?.nombre,
            }),
          },
        },
      })
    } catch (error) {
      console.error(`Error en login ${nombreRol}:`, error)
      return response.status(500).json({
        success: false,
        message: 'Error al procesar la solicitud',
        error: error.message,
      })
    }
  }

  /**
   * Login para Rectores
   * POST /rectores/login
   */
  async loginRectores(ctx: HttpContext) {
    return this.loginGenerico(ctx, [2], 'rectores')
  }

  /**
   * Login para Coordinadores
   * POST /coordinadores/login
   */
  async loginCoordinadores(ctx: HttpContext) {
    return this.loginGenerico(ctx, [3], 'coordinadores')
  }

  /**
   * Login para Docentes (incluye orientadores y docentes de aula)
   * POST /docentes/login
   */
  async loginDocentes(ctx: HttpContext) {
    return this.loginGenerico(ctx, [4, 5], 'docentes')
  }

  /**
   * Login para Acudientes
   * POST /acudientes/login-v2
   * Nota: Usar /acudientes/login existente que tiene lógica especial
   */
  async loginAcudientes(ctx: HttpContext) {
    return this.loginGenerico(ctx, [6], 'acudientes')
  }

  /**
   * Cambiar contraseña del usuario autenticado
   * POST /auth/cambiar-password
   */
  async cambiarPassword({ request, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.unauthorized({ success: false, message: 'No autenticado' })
      }

      const { contrasenaActual, nuevaContrasena, confirmarContrasena } = request.only([
        'contrasenaActual',
        'nuevaContrasena',
        'confirmarContrasena',
      ])

      // Validar campos requeridos
      if (!contrasenaActual || !nuevaContrasena || !confirmarContrasena) {
        return response.badRequest({
          success: false,
          message: 'Todos los campos son requeridos',
        })
      }

      // Validar que las contraseñas coincidan
      if (nuevaContrasena !== confirmarContrasena) {
        return response.badRequest({
          success: false,
          message: 'La nueva contraseña y la confirmación no coinciden',
        })
      }

      // Validar longitud mínima
      if (nuevaContrasena.length < 6) {
        return response.badRequest({
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres',
        })
      }

      // Buscar usuario
      const usuario = await Usuario.find(jwtUser.id)
      if (!usuario) {
        return response.notFound({ success: false, message: 'Usuario no encontrado' })
      }

      // Verificar contraseña actual
      const isPasswordValid = await hash.verify(usuario.contrasenaHash, contrasenaActual)
      if (!isPasswordValid) {
        return response.badRequest({
          success: false,
          message: 'La contraseña actual es incorrecta',
        })
      }

      // Actualizar contraseña
      usuario.contrasenaHash = await hash.make(nuevaContrasena)
      usuario.debeCambiarContrasena = false
      await usuario.save()

      return response.ok({
        success: true,
        message: 'Contraseña actualizada correctamente',
      })
    } catch (error) {
      console.error('Error al cambiar contraseña:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al cambiar la contraseña',
      })
    }
  }

  /**
   * Logout - Invalida la sesión actual
   * POST /auth/logout
   * Nota: Con JWT el logout es manejado en el frontend eliminando el token.
   * Este endpoint existe para compatibilidad y registro de auditoría.
   */
  async logout({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.unauthorized({ success: false, message: 'No autenticado' })
      }

      // Opcionalmente registrar en auditoría
      // await Auditoria.create({ ... })

      return response.ok({
        success: true,
        message: 'Sesión cerrada correctamente',
      })
    } catch (error) {
      console.error('Error en logout:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al cerrar sesión',
      })
    }
  }
}
