import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const UsuariosController = () => import('#controllers/usuariosController')

// Obtener perfil del usuario autenticado (requiere JWT)
router.get('/usuarios/me', [UsuariosController, 'me']).use(middleware.jwt())

// Listar usuarios (requiere JWT)
router.get('/usuarios', [UsuariosController, 'index']).use(middleware.jwt())

// Obtener usuario específico (requiere JWT)
router.get('/usuarios/:id', [UsuariosController, 'show']).use(middleware.jwt())

// Actualizar usuario (requiere JWT)
router.put('/usuarios/:id', [UsuariosController, 'update']).use(middleware.jwt())

// Desactivar usuario (requiere JWT)
router.delete('/usuarios/:id', [UsuariosController, 'destroy']).use(middleware.jwt())

// Cambio de contraseña (requiere JWT)
router.post('/usuarios/cambiar-password', [UsuariosController, 'cambiarPassword']).use(middleware.jwt())
