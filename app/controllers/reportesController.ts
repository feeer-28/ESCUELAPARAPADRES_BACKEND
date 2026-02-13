import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Curso from '#models/curso'
import Funcionario from '#models/funcionario'
import Role from '#models/role'
import Docente from '#models/docente'
import Usuario from '#models/usuario'

export default class ReportesController {
  /**
   * Reporte de entregas por curso
   * GET /reportes/cursos/:id/entregas
   */
  async entregasPorCurso({ params, request, response }: HttpContext) {
    const cursoId = params.id
    const periodoId = request.input('periodo') || request.input('periodoId')
    const download = String(request.input('download') ?? request.qs().download ?? '').toLowerCase()
    const format = String(request.input('format') ?? request.qs().format ?? 'csv').toLowerCase()

    // Control de acceso: si es docente, validar que el curso le pertenece
    const jwtUser = (request as any).jwtUser || (response as any).jwtUser || ({} as Usuario)
    if (jwtUser && (jwtUser as any).id) {
      const rol = await Role.find((jwtUser as any).rolId)
      const nombreRol = (rol?.nombre ?? '').toLowerCase()
      if (nombreRol === 'docente') {
        const docente = await Docente.query().where('usuario_id', (jwtUser as any).id).first()
        if (!docente) return response.forbidden({ success: false, message: 'Docente no válido' })
        const rows = await db.from('docente_curso').where('docente_id', docente.id).select('curso_id')
        const cursoIds = rows.map((r) => Number(r.curso_id))
        if (!cursoIds.includes(Number(cursoId))) {
          return response.forbidden({ success: false, message: 'No tienes acceso a este curso' })
        }
      }
    }

    const curso = await Curso.query().where('id', cursoId).preload('grado').first()
    if (!curso) {
      return response.notFound({ success: false, message: 'Curso no encontrado' })
    }

    // Obtener estudiantes del curso
    const estudiantes = await db
      .from('estudiantes')
      .where('curso_id', cursoId)
      .whereNull('eliminado_en')
      .select('id', 'nombres', 'apellidos')

    // Contar tareas asignadas al curso
    let tareasQuery = db
      .from('asignaciones')
      .where('curso_id', cursoId)

    if (periodoId) {
      tareasQuery = tareasQuery.where('periodo_id', periodoId)
    }

    const tareasResult = await tareasQuery.count('* as total')
    const totalTareas = Number(tareasResult[0]?.total || 0)

    // Para cada estudiante, contar entregas y promedio
    const estudiantesConMetricas = await Promise.all(
      estudiantes.map(async (est) => {
        let entregasQuery = db
          .from('entregas as e')
          .join('asignaciones as a', 'e.asignacion_id', 'a.id')
          .where('e.estudiante_id', est.id)
          .where('a.curso_id', cursoId)

        if (periodoId) {
          entregasQuery = entregasQuery.where('a.periodo_id', periodoId)
        }

        const entregasResult = await entregasQuery.count('* as total')
        const tareasEntregadas = Number(entregasResult[0]?.total || 0)

        // Promedio de calificaciones
        let promedioQuery = db
          .from('calificaciones as c')
          .join('asignaciones as a', 'c.asignacion_id', 'a.id')
          .where('c.estudiante_id', est.id)
          .where('a.curso_id', cursoId)

        if (periodoId) {
          promedioQuery = promedioQuery.where('a.periodo_id', periodoId)
        }

        const promedioResult = await promedioQuery.avg('c.nota as promedio')
        const promedio = promedioResult[0]?.promedio
          ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
          : 0

        return {
          id: est.id,
          nombre: `${est.nombres} ${est.apellidos}`,
          tareasAsignadas: totalTareas,
          tareasEntregadas,
          promedio,
          porcentajeCumplimiento: totalTareas > 0 ? Math.round((tareasEntregadas / totalTareas) * 100) : 0,
        }
      })
    )

    // Calcular resumen
    const totalEntregas = estudiantesConMetricas.reduce((sum, e) => sum + e.tareasEntregadas, 0)
    const totalEsperado = estudiantes.length * totalTareas
    const promedioEntregas = totalEsperado > 0 ? Math.round((totalEntregas / totalEsperado) * 100) : 0

    const promediosCurso = estudiantesConMetricas.filter((e) => e.promedio > 0).map((e) => e.promedio)
    const promedioCurso =
      promediosCurso.length > 0
        ? parseFloat((promediosCurso.reduce((a, b) => a + b, 0) / promediosCurso.length).toFixed(1))
        : 0

    // Si se solicita descarga CSV
    if (download === '1' || download === 'true') {
      if (format !== 'csv') {
        return response.badRequest({ success: false, message: 'Formato no soportado. Use csv' })
      }

      const header = ['Estudiante', 'TareasAsignadas', 'TareasEntregadas', 'Promedio', 'PorcentajeCumplimiento']
      const rows = estudiantesConMetricas.map((e) => [
        e.nombre,
        e.tareasAsignadas,
        e.tareasEntregadas,
        e.promedio,
        `${e.porcentajeCumplimiento}%`,
      ])

      const csv = [header, ...rows]
        .map((r) => r.map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))
        .join('\n')

      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header(
        'Content-Disposition',
        `attachment; filename="reporte_entregas_curso_${cursoId}${periodoId ? `_periodo_${periodoId}` : ''}.csv"`
      )
      return response.send(csv)
    }

    return response.ok({
      success: true,
      data: {
        curso: { id: curso.id, nombre: curso.nombre },
        periodo: periodoId ? { id: periodoId } : null,
        resumen: {
          totalTareas,
          promedioEntregas,
          promedioCurso,
        },
        estudiantes: estudiantesConMetricas,
      },
    })
  }

  /**
   * Reporte de calificaciones por curso
   * GET /reportes/cursos/:id/calificaciones
   */
  async calificacionesPorCurso({ params, request, response }: HttpContext) {
    const cursoId = params.id
    const periodoId = request.input('periodo') || request.input('periodoId')
    const download = String(request.input('download') ?? request.qs().download ?? '').toLowerCase()
    const format = String(request.input('format') ?? request.qs().format ?? 'csv').toLowerCase()

    // Control de acceso: si es docente, validar que el curso le pertenece
    const jwtUser = (request as any).jwtUser || (response as any).jwtUser || ({} as Usuario)
    if (jwtUser && (jwtUser as any).id) {
      const rol = await Role.find((jwtUser as any).rolId)
      const nombreRol = (rol?.nombre ?? '').toLowerCase()
      if (nombreRol === 'docente') {
        const docente = await Docente.query().where('usuario_id', (jwtUser as any).id).first()
        if (!docente) return response.forbidden({ success: false, message: 'Docente no válido' })
        const rows = await db.from('docente_curso').where('docente_id', docente.id).select('curso_id')
        const cursoIds = rows.map((r) => Number(r.curso_id))
        if (!cursoIds.includes(Number(cursoId))) {
          return response.forbidden({ success: false, message: 'No tienes acceso a este curso' })
        }
      }
    }

    const curso = await Curso.query().where('id', cursoId).preload('grado').first()
    if (!curso) {
      return response.notFound({ success: false, message: 'Curso no encontrado' })
    }

    // Obtener calificaciones
    let query = db
      .from('calificaciones as c')
      .join('estudiantes as e', 'c.estudiante_id', 'e.id')
      .join('asignaciones as a', 'c.asignacion_id', 'a.id')
      .where('a.curso_id', cursoId)
      .select(
        'e.id as estudianteId',
        'e.nombres',
        'e.apellidos',
        'c.nota',
        'a.titulo as tarea'
      )

    if (periodoId) {
      query = query.where('a.periodo_id', periodoId)
    }

    const calificaciones = await query.orderBy('e.apellidos')

    // Agrupar por estudiante
    const porEstudiante: Record<number, any> = {}
    calificaciones.forEach((cal) => {
      if (!porEstudiante[cal.estudianteId]) {
        porEstudiante[cal.estudianteId] = {
          id: cal.estudianteId,
          nombre: `${cal.nombres} ${cal.apellidos}`,
          calificaciones: [],
          promedio: 0,
        }
      }
      porEstudiante[cal.estudianteId].calificaciones.push({
        tarea: cal.tarea,
        nota: cal.nota,
      })
    })

    // Calcular promedios
    Object.values(porEstudiante).forEach((est: any) => {
      const notas = est.calificaciones.map((c: any) => Number(c.nota)).filter((n: number) => n > 0)
      est.promedio = notas.length > 0 ? parseFloat((notas.reduce((a: number, b: number) => a + b, 0) / notas.length).toFixed(1)) : 0
    })

    // Distribución de rendimiento
    const estudiantes = Object.values(porEstudiante)
    const distribucion = { superior: 0, alto: 0, basico: 0, bajo: 0 }
    estudiantes.forEach((e: any) => {
      if (e.promedio >= 4.6) distribucion.superior++
      else if (e.promedio >= 4.0) distribucion.alto++
      else if (e.promedio >= 3.0) distribucion.basico++
      else if (e.promedio > 0) distribucion.bajo++
    })

    // Descarga CSV si se solicita
    if (download === '1' || download === 'true') {
      if (format !== 'csv') {
        return response.badRequest({ success: false, message: 'Formato no soportado. Use csv' })
      }

      // CSV por estudiante con promedio y detalle de calificaciones en columnas dinámicas
      const tareasUnicas: string[] = []
      estudiantes.forEach((e: any) => {
        e.calificaciones.forEach((c: any) => {
          if (!tareasUnicas.includes(c.tarea)) tareasUnicas.push(c.tarea)
        })
      })

      const header = ['Estudiante', ...tareasUnicas, 'Promedio']
      const rows = (estudiantes as any[]).map((e) => {
        const mapNotas: Record<string, number> = {}
        e.calificaciones.forEach((c: any) => {
          mapNotas[c.tarea] = c.nota
        })
        const notasPorTarea = tareasUnicas.map((t) => (t in mapNotas ? mapNotas[t] : ''))
        return [e.nombre, ...notasPorTarea, e.promedio]
      })

      const csv = [header, ...rows]
        .map((r) => r.map((v) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : v)).join(','))
        .join('\n')

      response.header('Content-Type', 'text/csv; charset=utf-8')
      response.header(
        'Content-Disposition',
        `attachment; filename="reporte_calificaciones_curso_${cursoId}${periodoId ? `_periodo_${periodoId}` : ''}.csv"`
      )
      return response.send(csv)
    }

    return response.ok({
      success: true,
      data: {
        curso: { id: curso.id, nombre: curso.nombre },
        distribucion,
        estudiantes,
      },
    })
  }

  /**
   * Resumen institucional
   * GET /reportes/institucion/resumen
   */
  async resumenInstitucion({ response, jwtUser }: HttpContext) {
    let institucionId: number | null = null

    if (jwtUser) {
      const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
      institucionId = funcionario?.institucionId || null
    }

    if (!institucionId) {
      return response.badRequest({ success: false, message: 'No se pudo determinar la institución' })
    }

    // Total cursos
    const cursosResult = await db.from('cursos').where('institucion_id', institucionId).count('* as total')
    const totalCursos = Number(cursosResult[0]?.total || 0)

    // Total estudiantes
    const estudiantesResult = await db
      .from('estudiantes as e')
      .join('cursos as c', 'e.curso_id', 'c.id')
      .where('c.institucion_id', institucionId)
      .whereNull('e.eliminado_en')
      .count('e.id as total')
    const totalEstudiantes = Number(estudiantesResult[0]?.total || 0)

    // Total tareas
    const tareasResult = await db.from('asignaciones').where('institucion_id', institucionId).count('* as total')
    const totalTareas = Number(tareasResult[0]?.total || 0)

    // Total entregas
    const entregasResult = await db.from('entregas').where('institucion_id', institucionId).count('* as total')
    const totalEntregas = Number(entregasResult[0]?.total || 0)

    // Promedio general
    const promedioResult = await db
      .from('calificaciones')
      .where('institucion_id', institucionId)
      .avg('nota as promedio')
    const promedioGeneral = promedioResult[0]?.promedio
      ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
      : 0

    // Porcentaje de cumplimiento
    const porcentajeCumplimiento =
      totalTareas > 0 && totalEstudiantes > 0
        ? Math.round((totalEntregas / (totalTareas * totalEstudiantes)) * 100)
        : 0

    return response.ok({
      success: true,
      data: {
        institucionId,
        totalCursos,
        totalEstudiantes,
        totalTareas,
        totalEntregas,
        promedioGeneral,
        porcentajeCumplimiento,
      },
    })
  }

  /**
   * Reporte 1: Estudiantes por Curso/Grado/Jornada (a nivel institución del usuario)
   * GET /reportes/institucion/estudiantes-por-curso
   * Optional filters: gradoId, jornada
   */
  async estudiantesPorCursoInstitucion({ response, jwtUser, request }: HttpContext) {
    let institucionId: number | null = null

    if (jwtUser) {
      const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
      institucionId = funcionario?.institucionId || null
    }

    if (!institucionId) {
      return response.badRequest({ success: false, message: 'No se pudo determinar la institución' })
    }

    const gradoId = request.input('gradoId') ?? request.input('grado')
    const jornada = request.input('jornada')

    let cursosQuery = db.from('cursos as c').where('c.institucion_id', institucionId)
    if (gradoId) cursosQuery = cursosQuery.where('c.grado_id', gradoId)
    if (jornada) cursosQuery = cursosQuery.where('c.jornada', jornada)

    const cursos = await cursosQuery.select('c.id', 'c.nombre', 'c.grado_id', 'c.jornada')

    // Conteo de estudiantes por curso
    const resultados = await Promise.all(
      cursos.map(async (c) => {
        const countRes = await db
          .from('estudiantes as e')
          .where('e.curso_id', c.id)
          .whereNull('e.eliminado_en')
          .count('e.id as total')
        const total = Number(countRes[0]?.total || 0)
        return {
          cursoId: c.id,
          curso: c.nombre,
          gradoId: c.grado_id,
          jornada: c.jornada,
          totalEstudiantes: total,
        }
      })
    )

    // Totales por grado y por jornada
    const porGrado: Record<string, number> = {}
    const porJornada: Record<string, number> = {}
    resultados.forEach((r) => {
      porGrado[String(r.gradoId)] = (porGrado[String(r.gradoId)] ?? 0) + r.totalEstudiantes
      porJornada[String(r.jornada)] = (porJornada[String(r.jornada)] ?? 0) + r.totalEstudiantes
    })

    const totalEstudiantes = resultados.reduce((a, b) => a + b.totalEstudiantes, 0)

    return response.ok({
      success: true,
      data: {
        institucionId,
        filtros: { gradoId: gradoId ? Number(gradoId) : null, jornada: jornada ?? null },
        resumen: { totalEstudiantes, porGrado, porJornada },
        cursos: resultados,
      },
    })
  }

  /**
   * Reporte 6: Alertas Académicas por umbral y período (a nivel institución)
   * GET /reportes/institucion/alertas-academicas
   * Query: periodoId (opcional pero recomendado), umbral (default 3.0), cursoId (opcional)
   */
  async alertasAcademicasInstitucion({ response, jwtUser, request }: HttpContext) {
    let institucionId: number | null = null
    if (jwtUser) {
      const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
      institucionId = funcionario?.institucionId || null
    }

    if (!institucionId) {
      return response.badRequest({ success: false, message: 'No se pudo determinar la institución' })
    }

    const periodoId = request.input('periodoId') ?? request.input('periodo')
    const umbral = parseFloat(String(request.input('umbral') ?? '3.0'))
    const cursoId = request.input('cursoId') ?? request.input('curso')

    let query = db
      .from('calificaciones as c')
      .join('estudiantes as e', 'c.estudiante_id', 'e.id')
      .join('cursos as cu', 'e.curso_id', 'cu.id')
      .where('cu.institucion_id', institucionId)
      .whereNotNull('c.nota')
      .where('c.nota', '<', umbral)
      .select(
        'e.id as estudianteId',
        'e.nombres',
        'e.apellidos',
        'cu.id as cursoId',
        'cu.nombre as curso',
        'c.nota',
        'c.asignacion_id as asignacionId',
        'c.periodo_id as periodoId'
      )

    if (periodoId) query = query.where('c.periodo_id', periodoId)
    if (cursoId) query = query.where('cu.id', cursoId)

    const filas = await query.orderBy('cu.nombre').orderBy('e.apellidos')

    // Agrupar por curso y por estudiante
    const porCurso: Record<number, { cursoId: number; curso: string; estudiantes: Record<number, any> }> = {}
    filas.forEach((f) => {
      if (!porCurso[f.cursoId]) {
        porCurso[f.cursoId] = { cursoId: f.cursoId, curso: f.curso, estudiantes: {} }
      }
      const porEst = porCurso[f.cursoId].estudiantes
      if (!porEst[f.estudianteId]) {
        porEst[f.estudianteId] = {
          id: f.estudianteId,
          nombre: `${f.nombres} ${f.apellidos}`,
          alertas: [],
        }
      }
      porEst[f.estudianteId].alertas.push({ asignacionId: f.asignacionId, nota: f.nota, periodoId: f.periodoId })
    })

    const cursos = Object.values(porCurso).map((c) => ({
      cursoId: c.cursoId,
      curso: c.curso,
      totalEstudiantesAlerta: Object.keys(c.estudiantes).length,
      estudiantes: Object.values(c.estudiantes),
    }))

    const totalEstudiantesAlerta = cursos.reduce((a, b) => a + b.totalEstudiantesAlerta, 0)

    return response.ok({
      success: true,
      data: {
        institucionId,
        filtros: { periodoId: periodoId ? Number(periodoId) : null, umbral, cursoId: cursoId ? Number(cursoId) : null },
        totalEstudiantesAlerta,
        cursos,
      },
    })
  }

  /**
   * Reporte 7: Estudiantes sin calificaciones en el período (a nivel institución)
   * GET /reportes/institucion/sin-calificaciones
   * Query: periodoId (requerido para precisión), cursoId (opcional)
   */
  async estudiantesSinCalificacionesInstitucion({ response, jwtUser, request }: HttpContext) {
    let institucionId: number | null = null
    if (jwtUser) {
      const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
      institucionId = funcionario?.institucionId || null
    }

    if (!institucionId) {
      return response.badRequest({ success: false, message: 'No se pudo determinar la institución' })
    }

    const periodoId = request.input('periodoId') ?? request.input('periodo')
    const cursoId = request.input('cursoId') ?? request.input('curso')

    // Listado base de estudiantes de la institución (y curso si aplica)
    let baseQuery = db
      .from('estudiantes as e')
      .join('cursos as c', 'e.curso_id', 'c.id')
      .where('c.institucion_id', institucionId)
      .whereNull('e.eliminado_en')
      .select('e.id as estudianteId', 'e.nombres', 'e.apellidos', 'c.id as cursoId', 'c.nombre as curso')

    if (cursoId) baseQuery = baseQuery.where('c.id', cursoId)

    const estudiantes = await baseQuery

    if (!estudiantes.length) {
      return response.ok({ success: true, data: { institucionId, filtros: { periodoId: periodoId ? Number(periodoId) : null, cursoId: cursoId ? Number(cursoId) : null }, total: 0, estudiantes: [] } })
    }

    // Estudiantes que sí tienen calificaciones en el periodo
    let califQuery = db
      .from('calificaciones as cal')
      .whereIn('cal.estudiante_id', estudiantes.map((e) => e.estudianteId))
      .select('cal.estudiante_id as estudianteId')
      .groupBy('cal.estudiante_id')

    if (periodoId) califQuery = califQuery.where('cal.periodo_id', periodoId)

    const conCalif = await califQuery
    const conCalifSet = new Set<number>(conCalif.map((r) => Number(r.estudianteId)))

    const sinCalif = estudiantes.filter((e) => !conCalifSet.has(Number(e.estudianteId)))

    // Agrupar por curso
    const porCurso: Record<number, { cursoId: number; curso: string; total: number; estudiantes: any[] }> = {}
    sinCalif.forEach((e) => {
      if (!porCurso[e.cursoId]) porCurso[e.cursoId] = { cursoId: e.cursoId, curso: e.curso, total: 0, estudiantes: [] }
      porCurso[e.cursoId].estudiantes.push({ id: e.estudianteId, nombre: `${e.nombres} ${e.apellidos}` })
      porCurso[e.cursoId].total++
    })

    const cursos = Object.values(porCurso)

    return response.ok({
      success: true,
      data: {
        institucionId,
        filtros: { periodoId: periodoId ? Number(periodoId) : null, cursoId: cursoId ? Number(cursoId) : null },
        total: sinCalif.length,
        cursos,
      },
    })
  }
}
