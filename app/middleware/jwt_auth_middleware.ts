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
    console.log('=== DEBUG JWT MIDDLEWARE ===')
    console.log('🔐 AUTH HEADER RAW:', ctx.request.header('authorization'))
    console.log('🔐 AUTH HEADER TYPE:', typeof ctx.request.header('authorization'))
    
    const authHeader = String(ctx.request.header('authorization') ?? '')
    console.log('🔐 Authorization header:', authHeader)
    
    const [scheme, token] = authHeader.split(' ')
    console.log('🔐 Scheme:', scheme)
    console.log('🔐 Token exists:', !!token)
    console.log('🔐 Token length:', token?.length)
    console.log('🔐 Token preview:', token?.substring(0, 20) + '...')

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      console.log('❌ Token Bearer requerido')
      return ctx.response.unauthorized({ message: 'Token Bearer requerido' })
    }

    const secret = env.get('JWT_SECRET', env.get('APP_KEY'))
    console.log('🔐 Secret exists:', !!secret)
    console.log('🔐 Secret length:', secret?.length)

    let payload: JwtPayload
    try {
      payload = jwt.verify(token, secret) as unknown as JwtPayload
      console.log('✅ Token decodificado EXITOSAMENTE:', payload)
    } catch (error) {
      console.log('❌ ERROR AL DECODIFICAR TOKEN:', error.message)
      console.log('❌ Error name:', error.name)
      return ctx.response.unauthorized({ message: 'Token inválido o expirado' })
    }

    if (!payload?.sub) {
      console.log('❌ Token inválido - sin sub')
      return ctx.response.unauthorized({ message: 'Token inválido' })
    }

    console.log('👤 Buscando usuario con ID:', payload.sub)
    const usuario = await Usuario.find(payload.sub)
    if (!usuario) {
      console.log('❌ Usuario no existe con ID:', payload.sub)
      return ctx.response.unauthorized({ message: 'Usuario no existe' })
    }

    console.log('✅ Usuario ENCONTRADO:', {
      id: usuario.id,
      correo: usuario.correo,
      rolId: usuario.rolId,
      estaActivo: usuario.estaActivo
    })
    
    ;(ctx as any).jwtUser = usuario
    console.log('✅ jwtUser ASIGNADO a ctx')
    console.log('🔍 Verificando jwtUser después de asignar:', !!(ctx as any).jwtUser)
    console.log('=== FIN DEBUG JWT MIDDLEWARE ===')

    return next()
  }
}
