import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Rutas de eventos (requieren autenticación)
router.group(() => {
  // Listar eventos
  router.get('/eventos', '#controllers/eventosController.index')
  
  // Crear evento
  router.post('/eventos', '#controllers/eventosController.store')
  
  // Ver detalle de evento
  router.get('/eventos/:id', '#controllers/eventosController.show')
  
  // Actualizar evento
  router.put('/eventos/:id', '#controllers/eventosController.update')
  
  // Eliminar evento
  router.delete('/eventos/:id', '#controllers/eventosController.destroy')
  
  // Eventos próximos
  router.get('/eventos/proximos', '#controllers/eventosController.proximos')
  
}).prefix('/api').use([middleware.auth()])
