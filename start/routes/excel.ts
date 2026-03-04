
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import ExcelController from '#controllers/excelController'

// Rutas para carga masiva Excel
router.post('/excel/acudientes/carga-masiva', [ExcelController, 'cargaMasivaAcudientes']).use(middleware.jwt())
router
  .post('/excel/estudiantes/carga-masiva', async (ctx) => {
    return new ExcelController().cargaMasivaEstudiantes(ctx)
  })
  .use(middleware.jwt())
