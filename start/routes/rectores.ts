import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RectoresController = () => import('#controllers/rectoresController')

// Obtener estadísticas del rector (requiere JWT y rol rector)
router.get('/rectores/estadisticas', [RectoresController, 'estadisticas']).use(middleware.jwt())

// Crear coordinador en la institución del rector (requiere JWT y rol rector)
router
  .post('/rectores/coordinadores', [RectoresController, 'crearCoordinador'])
  .use(middleware.jwt())
