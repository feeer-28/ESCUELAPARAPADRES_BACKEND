import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware que permite acceso a Admin del sistema (rolId: 1) u Orientador (rolId: 4)
 */
export default class AdminOOrientadorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.jwtUser

    if (!user) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      })
    }

    if (user.rolId !== 1 && user.rolId !== 4) {
      return ctx.response.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador del sistema u orientador.',
      })
    }

    await next()
  }
}
