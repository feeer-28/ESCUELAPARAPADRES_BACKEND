import type { HttpContext } from '@adonisjs/core/http'
import Docente from '#models/docente'
import db from '@adonisjs/lucid/services/db'

export default class DocenteTareasController {
  /**
   * Obtener cursos del docente logueado (para asignar tareas)
   * GET /docentes/mis-cursos
   */
  async misCursos(ctx: HttpContext) {
    console.log('=== DEBUG DOCENTE MIS CURSOS ===')
    
    // 🔥 Obtener jwtUser del contexto
    const jwtUser = (ctx as any).jwtUser
    
    console.log('🔐 jwtUser en misCursos:', jwtUser)

    if (!jwtUser) {
      return ctx.response.unauthorized({
        success: false,
        message: 'No autenticado'
      })
    }

    console.log('👤 Docente ID:', jwtUser.id)

    try {
      // Buscar el docente por usuario_id
      const docente = await Docente.query()
        .where('usuario_id', jwtUser.id)
        .first()

      if (!docente) {
        return ctx.response.notFound({
          success: false,
          message: 'Docente no encontrado'
        })
      }

      console.log('👨‍🏫 Docente encontrado:', docente.id, docente.nombres, docente.apellidos)
      console.log('🏫 Institución del docente:', docente.institucionId)

      if (!docente.institucionId) {
        return ctx.response.badRequest({
          success: false,
          message: 'El docente no tiene una institución asignada'
        })
      }

      // 🔥 OBTENER CURSOS DE LA INSTITUCIÓN DEL DOCENTE
      // Método simple y directo para evitar problemas
      console.log('🏫 Institución del docente:', docente.institucionId)
      
      // Consulta simple sin joins complicados
      let cursos = await db.from('cursos')
        .where('institucion_id', docente.institucionId)
        .select('id', 'nombre', 'institucion_id as institucionId', 'grado_id as gradoId', 'jornada')
        .orderBy('nombre', 'asc')

      console.log('📚 Cursos encontrados (consulta simple):', cursos.length)
      
      // Si aún no hay cursos, mostrar información de debug
      if (cursos.length === 0) {
        console.log('� INVESTIGACIÓN COMPLETA:')
        
        // Verificar si el docente tiene institución
        console.log('📋 Docente institucionId:', docente.institucionId)
        
        // Verificar si existen cursos en la BD
        const totalCursos = await db.from('cursos').count('* as total')
        console.log('📋 Total cursos en BD:', totalCursos[0]?.total)
        
        // Verificar instituciones con cursos
        const institucionesConCursos = await db.from('cursos')
          .select('institucion_id')
          .distinct()
          .orderBy('institucion_id')
        console.log('� Instituciones con cursos:', institucionesConCursos)
        
        // Verificar si la institución del docente existe
        const institucionDocente = await db.from('instituciones')
          .where('id', docente.institucionId)
          .first()
        console.log('📋 Institución del docente:', institucionDocente)
      }

      return ctx.response.ok({
        success: true,
        data: cursos,
        totalCursos: cursos.length,
        institucionId: docente.institucionId
      })

    } catch (error) {
      console.error('❌ Error al obtener cursos del docente:', error)
      return ctx.response.internalServerError({
        success: false,
        message: 'Error al obtener cursos',
        error: error.message
      })
    }
  }

  /**
   * Obtener tareas del docente logueado (de todas las instituciones)
   * GET /docentes/mis-tareas
   */
  async misTareas(ctx: HttpContext) {
    console.log('=== DEBUG DOCENTE MIS TAREAS ===')
    
    // 🔥 Obtener jwtUser del contexto
    const jwtUser = (ctx as any).jwtUser
    
    console.log('🔐 jwtUser en misTareas:', jwtUser)

    if (!jwtUser) {
      return ctx.response.unauthorized({
        success: false,
        message: 'No autenticado'
      })
    }

    console.log('👤 Docente ID:', jwtUser.id)
    console.log('👤 Docente correo:', jwtUser.correo)

    try {
      // Buscar el docente por usuario_id
      const docente = await Docente.query()
        .where('usuario_id', jwtUser.id)
        .first()

      if (!docente) {
        return ctx.response.notFound({
          success: false,
          message: 'Docente no encontrado'
        })
      }

      console.log('👨‍🏫 Docente encontrado:', docente.id, docente.nombres, docente.apellidos)

      // 🔥 OBTENER TAREAS DEL BANCO GENERAL CON FORMATO CONSISTENTE
      // Todas las tareas de todas las instituciones con institucionId consistente
      const tareas = await db.from('banco_tareas as bt')
        .leftJoin('instituciones as i', 'bt.institucion_id', 'i.id')
        .select(
          'bt.id',
          'bt.titulo',
          'bt.descripcion',
          'bt.categoria_id as categoriaId',
          'bt.institucion_id as institucionId',
          'i.nombre as institucion_nombre'
        )
        .orderBy('bt.creado_en', 'desc')

      console.log('📋 Total tareas encontradas:', tareas.length)

      return ctx.response.ok({
        success: true,
        message: 'Tareas obtenidas exitosamente',
        data: {
          docente: {
            id: docente.id,
            nombres: docente.nombres,
            apellidos: docente.apellidos,
            institucionId: docente.institucionId
          },
          totalTareas: tareas.length,
          tareas: tareas
        }
      })

    } catch (error) {
      console.error('❌ Error al obtener tareas del docente:', error)
      return ctx.response.internalServerError({
        success: false,
        message: 'Error al obtener tareas',
        error: error.message
      })
    }
  }
  
  /**
   * Obtener tareas de la institución del docente logueado
   * GET /docentes/mis-tareas-institucion
   */
  async misTareasInstitucion(ctx: HttpContext) {
    console.log('=== DEBUG DOCENTE TAREAS INSTITUCIÓN ===')
    
    // 🔥 Obtener jwtUser del contexto
    const jwtUser = (ctx as any).jwtUser
    
    console.log('🔐 jwtUser en misTareasInstitucion:', jwtUser)

    if (!jwtUser) {
      return ctx.response.unauthorized({
        success: false,
        message: 'No autenticado'
      })
    }

    console.log('👤 Docente ID:', jwtUser.id)
    console.log('👤 Docente correo:', jwtUser.correo)

    try {
      // Buscar el docente por usuario_id
      const docente = await Docente.query()
        .where('usuario_id', jwtUser.id)
        .first()

      if (!docente) {
        return ctx.response.notFound({
          success: false,
          message: 'Docente no encontrado'
        })
      }

      console.log('👨‍🏫 Docente encontrado:', docente.id, docente.nombres, docente.apellidos)
      console.log('🏫 Institución del docente:', docente.institucionId)

      if (!docente.institucionId) {
        return ctx.response.badRequest({
          success: false,
          message: 'El docente no tiene una institución asignada'
        })
      }

      // 🔥 OBTENER TAREAS SOLO DE LA INSTITUCIÓN DEL DOCENTE
      const tareas = await db.from('banco_tareas as bt')
        .leftJoin('cursos as c', 'bt.curso_id', 'c.id')
        .leftJoin('grados as g', 'c.grado_id', 'g.id')
        .leftJoin('instituciones as i', 'bt.institucion_id', 'i.id')
        .leftJoin('docentes as d', 'bt.docente_id', 'd.id')
        .select(
          'bt.*',
          'c.nombre as curso_nombre',
          'g.nombre as grado_nombre',
          'i.nombre as institucion_nombre',
          'd.nombres as docente_nombre',
          'd.apellidos as docente_apellido'
        )
        .where('bt.institucion_id', docente.institucionId) // 🔥 FILTRAR POR INSTITUCIÓN
        .orderBy('bt.creado_en', 'desc')

      console.log('📋 Total tareas de mi institución:', tareas.length)

      // Obtener información de la institución
      const institucion = await db.from('instituciones')
        .where('id', docente.institucionId)
        .first()

      return ctx.response.ok({
        success: true,
        message: 'Tareas de mi institución obtenidas exitosamente',
        data: {
          docente: {
            id: docente.id,
            nombres: docente.nombres,
            apellidos: docente.apellidos,
            institucionId: docente.institucionId
          },
          institucion: institucion,
          totalTareas: tareas.length,
          tareas: tareas
        }
      })

    } catch (error) {
      console.error('❌ Error al obtener tareas de mi institución:', error)
      return ctx.response.internalServerError({
        success: false,
        message: 'Error al obtener tareas de mi institución',
        error: error.message
      })
    }
  }
}
