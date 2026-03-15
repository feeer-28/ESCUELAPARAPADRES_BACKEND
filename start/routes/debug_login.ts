import router from '@adonisjs/core/services/router'
import Usuario from '#models/usuario'
import jwt from 'jsonwebtoken'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'

// ADVERTENCIA: Esta ruta es solo para depuración en desarrollo.
// Permite obtener un token JWT para cualquier usuario sin necesidad de contraseña.
// No debe estar presente en un entorno de producción.

router.get('/debug/login/:userId', async ({ params, response }) => {
  // Asegurarse de que esta ruta solo funcione en desarrollo
  if (env.get('NODE_ENV') !== 'development') {
    return response.forbidden({ message: 'Ruta de depuración solo disponible en desarrollo.' })
  }

  const usuario = await Usuario.find(params.userId)

  if (!usuario) {
    return response.notFound({ message: 'Usuario no encontrado' })
  }

  const secret = env.get('JWT_SECRET', env.get('APP_KEY'))
  const accessToken = jwt.sign(
    {
      sub: usuario.id,
      correo: usuario.correo,
      rolId: usuario.rolId,
    },
    secret,
    { expiresIn: '7d' }
  )

  return response.json({
    message: 'Token de depuración generado',
    token: accessToken,
    usuario: {
      id: usuario.id,
      correo: usuario.correo,
      rolId: usuario.rolId,
      estaActivo: usuario.estaActivo,
    },
  })
})

// Endpoint para probar contraseña directamente
router.post('/debug/verify-password', async ({ request, response }) => {
  if (env.get('NODE_ENV') !== 'development') {
    return response.forbidden({ message: 'Ruta de depuración solo disponible en desarrollo.' })
  }

  const { correo, contrasena } = request.only(['correo', 'contrasena'])

  if (!correo || !contrasena) {
    return response.badRequest({ message: 'correo y contrasena son requeridos' })
  }

  const usuario = await Usuario.query().where('correo', correo).first()

  if (!usuario) {
    return response.notFound({ message: 'Usuario no encontrado' })
  }

  console.log('=== DEBUG VERIFICACIÓN DE CONTRASEÑA ===')
  console.log('Correo:', correo)
  console.log('Contraseña ingresada:', contrasena)
  console.log('Hash guardado:', usuario.contrasenaHash)
  
  // 🔥 DEBUG: Verificar la contraseña ingresada
  console.log('📋 Contraseña ingresada (cruda):', contrasena)
  console.log('📋 Contraseña a comparar (debería ser):', '13841600')
  console.log('📋 ¿Son iguales?:', contrasena === '13841600')
  
  const isValid = await hash.verify(usuario.contrasenaHash, contrasena)
  console.log('✅ ¿Contraseña válida?:', isValid)
  console.log('=====================================')

  if (isValid) {
    const secret = env.get('JWT_SECRET', env.get('APP_KEY'))
    const accessToken = jwt.sign(
      {
        sub: usuario.id,
        correo: usuario.correo,
        rolId: usuario.rolId,
      },
      secret,
      { expiresIn: '7d' }
    )

    return response.json({
      success: true,
      message: 'Contraseña válida',
      token: accessToken,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rolId: usuario.rolId,
        estaActivo: usuario.estaActivo,
      },
    })
  } else {
    return response.unauthorized({
      success: false,
      message: 'Contraseña inválida',
      debug: {
        correo,
        contrasenaIngresada: contrasena,
        hashGuardado: usuario.contrasenaHash,
      }
    })
  }
})

