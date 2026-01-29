import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import OrientadorController from '#controllers/orientadorController'

// CRUD Orientadores - Todas requieren JWT
router.get('/orientadores', [OrientadorController, 'index']).use(middleware.jwt())

// Acudientes/Padres de familia de la institución (ANTES de /:id para evitar conflictos)
router.get('/orientadores/acudientes', [OrientadorController, 'listarAcudientes']).use(middleware.jwt())

router.get('/orientadores/:id', [OrientadorController, 'show']).use(middleware.jwt())
router.post('/orientadores', [OrientadorController, 'store']).use(middleware.jwt())
router.put('/orientadores/:id', [OrientadorController, 'update']).use(middleware.jwt())
router.delete('/orientadores/:id', [OrientadorController, 'destroy']).use(middleware.jwt())
