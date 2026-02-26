import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const AsignacionesController = () => import('#controllers/asignacionesController')
const AsignacionesEspecialesController = () => import('#controllers/asignacionesEspecialesController')
const MovilEntregasController = () => import('#controllers/movil/entregasController')

router.post('/asignaciones', [AsignacionesController, 'store']).use(middleware.jwt())
// Casos especiales: asignación dirigida a estudiante(s) específicos
router.post('/asignaciones/especial', [AsignacionesEspecialesController, 'store']).use(middleware.jwt())

router
  .post('/asignaciones/orientador', [AsignacionesController, 'storeOrientador'])
  .use(middleware.jwt())
// Casos especiales (orientador)
router
  .post('/asignaciones/orientador/especial', [AsignacionesEspecialesController, 'storeOrientador'])
  .use(middleware.jwt())

// Editar una asignación (docente u orientador autorizado)
router.put('/asignaciones/:id', [AsignacionesController, 'update']).use(middleware.jwt())
router.patch('/asignaciones/:id', [AsignacionesController, 'update']).use(middleware.jwt())

// Eliminar una asignación (docente u orientador autorizado)
router.delete('/asignaciones/:id', [AsignacionesController, 'destroy']).use(middleware.jwt())

// Compatibilidad: crear entrega desde ruta anidada de asignaciones
router.post('/asignaciones/:id/entregas', [MovilEntregasController, 'enviarEntrega']).use(middleware.jwt())
