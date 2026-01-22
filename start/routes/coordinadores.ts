import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CoordinadoresController = () => import('#controllers/coordinadoresController')

// Todas las rutas requieren JWT (coordinador rolId: 3)
router
  .group(() => {
    // Dashboard general
    router.get('/coordinadores/estadisticas', [CoordinadoresController, 'estadisticas'])

    // Cursos con métricas
    router.get('/coordinadores/cursos', [CoordinadoresController, 'cursos'])

    // Alertas académicas
    router.get('/coordinadores/alertas', [CoordinadoresController, 'alertas'])

    // Docentes con seguimiento
    router.get('/coordinadores/docentes', [CoordinadoresController, 'docentes'])

    // Orientadores con métricas
    router.get('/coordinadores/orientadores', [CoordinadoresController, 'orientadores'])

    // Rendimiento detallado de un curso
    router.get('/coordinadores/cursos/:id/rendimiento', [
      CoordinadoresController,
      'rendimientoCurso',
    ])
  })
  .use(middleware.jwt())
