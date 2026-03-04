import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

import AsignacionesController from '#controllers/asignacionesController'
const MovilController = () => import('#controllers/movilController')



router.post('/asignaciones', [AsignacionesController, 'store']).use(middleware.jwt())
<<<<<<< Updated upstream

// Rutas adicionales para detalle y entregas (acudiente)
router.get('/asignaciones/:id/detalle', [MovilController, 'detalleAsignacion']).use(middleware.jwt())
router.post('/asignaciones/:id/entregas', [MovilController, 'enviarEntrega']).use(middleware.jwt())

// Rutas de tareas por estudiante (acudiente)
router.get('/estudiantes/:id/tareas', [MovilController, 'tareasEstudiante']).use(middleware.jwt())

=======
router
  .post('/asignaciones/orientador', [AsignacionesController, 'storeOrientador'])
  .use(middleware.jwt())
>>>>>>> Stashed changes
