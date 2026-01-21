import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import TareasController from '#controllers/tareasController'

router.get('/tareas', [TareasController, 'index']).use(middleware.jwt())
router.get('/tareas/:id', [TareasController, 'show']).use(middleware.jwt())
router.post('/tareas', [TareasController, 'store']).use(middleware.jwt())
