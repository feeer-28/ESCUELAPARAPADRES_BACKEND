import type { HttpContext } from '@adonisjs/core/http'
import Funcionario from '#models/funcionario'
import Role from '#models/role'

export default class OrientadorOAdminMiddleware {
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    console.log('=== DEBUG MIDDLEWARE ORIENTADOR O ADMIN ===')
    console.log('🔐 ctx object keys:', Object.keys(ctx))
    console.log('🔐 ctx.jwtUser exists:', !!(ctx as any).jwtUser)
    console.log('🔐 ctx.auth exists:', !!ctx.auth)
    console.log('🔐 ctx.auth.user exists:', !!ctx.auth?.user)
    
    // 🔥 SOLUCIÓN: Acceder directamente al contexto
    const jwtUser = (ctx as any).jwtUser || ctx.auth?.user
    
    console.log('👤 jwtUser desde ctx:', !!jwtUser)
    if (jwtUser) {
      console.log('👤 jwtUser data:', {
        id: jwtUser.id,
        correo: jwtUser.correo,
        rolId: jwtUser.rolId
      })
    }

    if (!jwtUser) {
      console.log('❌ No JWT user found - RECHAZANDO PETICIÓN')
      console.log('🔍 Fuentes probadas:')
      console.log('  - ctx.jwtUser:', !!(ctx as any).jwtUser)
      console.log('  - ctx.auth.user:', !!ctx.auth?.user)
      return ctx.response.unauthorized({
        success: false,
        message: 'No autenticado'
      })
    }

    console.log('✅ JWT User ENCONTRADO - continuando validación...')

    try {
      // Verificar si es admin sistema (rol 1)
      const rol = await Role.find(jwtUser.rolId)
      
      if (rol?.id === 1) {
        console.log('✅ Admin sistema autorizado para crear docentes')
        return next()
      }

      // Verificar si es orientador
      const funcionario = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .preload('institucion')
        .first()

      if (!funcionario || !funcionario.institucionId) {
        console.log('❌ Orientador sin institución asignada')
        return ctx.response.badRequest({
          success: false,
          message: 'El orientador no tiene una institución asignada'
        })
      }

      console.log('✅ Orientador autorizado para crear docentes:', {
        orientadorId: funcionario.id,
        institucionId: funcionario.institucionId,
        institucionNombre: funcionario.institucion?.nombre
      })

      return next()
    } catch (error) {
      console.error('❌ Error en middleware OrientadorOAdmin:', error)
      return ctx.response.internalServerError({
        success: false,
        message: 'Error al verificar permisos'
      })
    }
  }
}
