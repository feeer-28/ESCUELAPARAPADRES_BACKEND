import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware para verificar que el usuario autenticado es rector
 */
export default class RectorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.jwtUser

    if (!user) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      })
    }

    // Verificar que el rol sea rector (id: 2)
    if (user.rolId !== 2) {
      return ctx.response.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de rector.',
      })
    }

    await next()
  }
}
