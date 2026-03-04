import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import PeriodoController from '#controllers/periodoController'

// Rutas públicas (solo lectura)
router.get('/periodos', [PeriodoController, 'index'])
router.get('/periodos/:id', [PeriodoController, 'show'])

// Rutas protegidas - Solo Admin Sistema
router.post('/periodos', [PeriodoController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/periodos/:id', [PeriodoController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/periodos/:id', [PeriodoController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/periodos/:id', [PeriodoController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
