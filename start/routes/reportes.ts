import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ReportesController = () => import('#controllers/reportesController')

router.group(() => {
  // Reporte de entregas por curso
  router.get('/reportes/cursos/:id/entregas', [ReportesController, 'entregasPorCurso'])
  
  // Reporte de calificaciones por curso
  router.get('/reportes/cursos/:id/calificaciones', [ReportesController, 'calificacionesPorCurso'])
  
  // Resumen institucional
  router.get('/reportes/institucion/resumen', [ReportesController, 'resumenInstitucion'])

  // Estudiantes por Curso/Grado/Jornada (institución)
  router.get('/reportes/institucion/estudiantes-por-curso', [ReportesController, 'estudiantesPorCursoInstitucion'])

  // Alertas Académicas (institución)
  router.get('/reportes/institucion/alertas-academicas', [ReportesController, 'alertasAcademicasInstitucion'])

  // Estudiantes sin calificaciones en el período (institución)
  router.get('/reportes/institucion/sin-calificaciones', [ReportesController, 'estudiantesSinCalificacionesInstitucion'])
}).use(middleware.jwt())
