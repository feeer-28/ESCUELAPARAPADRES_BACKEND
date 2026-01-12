import router from '@adonisjs/core/services/router'
import MunicipioController from '#controllers/municipioController'

router.get('/municipios', [MunicipioController, 'index'])
router.get('/municipios/:id', [MunicipioController, 'show'])
router.post('/municipios', [MunicipioController, 'store'])
router.put('/municipios/:id', [MunicipioController, 'update'])
router.patch('/municipios/:id', [MunicipioController, 'update'])
router.delete('/municipios/:id', [MunicipioController, 'destroy'])
