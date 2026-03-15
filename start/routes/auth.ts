import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/authController')

// Login para Rectores (rolId: 2)
router.post('/rectores/login', [AuthController, 'loginRectores'])

// Login para Coordinadores (rolId: 3)
router.post('/coordinadores/login', [AuthController, 'loginCoordinadores'])

// Debug: Cambiar contraseña sin JWT (solo desarrollo)
router.post('/debug/cambiar-contrasena', [AuthController, 'cambiarPasswordDebug'])

// Debug: Resetear contraseña a un valor conocido
router.post('/debug/resetear-contrasena', [AuthController, 'resetearPasswordDebug'])

// Debug: Verificar y asignar institución al rector
router.post('/debug/asignar-institucion-rector', [AuthController, 'asignarInstitucionRector'])

// Debug endpoint para obtener datos actualizados del usuario
router.post('/debug/usuario-datos-actualizados', [AuthController, 'getUsuarioDatosActualizados'])

// Debug endpoint para verificar datos del coordinador
router.post('/debug/coordinador-datos', [AuthController, 'coordinadorDatosDebug'])

// NOTA: /docentes/login ya existe en start/routes/docente.ts
// NOTA: /acudientes/login ya existe en start/routes/acudiente.ts con lógica especial

// Endpoints autenticados
router.group(() => {
  // Cambiar contraseña
  router.post('/auth/cambiar-password', [AuthController, 'cambiarPassword'])
  
  // Cambiar contraseña (alternativo para frontend)
  router.post('/auth/cambiar-contrasena', [AuthController, 'cambiarPassword'])
  
  // Logout
  router.post('/auth/logout', [AuthController, 'logout'])
}).use(middleware.jwt())

