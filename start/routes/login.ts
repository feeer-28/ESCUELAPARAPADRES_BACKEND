import router from '@adonisjs/core/services/router'
 import { middleware } from '#start/kernel'
 
 const AuthController = () => import('#controllers/authController')

// Login genérico - múltiples rutas para compatibilidad
router.post('/login', [AuthController, 'login'])
router.post('/auth/login', [AuthController, 'login']) // Para compatibilidad con frontend
 
 router
   .group(() => {
     router.post('/logout', [AuthController, 'logout'])
   })
   .use(middleware.jwt())
