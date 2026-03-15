import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import OrientadorController from '#controllers/orientadorController'
import DocenteController from '#controllers/docenteController'
const OrientadorAsignacionesController = () => import('#controllers/orientadorAsignacionesController')

// CRUD Orientadores - Todas requieren JWT
router.get('/orientadores', [OrientadorController, 'index']).use(middleware.jwt())

// Acudientes/Padres de familia de la institución (ANTES de /:id para evitar conflictos)
router.get('/orientadores/acudientes', [OrientadorController, 'listarAcudientes']).use(middleware.jwt())
router
  .get('/orientadores/acudientes-institucion', [OrientadorController, 'listarAcudientesInstitucion'])
  .use(middleware.jwt())
router
  .get('/orientadores/acudientes/:acudienteId/estudiantes', [OrientadorController, 'listarEstudiantesPorAcudiente'])
  .use(middleware.jwt())
router.get('/orientadores/estudiantes', [OrientadorController, 'listarEstudiantesInstitucion']).use(middleware.jwt())

// Grados y cursos de la institución del orientador
router.get('/orientadores/grados', [OrientadorController, 'listarGrados']).use(middleware.jwt())
router.get('/orientadores/cursos', [OrientadorController, 'listarCursos']).use(middleware.jwt())
router.get('/orientadores/mi-institucion', [OrientadorController, 'miInstitucion']).use(middleware.jwt())

// Listar docentes de la institución del orientador (debe ir antes de /:id)
router.get('/orientadores/docentes', [DocenteController, 'index']).use(middleware.jwt())

router.get('/orientadores/:id', [OrientadorController, 'show']).use(middleware.jwt())
router.post('/orientadores', [OrientadorController, 'store']).use([middleware.jwt(), middleware.coordinadorORector()])
router.put('/orientadores/:id', [OrientadorController, 'update']).use([middleware.jwt(), middleware.coordinadorORector()])
router.delete('/orientadores/:id', [OrientadorController, 'destroy']).use([middleware.jwt(), middleware.coordinadorORector()])

// Crear docentes por orientador o admin del sistema
router
  .post('/orientadores/docentes', [DocenteController, 'store'])
  .use([middleware.jwt(), () => import('#middleware/admin_o_orientador_middleware')])

// Asignaciones del orientador
router.get('/orientador/asignaciones', [OrientadorAsignacionesController, 'listarAsignaciones']).use(middleware.jwt())
router.get('/orientador/asignaciones/:id/resumen', [OrientadorAsignacionesController, 'resumenAsignacion']).use(middleware.jwt())
// Entregas del orientador (listado con filtros)
router.get('/orientador/entregas', [OrientadorAsignacionesController, 'listarEntregas']).use(middleware.jwt())
