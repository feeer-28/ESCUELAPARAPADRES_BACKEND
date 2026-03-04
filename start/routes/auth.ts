import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/authController')

// Login para Rectores (rolId: 2)
router.post('/rectores/login', [AuthController, 'loginRectores'])

// Login para Coordinadores (rolId: 3)
router.post('/coordinadores/login', [AuthController, 'loginCoordinadores'])

// NOTA: /docentes/login ya existe en start/routes/docente.ts
// NOTA: /acudientes/login ya existe en start/routes/acudiente.ts con lógica especial

// Endpoints autenticados
router.group(() => {
  // Cambiar contraseña
  router.post('/auth/cambiar-password', [AuthController, 'cambiarPassword'])
  
  // Logout
  router.post('/auth/logout', [AuthController, 'logout'])
}).use(middleware.jwt())

