import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware para verificar que el usuario autenticado es admin_sistema
 */
export default class AdminSistemaMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.jwtUser

    if (!user) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      })
    }

    // Verificar que el rol sea admin_sistema (id: 1)
    if (user.rolId !== 1) {
      return ctx.response.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador del sistema.',
      })
    }

    await next()
  }
}
