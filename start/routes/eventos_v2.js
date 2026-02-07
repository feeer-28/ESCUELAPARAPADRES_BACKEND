import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Rutas de eventos (requieren autenticación)
router.group(() => {
  // Listar eventos con filtros
  router.get('/eventos', '#controllers/eventos_v2.index')
  
  // Crear evento
  router.post('/eventos', '#controllers/eventos_v2.store')
  
  // Ver detalle de evento
  router.get('/eventos/:id', '#controllers/eventos_v2.show')
  
  // Actualizar evento
  router.put('/eventos/:id', '#controllers/eventos_v2.update')
  
  // Eliminar evento (soft delete)
  router.delete('/eventos/:id', '#controllers/eventos_v2.destroy')
  
  // Eventos próximos
  router.get('/eventos/proximos', '#controllers/eventos_v2.proximos')
  
  // Estadísticas de eventos
  router.get('/eventos/estadisticas', '#controllers/eventos_v2.estadisticas')
  
}).prefix('/api').use([middleware.auth()])
