import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Rutas de notificaciones (requieren autenticación)
router.group(() => {
  // Listar notificaciones del usuario
  router.get('/notificaciones', '#controllers/notificaciones_v2.index')
  
  // Marcar notificación como leída
  router.put('/notificaciones/:id/leida', '#controllers/notificaciones_v2.marcarLeida')
  
  // Marcar todas como leídas
  router.put('/notificaciones/marcar-todas-leidas', '#controllers/notificaciones_v2.marcarTodasLeidas')
  
  // Eliminar notificación
  router.delete('/notificaciones/:id', '#controllers/notificaciones_v2.destroy')
  
  // Estadísticas de notificaciones
  router.get('/notificaciones/estadisticas', '#controllers/notificaciones_v2.estadisticas')
  
  // Enviar notificación de prueba
  router.post('/notificaciones/prueba', '#controllers/notificaciones_v2.prueba')
  
}).prefix('/api/movil').use([middleware.auth()])
