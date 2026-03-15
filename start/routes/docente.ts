import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import DocenteController from '#controllers/docenteController'
import DocenteTareasController from '#controllers/docente_tareas' // 🔥 Importar nuevo controlador

// Rutas públicas (autenticación)
router.post('/docentes/login', [DocenteController, 'login'])
router.post('/docentes/logout', [DocenteController, 'logout']).use(middleware.jwt())

// Rutas protegidas con JWT (lectura) - rutas específicas PRIMERO
router.get('/docentes', [DocenteController, 'index']).use(middleware.jwt())
router.get('/docentes/mis-tareas', [DocenteTareasController, 'misTareas']).use(middleware.jwt()) // 🔥 Para tareas (todas las instituciones)
router.get('/docentes/mis-cursos', [DocenteTareasController, 'misCursos']).use(middleware.jwt()) // 🔥 CORREGIDO: Para cursos
router.get('/docentes/mis-tareas-institucion', [DocenteTareasController, 'misTareasInstitucion']).use(middleware.jwt()) // 🔥 Para tareas de mi institución
router.get('/docentes/:id', [DocenteController, 'show']).use(middleware.jwt()) // 🔥 Ruta con parámetro al final

// Rutas protegidas - Admin Sistema y Orientadores
router.post('/docentes', [DocenteController, 'store'])
  .use([middleware.jwt(), middleware.orientadorOAdmin()])
router.put('/docentes/:id', [DocenteController, 'update'])
  .use([middleware.jwt(), middleware.orientadorOAdmin()])
router.patch('/docentes/:id', [DocenteController, 'update'])
  .use([middleware.jwt(), middleware.orientadorOAdmin()])
router.delete('/docentes/:id', [DocenteController, 'destroy'])
  .use([middleware.jwt(), middleware.orientadorOAdmin()])
