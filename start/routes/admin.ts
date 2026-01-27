import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AdminSistemaController = () => import('#controllers/adminSistemaController')

// Login admin (público)
router.post('/admin/login', [AdminSistemaController, 'login'])

// Rutas protegidas con JWT + admin_sistema middleware
router
  .group(() => {
    // === GESTIÓN DE USUARIOS ===
    // Crear usuario genérico (cualquier rol)
    router.post('/admin/usuarios', [AdminSistemaController, 'crearUsuario'])
    // Listar todos los usuarios
    router.get('/admin/usuarios', [AdminSistemaController, 'listarUsuarios'])
    // Activar usuario
    router.put('/admin/usuarios/:id/activar', [AdminSistemaController, 'activarUsuario'])
    // Desactivar usuario (soft delete)
    router.put('/admin/usuarios/:id/desactivar', [AdminSistemaController, 'desactivarUsuario'])
    // Eliminar usuario permanentemente (hard delete)
    router.delete('/admin/usuarios/:id', [AdminSistemaController, 'eliminarUsuario'])

    // === GESTIÓN DE RECTORES ===
    router.post('/admin/rectores', [AdminSistemaController, 'crearRector'])

    // === GESTIÓN DE COORDINADORES ===
    router.post('/admin/coordinadores', [AdminSistemaController, 'crearCoordinador'])

    // === GESTIÓN DE ORIENTADORES ===
    router.post('/admin/orientadores', [AdminSistemaController, 'crearOrientador'])

    // === GESTIÓN DE INSTITUCIONES ===
    router.get('/admin/instituciones/pendientes', [
      AdminSistemaController,
      'listarInstitucionesPendientes',
    ])
    router.put('/admin/instituciones/:id/aprobar', [
      AdminSistemaController,
      'aprobarInstitucion',
    ])

    // === ESTADÍSTICAS GLOBALES ===
    router.get('/admin/estadisticas', [AdminSistemaController, 'estadisticasGlobales'])
  })
  .use([middleware.jwt(), middleware.adminSistema()])
