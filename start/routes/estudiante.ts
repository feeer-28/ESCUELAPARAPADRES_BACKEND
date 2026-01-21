import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import EstudianteController from '#controllers/estudianteController'

router.get('/estudiantes', [EstudianteController, 'index']).use(middleware.jwt())
router.get('/estudiantes/:id', [EstudianteController, 'show']).use(middleware.jwt())
router.post('/estudiantes', [EstudianteController, 'store']).use(middleware.jwt())
router.put('/estudiantes/:id', [EstudianteController, 'update']).use(middleware.jwt())
router.patch('/estudiantes/:id', [EstudianteController, 'update']).use(middleware.jwt())
router.delete('/estudiantes/:id', [EstudianteController, 'destroy']).use(middleware.jwt())
