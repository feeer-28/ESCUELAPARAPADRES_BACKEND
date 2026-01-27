import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import InstitucionController from '#controllers/institucionController'

// Rutas públicas (solo lectura)
router.get('/instituciones', [InstitucionController, 'index'])
router.get('/instituciones/:id', [InstitucionController, 'show'])

// Rutas protegidas con JWT
router.get('/instituciones/:id/directivos', [InstitucionController, 'directivos']).use(middleware.jwt())

// Rutas protegidas - Solo Admin Sistema
router.post('/instituciones', [InstitucionController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/instituciones/:id', [InstitucionController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/instituciones/:id', [InstitucionController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/instituciones/:id', [InstitucionController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
