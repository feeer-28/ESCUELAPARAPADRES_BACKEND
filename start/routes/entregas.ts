import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

import EntregasController from '#controllers/entregasController'



router.post('/entregas', [EntregasController, 'store']).use(middleware.jwt())

