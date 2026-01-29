import router from '@adonisjs/core/services/router'
import DebugController from '#controllers/debugController'

// Ruta temporal para debugging (SIN autenticación)
// ⚠️ ELIMINAR EN PRODUCCIÓN
router.get('/debug/institucion/:id', [DebugController, 'verificarInstitucion'])
