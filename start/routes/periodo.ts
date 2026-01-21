import router from '@adonisjs/core/services/router'
import PeriodoController from '#controllers/periodoController'

router.get('/periodos', [PeriodoController, 'index'])
router.get('/periodos/:id', [PeriodoController, 'show'])
router.post('/periodos', [PeriodoController, 'store'])
router.put('/periodos/:id', [PeriodoController, 'update'])
router.patch('/periodos/:id', [PeriodoController, 'update'])
router.delete('/periodos/:id', [PeriodoController, 'destroy'])
