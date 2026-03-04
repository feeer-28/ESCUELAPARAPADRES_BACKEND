import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import DocenteController from '#controllers/docenteController'

// Rutas públicas (autenticación)
router.post('/docentes/login', [DocenteController, 'login'])
router.post('/docentes/logout', [DocenteController, 'logout']).use(middleware.jwt())

// ========================================
// Rutas para gestión de estudiantes y acudientes por docentes
// ========================================

// Gestión de estudiantes (rutas específicas primero)
router.get('/docentes/estudiantes', [DocenteController, 'listarEstudiantes']).use(middleware.jwt())
router.get('/docentes/estudiantes/:id', [DocenteController, 'verEstudiante']).use(middleware.jwt())
router.put('/docentes/estudiantes/:id', [DocenteController, 'editarEstudiante']).use(middleware.jwt())

// Gestión de acudientes (rutas específicas primero)
router.get('/docentes/acudientes', [DocenteController, 'listarAcudientes']).use(middleware.jwt())
router.get('/docentes/acudientes/:id', [DocenteController, 'verAcudiente']).use(middleware.jwt())
router.put('/docentes/acudientes/:id', [DocenteController, 'editarAcudiente']).use(middleware.jwt())

// Rutas protegidas con JWT (lectura) - rutas genéricas al final
router.get('/docentes', [DocenteController, 'index']).use(middleware.jwt())
router.get('/docentes/:id', [DocenteController, 'show']).use(middleware.jwt())

// Rutas protegidas - Solo Admin Sistema
router.post('/docentes', [DocenteController, 'store'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.put('/docentes/:id', [DocenteController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.patch('/docentes/:id', [DocenteController, 'update'])
  .use([middleware.jwt(), middleware.adminSistema()])
router.delete('/docentes/:id', [DocenteController, 'destroy'])
  .use([middleware.jwt(), middleware.adminSistema()])
