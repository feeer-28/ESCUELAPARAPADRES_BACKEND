import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Rutas de dispositivos móviles (requieren autenticación)
router.group(() => {
  // Registrar token FCM
  router.post('/dispositivos/registrar', '#controllers/dispositivosController.registrar')
  
  // Eliminar/desactivar token FCM
  router.delete('/dispositivos/eliminar', '#controllers/dispositivosController.eliminar')
  
  // Listar dispositivos del usuario
  router.get('/dispositivos', '#controllers/dispositivosController.index')
  
}).prefix('/api/movil').use([middleware.auth()])
