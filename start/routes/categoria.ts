import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import CategoriaController from '#controllers/categoriaController'

// Rutas públicas (solo lectura)
router.get('/categorias', [CategoriaController, 'index'])
router.get('/categorias/:id', [CategoriaController, 'show'])

// Rutas protegidas - Solo Admin Sistema
router.post('/categorias', [CategoriaController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/categorias/:id', [CategoriaController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/categorias/:id', [CategoriaController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/categorias/:id', [CategoriaController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
