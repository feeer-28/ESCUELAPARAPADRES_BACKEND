import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import CursoController from '#controllers/cursoController'

// Rutas públicas (solo lectura)
router.get('/cursos', [CursoController, 'index'])
router.get('/cursos/institucion/:institucionId', [CursoController, 'porInstitucion'])
router.get('/cursos/:id', [CursoController, 'show'])

// Rutas protegidas - Solo Admin Sistema
router.post('/cursos', [CursoController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/cursos/:id', [CursoController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/cursos/:id', [CursoController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/cursos/:id', [CursoController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
