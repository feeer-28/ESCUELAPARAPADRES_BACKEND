import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const RectoresController = () => import('#controllers/rectoresController')

// Todas las rutas del rector requieren JWT + rol rector
router
  .group(() => {
    // === ESTADÍSTICAS ===
    router.get('/rectores/estadisticas', [RectoresController, 'estadisticas'])

    // === GESTIÓN DE PERSONAL ===
    // Crear coordinador en la institución del rector
    router.post('/rectores/coordinadores', [RectoresController, 'crearCoordinador'])
    // Listar coordinadores de la institución del rector
    router.get('/rectores/coordinadores', [RectoresController, 'listarCoordinadores'])
    // Listar orientadores de la institución del rector
    router.get('/rectores/orientadores', [RectoresController, 'listarOrientadores'])
    // Listar docentes de la institución del rector
    router.get('/rectores/docentes', [RectoresController, 'listarDocentes'])

    // === CONFIGURACIÓN DE INSTITUCIÓN ===
    // Ver datos de su institución
    router.get('/rectores/mi-institucion', [RectoresController, 'miInstitucion'])
    // Editar datos de su institución (campos permitidos)
    router.put('/rectores/mi-institucion', [RectoresController, 'actualizarMiInstitucion'])

    // === GESTIÓN ACADÉMICA ===
    // Listar cursos de la institución del rector
    router.get('/rectores/cursos', [RectoresController, 'listarCursos'])
    
    // Períodos académicos de su institución
    router.get('/rectores/periodos', [RectoresController, 'listarPeriodos'])
    router.post('/rectores/periodos', [RectoresController, 'crearPeriodo'])
    router.put('/rectores/periodos/:id', [RectoresController, 'actualizarPeriodo'])
    router.delete('/rectores/periodos/:id', [RectoresController, 'eliminarPeriodo'])
  })
  .use([middleware.jwt(), middleware.rector()])
