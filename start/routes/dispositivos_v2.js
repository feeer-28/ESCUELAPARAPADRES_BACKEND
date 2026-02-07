import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Rutas de dispositivos móviles (requieren autenticación)
router.group(() => {
  // Registrar token FCM
  router.post('/dispositivos/registrar', '#controllers/dispositivos_v2.registrar')
  
  // Eliminar/desactivar token FCM
  router.delete('/dispositivos/eliminar', '#controllers/dispositivos_v2.eliminar')
  
  // Listar dispositivos del usuario
  router.get('/dispositivos', '#controllers/dispositivos_v2.index')
  
  // Actualizar información del dispositivo
  router.put('/dispositivos/actualizar', '#controllers/dispositivos_v2.actualizar')
  
  // Desactivar todos los dispositivos
  router.delete('/dispositivos/desactivar-todos', '#controllers/dispositivos_v2.desactivarTodos')
  
  // Estadísticas de dispositivos
  router.get('/dispositivos/estadisticas', '#controllers/dispositivos_v2.estadisticas')
  
}).prefix('/api/movil').use([middleware.auth()])
