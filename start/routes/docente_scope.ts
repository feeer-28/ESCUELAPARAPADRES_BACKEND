import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import DocenteScopeController from '#controllers/docenteScopeController'

router
  .group(() => {
    router.get('/docente/mis-cursos', [DocenteScopeController, 'misCursos'])
    router.get('/docente/estudiantes', [DocenteScopeController, 'estudiantes'])
    router.get('/docente/acudientes', [DocenteScopeController, 'acudientes'])
    router.get('/docente/entregas', [DocenteScopeController, 'entregas'])
    router.get('/docente/asignaciones', [DocenteScopeController, 'asignaciones'])
    router.get('/docente/asignaciones/:id/resumen', [DocenteScopeController, 'asignacionResumen'])
  })
  .use(middleware.jwt())
