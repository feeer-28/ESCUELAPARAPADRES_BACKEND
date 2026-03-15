import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware para permitir acceso solo a Coordinadores y Rectores
 */
export default class CoordinadorORectorMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const { jwtUser } = ctx
    
    if (!jwtUser) {
      return ctx.response.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      })
    }

    // Permitir solo a Coordinadores (rolId: 3) y Rectores (rolId: 2)
    if (jwtUser.rolId !== 3 && jwtUser.rolId !== 2) {
      return ctx.response.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo coordinadores y rectores pueden realizar esta acción.',
      })
    }

    await next()
  }
}
