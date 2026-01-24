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
}).use(middleware.jwt())
