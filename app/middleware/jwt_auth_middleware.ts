import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import jwt from 'jsonwebtoken'

import env from '#start/env'
import Usuario from '#models/usuario'

type JwtPayload = {
  sub: number
  correo?: string
  rolId?: number
}

export default class JwtAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = String(ctx.request.header('authorization') ?? '')
    const [scheme, token] = authHeader.split(' ')

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return ctx.response.unauthorized({ message: 'Token Bearer requerido' })
    }

    const secret = env.get('JWT_SECRET', env.get('APP_KEY'))

    let payload: JwtPayload
    try {
      payload = jwt.verify(token, secret) as JwtPayload
    } catch {
      return ctx.response.unauthorized({ message: 'Token inválido o expirado' })
    }

    if (!payload?.sub) {
      return ctx.response.unauthorized({ message: 'Token inválido' })
    }

    const usuario = await Usuario.find(payload.sub)
    if (!usuario) {
      return ctx.response.unauthorized({ message: 'Usuario no existe' })
    }

    ;(ctx as any).jwtUser = usuario

    return next()
  }
}
