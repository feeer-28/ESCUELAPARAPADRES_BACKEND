import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const AsignacionesController = () => import('#controllers/asignacionesController')

router.post('/asignaciones', [AsignacionesController, 'store']).use(middleware.jwt())

router
  .post('/asignaciones/orientador', [AsignacionesController, 'storeOrientador'])
  .use(middleware.jwt())

// Editar una asignación (docente u orientador autorizado)
router.put('/asignaciones/:id', [AsignacionesController, 'update']).use(middleware.jwt())
router.patch('/asignaciones/:id', [AsignacionesController, 'update']).use(middleware.jwt())

// Eliminar una asignación (docente u orientador autorizado)
router.delete('/asignaciones/:id', [AsignacionesController, 'destroy']).use(middleware.jwt())
