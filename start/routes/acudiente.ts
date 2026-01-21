import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import AcudienteController from '#controllers/acudienteController'

router.post('/acudientes/login', [AcudienteController, 'login'])
router.post('/acudientes/reset-password', [AcudienteController, 'resetPassword'])
router.post('/acudientes/logout', [AcudienteController, 'logout']).use(middleware.jwt())

router.get('/acudientes/mis-tareas', [AcudienteController, 'misTareas']).use(middleware.jwt())

router.get('/acudientes', [AcudienteController, 'index']).use(middleware.jwt())
router.get('/acudientes/:id', [AcudienteController, 'show']).use(middleware.jwt())
router.post('/acudientes', [AcudienteController, 'store'])
router.put('/acudientes/:id', [AcudienteController, 'update']).use(middleware.jwt())
router.patch('/acudientes/:id', [AcudienteController, 'update']).use(middleware.jwt())
router.delete('/acudientes/:id', [AcudienteController, 'destroy']).use(middleware.jwt())
