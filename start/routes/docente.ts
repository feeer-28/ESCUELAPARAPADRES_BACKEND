
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import DocenteController from '#controllers/docenteController'

router.post('/docentes/login', [DocenteController, 'login'])
router.post('/docentes/logout', [DocenteController, 'logout']).use(middleware.jwt())

router.get('/docentes', [DocenteController, 'index']).use(middleware.jwt())
router.get('/docentes/:id', [DocenteController, 'show']).use(middleware.jwt())
router.post('/docentes', [DocenteController, 'store'])
router.put('/docentes/:id', [DocenteController, 'update']).use(middleware.jwt())
router.patch('/docentes/:id', [DocenteController, 'update']).use(middleware.jwt())
router.delete('/docentes/:id', [DocenteController, 'destroy']).use(middleware.jwt())
