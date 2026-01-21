import router from '@adonisjs/core/services/router'
import GradoController from '#controllers/gradoController'

router.get('/grados', [GradoController, 'index'])
router.get('/grados/:id', [GradoController, 'show'])
router.post('/grados', [GradoController, 'store'])
router.put('/grados/:id', [GradoController, 'update'])
router.patch('/grados/:id', [GradoController, 'update'])
router.delete('/grados/:id', [GradoController, 'destroy'])
