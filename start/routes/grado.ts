import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import GradoController from '#controllers/gradoController'

// Rutas públicas (solo lectura)
router.get('/grados', [GradoController, 'index'])
router.get('/grados/:id', [GradoController, 'show'])

// Rutas protegidas - Solo Admin Sistema
router.post('/grados', [GradoController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/grados/:id', [GradoController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/grados/:id', [GradoController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/grados/:id', [GradoController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
