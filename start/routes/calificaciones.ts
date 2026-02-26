import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import CalificacionesController from '#controllers/calificacionesController'

router.post('/calificaciones', [CalificacionesController, 'store']).use(middleware.jwt())

// Alias para compatibilidad
router.post('/api/calificaciones', [CalificacionesController, 'store']).use(middleware.jwt())
router.post('/orientador/calificaciones', [CalificacionesController, 'store']).use(middleware.jwt())
router.post('/docente/calificaciones', [CalificacionesController, 'store']).use(middleware.jwt())
