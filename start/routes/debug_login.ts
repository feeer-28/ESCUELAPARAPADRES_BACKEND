import router from '@adonisjs/core/services/router'
import Usuario from '#models/usuario'
import jwt from 'jsonwebtoken'
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

  const secret = env.get('JWT_SECRET') || env.get('APP_KEY')
  if (!secret) {
    return response.internalServerError({ message: 'JWT_SECRET no está configurado.' })
  }

  // Generar un token con la información esencial del usuario
  const token = jwt.sign(
    {
      sub: usuario.id,
      correo: usuario.correo,
      rolId: usuario.rolId,
    },
    secret,
    { expiresIn: '1h' } // Token de corta duración para depuración
  )

  console.log(`[DEBUG] Token generado para usuario ID: ${usuario.id}, Rol ID: ${usuario.rolId}`)

  // Devolver el token
  return response.ok({
    message: `Token de depuración generado para ${usuario.correo}`,
    token,
  })
})
