import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import DocenteController from '#controllers/docenteController'

// Rutas públicas (autenticación)
router.post('/docentes/login', [DocenteController, 'login'])
router.post('/docentes/logout', [DocenteController, 'logout']).use(middleware.jwt())

// Rutas protegidas con JWT (lectura)
router.get('/docentes', [DocenteController, 'index']).use(middleware.jwt())
router.get('/docentes/:id', [DocenteController, 'show']).use(middleware.jwt())

// Rutas protegidas - Solo Admin Sistema
router.post('/docentes', [DocenteController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/docentes/:id', [DocenteController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/docentes/:id', [DocenteController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/docentes/:id', [DocenteController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
