import type { HttpContext } from '@adonisjs/core/http'
import NivelEducativo from '#models/nivelEducativo'
import Grado from '#models/grado'
import Curso from '#models/curso'
import Institucion from '#models/institucion'
import db from '@adonisjs/lucid/services/db'

export default class EstructuraAcademicaController {
  /**
   * Asignar grados existentes a un nivel educativo
   * POST /estructura-academica/asignar-grados
   */
  async asignarGrados({ request, response }: HttpContext) {
    try {
      const { nivelEducativoId, institucionId, gradosIds } = request.only([
        'nivelEducativoId',
        'institucionId',
        'gradosIds' // Array de IDs de grados existentes
      ])

      if (!nivelEducativoId || !institucionId || !gradosIds || !Array.isArray(gradosIds)) {
        return response.status(400).json({
          success: false,
          error: 'nivelEducativoId, institucionId y gradosIds (array) son requeridos'
        })
      }

      // Verificar que la institución exista
      const institucion = await Institucion.find(institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          error: 'Institución no encontrada'
        })
      }

      // Obtener información del nivel educativo
      let nivelEducativo
      if (typeof nivelEducativoId === 'string') {
        // Es un nivel predeterminado
        const nivelesPredeterminados = {
          'preescolar': { nombre: 'Preescolar' },
          'primaria': { nombre: 'Primaria' },
          'secundaria': { nombre: 'Secundaria' },
          'media': { nombre: 'Media Técnica' }
        }
        
        const nivelInfo = nivelesPredeterminados[nivelEducativoId]
        if (!nivelInfo) {
          return response.status(400).json({
            success: false,
            error: 'Nivel educativo predeterminado no válido'
          })
        }
        
        nivelEducativo = nivelInfo
      } else {
        // Es un nivel personalizado
        const nivelPersonalizado = await NivelEducativo.find(nivelEducativoId)
        if (!nivelPersonalizado) {
          return response.status(404).json({
            success: false,
            error: 'Nivel educativo no encontrado'
          })
        }
        
        nivelEducativo = {
          nombre: nivelPersonalizado.nombre
        }
      }

      // Verificar que los grados existan y pertenezcan a la institución
      const grados = await Grado.query()
        .whereIn('id', gradosIds)
        .where('institucion_id', institucionId)

      if (grados.length !== gradosIds.length) {
        return response.status(400).json({
          success: false,
          error: 'Uno o más grados no existen o no pertenecen a esta institución'
        })
      }

      // Para niveles predeterminados, necesitamos crear el registro en niveles_educativos
      let nivelEducativoIdFinal = nivelEducativoId
      if (typeof nivelEducativoId === 'string') {
        const nuevoNivel = await NivelEducativo.create({
          nombre: nivelEducativo.nombre,
          descripcion: `Nivel ${nivelEducativo.nombre} para institución ${institucion.nombre}`,
          institucionId: institucionId,
          esPredeterminado: false,
          orden: 1
        })
        nivelEducativoIdFinal = nuevoNivel.id
      }

      // Actualizar los grados para que apunten al nivel educativo
      const gradosActualizados = []
      for (const grado of grados) {
        grado.nivelEducativoId = nivelEducativoIdFinal
        await grado.save()
        gradosActualizados.push({
          id: grado.id,
          nombre: grado.nombre,
          orden: grado.orden
        })
      }

      return response.status(200).json({
        success: true,
        message: `Grados asignados a ${nivelEducativo.nombre}`,
        data: {
          nivel: nivelEducativo.nombre,
          nivelEducativoId: nivelEducativoIdFinal,
          gradosAsignados: gradosActualizados
        }
      })
    } catch (error) {
      console.error('Error al asignar grados:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al asignar grados',
        details: error.message
      })
    }
  }

  /**
   * Obtener todos los cursos de una institución organizados por grados
   * GET /estructura-academica/cursos-por-grado/:institucionId
   */
  async obtenerCursosPorGrado({ params, response }: HttpContext) {
    try {
      const institucionId = params.institucionId

      // Obtener todos los grados de la institución con sus cursos
      const gradosConCursos = await Grado.query()
        .where('institucion_id', institucionId)
        .preload('cursos', (cursosQuery) => {
          cursosQuery.orderBy('nombre', 'asc')
        })
        .orderBy('orden', 'asc')

      // Agrupar por nivel educativo si existe
      const estructura = {
        grados: gradosConCursos.map(grado => ({
          id: grado.id,
          nombre: grado.nombre,
          orden: grado.orden,
          nivelEducativoId: grado.nivelEducativoId,
          cursos: grado.cursos.map(curso => ({
            id: curso.id,
            nombre: curso.nombre,
            jornada: curso.jornada,
            totalEstudiantes: 0 // Se puede calcular si se necesita
          })),
          totalCursos: grado.cursos.length,
          puedeCrearMas: true // Siempre puede crear más cursos
        })),
        resumen: {
          totalGrados: gradosConCursos.length,
          totalCursos: gradosConCursos.reduce((total, grado) => total + grado.cursos.length, 0),
          gradosSinCursos: gradosConCursos.filter(g => g.cursos.length === 0).length,
          gradosConCursos: gradosConCursos.filter(g => g.cursos.length > 0).length
        }
      }

      return response.status(200).json({
        success: true,
        data: estructura
      })
    } catch (error) {
      console.error('Error al obtener cursos por grado:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al obtener cursos por grado',
        details: error.message
      })
    }
  }

  /**
   * Obtener grados disponibles para asignar a un nivel educativo
   * GET /estructura-academica/grados-disponibles/:institucionId
   */
  async obtenerGradosDisponibles({ params, response }: HttpContext) {
    try {
      const institucionId = params.institucionId

      // Obtener todos los grados de la institución que no están asignados a un nivel
      const gradosDisponibles = await Grado.query()
        .where('institucion_id', institucionId)
        .whereNull('nivel_educativo_id') // Grados sin asignar
        .orderBy('orden')

      return response.status(200).json({
        success: true,
        data: {
          institucionId,
          grados: gradosDisponibles.map(g => ({
            id: g.id,
            nombre: g.nombre,
            orden: g.orden,
            cursos: [] // Se cargará si se necesita
          }))
        }
      })
    } catch (error) {
      console.error('Error al obtener grados disponibles:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al obtener grados disponibles',
        details: error.message
      })
    }
  }

  /**
   * Generar grados automáticamente para un nivel educativo
   * POST /estructura-academica/generar-grados
   */
  async generarGrados({ request, response }: HttpContext) {
    try {
      const { nivelEducativoId, institucionId } = request.only([
        'nivelEducativoId',
        'institucionId'
      ])

      if (!nivelEducativoId || !institucionId) {
        return response.status(400).json({
          success: false,
          error: 'nivelEducativoId e institucionId son requeridos'
        })
      }

      // Obtener información del nivel educativo
      let nivelEducativo
      if (typeof nivelEducativoId === 'string') {
        // Es un nivel predeterminado
        const nivelesPredeterminados = {
          'preescolar': { nombre: 'Preescolar', grados: ['Transición', 'Jardín'] },
          'primaria': { nombre: 'Primaria', grados: ['1°', '2°', '3°', '4°', '5°'] },
          'secundaria': { nombre: 'Secundaria', grados: ['6°', '7°', '8°', '9°'] },
          'media': { nombre: 'Media Técnica', grados: ['10°', '11°'] }
        }
        
        const nivelInfo = nivelesPredeterminados[nivelEducativoId.toLowerCase()]
        if (!nivelInfo) {
          return response.status(400).json({
            success: false,
            error: 'Nivel educativo predeterminado no válido'
          })
        }
        
        nivelEducativo = nivelInfo
      } else {
        // Es un nivel personalizado
        const nivelPersonalizado = await NivelEducativo.find(nivelEducativoId)
        if (!nivelPersonalizado) {
          return response.status(404).json({
            success: false,
            error: 'Nivel educativo no encontrado'
          })
        }
        
        // Para niveles personalizados, necesitamos definir los grados
        // Esto podría venir del request o tener una configuración por defecto
        nivelEducativo = {
          nombre: nivelPersonalizado.nombre,
          grados: this.generarGradosPorDefecto(nivelPersonalizado.nombre)
        }
      }

      // Verificar que la institución exista
      const institucion = await Institucion.find(institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          error: 'Institución no encontrada'
        })
      }

      // Crear grados si no existen
      const gradosCreados = []
      for (const [index, nombreGrado] of nivelEducativo.grados.entries()) {
        // Verificar si ya existe
        const existente = await Grado.query()
          .where('nombre', nombreGrado)
          .where('institucion_id', institucionId)
          .first()

        if (!existente) {
          const grado = await Grado.create({
            nombre: nombreGrado,
            orden: index + 1,
            institucionId: institucionId,
            nivelEducativoId: typeof nivelEducativoId === 'string' ? null : nivelEducativoId,
            esAutomatico: true
          })
          gradosCreados.push(grado)
        }
      }

      return response.status(201).json({
        success: true,
        message: `Grados generados para ${nivelEducativo.nombre}`,
        data: {
          nivel: nivelEducativo.nombre,
          gradosCreados: gradosCreados.map(g => ({
            id: g.id,
            nombre: g.nombre,
            orden: g.orden
          }))
        }
      })
    } catch (error) {
      console.error('Error al generar grados:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al generar grados',
        details: error.message
      })
    }
  }

  /**
   * Generar cursos para un grado específico
   * POST /estructura-academica/generar-cursos
   */
  async generarCursos({ request, response }: HttpContext) {
    try {
      const { gradoId, cursos, institucionId } = request.only([
        'gradoId',
        'cursos', // Array: [{nombre: "6A", jornada: "mañana"}, {nombre: "6B", jornada: "tarde"}]
        'institucionId'
      ])

      if (!gradoId || !cursos || !Array.isArray(cursos) || !institucionId) {
        return response.status(400).json({
          success: false,
          error: 'gradoId, cursos (array) e institucionId son requeridos'
        })
      }

      // Verificar que el grado exista
      const grado = await Grado.find(gradoId)
      if (!grado) {
        return response.status(404).json({
          success: false,
          error: 'Grado no encontrado'
        })
      }

      // Crear cursos
      const cursosCreados = []
      for (const cursoInfo of cursos) {
        // Verificar si ya existe
        const existente = await Curso.query()
          .where('nombre', cursoInfo.nombre)
          .where('grado_id', gradoId)
          .where('institucion_id', institucionId)
          .first()

        if (!existente) {
          const curso = await Curso.create({
            nombre: cursoInfo.nombre,
            gradoId: gradoId,
            institucionId: institucionId,
            jornada: cursoInfo.jornada || 'mañana'
          })
          cursosCreados.push(curso)
        }
      }

      return response.status(201).json({
        success: true,
        message: `Cursos generados para ${grado.nombre}`,
        data: {
          grado: grado.nombre,
          cursosCreados: cursosCreados.map(c => ({
            id: c.id,
            nombre: c.nombre,
            jornada: c.jornada
          }))
        }
      })
    } catch (error) {
      console.error('Error al generar cursos:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al generar cursos',
        details: error.message
      })
    }
  }

  /**
   * Obtener estructura académica completa de una institución
   * GET /estructura-academica/institucion/:institucionId
   */
  async obtenerEstructura({ params, response }: HttpContext) {
    try {
      const institucionId = params.institucionId

      // Obtener niveles educativos personalizados
      const nivelesPersonalizados = await NivelEducativo.query()
        .where('institucion_id', institucionId)
        .whereNull('eliminado_en')
        .orderBy('orden')

      // Obtener grados con sus cursos
      const grados = await Grado.query()
        .where('institucion_id', institucionId)
        .preload('cursos')
        .orderBy('orden')

      // Agrupar por nivel educativo
      const estructura = {
        niveles: nivelesPersonalizados.map(nivel => ({
          id: nivel.id,
          nombre: nivel.nombre,
          descripcion: nivel.descripcion,
          abreviatura: nivel.abreviatura,
          orden: nivel.orden,
          grados: grados
            .filter(g => g.nivelEducativoId === nivel.id)
            .map(grado => ({
              id: grado.id,
              nombre: grado.nombre,
              orden: grado.orden,
              cursos: grado.cursos.map(curso => ({
                id: curso.id,
                nombre: curso.nombre,
                jornada: curso.jornada
              }))
            }))
        })),
        gradosSinNivel: grados
          .filter(g => !g.nivelEducativoId)
          .map(grado => ({
            id: grado.id,
            nombre: grado.nombre,
            orden: grado.orden,
            cursos: grado.cursos.map(curso => ({
              id: curso.id,
              nombre: curso.nombre,
              jornada: curso.jornada
            }))
          }))
      }

      return response.status(200).json({
        success: true,
        data: estructura
      })
    } catch (error) {
      console.error('Error al obtener estructura académica:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al obtener estructura académica',
        details: error.message
      })
    }
  }

  /**
   * Generar grados por defecto según el nombre del nivel
   */
  private generarGradosPorDefecto(nombreNivel: string): string[] {
    const nombreLower = nombreNivel.toLowerCase()
    
    if (nombreLower.includes('transición') || nombreLower.includes('jardín') || nombreLower.includes('preescolar')) {
      return ['Transición', 'Jardín']
    }
    
    if (nombreLower.includes('primaria') || nombreLower.includes('básica')) {
      return ['1°', '2°', '3°', '4°', '5°']
    }
    
    if (nombreLower.includes('secundaria')) {
      return ['6°', '7°', '8°', '9°']
    }
    
    if (nombreLower.includes('media') || nombreLower.includes('técnica') || nombreLower.includes('bachillerato')) {
      return ['10°', '11°']
    }
    
    // Por defecto, si no coincide con nada
    return ['1°', '2°', '3°']
  }

  /**
   * Sugerir cursos para un grado específico
   * GET /estructura-academica/sugerir-cursos/:gradoId
   */
  async sugerirCursos({ params, response }: HttpContext) {
    try {
      const gradoId = params.gradoId
      
      const grado = await Grado.find(gradoId)
      if (!grado) {
        return response.status(404).json({
          success: false,
          error: 'Grado no encontrado'
        })
      }

      // Generar sugerencias según el grado
      const sugerencias = this.generarSugerenciasCursos(grado.nombre)

      return response.status(200).json({
        success: true,
        data: {
          grado: grado.nombre,
          sugerencias
        }
      })
    } catch (error) {
      console.error('Error al generar sugerencias:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al generar sugerencias',
        details: error.message
      })
    }
  }

  /**
   * Generar sugerencias de cursos según el nombre del grado
   */
  private generarSugerenciasCursos(nombreGrado: string): Array<{nombre: string, jornada: string}> {
    const nombreLower = nombreGrado.toLowerCase()
    const jornadas = ['mañana', 'tarde', 'noche', 'única', 'completa']
    
    // Para grados numéricos (1°, 2°, etc.)
    if (nombreLower.match(/^\d+°?$/)) {
      const cursos = []
      for (const letra of ['A', 'B', 'C', 'D']) {
        for (const jornada of ['mañana', 'tarde']) {
          cursos.push({
            nombre: `${nombreGrado}${letra}`,
            jornada
          })
        }
      }
      return cursos
    }
    
    // Para otros grados (Transición, Jardín)
    if (nombreLower.includes('transición') || nombreLower.includes('jardín')) {
      return [
        { nombre: nombreGrado, jornada: 'mañana' },
        { nombre: nombreGrado, jornada: 'tarde' },
        { nombre: `${nombreGrado} A`, jornada: 'mañana' },
        { nombre: `${nombreGrado} B`, jornada: 'tarde' }
      ]
    }
    
    // Sugerencias por defecto
    return [
      { nombre: `${nombreGrado} A`, jornada: 'mañana' },
      { nombre: `${nombreGrado} B`, jornada: 'mañana' },
      { nombre: `${nombreGrado} C`, jornada: 'tarde' }
    ]
  }
}
