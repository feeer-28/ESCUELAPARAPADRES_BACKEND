import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import InstitucionController from '#controllers/institucionController'

router.get('/instituciones', [InstitucionController, 'index'])
router.get('/instituciones/:id', [InstitucionController, 'show'])
router.get('/instituciones/:id/directivos', [InstitucionController, 'directivos']).use(middleware.jwt())
router.post('/instituciones', [InstitucionController, 'store'])
router.put('/instituciones/:id', [InstitucionController, 'update'])
router.patch('/instituciones/:id', [InstitucionController, 'update'])
router.delete('/instituciones/:id', [InstitucionController, 'destroy'])
