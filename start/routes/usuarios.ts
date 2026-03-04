import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const UsuariosController = () => import('#controllers/usuariosController')

// Obtener perfil del usuario autenticado (requiere JWT)
router.get('/usuarios/me', [UsuariosController, 'me']).use(middleware.jwt())

// Cambio de contraseña (requiere JWT - cualquier usuario puede cambiar su propia contraseña)
router.post('/usuarios/cambiar-password', [UsuariosController, 'cambiarPassword']).use(middleware.jwt())

// Rutas protegidas - Solo Admin Sistema
router.get('/usuarios', [UsuariosController, 'index'])
  .use([middleware.jwt(), middleware.adminSistema()])

router.get('/usuarios/:id', [UsuariosController, 'show'])
  .use([middleware.jwt(), middleware.adminSistema()])

router.put('/usuarios/:id', [UsuariosController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])

router.delete('/usuarios/:id', [UsuariosController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
