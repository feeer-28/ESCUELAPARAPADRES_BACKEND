import router from '@adonisjs/core/services/router'
import RolesController from '#controllers/rolesController'

router.get('/roles', [RolesController, 'index'])
router.get('/roles/:id', [RolesController, 'show'])
router.post('/roles', [RolesController, 'store'])
router.put('/roles/:id', [RolesController, 'update'])
router.patch('/roles/:id', [RolesController, 'update'])
router.delete('/roles/:id', [RolesController, 'destroy'])
