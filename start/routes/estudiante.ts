import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import EstudianteController from '#controllers/estudianteController'

// CRUD básico de estudiantes
router.get('/estudiantes', [EstudianteController, 'index']).use(middleware.jwt())
router.get('/estudiantes/:id', [EstudianteController, 'show']).use(middleware.jwt())
router.post('/estudiantes', [EstudianteController, 'store']).use(middleware.jwt())
router.put('/estudiantes/:id', [EstudianteController, 'update']).use(middleware.jwt())
router.patch('/estudiantes/:id', [EstudianteController, 'update']).use(middleware.jwt())
router.delete('/estudiantes/:id', [EstudianteController, 'destroy']).use(middleware.jwt())

// Vinculación estudiante-acudiente (HU-13)
router.get('/estudiantes/:id/acudientes', [EstudianteController, 'listarAcudientes']).use(middleware.jwt())
router.post('/estudiantes/:id/acudientes', [EstudianteController, 'vincularAcudiente']).use(middleware.jwt())
router.put('/estudiantes/:id/acudientes/:acudienteId', [EstudianteController, 'actualizarVinculo']).use(middleware.jwt())
router.delete('/estudiantes/:id/acudientes/:acudienteId', [EstudianteController, 'desvincularAcudiente']).use(middleware.jwt())

// Gestión estudiantes (HU-15)
router.post('/estudiantes/:id/cambiar-curso', [EstudianteController, 'cambiarCurso']).use(middleware.jwt())
router.post('/estudiantes/:id/retirar', [EstudianteController, 'retirar']).use(middleware.jwt())
router.get('/estudiantes/:id/historial', [EstudianteController, 'historial']).use(middleware.jwt())

// Rutas para carga masiva Excel
router.get('/estudiantes/plantilla-excel', [EstudianteController, 'descargarPlantilla']).use(middleware.jwt())
router.post('/estudiantes/validar-excel', [EstudianteController, 'validarExcel']).use(middleware.jwt())
router.post('/estudiantes/carga-masiva', [EstudianteController, 'cargaMasiva']).use(middleware.jwt())

