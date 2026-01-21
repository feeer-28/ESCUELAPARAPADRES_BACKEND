import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import CalificacionesController from '#controllers/calificacionesController'

router.post('/calificaciones', [CalificacionesController, 'store']).use(middleware.jwt())
