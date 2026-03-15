import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RectoresController = () => import('#controllers/rectoresController')

// Todas las rutas del rector requieren JWT + rol rector
router
  .group(() => {
    // === ESTADÍSTICAS ===
    router.get('/rectores/estadisticas', [RectoresController, 'estadisticas'])
    router.get('/rector/estadisticas', [RectoresController, 'estadisticas']) // Compatibilidad frontend

    // === GESTIÓN DE PERSONAL ===
    // Crear coordinador en la institución del rector
    router.post('/rectores/coordinadores', [RectoresController, 'crearCoordinador'])
    router.post('/rector/coordinadores', [RectoresController, 'crearCoordinador']) // Compatibilidad frontend
    
    // Listar coordinadores de la institución del rector
    router.get('/rectores/coordinadores', [RectoresController, 'listarCoordinadores'])
    router.get('/rector/coordinadores', [RectoresController, 'listarCoordinadores']) // Compatibilidad frontend
    
    // Listar orientadores de la institución del rector
    router.get('/rectores/orientadores', [RectoresController, 'listarOrientadores'])
    router.get('/rector/orientadores', [RectoresController, 'listarOrientadores']) // Compatibilidad frontend
    
    // Listar docentes de la institución del rector
    router.get('/rectores/docentes', [RectoresController, 'listarDocentes'])
    router.get('/rector/docentes', [RectoresController, 'listarDocentes']) // Compatibilidad frontend

    // === CONFIGURACIÓN DE INSTITUCIÓN ===
    // Ver datos de su institución
    router.get('/rectores/mi-institucion', [RectoresController, 'miInstitucion'])
    router.get('/rector/mi-institucion', [RectoresController, 'miInstitucion']) // Compatibilidad frontend
    
    // Editar datos de su institución (campos permitidos)
    router.put('/rectores/mi-institucion', [RectoresController, 'actualizarMiInstitucion'])
    router.put('/rector/mi-institucion', [RectoresController, 'actualizarMiInstitucion']) // Compatibilidad frontend

    // === GESTIÓN ACADÉMICA ===
    // Listar cursos de la institución del rector
    router.get('/rectores/cursos', [RectoresController, 'listarCursos'])
    router.get('/rector/cursos', [RectoresController, 'listarCursos']) // Compatibilidad frontend
    
    // Períodos académicos de su institución
    router.get('/rectores/periodos', [RectoresController, 'listarPeriodos'])
    router.get('/rector/periodos', [RectoresController, 'listarPeriodos']) // Compatibilidad frontend
    
    router.post('/rectores/periodos', [RectoresController, 'crearPeriodo'])
    router.post('/rector/periodos', [RectoresController, 'crearPeriodo']) // Compatibilidad frontend
    
    router.put('/rectores/periodos/:id', [RectoresController, 'actualizarPeriodo'])
    router.put('/rector/periodos/:id', [RectoresController, 'actualizarPeriodo']) // Compatibilidad frontend
    
    router.delete('/rectores/periodos/:id', [RectoresController, 'eliminarPeriodo'])
    router.delete('/rector/periodos/:id', [RectoresController, 'eliminarPeriodo']) // Compatibilidad frontend
  })
  .use([middleware.jwt(), middleware.rector()])
