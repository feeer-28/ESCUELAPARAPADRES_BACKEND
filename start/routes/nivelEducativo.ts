import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import NivelEducativoController from '#controllers/nivelEducativoController'

// Rutas públicas (solo lectura)
router.get('/niveles-educativos', [NivelEducativoController, 'index'])

// Rutas protegidas - Requieren JWT
router.post('/niveles-educativos', [NivelEducativoController, 'store']).use(middleware.jwt())
router.put('/niveles-educativos/:id', [NivelEducativoController, 'update']).use(middleware.jwt())
router.delete('/niveles-educativos/:id', [NivelEducativoController, 'destroy']).use(middleware.jwt())
