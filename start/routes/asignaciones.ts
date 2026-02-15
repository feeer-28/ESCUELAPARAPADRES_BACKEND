import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const AsignacionesController = () => import('#controllers/asignacionesController')

router.post('/asignaciones', [AsignacionesController, 'store']).use(middleware.jwt())

router
  .post('/asignaciones/orientador', [AsignacionesController, 'storeOrientador'])
  .use(middleware.jwt())
