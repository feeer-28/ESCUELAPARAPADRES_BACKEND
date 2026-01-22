import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AdminSistemaController = () => import('#controllers/adminSistemaController')

// Login admin (público)
router.post('/admin/login', [AdminSistemaController, 'login'])

// Rutas protegidas con JWT + admin_sistema middleware
router
  .group(() => {
    // Gestión de rectores
    router.post('/admin/rectores', [AdminSistemaController, 'crearRector'])

    // Gestión de coordinadores
    router.post('/admin/coordinadores', [AdminSistemaController, 'crearCoordinador'])

    // Gestión de instituciones
    router.get('/admin/instituciones/pendientes', [
      AdminSistemaController,
      'listarInstitucionesPendientes',
    ])
    router.put('/admin/instituciones/:id/aprobar', [
      AdminSistemaController,
      'aprobarInstitucion',
    ])
  })
  .use([middleware.jwt(), middleware.adminSistema()])
