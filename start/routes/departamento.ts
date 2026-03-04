import router from '@adonisjs/core/services/router'
import DepartamentoController from '#controllers/departamentoController'

router.get('/departamentos', [DepartamentoController, 'index'])
router.get('/departamentos/:id', [DepartamentoController, 'show'])
router.post('/departamentos', [DepartamentoController, 'store'])
router.put('/departamentos/:id', [DepartamentoController, 'update'])
router.patch('/departamentos/:id', [DepartamentoController, 'update'])
router.delete('/departamentos/:id', [DepartamentoController, 'destroy'])
