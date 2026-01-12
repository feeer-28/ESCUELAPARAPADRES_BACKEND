import router from '@adonisjs/core/services/router'
import CursoController from '#controllers/cursoController'

router.get('/cursos', [CursoController, 'index'])
router.get('/cursos/:id', [CursoController, 'show'])
router.post('/cursos', [CursoController, 'store'])
router.put('/cursos/:id', [CursoController, 'update'])
router.patch('/cursos/:id', [CursoController, 'update'])
router.delete('/cursos/:id', [CursoController, 'destroy'])
