import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import AsignacionesController from '#controllers/asignacionesController'

router.post('/asignaciones', [AsignacionesController, 'store']).use(middleware.jwt())
