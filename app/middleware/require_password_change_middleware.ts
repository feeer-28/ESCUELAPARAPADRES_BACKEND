import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware para verificar si el usuario debe cambiar su contraseña obligatoriamente
 * Bloquea el acceso a todas las rutas excepto /usuarios/cambiar-password y /logout
 */
export default class RequirePasswordChangeMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.jwtUser

    if (!user) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      })
    }

    // Si el usuario debe cambiar contraseña
    if (user.debeCambiarContrasena) {
      // Permitir solo acceso a estas rutas
      const allowedPaths = [
        '/usuarios/cambiar-password',
        '/logout',
        '/acudientes/logout',
        '/docentes/logout',
      ]

      const currentPath = ctx.request.url()

      if (!allowedPaths.some((path) => currentPath.includes(path))) {
        return ctx.response.status(403).json({
          success: false,
          message:
            'Debe cambiar su contraseña antes de continuar. Por seguridad, es necesario establecer una nueva contraseña.',
          requirePasswordChange: true,
        })
      }
    }

    await next()
  }
}
