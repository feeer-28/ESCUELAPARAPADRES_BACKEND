import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import AcudienteController from '#controllers/acudienteController'

// Rutas públicas (autenticación)
router.post('/acudientes/login', [AcudienteController, 'login'])
router.post('/acudientes/reset-password', [AcudienteController, 'resetPassword'])
router.post('/acudientes/logout', [AcudienteController, 'logout']).use(middleware.jwt())

// Rutas protegidas con JWT (lectura y tareas propias)
router.get('/acudientes/mis-tareas', [AcudienteController, 'misTareas']).use(middleware.jwt())
router.get('/acudientes', [AcudienteController, 'index']).use(middleware.jwt())
router.get('/acudientes/:id', [AcudienteController, 'show']).use(middleware.jwt())

// Rutas protegidas - Solo Admin Sistema
router.post('/acudientes', [AcudienteController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/acudientes/:id', [AcudienteController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/acudientes/:id', [AcudienteController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/acudientes/:id', [AcudienteController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
