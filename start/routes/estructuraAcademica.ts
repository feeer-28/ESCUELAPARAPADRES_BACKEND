import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import EstructuraAcademicaController from '#controllers/estructuraAcademicaController'

// Rutas protegidas - Requieren JWT
router.post('/estructura-academica/asignar-grados', [EstructuraAcademicaController, 'asignarGrados']).use(middleware.jwt())
router.get('/estructura-academica/grados-disponibles/:institucionId', [EstructuraAcademicaController, 'obtenerGradosDisponibles']).use(middleware.jwt())
router.get('/estructura-academica/cursos-por-grado/:institucionId', [EstructuraAcademicaController, 'obtenerCursosPorGrado']).use(middleware.jwt())
router.post('/estructura-academica/generar-grados', [EstructuraAcademicaController, 'generarGrados']).use(middleware.jwt())
router.post('/estructura-academica/generar-cursos', [EstructuraAcademicaController, 'generarCursos']).use(middleware.jwt())
router.get('/estructura-academica/institucion/:institucionId', [EstructuraAcademicaController, 'obtenerEstructura']).use(middleware.jwt())
router.get('/estructura-academica/sugerir-cursos/:gradoId', [EstructuraAcademicaController, 'sugerirCursos']).use(middleware.jwt())
