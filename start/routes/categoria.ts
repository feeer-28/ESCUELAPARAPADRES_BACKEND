import router from '@adonisjs/core/services/router'
import CategoriaController from '#controllers/categoriaController'

router.get('/categorias', [CategoriaController, 'index'])
router.get('/categorias/:id', [CategoriaController, 'show'])
router.post('/categorias', [CategoriaController, 'store'])
router.put('/categorias/:id', [CategoriaController, 'update'])
router.patch('/categorias/:id', [CategoriaController, 'update'])
router.delete('/categorias/:id', [CategoriaController, 'destroy'])
