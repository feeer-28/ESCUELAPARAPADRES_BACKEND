import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const CoordinadoresController = () => import('#controllers/coordinadoresController')

// Todas las rutas requieren JWT + rol coordinador
router
  .group(() => {
    // === ESTADÍSTICAS Y DASHBOARD ===
    router.get('/coordinadores/estadisticas', [CoordinadoresController, 'estadisticas'])
    router.get('/coordinadores/alertas', [CoordinadoresController, 'alertas'])

    // === GESTIÓN ACADÉMICA ===
    // Cursos con métricas
    router.get('/coordinadores/cursos', [CoordinadoresController, 'cursos'])
    router.get('/coordinadores/cursos/:id/rendimiento', [
      CoordinadoresController,
      'rendimientoCurso',
    ])

    // === GESTIÓN DE PERSONAL ===
    // Vista unificada de personal (docentes + orientadores)
    router.get('/coordinadores/personal', [CoordinadoresController, 'personal'])
    router.post('/coordinadores/personal', [CoordinadoresController, 'crearPersonal'])
    router.put('/coordinadores/personal/:id', [CoordinadoresController, 'actualizarPersonal'])
    router.patch('/coordinadores/personal/:id/estado', [CoordinadoresController, 'cambiarEstadoPersonal'])
    
    // Docentes (endpoints específicos - mantener por compatibilidad)
    router.get('/coordinadores/docentes', [CoordinadoresController, 'docentes'])
    router.post('/coordinadores/docentes', [CoordinadoresController, 'crearDocente'])
    
    // Orientadores (endpoints específicos - mantener por compatibilidad)
    router.get('/coordinadores/orientadores', [CoordinadoresController, 'orientadores'])
    router.post('/coordinadores/orientadores', [CoordinadoresController, 'crearOrientador'])
    router.put('/coordinadores/orientadores/:id', [CoordinadoresController, 'actualizarOrientador'])
    router.delete('/coordinadores/orientadores/:id', [CoordinadoresController, 'eliminarOrientador'])
    
    // Acudientes/Padres de familia
    router.get('/coordinadores/acudientes', [CoordinadoresController, 'listarAcudientes'])

    // === CONFIGURACIÓN ===
    // Ver datos de su institución
    router.get('/coordinadores/mi-institucion', [CoordinadoresController, 'miInstitucion'])
    
    // Períodos académicos de su institución
    router.get('/coordinadores/periodos', [CoordinadoresController, 'listarPeriodos'])
  })
  .use([middleware.jwt(), middleware.coordinador()])
