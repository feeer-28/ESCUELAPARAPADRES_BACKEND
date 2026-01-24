import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Curso from '#models/curso'
import Funcionario from '#models/funcionario'

export default class ReportesController {
  /**
   * Reporte de entregas por curso
   * GET /reportes/cursos/:id/entregas
   */
  async entregasPorCurso({ params, request, response }: HttpContext) {
    const cursoId = params.id
    const periodoId = request.input('periodo') || request.input('periodoId')

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
}
